import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { parseTourManifest, tourDecision, validTourFile, validTourRevision, validTourSlug } from "../src/lib/property-tour-contract";
import { limitedTourForm, MAX_TOUR_UPLOAD, validateTourAsset } from "../src/lib/property-tour-validation";
import { sameOriginAdminMutation } from "../src/lib/admin-access";
import { tourRenderQuality } from "../src/lib/property-tour-quality";
import { TourMotion, tourDragSpeed } from "../src/lib/property-tour-motion";

test("Touch drags the scene while the mouse keeps its existing direction", () => {
  assert.equal(tourDragSpeed("touch"), -0.3);
  assert.equal(tourDragSpeed("mouse"), 0.3);
  assert.equal(tourDragSpeed("pen"), 0.3);
});

test("Directional buttons accelerate continuously independent of frame rate", () => {
  const distances = [30, 60, 120].map(fps => {
    const motion = new TourMotion(); motion.start("forward");
    let total = 0;
    for (let frame = 0; frame < fps; frame++) {
      const step = motion.step(1 / fps)!;
      assert.equal(step.direction, "forward");
      assert.ok(step.distance > 0 && step.distance < 0.025);
      total += step.distance;
    }
    return total;
  });
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.007);
  assert.ok(distances.every(distance => distance > 0.4 && distance < 0.45));
});

test("Quick taps animate one small step; release and cancellation cannot leave movement stuck", () => {
  const motion = new TourMotion(); motion.start("left"); motion.release();
  let distance = 0;
  for (let i = 0; i < 120; i++) distance += motion.step(1 / 60)?.distance ?? 0;
  assert.ok(Math.abs(distance - 0.1) < 0.0002);
  assert.equal(motion.step(1 / 60), null);
  motion.start("right");
  for (let i = 0; i < 60; i++) motion.step(1 / 60);
  motion.release();
  let coast = 0;
  for (let i = 0; i < 120; i++) coast += motion.step(1 / 60)?.distance ?? 0;
  assert.ok(coast > 0 && coast < 0.028);
  motion.start("back"); motion.cancel();
  assert.equal(motion.step(1), null);
  motion.start("forward");
  assert.equal(motion.step(NaN), null);
  assert.equal(motion.step(-1), null);
  assert.ok(motion.step(10)!.distance < 0.025);
  motion.start("back");
  assert.equal(motion.step(1 / 60)!.direction, "back");
});

test("Automatic tours keep full detail on high-density phones without data saving", () => {
  assert.deepEqual(tourRenderQuality("auto", false, 3), { fileName: "world.spz", pixelRatio: 2 });
  assert.deepEqual(tourRenderQuality("auto", false, 1), { fileName: "world.spz", pixelRatio: 1 });
  assert.deepEqual(tourRenderQuality("auto", true, 3), { fileName: "mobile.spz", pixelRatio: 1.5 });
  assert.deepEqual(tourRenderQuality("high", true, 3), { fileName: "world.spz", pixelRatio: 2 });
  assert.deepEqual(tourRenderQuality("mobile", false, 3), { fileName: "mobile.spz", pixelRatio: 1.5 });
  for (const density of [0, -1, NaN, Infinity]) assert.equal(tourRenderQuality("auto", false, density).pixelRatio, 1);
});

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
