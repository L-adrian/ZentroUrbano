export const TOUR_DISCLAIMER = "Recreación con IA. Puede diferir de la vivienda real e inventar zonas no fotografiadas. Sin medidas verificadas.";
export const TOUR_FILES = ["world.spz", "mobile.spz"] as const;
export type TourFile = typeof TOUR_FILES[number];
export type TourManifest = {
  scope: string;
  model: "marble-1.1";
  metricScale: number;
  groundOffset: number;
  photoIndices: number[];
};
export type PublicTour = TourManifest & {
  slug: string;
  revision: string;
  assetBase: string;
  photos: { src: string; label: string }[];
};
export type AdminTour = {
  slug: string;
  title: string;
  revision: string;
  status: string;
  scope: string;
  opens: number;
  errors: number;
  contacts: number;
};
export const validTourSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 180;
export const validTourRevision = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export const validTourFile = (value: string): value is TourFile => TOUR_FILES.some(name => name === value);

export function parseTourManifest(value: unknown, photoCount: number): TourManifest {
  if (!value || typeof value !== "object") throw new Error("Manifiesto inválido.");
  const data = value as Record<string, unknown>;
  if (typeof data.scope !== "string" || !data.scope.trim() || data.scope.length > 100 || /[\x00-\x1f<>]/.test(data.scope)) throw new Error("Indica el ambiente del recorrido (máximo 100 caracteres).");
  if (data.model !== "marble-1.1") throw new Error("Modelo de recorrido no compatible.");
  if (typeof data.metricScale !== "number" || !Number.isFinite(data.metricScale) || data.metricScale <= 0 || data.metricScale > 100) throw new Error("Escala inválida.");
  if (typeof data.groundOffset !== "number" || !Number.isFinite(data.groundOffset) || Math.abs(data.groundOffset) > 100) throw new Error("Altura inválida.");
  if (!Array.isArray(data.photoIndices) || data.photoIndices.length < 2 || data.photoIndices.length > 8 || new Set(data.photoIndices).size !== data.photoIndices.length || data.photoIndices.some(i => !Number.isInteger(i) || i < 0 || i >= photoCount)) throw new Error("Selecciona entre 2 y 8 fotos originales de esta ficha.");
  return { scope: data.scope.trim(), model: data.model, metricScale: data.metricScale, groundOffset: data.groundOffset, photoIndices: data.photoIndices };
}

export function tourDecision(value: unknown, revision: string) {
  const input = value as Record<string, unknown> | null;
  if (!input || input.revision !== revision) throw new Error("El recorrido cambió. Actualiza antes de continuar.");
  if (input.action !== "publish" && input.action !== "hide") throw new Error("Decisión inválida.");
  if (input.action === "publish" && (input.ownerApproved !== true || input.reviewed !== true)) throw new Error("Confirma la revisión visual y la autorización del propietario.");
  return input.action;
}
