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

// The filter keeps several zones and places in one string ("Zona Norte|Urbarí").
export function splitZones(value: string) {
  return Array.from(new Set(value.split(zoneSeparator).map(canonicalZone).filter(Boolean)));
}

export function joinZones(zones: string[]) {
  return splitZones(zones.join(zoneSeparator)).join(zoneSeparator);
}

// A chosen zone covers every place inside it; a chosen place covers only itself.
export function zoneMatches(propertyZone: string, selected: string[]) {
  if (selected.length === 0) return true;
  const zone = canonicalZone(propertyZone);
  const sector = sectorByZone.get(zone);
  return selected.includes(zone) || (sector !== undefined && selected.includes(sector));
}

export function formatZoneList(zones: string[]) {
  if (zones.length <= 1) return zones[0] ?? "";
  return `${zones.slice(0, -1).join(", ")} o ${zones[zones.length - 1]}`;
}
