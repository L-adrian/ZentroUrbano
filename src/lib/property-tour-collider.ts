import * as THREE from "three";
import { PackedSplats, SplatMesh } from "@sparkjsdev/spark";
import { TOUR_CLEARANCE } from "./property-tour-motion";

export async function createTourCollider(mesh: SplatMesh, anchor: THREE.Vector3) {
  const source = mesh.packedSplats;
  if (!source?.packedArray) throw new Error("Tour collision data unavailable");
  const candidates = new Float64Array(source.numSplats * 4);
  const sourceIndices = new Uint32Array(source.numSplats);
  let count = 0;
  const center = new THREE.Vector3();
  const scale = mesh.matrixWorld.getMaxScaleOnAxis();
  // Decode once. The local collision window follows the camera; it never limits movement.
  mesh.forEachSplat((index, position, scales, _quaternion, opacity) => {
    if (opacity < 0.5) return;
    center.copy(position).applyMatrix4(mesh.matrixWorld);
    const extent = 8 * Math.max(scales.x, scales.y, scales.z) * scale;
    const i = count * 4;
    candidates[i] = center.x; candidates[i + 1] = center.y; candidates[i + 2] = center.z;
    candidates[i + 3] = (0.6 + TOUR_CLEARANCE + 0.15 + extent) ** 2;
    sourceIndices[count++] = index;
  });
  const packedSplats = new PackedSplats({ splatEncoding: source.splatEncoding });
  const collider = new SplatMesh({ packedSplats, splatEncoding: source.splatEncoding, raycastable: true, minRaycastOpacity: 0.5, enableLod: false });
  await collider.initialized;
  collider.matrixAutoUpdate = false;
  collider.matrixWorld.copy(mesh.matrixWorld);
  const selection: number[] = [];
  const windowCenter = new THREE.Vector3(Infinity, Infinity, Infinity);
  const update = (position: THREE.Vector3) => {
    if (windowCenter.distanceToSquared(position) <= 0.4 ** 2) return;
    selection.length = 0;
    for (let n = 0; n < count; n++) {
      const i = n * 4;
      const x = candidates[i] - position.x, y = candidates[i + 1] - position.y, z = candidates[i + 2] - position.z;
      if (x * x + y * y + z * z <= candidates[i + 3]) selection.push(sourceIndices[n]);
    }
    const packedArray = packedSplats.ensureSplats(selection.length);
    for (let n = 0; n < selection.length; n++) {
      const from = selection[n] * 4, to = n * 4;
      for (let word = 0; word < 4; word++) packedArray[to + word] = source.packedArray![from + word];
    }
    // CPU-only mesh: update raycast counts without uploading/rebuilding the visual model.
    packedSplats.numSplats = collider.numSplats = collider.context.numSplats.value = selection.length;
    windowCenter.copy(position);
  };
  update(anchor);
  return { mesh: collider, update, dispose: () => collider.dispose() };
}
