import { distanceKm, isValidCoordinates, type LatLng } from "@/lib/catalog-geo";

// Zones of Santa Cruz de la Sierra, each with the neighborhoods and avenues people search for.
// Picking a zone ("Zona Norte") picks every place inside it; a place can also be picked alone.
// Owners type the zone by hand, so the aliases fold their spellings ("Norte", "Urbari") into one.
// Sources for which zone each place belongs to: the municipal districts (gmsantacruz.gob.bo), and
// real-estate and city guides (aqui.com.bo, boliviaprop.com, uber.com/bo); see PR #16.
export type CityPlace = { name: string; aliases?: string[] };
export type CitySector = { name: string; aliases?: string[]; places: CityPlace[] };

export const santaCruzSectors: CitySector[] = [
  {
    name: "Centro",
    aliases: ["Casco Viejo", "Casco Antiguo", "Primer Anillo", "Zona Centro"],
    places: [{ name: "El Arenal", aliases: ["Arenal"] }, { name: "Callejas" }],
  },
  {
    name: "Zona Norte",
    aliases: ["Norte"],
    places: [
      { name: "Equipetrol", aliases: ["Equipetrol Norte"] },
      { name: "Sirari" },
      { name: "Av. Banzer", aliases: ["Banzer", "Avenida Banzer", "Av. Bánzer"] },
      { name: "Av. Beni", aliases: ["Beni", "Avenida Beni"] },
      { name: "Av. Alemana", aliases: ["Alemana", "Avenida Alemana"] },
      { name: "Av. Busch", aliases: ["Busch", "Avenida Busch"] },
      { name: "Av. San Martín", aliases: ["San Martin", "Av. San Martin", "Avenida San Martín"] },
      { name: "Av. Mutualista", aliases: ["Mutualista", "Avenida Mutualista"] },
      { name: "Cambódromo", aliases: ["Cambodromo"] },
      { name: "Norte Integrado" },
      { name: "Hamacas", aliases: ["Las Hamacas"] },
      { name: "Radial 26" },
      { name: "Canal Isuto", aliases: ["Isuto"] },
      { name: "Satélite Norte", aliases: ["Satelite Norte"] },
      { name: "Los Tusequis", aliases: ["Tusequis"] },
    ],
  },
  {
    name: "Zona Sur",
    aliases: ["Sur"],
    places: [
      { name: "Av. Santos Dumont", aliases: ["Santos Dumont", "Avenida Santos Dumont"] },
      { name: "Saguapac", aliases: ["Saguapac Sur", "Barrio Saguapac"] },
      { name: "El Trompillo", aliases: ["Trompillo"] },
      { name: "Av. Grigotá", aliases: ["Grigota", "Av. Grigota", "Avenida Grigotá"] },
      { name: "Av. Las Américas", aliases: ["Las Americas", "Av. Las Americas"] },
      { name: "Estación Argentina", aliases: ["Estacion Argentina"] },
      { name: "Doble Vía La Guardia", aliases: ["Doble via La Guardia", "La Guardia"] },
      { name: "Los Lotes" },
      { name: "Nuevo Palmar" },
      { name: "El Bajío", aliases: ["Bajio", "El Bajio"] },
    ],
  },
  {
    name: "Zona Este",
    aliases: ["Este"],
    places: [
      { name: "Plan 3000", aliases: ["Plan Tres Mil"] },
      { name: "Barrio 18 de Marzo", aliases: ["18 de Marzo"] },
      { name: "Villa 1ro de Mayo", aliases: ["Villa Primero de Mayo", "1ro de Mayo"] },
      { name: "Pampa de la Isla" },
      { name: "Canal Guapiló", aliases: ["Canal Guapilo", "Guapilo", "Guapilón"] },
      { name: "Av. Virgen de Cotoca", aliases: ["Virgen de Cotoca", "Avenida Virgen de Cotoca"] },
      { name: "Av. Paraguá", aliases: ["Paragua", "Av. Paragua", "Avenida Paraguá"] },
      { name: "Av. Tres Pasos al Frente", aliases: ["Tres Pasos al Frente", "3 Pasos al Frente"] },
      { name: "El Pari", aliases: ["Pari"] },
    ],
  },
  {
    name: "Zona Oeste",
    aliases: ["Oeste"],
    places: [
      { name: "Las Palmas" },
      { name: "Urbarí", aliases: ["Urbari"] },
      { name: "Av. Piraí", aliases: ["Pirai", "Av. Pirai", "Avenida Piraí"] },
      { name: "Av. Roca y Coronado", aliases: ["Roca y Coronado"] },
    ],
  },
  {
    name: "Urubó y Porongo",
    aliases: ["Otro lado del Piraí"],
    places: [
      { name: "Urubó", aliases: ["Urubo", "Urubó Golf", "Urubo Golf"] },
      { name: "Porongo" },
    ],
  },
];

