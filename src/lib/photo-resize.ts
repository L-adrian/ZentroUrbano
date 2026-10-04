// Lighter photos (P9): the browser shrinks each photo before sending it and the server keeps that
// smaller version. Shared numbers, so the browser and the server agree.

export const uploadMaxSide = 1920;
export const uploadJpegQuality = 0.82;
// Small JPEGs are sent as they are; re-encoding them again would only lose quality.
export const keepJpegUnderBytes = 1_500_000;
// Phones take photos larger than the 10 MB upload limit; the browser can still shrink them.
export const maxSelectedPhotoBytes = 30 * 1024 * 1024;

export function fitWithin(width: number, height: number, maxSide = uploadMaxSide) {
  const longest = Math.max(width, height);
  if (!(longest > maxSide)) return { width, height, scaled: false };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scaled: true };
}

export function needsShrinking(file: { type: string; size: number }, width: number, height: number) {
  return Math.max(width, height) > uploadMaxSide || file.type !== "image/jpeg" || file.size > keepJpegUnderBytes;
}

export function shrunkFileName(name: string) {
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, "") || "foto";
  return `${base}.jpg`;
}
