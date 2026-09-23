import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { validateUploadPhotos } from "../src/lib/upload-photos";
import { createUploadPhotoFixtures } from "./fixtures/upload-photos";

const source = readFileSync("public/images/properties/torre-urbari/01.jpg");

test("upload requires at least five photos and accepts the five and fifteen boundaries", async () => {
  const photos = await createUploadPhotoFixtures(16);
  for (const count of [0, 1, 2, 3, 4]) {
    const result = await validateUploadPhotos(photos.slice(0, count));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.match(result.message, /al menos 5 fotos/);
    }
  }
  for (const count of [5, 15]) assert.equal((await validateUploadPhotos(photos.slice(0, count))).ok, true);
  const result = await validateUploadPhotos(photos);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.match(result.message, /hasta 15 fotos/);
  }
});
test("upload validates actual JPEG, PNG and WebP pixels", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    assert.equal((await validateUploadPhotos(await createUploadPhotoFixtures(5, format))).ok, true);
  }
});
test("upload rejects fake images, MIME mismatch, empty files and truncated pixels", async () => {
  const validPhotos = (await createUploadPhotoFixtures(5)).slice(1);
  for (const photo of [new File(["not an image"], "fake.jpg", { type: "image/jpeg" }), new File([source], "wrong.png", { type: "image/png" }), new File([], "empty.jpg", { type: "image/jpeg" }), new File([source.subarray(0, 200)], "broken.jpg", { type: "image/jpeg" })]) {
    const result = await validateUploadPhotos([...validPhotos, photo]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 415);
  }
});
test("upload rejects duplicate photos even when the minimum count is met", async () => {
  const photos = await createUploadPhotoFixtures(4);
  const result = await validateUploadPhotos([...photos, photos[0]]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.match(result.message, /fotos repetidas/);
  }
});
