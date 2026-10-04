import type { Property } from "@/lib/properties";

// Distances, map areas and nearby homes for the catalog. Everything here is straight-line
// ("en línea recta") and approximate: never a route or a travel time.

export type LatLng = { lat: number; lng: number };
export type MapArea = { south: number; west: number; north: number; east: number };

export type KnownPlace = {
  id: string;
  name: string;
  // Words people write in the search box ("uagrm", "la u"), already without accents.
  aliases: string[];
  coordinates: LatLng;
  // Where the coordinates were checked (authoritative source or data in this repository).
  source: string;
};

// Well-known places for "Cerca de". Only places whose coordinates were verified against an
// authoritative source go here. When this list was written (2026-10-04) no source could be
// reached from the build environment (OpenStreetMap, Wikidata and Wikipedia were blocked), so
// it starts empty and the "Cerca de" selector stays hidden. Add a place with its source, for
// example: { id: "uagrm", name: "UAGRM", aliases: ["uagrm"], coordinates: {...}, source: "..." }.
export const knownPlaces: KnownPlace[] = [];

const earthRadiusKm = 6371.0088;

export function distanceKm(from: LatLng, to: LatLng) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

// "~1,2 km", "~800 m", "~12 km".
export function formatApproxKm(km: number) {
  if (!Number.isFinite(km) || km < 0) return null;
  if (km < 1) return `~${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `~${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 1 }).format(rounded)} km`;
}

// "a ~1,2 km en línea recta"; with a place, "a ~1,2 km de UAGRM en línea recta".
export function formatApproxDistance(km: number, from?: string) {
  const distance = formatApproxKm(km);
  if (!distance) return null;
  return `a ${distance}${from ? ` de ${from}` : ""} en línea recta`;
}

export function getKnownPlace(id: string, places: KnownPlace[] = knownPlaces) {
  return places.find((place) => place.id === id);
}

export function isValidCoordinates(point: LatLng | null | undefined): point is LatLng {
  return Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      Math.abs(point.lat) <= 90 &&
      Math.abs(point.lng) <= 180,
  );
}

export function isInsideArea(point: LatLng, area: MapArea) {
  return (
    isValidCoordinates(point) &&
    point.lat >= area.south &&
    point.lat <= area.north &&
    point.lng >= area.west &&
    point.lng <= area.east
  );
}

// URL form: "south,west,north,east" with 4 decimals (about 10 m).
export function formatMapArea(area: MapArea) {
  return [area.south, area.west, area.north, area.east].map((value) => value.toFixed(4)).join(",");
}

export function parseMapArea(value: string | null | undefined): MapArea | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [south, west, north, east] = parts;
  if (south >= north || west >= east || Math.abs(south) > 90 || Math.abs(north) > 90 || Math.abs(west) > 180 || Math.abs(east) > 180) {
    return null;
  }
  return { south, west, north, east };
}

export function roundMapArea(area: MapArea): MapArea {
  return parseMapArea(formatMapArea(area)) ?? area;
}

// Center of a zone = average point of its listings.
export function getZoneCenters(properties: Array<Pick<Property, "zone" | "coordinates">>) {
  const sums = new Map<string, { lat: number; lng: number; count: number }>();
  for (const property of properties) {
    if (!property.zone || !isValidCoordinates(property.coordinates)) continue;
    const sum = sums.get(property.zone) ?? { lat: 0, lng: 0, count: 0 };
    sum.lat += property.coordinates.lat;
    sum.lng += property.coordinates.lng;
    sum.count += 1;
    sums.set(property.zone, sum);
  }
  return new Map(Array.from(sums, ([zone, sum]) => [zone, { lat: sum.lat / sum.count, lng: sum.lng / sum.count }]));
}

export const nearbyListingsMin = 3;
export const nearbyListingsMax = 6;
export const nearbyListingsMaxKm = 15;

// Homes from other zones, closest to the zone's center first. Empty when fewer than 3 are close,
// so a zone page never shows a "Cerca de" block with one lonely home from the other side of town.
export function getNearbyListings<T extends Pick<Property, "zone" | "coordinates">>(
  candidates: T[],
  zone: string,
  center: LatLng | undefined,
  { min = nearbyListingsMin, max = nearbyListingsMax, maxKm = nearbyListingsMaxKm } = {},
) {
  if (!zone || !center) return [];
  const nearby = candidates
    .filter((property) => property.zone !== zone && isValidCoordinates(property.coordinates))
    .map((property) => ({ property, distanceKm: distanceKm(center, property.coordinates) }))
    .filter((item) => item.distanceKm <= maxKm)
    .sort((first, second) => first.distanceKm - second.distanceKm)
    .slice(0, max);
  return nearby.length >= min ? nearby : [];
}
