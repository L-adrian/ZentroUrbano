// Zones and neighborhoods of Santa Cruz de la Sierra that people search for. The filter shows all
// of them, with the number of homes in each, so a zone with no listings yet is still findable.
// Owners type the zone by hand, so the aliases fold their spellings ("Norte", "Urbari") into one.
export type CityZone = { name: string; aliases?: string[] };

export const santaCruzZones: CityZone[] = [
  { name: "Centro", aliases: ["Casco Viejo", "Casco Antiguo", "Primer Anillo"] },
  { name: "Equipetrol", aliases: ["Equipetrol Norte"] },
  { name: "Sirari" },
  { name: "Las Palmas" },
  { name: "Urbarí", aliases: ["Urbari"] },
  { name: "Urubó", aliases: ["Urubo", "Urubó Golf", "Urubo Golf"] },
  { name: "Porongo" },
  { name: "Zona Norte", aliases: ["Norte"] },
  { name: "Norte Integrado" },
  { name: "Satélite Norte", aliases: ["Satelite Norte"] },
  { name: "Av. Banzer", aliases: ["Banzer", "Avenida Banzer"] },
  { name: "Av. Beni", aliases: ["Beni", "Avenida Beni"] },
  { name: "Av. Alemana", aliases: ["Alemana", "Avenida Alemana"] },
  { name: "Av. Busch", aliases: ["Busch", "Avenida Busch"] },
  { name: "Av. Piraí", aliases: ["Pirai", "Avenida Piraí"] },
  { name: "Av. Santos Dumont", aliases: ["Santos Dumont"] },
  { name: "Mutualista", aliases: ["Av. Mutualista", "Avenida Mutualista"] },
  { name: "Hamacas", aliases: ["Las Hamacas"] },
  { name: "Cambódromo", aliases: ["Cambodromo"] },
  { name: "Canal Isuto" },
  { name: "Canal Guapiló", aliases: ["Canal Guapilo", "Guapilo", "Guapilón"] },
  { name: "Radial 26" },
  { name: "El Trompillo", aliases: ["Trompillo"] },
  { name: "Zona Sur", aliases: ["Sur"] },
  { name: "Zona Este", aliases: ["Este"] },
  { name: "Zona Oeste", aliases: ["Oeste"] },
  { name: "Doble Vía La Guardia", aliases: ["Doble via La Guardia", "La Guardia"] },
  { name: "Saguapac Sur" },
  { name: "Barrio 18 de Marzo", aliases: ["18 de Marzo"] },
  { name: "Los Lotes" },
  { name: "Plan 3000", aliases: ["Plan Tres Mil"] },
  { name: "Villa 1ro de Mayo", aliases: ["Villa Primero de Mayo", "1ro de Mayo"] },
  { name: "Pampa de la Isla" },
  { name: "El Bajío", aliases: ["Bajio", "El Bajio"] },
  { name: "Remanso" },
];

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
for (const zone of santaCruzZones) {
  for (const label of [zone.name, ...(zone.aliases ?? [])]) zoneByKey.set(normalizeZone(label), zone.name);
}

// The zone's name in the list above, or the owner's own text when it is not there.
export function canonicalZone(zone: string) {
  const trimmed = zone.trim();
  return zoneByKey.get(normalizeZone(trimmed)) ?? trimmed;
}

// The filter keeps several zones in one string ("Equipetrol|Sirari").
export function splitZones(value: string) {
  return Array.from(new Set(value.split(zoneSeparator).map(canonicalZone).filter(Boolean)));
}

export function joinZones(zones: string[]) {
  return splitZones(zones.join(zoneSeparator)).join(zoneSeparator);
}

export function zoneMatches(propertyZone: string, selected: string[]) {
  return selected.length === 0 || selected.includes(canonicalZone(propertyZone));
}

export function formatZoneList(zones: string[]) {
  if (zones.length <= 1) return zones[0] ?? "";
  return `${zones.slice(0, -1).join(", ")} o ${zones[zones.length - 1]}`;
}
