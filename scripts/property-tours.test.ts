import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { parseTourManifest, tourDecision, validTourFile, validTourRevision, validTourSlug } from "../src/lib/property-tour-contract";
import { limitedTourForm, MAX_TOUR_UPLOAD, validateTourAsset } from "../src/lib/property-tour-validation";
import { sameOriginAdminMutation } from "../src/lib/admin-access";

const manifest = { scope: "Cocina y estar", model: "marble-1.1", metricScale: 1.83, groundOffset: 1.54, photoIndices: [1, 4, 10, 11] };
test("Tour manifest only exposes known fields and original property photos", () => {
  assert.deepEqual(parseTourManifest({ ...manifest, apiKey: "secret", url: "https://evil.invalid" }, 12), manifest);
  for (const change of [{ photoIndices: [0, 99] }, { photoIndices: [0, 0] }, { metricScale: Infinity }, { groundOffset: NaN }, { model: "other" }, { scope: "<script>" }]) assert.throws(() => parseTourManifest({ ...manifest, ...change }, 12));
});
test("Publication requires fresh revision, explicit review and owner consent", () => {
  assert.equal(tourDecision({ action: "publish", revision: "a", reviewed: true, ownerApproved: true }, "a"), "publish");
  assert.equal(tourDecision({ action: "hide", revision: "a" }, "a"), "hide");
  for (const input of [null, {}, { action: "publish", revision: "a" }, { action: "publish", revision: "a", reviewed: true, ownerApproved: "true" }, { action: "hide", revision: "old" }]) assert.throws(() => tourDecision(input, "a"));
});
test("Asset names and route identifiers cannot escape the tour", () => {
  assert.ok(validTourSlug("departamento-equipetrol-3000"));
  assert.ok(validTourRevision("24a3c2eb-394e-4972-906a-22271b32bdbd"));
  for (const value of ["../world.spz", "world.spz/../key", "%2fsecret", "scene.json", "api-key", "https://host/world.spz"]) assert.equal(validTourFile(value), false);
  assert.equal(validTourSlug("../admin"), false);
  assert.equal(validTourRevision("../revision"), false);
});
test("SPZ validates compression, header, resolution and file size", () => {
  const raw = Buffer.alloc(16 + 19 * 2); raw.writeUInt32LE(0x5053474e, 0); raw.writeUInt32LE(2, 4); raw.writeUInt32LE(2, 8);
  assert.equal(validateTourAsset("world.spz", gzipSync(raw)), 2);
  assert.throws(() => validateTourAsset("world.spz", Buffer.from("not a splat")));
  raw.writeUInt32LE(700000, 8); assert.throws(() => validateTourAsset("world.spz", gzipSync(raw)));
  raw.writeUInt32LE(160000, 8); assert.throws(() => validateTourAsset("mobile.spz", gzipSync(raw)));
});
test("Uploads have a streaming size limit and cannot bypass same-origin checks", async () => {
  const form = new FormData(); form.set("manifest", new Blob([JSON.stringify(manifest)]), "manifest.json");
  const request = new Request("https://zentro.test/admin/recorridos/test/upload", { method: "POST", headers: { origin: "https://zentro.test" }, body: form });
  assert.ok(sameOriginAdminMutation(request, "multipart/form-data"));
  assert.ok((await limitedTourForm(request)).get("manifest") instanceof File);
  const foreign = new Request("https://zentro.test/admin", { headers: { origin: "https://evil.test", "content-type": "application/json" } });
  assert.equal(sameOriginAdminMutation(foreign), false);
  const tooLarge = new Request("https://zentro.test/admin", { method: "POST", body: "x", headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(MAX_TOUR_UPLOAD + 1) } });
  await assert.rejects(limitedTourForm(tooLarge));
});
