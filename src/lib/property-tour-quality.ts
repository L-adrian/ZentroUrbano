export function tourRenderQuality(quality: string, saveData: boolean, devicePixelRatio: number) {
  // A small screen does not imply a low-detail model; respect explicit data saving only.
  const light = quality === "mobile" || (quality === "auto" && saveData);
  const density = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    fileName: light ? "mobile.spz" : "world.spz",
    pixelRatio: Math.min(density, light ? 1.5 : 2),
  };
}
