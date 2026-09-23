import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { saveContactLeads } from "@/lib/contact-leads";
import { hasDatabaseConfig, requiresDatabase } from "@/lib/mysql";
import { parsePublicationDetails } from "@/lib/publication-input";
import { PublicationError, storeDatabaseRequest } from "@/lib/database-publications";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { isRentalPropertyType } from "@/lib/rentals";
import { persistentStorageRoot } from "@/lib/storage";
import { isDisplayCurrency, parsePropertyExchangeRate } from "@/lib/currency";
import { maxTotalPhotoBytes, validateUploadPhotos } from "@/lib/upload-photos";

export const runtime = "nodejs";

const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export async function POST(request: NextRequest) {
  if (requiresDatabase() && !hasDatabaseConfig()) return NextResponse.json({ok:false,message:"La base de datos no está configurada."},{status:503});
  const account = await getCurrentAccount();
  if (!account) {
    return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", message: "Inicia sesión para enviar tu vivienda a revisión." }, { status: 401 });
  }
  if (account.kind !== "owner") {
    return NextResponse.json({ ok: false, message: "La publicación está disponible para propietarios de viviendas en alquiler." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length")) > maxTotalPhotoBytes + 1024 * 1024) {
    return NextResponse.json({ ok: false, message: "El envio supera el limite de 60 MB de fotos." }, { status: 413 });
  }
  const parsed = await parseRequest(request);

  if (!parsed) {
    return NextResponse.json({ ok: false, message: "Solicitud inválida." }, { status: 400 });
  }

  const { payload, photos } = parsed;

  if (readText(payload.website)) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (
    payload.operation !== "Alquiler" ||
    payload.publisherKind !== "owner" ||
    payload.ownerConfirmed !== true ||
    !isRentalPropertyType(payload.propertyType)
  ) {
    return NextResponse.json(
      { ok: false, message: "Solo aceptamos viviendas en alquiler directo con el propietario, sin comisión de intermediación." },
      { status: 400 },
    );
  }

  const contactName = readText(payload.contactName);
  const currency = payload.currency ?? "BOB";
  const exchangeRate = currency === "USD" ? parsePropertyExchangeRate(payload.exchangeRate) : null;
  if (typeof currency !== "string" || !isDisplayCurrency(currency) || (currency === "USD" && exchangeRate === null)) {
    return NextResponse.json({ ok: false, message: "Indica una moneda válida y un tipo de cambio mayor a 0 y de hasta 1000 Bs por USD." }, { status: 400 });
  }
  const whatsapp = readText(payload.whatsapp);
  const sourceText = readText(payload.sourceText);

  if (!contactName || !whatsapp || !sourceText || sourceText.length < 40) {
    return NextResponse.json(
      { ok: false, message: "Completa nombre, WhatsApp e información de la vivienda." },
      { status: 400 },
    );
  }

  if (sourceText.length > 12_000) {
    return NextResponse.json(
      { ok: false, message: "La información enviada es demasiado extensa." },
      { status: 413 },
    );
  }

  const photoValidation = await validateUploadPhotos(photos);
  if (!photoValidation.ok) {
    return NextResponse.json(
      { ok: false, message: photoValidation.message },
      { status: photoValidation.status },
    );
  }

  const requestId = `publication_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  if (hasDatabaseConfig()) {
    const details = parsePublicationDetails(payload.details);
    const key = request.headers.get("idempotency-key") || "";
    const normalizedPhone = whatsapp.replace(/\D/g, "");
    if (!details || !/^[a-zA-Z0-9_-]{32,64}$/.test(key) || !/^(591)?[67]\d{7}$/.test(normalizedPhone) || contactName.length > 160) {
      return NextResponse.json({ok:false,message:"Revisa los datos de la vivienda y un WhatsApp válido de Bolivia."},{status:400});
    }
    try {
      const result = await storeDatabaseRequest({id:requestId,accountId:account.id,accountEmail:account.email,contactName,
        whatsapp:normalizedPhone.startsWith("591") ? normalizedPhone : `591${normalizedPhone}`,sourceText,details,
        price:details.price,currency:details.currency,exchangeRate:details.exchangeRate},photos,key);
      return NextResponse.json({ok:true,...result},{status:201});
    } catch(error) {
      return NextResponse.json({ok:false,message:error instanceof PublicationError ? error.message : "No pudimos guardar la solicitud en la base de datos. Conservamos tus datos; intenta nuevamente."},{status:error instanceof PublicationError ? error.status : 503});
    }
  }
  const requestDirectory = path.join(persistentStorageRoot, "publication-requests", requestId);
  const pendingDirectory = `${requestDirectory}.pending`;

  try {
  await mkdir(pendingDirectory, { recursive: true });

  const storedPhotos: Array<{ originalName: string; storedName: string; size: number; type: string }> = [];

  for (const [index, photo] of photos.entries()) {
    const extension = allowedImageTypes.get(photo.type) ?? ".jpg";
    const storedName = `${String(index + 1).padStart(2, "0")}${extension}`;
    const bytes = Buffer.from(await photo.arrayBuffer());
    await writeFile(path.join(pendingDirectory, storedName), bytes);
    storedPhotos.push({
      originalName: photo.name,
      storedName,
      size: photo.size,
      type: photo.type,
    });
  }

  const requestRecord = {
    id: requestId,
    createdAt: new Date().toISOString(),
    status: "pending_review",
    accountId: account.id,
    accountEmail: account.email,
    operation: "Alquiler",
    propertyType: payload.propertyType,
    price: typeof payload.price === "number" && Number.isFinite(payload.price) ? payload.price : null,
    currency,
    exchangeRate,
    publisherKind: "owner",
    ownerConfirmed: true,
    contactName,
    whatsapp,
    sourceText,
    notes: readText(payload.notes),
    photoReport: Array.isArray(payload.photoReport) ? payload.photoReport : [],
    photos: storedPhotos,
  };

  await writeFile(
    path.join(pendingDirectory, "request.json"),
    JSON.stringify(requestRecord, null, 2),
    "utf8",
  );
  await rename(pendingDirectory, requestDirectory);

  let databaseLeadId: string | null = null;
  if (hasDatabaseConfig()) {
    try {
      const leads = await saveContactLeads({
        propertySlug: null,
        contactName,
        whatsapp,
        sourcePlatform: "owner_wizard",
        sourceUrl: null,
        sourceText,
        notes: `${readText(payload.notes)} Solicitud local: ${requestId}`.trim(),
      });
      databaseLeadId = leads[0]?.id ?? null;
    } catch (error) {
      console.error("No se pudo sincronizar la solicitud con MySQL.", error);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      requestId,
      databaseLeadId,
      photosStored: storedPhotos.length,
      status: "pending_review",
    },
    { status: 201 },
  );
  } catch {
    // Only this request's newly-created staging directory is eligible for cleanup.
    await rm(pendingDirectory, { recursive: true, force: true }).catch(() => undefined);
    return NextResponse.json({ ok: false, message: "No pudimos guardar la solicitud. Tus datos siguen en el formulario; intenta nuevamente." }, { status: 503 });
  }
}

async function parseRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return null;
    }

    const rawPayload = formData.get("payload");
    if (typeof rawPayload !== "string") {
      return null;
    }

    const payload = parsePayload(rawPayload);
    if (!payload) {
      return null;
    }

    const photos = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File);

    return { payload, photos };
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  return payload ? { payload, photos: [] as File[] } : null;
}

function parsePayload(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
