import * as THREE from "three";
import { PackedSplats, SplatMesh } from "@sparkjsdev/spark";
import { TOUR_CLEARANCE, TOUR_RADIUS } from "./property-tour-motion";

export async function createTourCollider(mesh: SplatMesh, anchor: THREE.Vector3) {
  const source = mesh.packedSplats;
  if (!source?.packedArray) throw new Error("Tour collision data unavailable");
  const indices: number[] = [];
  const center = new THREE.Vector3();
  const scale = mesh.matrixWorld.getMaxScaleOnAxis();
  // Keep every opaque Gaussian that could intersect any allowed camera ray, including its extent.
  // The render mesh stays untouched; only the CPU collision mesh is reduced, once at load time.
  mesh.forEachSplat((index, position, scales, _quaternion, opacity) => {
    if (opacity < 0.5) return;
    center.copy(position).applyMatrix4(mesh.matrixWorld);
    const extent = 8 * Math.max(scales.x, scales.y, scales.z) * scale;
    if (center.distanceTo(anchor) <= TOUR_RADIUS + TOUR_CLEARANCE + 0.15 + extent) indices.push(index);
  });
  const packedSplats = new PackedSplats({ splatEncoding: source.splatEncoding });
  const packedArray = packedSplats.ensureSplats(indices.length);
  indices.forEach((index, target) => packedArray.set(source.packedArray!.subarray(index * 4, index * 4 + 4), target * 4));
  packedSplats.numSplats = indices.length;
  const collider = new SplatMesh({ packedSplats, splatEncoding: source.splatEncoding, raycastable: true, minRaycastOpacity: 0.5, enableLod: false });
  await collider.initialized;
  collider.matrixAutoUpdate = false;
  collider.matrixWorld.copy(mesh.matrixWorld);
  // This mesh is CPU-only, so its raycast count is set without a renderer update.
  collider.numSplats = packedSplats.numSplats;
  collider.context.numSplats.value = collider.numSplats;
  return collider;
}
