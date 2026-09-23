import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { Property } from "@/lib/properties";

export const SANTA_CRUZ_CENTER: LatLngExpression = [-17.7833, -63.1821];

export const BOLIVIA_MAP_BOUNDS: LatLngBoundsExpression = [
  [-23.2, -69.9],
  [-9.4, -57.1],
];

export const MAP_OVERVIEW_MIN_ZOOM = 10;
export const MAP_DETAIL_MIN_ZOOM = 12;
export const MAP_MAX_ZOOM = 18;
export const MAP_MAX_NATIVE_ZOOM = 18;
export const MAP_DETAIL_ZOOM = 15;
export const MAP_FOCUS_ZOOM = 15;
export const MAP_CLUSTER_MAX_ZOOM = 13;
export const MAP_MARKER_LABEL_MIN_ZOOM = 13;
export const MAP_TILE_KEEP_BUFFER = 2;
export const MAP_WHEEL_PX_PER_ZOOM_LEVEL = 90;

export const MAP_ERROR_TILE_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#f3f3ee"/><path d="M0 128h256M128 0v256" stroke="#e1e1da" stroke-width="1"/></svg>`,
)}`;

export const MAP_TILE_PROVIDERS = [
  ...(process.env.NEXT_PUBLIC_MAP_TILE_URL ? [{
    id: "configured",
    attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    url: process.env.NEXT_PUBLIC_MAP_TILE_URL,
  }] : []),
  {
    id: "openstreetmap",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
] as const;

export function hasValidPropertyCoordinates(property: Pick<Property, "coordinates">) {
  const { lat, lng } = property.coordinates;

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function getGoogleMapsUrl(property: Pick<Property, "coordinates" | "mapUrl">) {
  if (!hasValidPropertyCoordinates(property)) {
    return property.mapUrl;
  }

  const { lat, lng } = property.coordinates;

  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function getGoogleMapsDirectionsUrl(property: Pick<Property, "coordinates" | "mapUrl">) {
  if (!hasValidPropertyCoordinates(property)) return property.mapUrl;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${property.coordinates.lat},${property.coordinates.lng}`);
  return url.toString();
}