// Santa Cruz has no official line between Norte, Sur, Este and Oeste (its official units are the
// municipal districts), so the zone of a home is the direction it lies in from the main square,
// the way people use the words: Centro inside the 1st ring, Urubó and Porongo across the Piraí,
// and otherwise the quarter of the compass (north is 315° to 45°). A known neighborhood the owner
// typed wins over the point, so "Sirari" is always Zona Norte.
const mainSquare: LatLng = { lat: -17.7834, lng: -63.1821 };
const centroRadiusKm = 1.3;
// The Piraí river runs north-south just west of Las Palmas; Urubó and Porongo are beyond it.
const piraiRiverLng = -63.218;
// Points farther than this are not in the city (a wrong pin); they keep the owner's text.
const cityRadiusKm = 30;

export function sectorFromCoordinates(point: LatLng | null | undefined) {
  if (!isValidCoordinates(point)) return null;
  const km = distanceKm(mainSquare, point);
  if (km > cityRadiusKm) return null;
  if (point.lng < piraiRiverLng) return "Urubó y Porongo";
  if (km <= centroRadiusKm) return "Centro";
  const north = point.lat - mainSquare.lat;
  const east = (point.lng - mainSquare.lng) * Math.cos((mainSquare.lat * Math.PI) / 180);
  const bearing = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
  if (bearing >= 315 || bearing < 45) return "Zona Norte";
  if (bearing < 135) return "Zona Este";
  if (bearing < 225) return "Zona Sur";
  return "Zona Oeste";
}

// Places the owner typed that are not in the list above fall in this group.
export const otherZonesLabel = "Otras zonas";

const zoneSeparator = "|";

function normalizeZone(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\bavenida\b/g, "av")
    .replace(/\s+/g, " ")
    .trim();
}

const zoneByKey = new Map<string, string>();
const sectorByZone = new Map<string, string>();
for (const sector of santaCruzSectors) {
  for (const label of [sector.name, ...(sector.aliases ?? [])]) zoneByKey.set(normalizeZone(label), sector.name);
  sectorByZone.set(sector.name, sector.name);
  for (const place of sector.places) {
    for (const label of [place.name, ...(place.aliases ?? [])]) zoneByKey.set(normalizeZone(label), place.name);
    sectorByZone.set(place.name, sector.name);
  }
}

// The place's (or zone's) name in the list above, or the owner's own text when it is not there.
export function canonicalZone(zone: string) {
  const trimmed = zone.trim();
  return zoneByKey.get(normalizeZone(trimmed)) ?? trimmed;
}

export function isSectorName(name: string) {
  return santaCruzSectors.some((sector) => sector.name === name);
}

// "Zona Norte" for "Sirari" and for "Zona Norte" itself; null for a place outside the list.
export function getZoneSector(zone: string) {
  return sectorByZone.get(canonicalZone(zone)) ?? null;
}

function isPlaceName(zone: string) {
  return sectorByZone.has(zone) && !isSectorName(zone);
}

// Where a home goes in the filter: a known neighborhood keeps its own name and zone; a bare zone
// ("Norte") or a name outside the list goes by its map point, and keeps its text as the place.
export function locateHome(home: { zone: string; coordinates?: LatLng | null }) {
  const zone = canonicalZone(home.zone);
  if (isPlaceName(zone)) return { place: zone, sector: sectorByZone.get(zone) ?? null };
  const sector = sectorFromCoordinates(home.coordinates) ?? sectorByZone.get(zone) ?? null;
  return { place: isSectorName(zone) ? null : zone || null, sector };
}

// The filter keeps several zones and places in one string ("Zona Norte|Urbarí").
export function splitZones(value: string) {
  return Array.from(new Set(value.split(zoneSeparator).map(canonicalZone).filter(Boolean)));
}

export function joinZones(zones: string[]) {
  return splitZones(zones.join(zoneSeparator)).join(zoneSeparator);
}

// A chosen zone covers every home located in it; a chosen place covers only homes with that name.
export function zoneMatches(home: { zone: string; coordinates?: LatLng | null }, selected: string[]) {
  if (selected.length === 0) return true;
  const { place, sector } = locateHome(home);
  return (place !== null && selected.includes(place)) || (sector !== null && selected.includes(sector));
}

export function formatZoneList(zones: string[]) {
  if (zones.length <= 1) return zones[0] ?? "";
  return `${zones.slice(0, -1).join(", ")} o ${zones[zones.length - 1]}`;
}
