import { readFileSync } from "node:fs";
import sharp from "sharp";

export async function createUploadPhotoFixtures(count = 5, format: "jpeg" | "png" | "webp" = "jpeg") {
  const source = readFileSync("public/images/properties/torre-urbari/01.jpg");
  const photos: File[] = [];
  for (let index = 0; index < count; index++) {
    const bytes = index === 0 && format === "jpeg"
      ? source
      : await sharp(source).resize(120 + index, 80).toFormat(format).toBuffer();
    const extension = format === "jpeg" ? "jpg" : format;
    photos.push(new File([new Uint8Array(bytes)], `${String(index + 1).padStart(2, "0")}.${extension}`, { type: `image/${format}` }));
  }
  return photos;
}
