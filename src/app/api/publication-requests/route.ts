import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { saveContactLeads } from "@/lib/contact-leads";
import { hasDatabaseConfig, requiresDatabase } from "@/lib/mysql";
import { getPublicationContactErrors, normalizePublicationPhone, validatePublicationDetails } from "@/lib/publication-input";
import { ownerCorrectableRequest, PublicationError, storeAliadoRequest, storeDatabaseRequest, type UploadedPhoto } from "@/lib/database-publications";
import bcrypt from "bcryptjs";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { isDisposableEmail, isWeakPassword, normalizeSignupEmail, normalizeSignupName, signupLimits } from "@/lib/signup-rules";
import { getTeamMemberByAccount } from "@/lib/team";
import { isRentalPropertyType } from "@/lib/rentals";
import { persistentStorageRoot } from "@/lib/storage";
import { isDisplayCurrency, parsePropertyExchangeRate } from "@/lib/currency";
import { maxTotalPhotoBytes, shrinkUploadPhoto, validateUploadPhotos } from "@/lib/upload-photos";
import { validPhotoCategory } from "@/lib/publish-prefill";

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
  // An aliado publishes only for an owner, creating the owner's account in the same envío.
  const aliado = account.kind === "aliado" && account.storage === "mysql" ? await getTeamMemberByAccount(account.id).catch(() => null) : null;
  if (account.kind !== "owner" && !aliado) {
    return NextResponse.json({ ok: false, message: account.kind === "aliado" ? "Tu cuenta de aliado todavía no está unida a tu ficha del equipo. Avísale a Zentro." : "La publicación está disponible para propietarios de viviendas en alquiler." }, { status: 403 });
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

  const validation = hasDatabaseConfig() ? validatePublicationDetails(payload.details) : null;
  const fieldErrors = { ...validation?.fieldErrors, ...getPublicationContactErrors(contactName, whatsapp) };
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR", fieldErrors, message: Object.values(fieldErrors).join(" ") }, { status: 400 });
  }
  const normalizedPhone = normalizePublicationPhone(whatsapp)!;
  const ownerAccount = aliado ? await checkOwnerAccount(payload.ownerAccount, contactName, normalizedPhone) : null;
  if (ownerAccount && !ownerAccount.ok) {
    return NextResponse.json({ ok: false, code: "OWNER_ACCOUNT", message: ownerAccount.message }, { status: 400 });
  }
  const key = request.headers.get("idempotency-key") || "";
  if (hasDatabaseConfig() && !/^[a-zA-Z0-9_-]{32,64}$/.test(key)) {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST_KEY", message: "No pudimos identificar este envío. Vuelve a intentarlo; tus datos y fotos siguen en el formulario." }, { status: 400 });
  }

  const photoValidation = await validateUploadPhotos(photos);
  if (!photoValidation.ok) {
    return NextResponse.json(
      { ok: false, message: photoValidation.message },
      { status: photoValidation.status },
    );
  }

  // Only the lighter copy of each photo is kept (longest side 1920 px), with its room label.
  const photoReport = Array.isArray(payload.photoReport) ? payload.photoReport : [];
  const uploaded: UploadedPhoto[] = [];
  for (const [index, photo] of photos.entries()) {
    const report = photoReport[index] as { category?: unknown } | undefined;
    uploaded.push({ ...(await shrinkUploadPhoto(photo)), originalName: photo.name, category: validPhotoCategory(report?.category) });
  }

  const requestId = `publication_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  if (aliado && ownerAccount?.ok && hasDatabaseConfig()) {
    const details = validation!.details!;
    try {
      const result = await storeAliadoRequest({ id: requestId, contactName, whatsapp: normalizedPhone, sourceText, details,
        price: details.price, currency: details.currency, exchangeRate: details.exchangeRate,
        aliado: { memberId: aliado.member.id, name: aliado.member.name } }, ownerAccount.owner, uploaded, key);
      return NextResponse.json({ ok: true, ...result, ownerLogin: ownerAccount.owner.username }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ ok: false, ...(error instanceof PublicationError && error.code ? { code: error.code } : {}), message: error instanceof PublicationError ? error.message : "No pudimos guardar la solicitud en la base de datos. Conservamos los datos; intenta nuevamente." }, { status: error instanceof PublicationError ? error.status : 503 });
    }
  }
  if (aliado) return NextResponse.json({ ok: false, message: "La base de datos no está disponible. Intenta nuevamente en unos minutos." }, { status: 503 });
  if (hasDatabaseConfig()) {
    const details = validation!.details!;
    try {
      // "Corregir y reenviar": linked only to a request of this owner that is waiting for it.
      // Otherwise it is kept as a new request, so nothing the owner sent is lost.
      const correctionOf = typeof payload.correctionOf === "string" && (await ownerCorrectableRequest(account.id, payload.correctionOf).catch(() => null))
        ? payload.correctionOf : undefined;
      const result = await storeDatabaseRequest({id:requestId,accountId:account.id,accountEmail:account.email,contactName,
        whatsapp:normalizedPhone,sourceText,details,
        price:details.price,currency:details.currency,exchangeRate:details.exchangeRate,...(correctionOf ? {correctionOf} : {})},uploaded,key);
      return NextResponse.json({ok:true,...result},{status:201});
    } catch(error) {
      return NextResponse.json({ok:false,...(error instanceof PublicationError && error.code ? {code:error.code} : {}),message:error instanceof PublicationError ? error.message : "No pudimos guardar la solicitud en la base de datos. Conservamos tus datos; intenta nuevamente."},{status:error instanceof PublicationError ? error.status : 503});
    }
  }
  const requestDirectory = path.join(persistentStorageRoot, "publication-requests", requestId);
  const pendingDirectory = `${requestDirectory}.pending`;

  try {
  await mkdir(pendingDirectory, { recursive: true });

  const storedPhotos: Array<{ originalName: string; storedName: string; size: number; type: string }> = [];

  for (const [index, photo] of uploaded.entries()) {
    const extension = allowedImageTypes.get(photo.type) ?? ".jpg";
    const storedName = `${String(index + 1).padStart(2, "0")}${extension}`;
    await writeFile(path.join(pendingDirectory, storedName), photo.bytes);
    storedPhotos.push({
      originalName: photo.originalName,
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

// The owner's own account, made by the aliado: the owner signs in with their WhatsApp number (8
// digits) or the email, if they gave one, and the password the aliado passes on to them.
async function checkOwnerAccount(input: unknown, contactName: string, whatsapp: string) {
  const data = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const name = normalizeSignupName(contactName);
  if (!name) return { ok: false as const, message: "Escribe el nombre y apellido del dueño, solo con letras." };
  const rawEmail = readText(data.email);
  const email = rawEmail ? normalizeSignupEmail(rawEmail) : null;
  if (rawEmail && !email) return { ok: false as const, message: "Revisa el correo del dueño (como nombre@gmail.com) o déjalo vacío." };
  if (email && isDisposableEmail(email)) return { ok: false as const, message: "Usa un correo personal del dueño; no aceptamos correos temporales." };
  const password = typeof data.password === "string" ? data.password : "";
  if (password.length < signupLimits.passwordMin || new TextEncoder().encode(password).length > signupLimits.passwordBytes) {
    return { ok: false as const, message: "La contraseña del dueño debe tener entre 8 y 72 caracteres." };
  }
  const username = whatsapp.slice(3);
  if (isWeakPassword(password, email) || password === username || password === whatsapp) {
    return { ok: false as const, message: "Esa contraseña es muy fácil de adivinar. Usa otra (puedes tocar «Crear una»)." };
  }
  return { ok: true as const, owner: { name, username, email, passwordHash: await bcrypt.hash(password, 12) } };
}
