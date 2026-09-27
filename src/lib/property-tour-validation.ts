import { gunzipSync } from "node:zlib";
import type { TourFile } from "./property-tour-contract";

export const MAX_TOUR_FILE = 10 * 1024 * 1024;
export const MAX_TOUR_UPLOAD = 21 * 1024 * 1024;

export function validateTourAsset(name: TourFile, bytes: Buffer) {
  if (bytes.length < 20 || bytes.length > MAX_TOUR_FILE) throw new Error("Cada archivo SPZ debe pesar menos de 10 MB.");
  let raw: Buffer;
  try { raw = gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 }); }
  catch { throw new Error("Archivo SPZ comprimido inválido."); }
  if (raw.length < 16 || raw.readUInt32LE(0) !== 0x5053474e || ![2, 3].includes(raw.readUInt32LE(4))) throw new Error("Formato SPZ no compatible.");
  const points = raw.readUInt32LE(8);
  if (points < 1 || points > (name === "mobile.spz" ? 150000 : 600000) || raw.length < 16 + points * 9) throw new Error("El archivo SPZ supera la resolución permitida o está incompleto.");
  return points;
}

export async function limitedTourForm(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (!type.startsWith("multipart/form-data; boundary=")) throw new Error("Usa el formulario de carga del recorrido.");
  if (!request.body || Number(request.headers.get("content-length") || 0) > MAX_TOUR_UPLOAD) throw new Error("Carga demasiado grande (máximo 21 MB).");
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_TOUR_UPLOAD) { await reader.cancel(); throw new Error("Carga demasiado grande (máximo 21 MB)."); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Response(Buffer.concat(parts), { headers: { "Content-Type": type } }).formData();
}
