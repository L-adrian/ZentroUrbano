import type { Property } from "@/lib/properties";

// "Verificar ubicación" in Mi cuenta: the owner moves the pin to the door and confirms it.
// Only the owner's confirmation sets rental_details.locationConfirmedAt; an admin who types
// coordinates during review never does. Shared by the browser and the route; no database here.

// Same box the admin review accepts: Bolivia.
export const ownerLocationBounds = { minLat: -23, maxLat: -9, minLng: -70, maxLng: -57 } as const;

// Farther than this from the current point, Mi cuenta asks the owner to double-check.
export const ownerLocationWarnMeters = 3000;

export function parseOwnerCoordinates(value: unknown): { lat: number; lng: number } | null {
  if (!value || typeof value !== "object") return null;
  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const { minLat, maxLat, minLng, maxLng } = ownerLocationBounds;
  if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) return null;
  // About 10 cm; more digits would only suggest a precision nobody has.
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(0, Math.round(meters / 10) * 10).toLocaleString("es-BO")} m`;
  return `${(Math.round(meters / 100) / 10).toLocaleString("es-BO")} km`;
}

export function ownerLocationStatus(property: Pick<Property, "locationConfirmedAt">) {
  return property.locationConfirmedAt
    ? { confirmed: true, label: "Ubicación confirmada", detail: "Tu anuncio muestra el punto exacto que confirmaste." }
    : { confirmed: false, label: "Ubicación aproximada", detail: "Tu anuncio muestra un círculo de 300 m. Verifícala para mostrar el punto exacto de tu puerta." };
}

// Links generated from the coordinates follow the new point; a link the owner pasted stays as it was.
export function isGeneratedMapUrl(value: string | null | undefined) {
  return !value || /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value);
}

export function generatedMapUrl(point: { lat: number; lng: number }) {
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
}
