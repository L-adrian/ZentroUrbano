import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { validateUploadPhotos } from "../src/lib/upload-photos";

const source = readFileSync("public/images/properties/torre-urbari/01.jpg");
const jpg = () => new File([source], "photo.jpg", { type: "image/jpeg" });
test("upload validates actual JPEG, PNG and WebP pixels", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    const bytes = await sharp(source).resize(120, 80).toFormat(format).toBuffer();
    assert.equal((await validateUploadPhotos([new File([bytes], `photo.${format}`, { type: `image/${format}` })])).ok, true);
  }
});
test("upload rejects fake images, MIME mismatch, empty files and truncated pixels", async () => {
  for (const photo of [new File(["not an image"], "fake.jpg", { type: "image/jpeg" }), new File([source], "wrong.png", { type: "image/png" }), new File([], "empty.jpg", { type: "image/jpeg" }), new File([source.subarray(0, 200)], "broken.jpg", { type: "image/jpeg" })]) {
    assert.equal((await validateUploadPhotos([photo])).ok, false);
  }
});
test("upload rejects duplicates and never silently discards the sixteenth photo", async () => {
  assert.equal((await validateUploadPhotos([jpg(), jpg()])).ok, false);
  const tooMany = await validateUploadPhotos(Array.from({ length: 16 }, jpg));
  assert.equal(tooMany.ok, false);
  if (!tooMany.ok) assert.equal(tooMany.status, 400);
});
