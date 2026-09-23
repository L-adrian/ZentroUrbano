import sharp from "sharp";
import { createHash } from "node:crypto";

export const maxUploadPhotos = 15;
export const maxPhotoBytes = 10 * 1024 * 1024;
export const maxTotalPhotoBytes = 60 * 1024 * 1024;
const formats = new Map([["image/jpeg", "jpeg"], ["image/png", "png"], ["image/webp", "webp"]]);

export async function validateUploadPhotos(photos: File[]) {
  const fail = (status: number, message: string) => ({ ok: false as const, status, message });
  if (!photos.length) return fail(400, "Agrega al menos una foto de la vivienda.");
  if (photos.length > maxUploadPhotos) return fail(400, "Puedes enviar hasta 15 fotos. No se guardo ninguna; retira las adicionales.");
  if (photos.some(photo => photo.size > maxPhotoBytes) || photos.reduce((sum, photo) => sum + photo.size, 0) > maxTotalPhotoBytes) return fail(413, "Maximo 10 MB por foto y 60 MB en total.");
  const fingerprints = new Set<string>();
  for (const photo of photos) {
    if (!formats.has(photo.type) || !photo.size) return fail(415, "Solo se permiten fotos JPG, PNG o WebP validas.");
    try {
      const bytes = Buffer.from(await photo.arrayBuffer());
      const fingerprint = createHash("sha256").update(bytes).digest("hex");
      if (fingerprints.has(fingerprint)) return fail(400, "Hay fotos repetidas. Retira los duplicados antes de enviar.");
      fingerprints.add(fingerprint);
      const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning" });
      const metadata = await image.metadata();
      if (metadata.format !== formats.get(photo.type) || (metadata.pages ?? 1) > 1) return fail(415, "Una imagen no coincide con su formato o es animada. Usa fotos JPG, PNG o WebP.");
      // Decode pixels too: a valid header does not guarantee a readable image.
      await image.resize(1, 1).raw().toBuffer();
    } catch { return fail(415, "No pudimos leer una foto o supera 40 megapixeles. Exportala de nuevo como JPG, PNG o WebP."); }
  }
  return { ok: true as const };
}
