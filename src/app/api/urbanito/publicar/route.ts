import { randomUUID } from "node:crypto";
import { hasDatabaseConfig } from "@/lib/mysql";
import { getPublicationContactErrors, normalizePublicationPhone, validatePublicationDetails } from "@/lib/publication-input";
import { PublicationError, storeDatabaseRequest, type UploadedPhoto } from "@/lib/database-publications";
import { getUrbanitoOwner } from "@/lib/urbanito";
import { readTelegramId } from "@/lib/urbanito-input";
import { maxTotalPhotoBytes, shrinkUploadPhoto, validateUploadPhotos } from "@/lib/upload-photos";
import { forUrbanito, reply } from "../reply";

export const runtime = "nodejs";

// Urbanito sends a home that a linked owner dictated in Telegram. Same rules and checks as the
// publish wizard (owner-direct rentals only, 5 to 15 photos), and it lands in /admin/solicitudes for review.
export async function POST(request: Request) {
  return forUrbanito(request, async () => {
    if (!hasDatabaseConfig()) return reply(503, { message: "La base de datos no está configurada." });
    if (Number(request.headers.get("content-length")) > maxTotalPhotoBytes + 1024 * 1024) return reply(413, { message: "Las fotos superan los 60 MB." });
    const form = await request.formData().catch(() => null);
    const payload = parsePayload(form?.get("payload"));
    if (!form || !payload) return reply(400, { message: "Solicitud inválida." });
    const telegramId = readTelegramId(payload.telegram_id);
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });

    const owner = await getUrbanitoOwner(telegramId);
    if (!owner) return reply(404, { message: "Esta cuenta de Telegram no está conectada a Zentro Urbano." });
    if (owner.kind !== "owner" || owner.status !== "active") {
      return reply(403, { code: "NOT_OWNER", message: "En Zentro Urbano solo publican los dueños, en alquiler directo y sin comisión." });
    }
    if (payload.ownerConfirmed !== true) {
      return reply(400, { code: "NOT_OWNER", message: "Solo aceptamos viviendas en alquiler directo con el propietario, sin comisión de intermediación." });
    }

    const key = request.headers.get("idempotency-key") || "";
    if (!/^[a-zA-Z0-9_-]{32,64}$/.test(key)) return reply(400, { message: "Falta la clave del envío." });

    const contactName = text(payload.contactName) || owner.display_name;
    const whatsapp = text(payload.whatsapp) || owner.phone || "";
    const validation = validatePublicationDetails(payload.details);
    const fieldErrors = { ...validation.fieldErrors, ...getPublicationContactErrors(contactName, whatsapp) };
    if (Object.keys(fieldErrors).length) return reply(400, { code: "VALIDATION_ERROR", fieldErrors, message: Object.values(fieldErrors).join(" ") });
    const details = validation.details!;

    const photos = form.getAll("photos").filter((value): value is File => value instanceof File);
    const photoValidation = await validateUploadPhotos(photos);
    if (!photoValidation.ok) return reply(photoValidation.status, { code: "PHOTOS", message: photoValidation.message });
    const uploaded: UploadedPhoto[] = [];
    for (const photo of photos) uploaded.push({ ...(await shrinkUploadPhoto(photo)), originalName: photo.name, category: "" });

    // The reviewer sees where it came from; the text is what the owner dictated, not a web form.
    const sourceText = `Enviado desde Urbanito (Telegram).\n\n${details.title}\n${details.description}`.slice(0, 12_000);
    try {
      const result = await storeDatabaseRequest(
        { id: `publication_${randomUUID().replaceAll("-", "").slice(0, 24)}`, accountId: owner.id, accountEmail: owner.email, contactName,
          whatsapp: normalizePublicationPhone(whatsapp)!, sourceText, details, price: details.price, currency: details.currency, exchangeRate: details.exchangeRate },
        uploaded,
        key,
      );
      return reply(201, { ok: true, ...result });
    } catch (error) {
      if (error instanceof PublicationError) return reply(error.status, { ...(error.code ? { code: error.code } : {}), message: error.message });
      throw error;
    }
  });
}

function parsePayload(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
