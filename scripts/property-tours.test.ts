import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { parseTourManifest, tourDecision, validTourFile, validTourRevision, validTourSlug } from "../src/lib/property-tour-contract";
import { limitedTourForm, MAX_TOUR_UPLOAD, validateTourAsset } from "../src/lib/property-tour-validation";
import { sameOriginAdminMutation } from "../src/lib/admin-access";
import { tourRenderQuality } from "../src/lib/property-tour-quality";
import { TourMotion, TOUR_DRAG_SPEED, tourKeyDirection } from "../src/lib/property-tour-motion";
import * as THREE from "three";
import { PackedSplats, SplatMesh } from "@sparkjsdev/spark";
import { createTourCollider } from "../src/lib/property-tour-collider";

test("Collision mesh retains nearby and large opaque splats without changing the rendered model", async () => {
  const packed = new PackedSplats();
  for (const [x, scale, opacity] of [[0, 0.1, 1], [100, 0.1, 1], [0, 0.1, 0.1], [2, 0.5, 1]]) {
    packed.pushSplat(new THREE.Vector3(x, 0, 0), new THREE.Vector3().setScalar(scale), new THREE.Quaternion(), opacity, new THREE.Color());
  }
  const mesh = new SplatMesh({ packedSplats: packed });
  await mesh.initialized;
  mesh.position.set(5, 1, -8); mesh.scale.setScalar(1.8); mesh.rotation.x = Math.PI; mesh.updateMatrixWorld(true);
  const before = packed.packedArray!.slice();
  const collider = await createTourCollider(mesh, mesh.position);
  try {
    assert.equal(collider.mesh.numSplats, 2);
    assert.equal(collider.mesh.context.numSplats.value, 2);
    assert.deepEqual(collider.mesh.matrixWorld.elements, mesh.matrixWorld.elements);
    assert.deepEqual(collider.mesh.packedSplats!.splatEncoding, packed.splatEncoding);
    assert.deepEqual(collider.mesh.packedSplats!.packedArray!.slice(0, 8), new Uint32Array([...before.slice(0, 4), ...before.slice(12, 16)]));
    collider.update(new THREE.Vector3(185, 1, -8));
    assert.equal(collider.mesh.numSplats, 1, "Collision selection must follow the camera far beyond the initial position");
    assert.deepEqual(collider.mesh.packedSplats!.packedArray!.slice(0, 4), before.slice(4, 8));
    collider.update(new THREE.Vector3(500, 1, -8));
    assert.equal(collider.mesh.numSplats, 0, "Empty space must not retain obstacles from the previous room");
    collider.update(mesh.position);
    assert.equal(collider.mesh.numSplats, 2, "Returning to the start restores its obstacle selection");
    assert.deepEqual(packed.packedArray, before);
    assert.equal(packed.numSplats, 4);
  } finally { collider.dispose(); mesh.dispose(); }
});

test("Mouse and touch use the same natural scene-drag direction", () => {
  assert.equal(TOUR_DRAG_SPEED, -0.3);
  assert.equal(tourKeyDirection("KeyW"), "forward");
  assert.equal(tourKeyDirection("ArrowLeft"), "left");
  assert.equal(tourKeyDirection("Escape"), undefined);
});

test("Continuous movement covers the same distance at 30, 60 and 120 Hz", () => {
  const distances = [30, 60, 120].map(fps => {
    const motion = new TourMotion(); motion.start("forward");
    let total = 0;
    for (let frame = 0; frame < fps; frame++) {
      const step = motion.step(1 / fps)!;
      assert.equal(step.right, 0);
      assert.ok(step.forward > 0 && step.forward < 0.025);
      total += step.forward;
    }
    return total;
  });
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.000001);
  assert.ok(distances.every(distance => distance > 0.6 && distance < 0.65));
});

test("Holding WASD and holding a button produce identical motion without key-repeat", () => {
  const keyboard = new TourMotion(), button = new TourMotion();
  keyboard.press("KeyW", "forward"); button.start("forward");
  for (let frame = 0; frame < 60; frame++) {
    if (frame % 3 === 0) keyboard.press("KeyW", "forward");
    assert.deepEqual(keyboard.step(1 / 60), button.step(1 / 60));
  }
  keyboard.release("KeyW"); button.release();
  for (let frame = 0; frame < 60; frame++) assert.deepEqual(keyboard.step(1 / 60), button.step(1 / 60));
  assert.equal(keyboard.step(1 / 60), null);
});

test("Diagonal movement is normalized; releasing one source keeps other keys held", () => {
  const straight = new TourMotion(), diagonal = new TourMotion();
  straight.press("KeyW", "forward");
  diagonal.press("KeyW", "forward"); diagonal.press("KeyD", "right");
  for (let frame = 0; frame < 60; frame++) {
    const a = straight.step(1 / 60)!, b = diagonal.step(1 / 60)!;
    assert.ok(Math.abs(a.forward - Math.hypot(b.right, b.forward)) < 0.000001);
  }
  diagonal.release("KeyD"); diagonal.start("left"); diagonal.cancel("button");
  for (let frame = 0; frame < 60; frame++) diagonal.step(1 / 60);
  const forward = diagonal.step(1 / 60)!;
  assert.ok(forward.forward > 0.01 && Math.abs(forward.right) < 0.0001);
  diagonal.press("KeyS", "back");
  for (let frame = 0; frame < 60; frame++) diagonal.step(1 / 60);
  assert.equal(diagonal.step(1 / 60), null);
});

test("Cancelled gestures and blur stop immediately; accessible clicks are bounded animations", () => {
  const motion = new TourMotion(); motion.start("forward"); motion.step(0.04); motion.cancel("button");
  assert.equal(motion.step(0.04), null);
  motion.press("KeyA", "left"); motion.step(0.04); motion.cancel();
  assert.equal(motion.step(0.04), null);
  motion.pulse("right");
  let distance = 0;
  for (let frame = 0; frame < 120; frame++) distance += motion.step(1 / 60)?.right ?? 0;
  assert.ok(distance > 0.08 && distance < 0.11);
  assert.equal(motion.step(0.04), null);
  assert.equal(motion.step(NaN), null);
  assert.equal(motion.step(-1), null);
  motion.start("forward");
  assert.ok(motion.step(10)!.forward < 0.033);
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
