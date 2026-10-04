import sharp from "sharp";
import { createHash } from "node:crypto";
import { fitWithin, uploadJpegQuality, uploadMaxSide } from "./photo-resize";

import { minUploadPhotos, maxUploadPhotos, maxPhotoBytes, maxTotalPhotoBytes } from "./photo-upload-limits";
export { minUploadPhotos, maxUploadPhotos, maxPhotoBytes, maxTotalPhotoBytes } from "./photo-upload-limits";
const formats = new Map([["image/jpeg", "jpeg"], ["image/png", "png"], ["image/webp", "webp"]]);

export async function validateUploadPhotos(photos: File[]) {
  const fail = (status: number, message: string) => ({ ok: false as const, status, message });
  if (photos.length < minUploadPhotos) return fail(400, `Agrega al menos ${minUploadPhotos} fotos de la vivienda.`);
  if (photos.length > maxUploadPhotos) return fail(400, `Puedes enviar hasta ${maxUploadPhotos} fotos. No se guardo ninguna; retira las adicionales.`);
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

// Lighter photos (P9): what is stored for a new request is a copy no larger than 1920 px on its
// longest side. Photos already that small are kept byte for byte (the browser usually shrank them).
// Photos stored before this change are never rewritten.
export type StoredUploadPhoto = { bytes: Buffer; type: string; extension: "jpg" | "png" | "webp"; size: number; resized: boolean };

const extensions: Record<string, StoredUploadPhoto["extension"]> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function shrinkUploadPhoto(photo: File): Promise<StoredUploadPhoto> {
  const original = Buffer.from(await photo.arrayBuffer());
  const keep = { bytes: original, type: photo.type, extension: extensions[photo.type] ?? "jpg", size: original.length, resized: false };
  try {
    const metadata = await sharp(original, { limitInputPixels: 40_000_000 }).metadata();
    // EXIF orientations 5-8 swap width and height; the longest side is the same either way.
    if (!fitWithin(metadata.width ?? 0, metadata.height ?? 0).scaled) return keep;
    const bytes = await sharp(original, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: uploadMaxSide, height: uploadMaxSide, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: Math.round(uploadJpegQuality * 100), mozjpeg: true })
      .toBuffer();
    return { bytes, type: "image/jpeg", extension: "jpg", size: bytes.length, resized: true };
  } catch {
    // Already validated; if shrinking fails the photo is kept as it came.
    return keep;
  }
}
