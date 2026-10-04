import {
  convertPrice,
  getPropertyExchangeRate,
  getPropertyPriceInCurrency,
  parseCurrencyAmount,
  type DisplayCurrency,
} from "@/lib/currency";
import {
  distanceKm,
  formatMapArea,
  getKnownPlace,
  isInsideArea,
  knownPlaces,
  parseMapArea,
  type KnownPlace,
  type MapArea,
} from "@/lib/catalog-geo";
import { getAvailabilityState, getEntryCost, getMonthlyCost } from "@/lib/listing-summary";
import type { Operation, Property, PropertyType } from "@/lib/properties";
import {
  compareWithZoneAverage,
  getZoneAverages,
  isBelowZoneAverage,
  type ZoneAverage,
  type ZoneAverageComparison,
} from "@/lib/zone-prices";

export type PropertySearchEvaluation = {
  matches: boolean;
  score: number;
  hasIntent: boolean;
};

type SearchAmenity =
  | "garage"
  | "pets"
  | "furnished"
  | "security"
  | "pool"
  | "patio"
  | "grill"
  | "elevator";

type SearchIntent =
  | { kind: "place"; indexes: number[]; place: KnownPlace }
  | { kind: "monoambiente"; indexes: number[] }
  | { kind: "type"; indexes: number[]; type: PropertyType }
  | { kind: "operation"; indexes: number[]; operation: Operation }
  | { kind: "bedrooms"; indexes: number[]; count: number }
  | { kind: "amenity"; indexes: number[]; amenity: SearchAmenity }
  | { kind: "price"; indexes: number[]; amount: number; currency: DisplayCurrency };

type QueryWord = { text: string; tokenIndexes: number[] };

type ParsedSearchQuery = {
  normalized: string;
  tokens: string[];
  words: QueryWord[];
  meaningfulTokens: string[];
  consumedIndexes: Set<number>;
  // Free words that no published listing has anywhere ("No usamos: ..."); they do not filter.
  ignoredIndexes: Set<number>;
  intents: SearchIntent[];
  propertyType?: PropertyType;
  operation?: Operation;
  bedroomCount?: number;
  monoambiente: boolean;
  amenities: SearchAmenity[];
  maxPriceUsd?: number;
  maxPriceBob?: number;
};

type PropertySearchOptions = {
  // Currency for amounts written without one ("hasta 3000").
  currency?: DisplayCurrency;
  // Well-known places the text can name ("cerca de la UAGRM").
  places?: KnownPlace[];
};

const stopWords = new Set([
  "a",
  "al",
  "algo",
  "busca",
  "buscar",
  "busco",
  "cerca",
  "con",
  "de",
  "del",
  "el",
  "en",
  "entre",
  "hasta",
  "la",
  "las",
  "lo",
  "los",
  "max",
  "maximo",
  "me",
  "mensual",
  "mes",
  "necesito",
  "o",
  "para",
  "por",
  "presupuesto",
  "propiedad",
  "propiedades",
  "que",
  "quiero",
  "quisiera",
  "un",
  "una",
  "unas",
  "unos",
  "y",
  "zona",
  "zonas",
]);

const numberWords: Record<string, number> = {
  cero: 0,
  mono: 1,
  monoambiente: 1,
  uno: 1,
  una: 1,
  un: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

const roomTerms = [
  "ambiente",
  "ambientes",
  "cuarto",
  "cuartos",
  "dorm",
  "dormitorio",
  "dormitorios",
  "hab",
  "habitacion",
  "habitaciones",
  "pieza",
  "piezas",
];

const typeAliases: Array<{ type: PropertyType; aliases: string[] }> = [
  {
    type: "Casa",
    aliases: ["casa", "casas", "vivienda", "viviendas"],
  },
  {
    type: "Departamento",
    aliases: [
      "apartamento",
      "apartamentos",
      "departamento",
      "departamentos",
      "depto",
      "deptos",
      "dpto",
      "dptos",
    ],
  },
  {
    type: "Terreno",
    aliases: ["lote", "lotes", "terreno", "terrenos"],
  },
];

const monoambienteAliases = ["monoambiente", "mono ambiente", "mono ambientes", "studio", "estudio"];

const operationAliases: Array<{ operation: Operation; aliases: string[] }> = [
  {
    operation: "Compra",
    aliases: ["compra", "comprar", "venta", "vendo", "inversion", "invertir"],
  },
  {
    operation: "Alquiler",
    aliases: ["alquiler", "alquilar", "arriendo", "arrendar", "renta"],
  },
  {
    operation: "Anticrético",
    aliases: ["anticretico", "anticresis"],
  },
];

const amenityAliases: Array<{ amenity: SearchAmenity; aliases: string[] }> = [
  {
    amenity: "garage",
    aliases: ["cochera", "estacionamiento", "garaje", "garage", "parqueo"],
  },
  {
    amenity: "pets",
    aliases: ["gato", "gatos", "mascota", "mascotas", "perro", "perros", "pet"],
  },
  {
    amenity: "furnished",
    aliases: ["amoblado", "amoblada", "amueblado", "amueblada", "equipado", "muebles"],
  },
  {
    amenity: "security",
    aliases: ["guardia", "porteria", "seguridad", "vigilancia"],
  },
  {
    amenity: "pool",
    aliases: ["piscina", "pileta"],
  },
  {
    amenity: "patio",
    aliases: ["balcon", "jardin", "patio", "terraza"],
  },
  {
    amenity: "grill",
    aliases: ["asador", "churrasquera", "parrilla", "quincho"],
  },
  {
    amenity: "elevator",
    aliases: ["ascensor", "elevador"],
  },
];

const currencyUsdTerms = new Set(["dolar", "dolares", "usd", "us"]);
const currencyBobTerms = new Set(["bob", "boliviano", "bolivianos", "bs"]);
const priceLimitTerms = new Set(["hasta", "max", "maximo", "menos", "presupuesto", "tope"]);
const amenityLabels: Record<SearchAmenity, string> = {
  garage: "Con parqueo",
  pets: "Acepta mascotas",
  furnished: "Amoblado",
  security: "Seguridad",
  pool: "Piscina",
  patio: "Patio o jardín",
  grill: "Churrasquera",
  elevator: "Ascensor",
};

export function hasSearchQuery(value: string | null | undefined) {
  const parsed = parseSearchQuery(value ?? "");
  return parsed.meaningfulTokens.length > 0;
}

export function evaluatePropertySearch(
  property: Property,
  query: string | null | undefined,
  options: PropertySearchOptions = {},
): PropertySearchEvaluation {
  return evaluateParsedSearch(property, parseSearchQuery(query ?? "", options));
}

function evaluateParsedSearch(property: Property, parsed: ParsedSearchQuery): PropertySearchEvaluation {
  if (parsed.meaningfulTokens.length === 0) {
    return { matches: true, score: 0, hasIntent: false };
  }

  const constraintScore = getConstraintScore(property, parsed);
  if (constraintScore === null) {
    return { matches: false, score: 0, hasIntent: true };
  }

  const { text: searchableText, words: searchableWords } = getSearchableText(property);
  const softTokens = getSoftSearchTokens(parsed);
  let textScore = 0;
  let matchedSoftTokens = 0;

  for (const token of softTokens) {
    const tokenScore = getTokenMatchScore(token, searchableText, searchableWords);

    if (tokenScore > 0) {
      matchedSoftTokens += 1;
      textScore += tokenScore;
    }
  }

  const hasHardIntent = parsed.intents.length > 0;
  const matches = hasHardIntent || softTokens.length === 0 || matchedSoftTokens > 0;

  return {
    matches,
    score: matches ? constraintScore + textScore : 0,
    hasIntent: true,
  };
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\$us/giu, " usd ")
    .replace(/\bu\$s\b/giu, " usd ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "3.000" and "3 mil" are amounts, not two words.
function normalizeQueryAmounts(query: string) {
  return query
    .replace(/(\d)[.,](?=\d{3}(?:\D|$))/g, "$1")
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/giu, (_, amount: string) =>
      String(Math.round(Number(amount.replace(",", ".")) * 1000)),
    );
}

// Each written word keeps the indexes of its normalized tokens, so a part the search understood
// can be removed from the text ("Monoambiente ×") without touching the rest.
function tokenizeQuery(query: string) {
  const words: QueryWord[] = [];
  const tokens: string[] = [];
  for (const text of normalizeQueryAmounts(query).split(/\s+/).filter(Boolean)) {
    const wordTokens = normalizeSearchText(text).split(" ").filter(Boolean);
    words.push({ text, tokenIndexes: wordTokens.map((_, offset) => tokens.length + offset) });
    tokens.push(...wordTokens);
  }
  return { words, tokens, normalized: tokens.join(" ") };
}

function parseSearchQuery(query: string, options: PropertySearchOptions = {}): ParsedSearchQuery {
  const { words, tokens, normalized } = tokenizeQuery(query);
  const meaningfulTokens = tokens.filter(isMeaningfulToken);
  const consumedIndexes = new Set<number>();
  const intents: SearchIntent[] = [];
  const record = (intent: SearchIntent) => {
    intent.indexes.forEach((index) => consumedIndexes.add(index));
    intents.push(intent);
  };

  for (const place of options.places ?? knownPlaces) {
    const indexes = findAliasMatch(tokens, place.aliases, consumedIndexes, true);
    if (indexes) {
      record({ kind: "place", indexes, place });
      break;
    }
  }

  // Same rule as the "Tipo: Monoambiente" filter (isMonoambiente), not "any 1-bedroom apartment".
  const monoambienteIndexes = findAliasMatch(tokens, monoambienteAliases, consumedIndexes);
  if (monoambienteIndexes) record({ kind: "monoambiente", indexes: monoambienteIndexes });

  for (const group of typeAliases) {
    const indexes = findAliasMatch(tokens, group.aliases, consumedIndexes);
    if (indexes) {
      record({ kind: "type", indexes, type: group.type });
      break;
    }
  }

  for (const group of operationAliases) {
    const indexes = findAliasMatch(tokens, group.aliases, consumedIndexes);
    if (indexes) {
      record({ kind: "operation", indexes, operation: group.operation });
      break;
    }
  }

  const bedrooms = monoambienteIndexes ? null : detectBedroomCount(tokens, consumedIndexes);
  if (bedrooms) record({ kind: "bedrooms", indexes: bedrooms.indexes, count: bedrooms.count });

  for (const group of amenityAliases) {
    const index = tokens.findIndex(
      (token, tokenIndex) => !consumedIndexes.has(tokenIndex) && group.aliases.some((alias) => isSimilarToken(token, alias)),
    );
    if (index >= 0) record({ kind: "amenity", indexes: [index], amenity: group.amenity });
  }

  for (const price of detectPriceIntent(tokens, consumedIndexes, options.currency ?? "BOB")) record(price);

  const typeIntent = intents.find((intent) => intent.kind === "type");
  const operationIntent = intents.find((intent) => intent.kind === "operation");
  const bedroomIntent = intents.find((intent) => intent.kind === "bedrooms");
  const priceIntents = intents.filter((intent) => intent.kind === "price");
  const maxPrice = (currency: DisplayCurrency) => {
    const amounts = priceIntents.filter((intent) => intent.currency === currency).map((intent) => intent.amount);
    return amounts.length ? Math.max(...amounts) : undefined;
  };

  return {
    normalized,
    tokens,
    words,
    meaningfulTokens,
    consumedIndexes,
    ignoredIndexes: new Set<number>(),
    intents,
    propertyType: typeIntent?.kind === "type" ? typeIntent.type : undefined,
    operation: operationIntent?.kind === "operation" ? operationIntent.operation : undefined,
    bedroomCount: bedroomIntent?.kind === "bedrooms" ? bedroomIntent.count : undefined,
    monoambiente: Boolean(monoambienteIndexes),
    amenities: intents.flatMap((intent) => (intent.kind === "amenity" ? [intent.amenity] : [])),
    maxPriceUsd: maxPrice("USD"),
    maxPriceBob: maxPrice("BOB"),
  };
}

function detectBedroomCount(tokens: string[], consumedIndexes: Set<number>) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (consumedIndexes.has(index)) continue;
    const count = getTokenNumber(tokens[index]);

    if (count === null || count < 0 || count > 20) {
      continue;
    }

    const nearbyRoomIndex = findNearbyIndex(tokens, index, roomTerms, 3);

    if (nearbyRoomIndex !== null && !consumedIndexes.has(nearbyRoomIndex)) {
      return { count, indexes: [index, nearbyRoomIndex] };
    }
  }

  return null;
}

function detectPriceIntent(
  tokens: string[],
  consumedIndexes: Set<number>,
  defaultCurrency: DisplayCurrency,
): SearchIntent[] {
  const prices: SearchIntent[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const amount = getTokenNumber(tokens[index]);

    if (amount === null || amount <= 20 || consumedIndexes.has(index)) {
      continue;
    }

    const currencyIndex = findNearbyCurrencyIndex(tokens, index);
    const limitIndex = [index - 1, index - 2].find((candidate) => candidate >= 0 && priceLimitTerms.has(tokens[candidate]));
    const currency: DisplayCurrency | null =
      currencyIndex !== null
        ? currencyUsdTerms.has(tokens[currencyIndex]) ? "USD" : "BOB"
        : limitIndex !== undefined
          ? defaultCurrency
          : null;

    if (currency) {
      const indexes = [index, ...(currencyIndex !== null ? [currencyIndex] : []), ...(limitIndex !== undefined ? [limitIndex] : [])];
      prices.push({ kind: "price", indexes, amount, currency });
    }
  }

  return prices;
}

// Single words ("depto") or consecutive words ("mono ambiente", "terminal bimodal").
function findAliasMatch(tokens: string[], aliases: string[], consumedIndexes: Set<number>, exact = false) {
  for (const alias of aliases) {
    const aliasTokens = normalizeSearchText(alias).split(" ").filter(Boolean);
    if (!aliasTokens.length) continue;

    for (let start = 0; start + aliasTokens.length <= tokens.length; start += 1) {
      const indexes = aliasTokens.map((_, offset) => start + offset);
      const matches = indexes.every((index, offset) =>
        !consumedIndexes.has(index) &&
        (exact || aliasTokens.length > 1 ? tokens[index] === aliasTokens[offset] : isSimilarToken(tokens[index], aliasTokens[offset])),
      );
      if (matches) return indexes;
    }
  }

  return null;
}

function getConstraintScore(property: Property, parsed: ParsedSearchQuery) {
  let score = 0;

  if (parsed.propertyType) {
    if (property.type !== parsed.propertyType) {
      return null;
    }
    score += 40;
  }

  if (parsed.operation) {
    if (property.operation !== parsed.operation) {
      return null;
    }
    score += 28;
  }

  if (parsed.monoambiente) {
    if (!isMonoambiente(property)) {
      return null;
    }
    score += 36;
  }

  if (parsed.bedroomCount !== undefined) {
    if (property.bedrooms < parsed.bedroomCount) {
      return null;
    } else {
      score += property.bedrooms === parsed.bedroomCount ? 32 : 24;
    }
  }

  for (const amenity of parsed.amenities) {
    if (!propertyHasAmenity(property, amenity)) {
      return null;
    }
    score += 14;
  }

  if (parsed.maxPriceUsd !== undefined) {
    if (getPropertyPriceInCurrency(property, "USD") > parsed.maxPriceUsd) {
      return null;
    }
    score += 12;
  }

  if (parsed.maxPriceBob !== undefined) {
    if (getPropertyPriceInCurrency(property, "BOB") > parsed.maxPriceBob) {
      return null;
    }
    score += 12;
  }

  return score;
}

function getSoftSearchTokens(parsed: ParsedSearchQuery) {
  return parsed.tokens.filter((token, index) => {
    if (parsed.consumedIndexes.has(index) || parsed.ignoredIndexes.has(index)) {
      return false;
    }

    return isMeaningfulToken(token);
  });
}

function getSoftTokenIndexes(parsed: ParsedSearchQuery) {
  return parsed.tokens.flatMap((token, index) =>
    !parsed.consumedIndexes.has(index) && isMeaningfulToken(token) ? [index] : [],
  );
}

// Free words that appear in no listing at all do not empty the results; they are listed as
// "No usamos" instead, so the person knows they were left out.
function markIgnoredTokens(parsed: ParsedSearchQuery, properties: Property[]) {
  for (const index of getSoftTokenIndexes(parsed)) {
    const token = parsed.tokens[index];
    const known = properties.some((property) => {
      const { text, words } = getSearchableText(property);
      return getTokenMatchScore(token, text, words) > 0;
    });
    if (!known) parsed.ignoredIndexes.add(index);
  }
}

const searchableTextCache = new WeakMap<Property, { text: string; words: string[] }>();

function getSearchableText(property: Property) {
  let cached = searchableTextCache.get(property);
  if (!cached) {
    const text = normalizeSearchText(buildPropertySearchText(property));
    cached = { text, words: getSearchableWords(text) };
    searchableTextCache.set(property, cached);
  }
  return cached;
}

function isMeaningfulToken(token: string) {
  return (token.length >= 2 || /^\d+$/u.test(token)) && !stopWords.has(token);
}

function getSearchableWords(searchableText: string) {
  return Array.from(
    new Set(searchableText.split(" ").filter((word) => word.length >= 2 && !stopWords.has(word))),
  );
}

function getTokenMatchScore(token: string, searchableText: string, searchableWords: string[]) {
  if (searchableText.includes(token)) {
    return token.length >= 5 ? 10 : 7;
  }

  if (token.length < 4 || /^\d+$/u.test(token)) {
    return 0;
  }

  return searchableWords.some((word) => isSimilarToken(token, word)) ? 5 : 0;
}

function buildPropertySearchText(property: Property) {
  const priceUsd = Math.round(getPropertyPriceInCurrency(property, "USD"));
  const priceBob = Math.round(getPropertyPriceInCurrency(property, "BOB"));

  return [
    property.title,
    property.slug.replaceAll("-", " "),
    property.type,
    getPropertyTypeAliases(property.type),
    property.operation,
    property.operation === "Compra" ? "venta comprar inversion" : "",
    property.operation === "Alquiler" ? "alquiler alquilar arriendo renta" : "",
    property.operation === "Anticrético" ? "anticretico anticresis" : "",
    property.city,
    property.zone,
    property.address,
    property.shortDescription,
    property.longDescription,
    property.price,
    property.currency,
    `${priceUsd} usd dolares`,
    `${priceBob} bs bob bolivianos`,
    property.listingPlan === "featured" ? "destacada destacadas premium prioridad" : "curada",
    property.publisher.name,
    property.publisher.shortName,
    property.publisher.kind === "agency" ? "inmobiliaria agencia verificada" : "dueno directo",
    property.agent.name,
    property.agent.role,
    property.agent.email,
    property.agent.phone,
    ...property.agent.areas,
    ...property.requirements,
    ...property.tags,
    ...property.idealFor,
    ...property.neighborhoodHighlights,
    ...getNumericSearchTerms(property),
    ...getAmenitySearchTerms(property),
  ]
    .filter(Boolean)
    .join(" ");
}

function getPropertyTypeAliases(type: PropertyType) {
  if (type === "Casa") {
    return "casa casas vivienda viviendas";
  }

  if (type === "Departamento") {
    return "departamento departamentos depto deptos dpto dptos apartamento apartamentos";
  }

  return "terreno terrenos lote lotes";
}

function getNumericSearchTerms(property: Property) {
  const terms = [
    `${property.area} m2`,
    `${property.area} metros`,
    `${property.area} metros cuadrados`,
  ];

  if (property.bedrooms > 0) {
    terms.push(
      `${property.bedrooms} dormitorios`,
      `${property.bedrooms} habitaciones`,
      `${property.bedrooms} cuartos`,
      `${property.bedrooms} dorm`,
    );
  } else {
    terms.push("sin dormitorios terreno lote");
  }

  if (property.bathrooms > 0) {
    terms.push(`${property.bathrooms} banos`, `${property.bathrooms} banos completos`);
  }

  if (property.garage > 0) {
    terms.push(
      `${property.garage} garaje`,
      `${property.garage} garajes`,
      `${property.garage} parqueos`,
      `${property.garage} estacionamientos`,
    );
  }

  return terms;
}

function getAmenitySearchTerms(property: Property) {
  const terms: string[] = [];

  if (property.pets) {
    terms.push("mascotas pet friendly perros gatos acepta mascotas");
  }

  if (property.furnished) {
    terms.push("amoblado amoblada amueblado amueblada equipado equipada con muebles mobiliario");
  }

  if (property.security) {
    terms.push("seguridad guardia vigilancia condominio seguridad 24/7 porteria");
  }

  if (property.pool) {
    terms.push("piscina pileta amenities");
  }

  if (property.patio) {
    terms.push("patio jardin area verde areas verdes terraza balcon exterior");
  }

  if (property.grill) {
    terms.push("churrasquera parrilla asador quincho barbecue");
  }

  if (property.elevator) {
    terms.push("ascensor elevador edificio");
  }

  if (property.garage > 0) {
    terms.push("garaje garajes parqueo parqueos estacionamiento estacionamientos cochera");
  }

  if (property.type === "Departamento" && property.bedrooms === 1) {
    terms.push("un dormitorio una habitacion");
  }

  if (isMonoambiente(property)) {
    terms.push("monoambiente mono ambiente studio estudio");
  }

  return terms;
}

function propertyHasAmenity(property: Property, amenity: SearchAmenity) {
  if (amenity === "garage") {
    return property.garage > 0;
  }

  return Boolean(property[amenity]);
}

function findNearbyIndex(tokens: string[], originIndex: number, aliases: string[], distance: number) {
  let closest: number | null = null;

  for (
    let index = Math.max(0, originIndex - distance);
    index <= Math.min(tokens.length - 1, originIndex + distance);
    index += 1
  ) {
    if (index === originIndex) {
      continue;
    }

    if (aliases.some((alias) => isSimilarToken(tokens[index], alias))) {
      closest = index;
      break;
    }
  }

  return closest;
}

function findNearbyCurrencyIndex(tokens: string[], originIndex: number) {
  for (
    let index = Math.max(0, originIndex - 2);
    index <= Math.min(tokens.length - 1, originIndex + 2);
    index += 1
  ) {
    const token = tokens[index];

    if (currencyUsdTerms.has(token) || currencyBobTerms.has(token)) {
      return index;
    }
  }

  return null;
}

function getTokenNumber(token: string) {
  if (/^\d+$/u.test(token)) {
    return Number(token);
  }

  return numberWords[token] ?? null;
}

function isSimilarToken(token: string, target: string) {
  if (!token || !target) {
    return false;
  }

  if (token === target) {
    return true;
  }

  if (token.length >= 4 && target.length >= 4) {
    if (token.startsWith(target) || target.startsWith(token)) {
      return true;
    }
  }

  const maxDistance = token.length >= 8 && target.length >= 8 ? 2 : 1;

  if (Math.min(token.length, target.length) < 5) {
    return false;
  }

  return levenshteinDistance(token, target, maxDistance) <= maxDistance;
}

function levenshteinDistance(source: string, target: string, maxDistance: number) {
  if (Math.abs(source.length - target.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  const current = new Array<number>(target.length + 1);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    current[0] = sourceIndex;
    let rowMin = current[0];

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const cost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      current[targetIndex] = Math.min(
        current[targetIndex - 1] + 1,
        previous[targetIndex] + 1,
        previous[targetIndex - 1] + cost,
      );
      rowMin = Math.min(rowMin, current[targetIndex]);
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[target.length];
}

// Catalog filters: shared by the catalog, the home search and the links people share.

export const rentalTypeOptions = ["Casa", "Departamento", "Monoambiente"] as const;
export type RentalType = (typeof rentalTypeOptions)[number];
// "" means any type; several types travel joined by commas ("Casa,Departamento"), always in this order.
export type RentalTypeFilter = string;

export function getRentalTypes(filter: string): RentalType[] {
  const picked = new Set(filter.split(",").map((item) => item.trim()));
  return rentalTypeOptions.filter((type) => picked.has(type));
}

export function toRentalTypeFilter(types: Iterable<string>): RentalTypeFilter {
  return getRentalTypes([...types].join(",")).join(",");
}
export type PetsPolicy = "allowed" | "consult" | "not_allowed";
export type PriceBound = { amount: number; currency: DisplayCurrency };
export type GuaranteeFilter = "" | "sin" | "hasta-1-mes";
export type RentalSort = "" | "recientes" | "menor-precio" | "mayor-precio" | "menor-entrada" | "cercania";
// Data the owner did not give: those homes go last, in a "pendiente de consulta" group.
export type PendingReason = "pets" | "expenses" | "guarantee" | "entry";

export type RentalSearchFilters = {
  query: string;
  zone: string;
  type: RentalTypeFilter;
  minPrice: string;
  maxPrice: string;
  // Currency of a price that came in a link; otherwise prices follow the visitor's currency.
  priceCurrency: DisplayCurrency | null;
  bedrooms: string;
  bathrooms: string;
  pets: boolean;
  garage: boolean;
  furnished: boolean;
  guarantee: GuaranteeFilter;
  // The budget (Mín./Máx.) is compared with rent plus expenses.
  includeExpenses: boolean;
  // "Para entrar, hasta Bs …": first month, expenses and guarantee together.
  maxEntry: string;
  // Optional and off by default (owner's decision): only homes priced below their zone's average.
  belowZoneAverage: boolean;
  // Id of a well-known place (catalog-geo knownPlaces).
  near: string;
  // Visible map area chosen with "Buscar en esta zona del mapa".
  area: MapArea | null;
  sort: RentalSort;
};

export type RentalFilterKey = Exclude<keyof RentalSearchFilters, "priceCurrency" | "sort">;

export type RentalSearchMatch = {
  property: Property;
  petsPolicy: PetsPolicy;
  pending: PendingReason[];
  distanceKm: number | null;
  zoneAverage: ZoneAverageComparison | null;
};

export type RentalSearchOptions = {
  places?: KnownPlace[];
  zoneAverages?: Map<string, ZoneAverage>;
};

type SearchParamsReader = {
  get(name: string): string | null;
  getAll(name: string): string[];
};

export const emptyRentalSearchFilters: RentalSearchFilters = {
  query: "",
  zone: "",
  type: "",
  minPrice: "",
  maxPrice: "",
  priceCurrency: null,
  bedrooms: "",
  bathrooms: "",
  pets: false,
  garage: false,
  furnished: false,
  guarantee: "",
  includeExpenses: false,
  maxEntry: "",
  belowZoneAverage: false,
  near: "",
  area: null,
  sort: "",
};

export const rentalBedroomOptions = ["1", "2", "3", "4"];
export const rentalBathroomOptions = ["1", "2", "3"];
export const rentalSortOptions: Array<{ value: RentalSort; label: string }> = [
  { value: "", label: "Normal (destacados primero)" },
  { value: "recientes", label: "Confirmados hace poco" },
  { value: "menor-precio", label: "Menor precio" },
  { value: "mayor-precio", label: "Mayor precio" },
  { value: "menor-entrada", label: "Menor costo para entrar" },
];
export const rentalSearchParamKeys = [
  "q",
  "zone",
  "type",
  "minPrice",
  "maxPrice",
  "maxEntrada",
  "currency",
  "bedrooms",
  "bathrooms",
  "amenity",
  "garantia",
  "expensas",
  "promedio",
  "cerca",
  "area",
  "orden",
];

const rentalFilterKeys: RentalFilterKey[] = [
  "query",
  "zone",
  "type",
  "minPrice",
  "maxPrice",
  "includeExpenses",
  "maxEntry",
  "bedrooms",
  "bathrooms",
  "pets",
  "garage",
  "furnished",
  "guarantee",
  "belowZoneAverage",
  "near",
  "area",
];

const rentalSorts = new Set<string>(["recientes", "menor-precio", "mayor-precio", "menor-entrada", "cercania"]);

// Reads "3.000", "3,000", "3 mil", "3k", "Bs 3000" or "$us 450". Null when it is not an amount.
export function parsePriceInput(
  value: string | null | undefined,
  fallbackCurrency: DisplayCurrency,
): PriceBound | null {
  let text = (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/([a-z$])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z$])/g, "$1 $2")
    .trim();
  if (!text) return null;

  let currency = fallbackCurrency;
  if (/\$|\busd\b|\bdolar(es)?\b/.test(text)) currency = "USD";
  else if (/\bbs\b|\bbob\b|\bbolivianos?\b/.test(text)) currency = "BOB";

  text = text
    .replace(/\$\s*us\b|\bus\s*\$|\bu\s*\$\s*s\b|\busd\b|\bdolar(es)?\b|\$|\bbs\b\.?|\bbob\b|\bbolivianos?\b/g, " ")
    .replace(/\b(por|al)\s+mes\b|\/\s*mes\b|\bmensual(es)?\b|\bhasta\b|\bdesde\b|\bmax(imo)?\b\.?|\bmin(imo)?\b\.?/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const thousands = /^(\d[\d.,]*)\s*(?:mil|k)$/.exec(text);
  const base = parseCurrencyAmount(thousands ? thousands[1] : text);
  if (base === null) return null;
  return { amount: thousands ? Math.round(base * 1000) : base, currency };
}

export function formatPriceBound(bound: PriceBound) {
  const amount = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 }).format(bound.amount);
  return `${bound.currency === "USD" ? "$us" : "Bs"} ${amount}`;
}

export function getPetsPolicy(property: Pick<Property, "pets" | "rentalDetails">): PetsPolicy {
  if (property.pets) return "allowed";
  return property.rentalDetails?.petsPolicy === "not_allowed" ? "not_allowed" : "consult";
}

export function isMonoambiente(property: Property) {
  return (
    property.rentalDetails?.type === "Monoambiente" ||
    (property.type === "Departamento" &&
      property.bedrooms === 1 &&
      (property.title.toLocaleLowerCase("es").includes("monoambiente") ||
        property.tags.some((tag) => tag.toLocaleLowerCase("es").includes("monoambiente"))))
  );
}

export function isRentalSort(value: string | null | undefined): value is RentalSort {
  return value === "" || (typeof value === "string" && rentalSorts.has(value));
}

// URL values win over the page defaults (for example the zone of a zone page).
export function readRentalSearchParams(
  params: SearchParamsReader,
  defaults: Partial<RentalSearchFilters> = {},
  places: KnownPlace[] = knownPlaces,
): RentalSearchFilters {
  const base = { ...emptyRentalSearchFilters, ...defaults };
  const text = (key: string, max: number) => {
    const value = params.get(key);
    return value === null ? null : value.trim().slice(0, max);
  };
  const typeParams = params.getAll("type");
  const bedroomsParam = text("bedrooms", 20);
  const amenityParams = params.getAll("amenity");
  const amenities = new Set(amenityParams.flatMap((value) => value.split(",").map((item) => item.trim())));
  const currencyParam = params.get("currency");
  const hasPriceParam = ["minPrice", "maxPrice", "maxEntrada"].some((key) => params.get(key) !== null);
  const guaranteeParam = text("garantia", 20);
  const expensesParam = text("expensas", 20);
  const averageParam = text("promedio", 20);
  const nearParam = text("cerca", 60);
  const areaParam = text("area", 80);
  const sortParam = text("orden", 20);

  let type = base.type;
  if (bedroomsParam === "Monoambiente") type = "Monoambiente";
  else if (typeParams.length) type = toRentalTypeFilter(typeParams.join(",").slice(0, 80).split(","));

  return {
    query: text("q", 120) ?? base.query,
    zone: text("zone", 80) ?? base.zone,
    type,
    minPrice: text("minPrice", 40) ?? base.minPrice,
    maxPrice: text("maxPrice", 40) ?? base.maxPrice,
    priceCurrency:
      hasPriceParam && (currencyParam === "USD" || currencyParam === "BOB")
        ? currencyParam
        : base.priceCurrency,
    bedrooms: optionParam(bedroomsParam === "Monoambiente" ? null : bedroomsParam, rentalBedroomOptions, base.bedrooms),
    bathrooms: optionParam(text("bathrooms", 20), rentalBathroomOptions, base.bathrooms),
    pets: amenityParams.length ? amenities.has("pets") : base.pets,
    garage: amenityParams.length ? amenities.has("garage") : base.garage,
    furnished: amenityParams.length ? amenities.has("furnished") : base.furnished,
    guarantee:
      guaranteeParam === null
        ? base.guarantee
        : guaranteeParam === "sin" || guaranteeParam === "hasta-1-mes"
          ? guaranteeParam
          : "",
    includeExpenses: expensesParam === null ? base.includeExpenses : expensesParam === "incluidas",
    maxEntry: text("maxEntrada", 40) ?? base.maxEntry,
    belowZoneAverage: averageParam === null ? base.belowZoneAverage : averageParam === "bajo",
    near: nearParam === null ? base.near : getKnownPlace(nearParam, places) ? nearParam : "",
    area: areaParam === null ? base.area : parseMapArea(areaParam),
    sort: sortParam === null ? base.sort : isRentalSort(sortParam) ? sortParam : "",
  };
}

// Page defaults that the person cleared are written empty ("zone="), so a reload or a shared
// link keeps "Todas las zonas" on a zone page instead of going back to the page's zone.
export function buildRentalSearchParams(
  filters: RentalSearchFilters,
  displayCurrency: DisplayCurrency,
  defaults: Partial<RentalSearchFilters> = {},
) {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  const { min, max } = getPriceBounds(filters, displayCurrency);
  const entry = getEntryBound(filters, displayCurrency);
  const currency = (max ?? min ?? entry)?.currency;
  const inCurrency = (bound: PriceBound) => formatAmountParam(convertPrice(bound.amount, bound.currency, currency ?? bound.currency));

  if (query) params.set("q", query);
  if (filters.zone) params.set("zone", filters.zone);
  else if (defaults.zone) params.set("zone", "");
  if (filters.type) for (const type of getRentalTypes(filters.type)) params.append("type", type);
  else if (defaults.type) params.set("type", "");
  if (min) params.set("minPrice", inCurrency(min));
  if (max) params.set("maxPrice", inCurrency(max));
  else if (defaults.maxPrice) params.set("maxPrice", "");
  if (entry) params.set("maxEntrada", inCurrency(entry));
  if (currency) params.set("currency", currency);
  if (filters.bedrooms) params.set("bedrooms", filters.bedrooms);
  if (filters.bathrooms) params.set("bathrooms", filters.bathrooms);
  if (filters.pets) params.append("amenity", "pets");
  if (filters.garage) params.append("amenity", "garage");
  if (filters.furnished) params.append("amenity", "furnished");
  if (!filters.pets && !filters.garage && !filters.furnished && (defaults.pets || defaults.garage || defaults.furnished)) {
    params.set("amenity", "");
  }
  if (filters.guarantee) params.set("garantia", filters.guarantee);
  if (filters.includeExpenses) params.set("expensas", "incluidas");
  if (filters.belowZoneAverage) params.set("promedio", "bajo");
  if (filters.near) params.set("cerca", filters.near);
  if (filters.area) params.set("area", formatMapArea(filters.area));
  if (filters.sort) params.set("orden", filters.sort);
  return params;
}

export function getPriceBounds(filters: RentalSearchFilters, displayCurrency: DisplayCurrency) {
  const currency = filters.priceCurrency ?? displayCurrency;
  return {
    min: parsePriceInput(filters.minPrice, currency),
    max: parsePriceInput(filters.maxPrice, currency),
  };
}

export function getEntryBound(filters: RentalSearchFilters, displayCurrency: DisplayCurrency) {
  return parsePriceInput(filters.maxEntry, filters.priceCurrency ?? displayCurrency);
}

export function getActiveRentalFilters(filters: RentalSearchFilters) {
  return rentalFilterKeys.filter((key) => {
    const value = filters[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.trim() !== "";
    return value !== null;
  });
}

export function withoutRentalFilter(
  filters: RentalSearchFilters,
  key: RentalFilterKey,
): RentalSearchFilters {
  const next = { ...filters, [key]: emptyRentalSearchFilters[key] };
  if (!next.minPrice.trim() && !next.maxPrice.trim() && !next.maxEntry.trim()) next.priceCurrency = null;
  if (key === "near" && next.sort === "cercania") next.sort = "";
  return next;
}

// Order: homes with every asked datum first, "pendiente de consulta" last. Within each group the
// normal order puts featured listings first (relevance first with a text search); any other order
// the person picks applies to all, featured or not.
export function searchRentals(
  properties: Property[],
  filters: RentalSearchFilters,
  displayCurrency: DisplayCurrency,
  options: RentalSearchOptions = {},
): RentalSearchMatch[] {
  const places = options.places ?? knownPlaces;
  const parsed = parseSearchQuery(filters.query, { currency: displayCurrency, places });
  const types = getRentalTypes(filters.type);
  const hasQuery = parsed.meaningfulTokens.length > 0;
  if (hasQuery) markIgnoredTokens(parsed, properties);
  const { min, max } = getPriceBounds(filters, displayCurrency);
  const entryBound = getEntryBound(filters, displayCurrency);
  const bedrooms = Number(filters.bedrooms) || 0;
  const bathrooms = Number(filters.bathrooms) || 0;
  const textPlace = parsed.intents.find((intent) => intent.kind === "place");
  const place = getKnownPlace(filters.near, places) ?? (textPlace?.kind === "place" ? textPlace.place : undefined);
  const zoneAverages = filters.belowZoneAverage ? (options.zoneAverages ?? getZoneAverages(properties)) : null;
  const sort = filters.sort === "cercania" && !place ? "" : filters.sort;

  const matches = properties.flatMap((property, index) => {
    const evaluation = evaluateParsedSearch(property, parsed);
    const petsPolicy = getPetsPolicy(property);
    const pending: PendingReason[] = [];
    const inCurrency = (amount: number, currency: DisplayCurrency) =>
      convertPrice(amount, property.currency, currency, getPropertyExchangeRate(property));

    if (hasQuery && !evaluation.matches) return [];
    if (filters.zone && property.zone !== filters.zone) return [];
    if (types.length && !types.some((type) => (type === "Monoambiente" ? isMonoambiente(property) : property.type === type))) return [];

    const monthly = filters.includeExpenses ? getMonthlyCost(property) : property.price;
    if (min || max) {
      if (monthly === null) {
        // Rent alone already over the budget: out. Otherwise the expenses decide, so ask.
        if (max && inCurrency(property.price, max.currency) > max.amount) return [];
        pending.push("expenses");
      } else {
        if (min && inCurrency(monthly, min.currency) < min.amount) return [];
        if (max && inCurrency(monthly, max.currency) > max.amount) return [];
      }
    }

    if (property.bedrooms < bedrooms || property.bathrooms < bathrooms) return [];
    if (filters.pets && petsPolicy === "not_allowed") return [];
    if (filters.pets && petsPolicy === "consult") pending.unshift("pets");
    if (filters.garage && property.garage <= 0) return [];
    if (filters.furnished && !property.furnished) return [];

    const entry = filters.guarantee || entryBound || sort === "menor-entrada" ? getEntryCost(property) : null;
    if (filters.guarantee) {
      if (!entry) pending.push("guarantee");
      else if (filters.guarantee === "sin" ? entry.deposit > 0 : entry.deposit > property.price + 0.005) return [];
    }
    if (entryBound) {
      if (!entry) pending.push("entry");
      else if (inCurrency(entry.total, entryBound.currency) > entryBound.amount + 0.005) return [];
    }

    const zoneAverage = zoneAverages ? compareWithZoneAverage(property, zoneAverages) : null;
    if (zoneAverages && !isBelowZoneAverage(zoneAverage)) return [];
    if (filters.area && !isInsideArea(property.coordinates, filters.area)) return [];

    return [{
      property,
      index,
      petsPolicy,
      pending,
      score: evaluation.score,
      distanceKm: place ? distanceKm(place.coordinates, property.coordinates) : null,
      zoneAverage,
      priceBob: convertPrice(monthly ?? property.price, property.currency, "BOB", getPropertyExchangeRate(property)),
      entryBob: entry ? convertPrice(entry.total, property.currency, "BOB", getPropertyExchangeRate(property)) : Infinity,
    }];
  });

  const byDistance = (first: (typeof matches)[number], second: (typeof matches)[number]) =>
    (first.distanceKm ?? Infinity) - (second.distanceKm ?? Infinity);
  const compare = (first: (typeof matches)[number], second: (typeof matches)[number]) => {
    switch (sort) {
      case "recientes":
        return confirmationRank(first.property) - confirmationRank(second.property);
      case "menor-precio":
        return first.priceBob - second.priceBob;
      case "mayor-precio":
        return second.priceBob - first.priceBob;
      case "menor-entrada":
        return first.entryBob === second.entryBob ? 0 : first.entryBob - second.entryBob;
      case "cercania":
        return byDistance(first, second);
      default:
        return (
          (hasQuery ? second.score - first.score : 0) ||
          (textPlace && !filters.near ? byDistance(first, second) : 0) ||
          featuredRank(first.property) - featuredRank(second.property)
        );
    }
  };

  return matches
    .sort(
      (first, second) =>
        Number(first.pending.length > 0) - Number(second.pending.length > 0) ||
        compare(first, second) ||
        first.index - second.index,
    )
    .map(({ property, petsPolicy, pending, distanceKm, zoneAverage }) => ({ property, petsPolicy, pending, distanceKm, zoneAverage }));
}

// Words for the chips of active filters ("Hasta Bs 3.000 ×").
export function describeRentalFilter(
  key: RentalFilterKey,
  filters: RentalSearchFilters,
  displayCurrency: DisplayCurrency,
  places: KnownPlace[] = knownPlaces,
) {
  const { min, max } = getPriceBounds(filters, displayCurrency);
  const entry = getEntryBound(filters, displayCurrency);
  const bedrooms = Number(filters.bedrooms);
  const bathrooms = Number(filters.bathrooms);
  switch (key) {
    case "query":
      return `Búsqueda: “${shortenText(filters.query.trim(), 28)}”`;
    case "zone":
      return `Zona: ${filters.zone}`;
    case "type":
      return getRentalTypes(filters.type).join(" o ");
    case "minPrice":
      return min ? `Desde ${formatPriceBound(min)}` : `Mín.: “${shortenText(filters.minPrice.trim(), 16)}”`;
    case "maxPrice":
      return max ? `Hasta ${formatPriceBound(max)}` : `Máx.: “${shortenText(filters.maxPrice.trim(), 16)}”`;
    case "includeExpenses":
      return "Presupuesto con expensas";
    case "maxEntry":
      return entry ? `Para entrar hasta ${formatPriceBound(entry)}` : `Para entrar: “${shortenText(filters.maxEntry.trim(), 16)}”`;
    case "bedrooms":
      return `${bedrooms}+ ${bedrooms === 1 ? "dormitorio" : "dormitorios"}`;
    case "bathrooms":
      return `${bathrooms}+ ${bathrooms === 1 ? "baño" : "baños"}`;
    case "pets":
      return "Acepta mascotas";
    case "garage":
      return "Con parqueo";
    case "furnished":
      return "Amoblado";
    case "guarantee":
      return filters.guarantee === "sin" ? "Sin garantía" : "Garantía hasta 1 mes";
    case "belowZoneAverage":
      return "Bajo el promedio de la zona";
    case "near":
      return `Cerca de ${getKnownPlace(filters.near, places)?.name ?? filters.near}`;
    case "area":
      return "Zona del mapa";
  }
}

// Plain-language summary of the search, for the price hint and the WhatsApp messages.
export function describeRentalSearch(
  filters: RentalSearchFilters,
  displayCurrency: DisplayCurrency,
  places: KnownPlace[] = knownPlaces,
) {
  const { min, max } = getPriceBounds(filters, displayCurrency);
  const entry = getEntryBound(filters, displayCurrency);
  const query = filters.query.trim();
  const bedrooms = Number(filters.bedrooms);
  const bathrooms = Number(filters.bathrooms);
  const kind = filters.type ? getRentalTypes(filters.type).join(" o ").toLocaleLowerCase("es") : filters.zone ? "vivienda" : "";
  const place = getKnownPlace(filters.near, places);
  return [
    kind ? `${kind}${filters.zone ? ` en ${filters.zone}` : ""}` : null,
    describePriceBounds(min, max),
    filters.includeExpenses && (min || max) ? "con expensas incluidas en el presupuesto" : null,
    entry ? `para entrar hasta ${formatPriceBound(entry)}` : null,
    bedrooms ? `${bedrooms} ${bedrooms === 1 ? "dormitorio" : "dormitorios"} o más` : null,
    bathrooms ? `${bathrooms} ${bathrooms === 1 ? "baño" : "baños"} o más` : null,
    filters.pets ? "que acepte mascotas" : null,
    filters.garage ? "con parqueo" : null,
    filters.furnished ? "amoblada" : null,
    filters.guarantee === "sin" ? "sin garantía" : filters.guarantee === "hasta-1-mes" ? "con garantía de hasta 1 mes" : null,
    filters.belowZoneAverage ? "bajo el promedio de su zona" : null,
    place ? `cerca de ${place.name}` : null,
    filters.area ? "en la zona marcada del mapa" : null,
    query ? `búsqueda “${query}”` : null,
  ].filter((part): part is string => Boolean(part));
}

export function describePriceBounds(min: PriceBound | null, max: PriceBound | null) {
  if (min && max) return `entre ${formatPriceBound(min)} y ${formatPriceBound(max)} por mes`;
  if (max) return `hasta ${formatPriceBound(max)} por mes`;
  if (min) return `desde ${formatPriceBound(min)} por mes`;
  return null;
}

export type SearchUnderstandingChip = { key: string; label: string; query: string };
export type SearchUnderstanding = { chips: SearchUnderstandingChip[]; unused: string[] };

// How the search box understood the text: one chip per understood part (its X removes those
// words from the text) and, apart, the words no listing has ("No usamos: …").
export function understandRentalQuery(
  query: string,
  properties: Property[],
  displayCurrency: DisplayCurrency,
  places: KnownPlace[] = knownPlaces,
): SearchUnderstanding {
  const parsed = parseSearchQuery(query, { currency: displayCurrency, places });
  if (parsed.meaningfulTokens.length === 0) return { chips: [], unused: [] };
  markIgnoredTokens(parsed, properties);

  const chips: SearchUnderstandingChip[] = parsed.intents.map((intent, index) => ({
    key: `${intent.kind}-${index}`,
    label: describeSearchIntent(intent),
    query: queryWithoutTokens(parsed, new Set(intent.indexes)),
  }));
  const unused: string[] = [];

  parsed.words.forEach((word, wordIndex) => {
    const soft = word.tokenIndexes.filter(
      (index) => !parsed.consumedIndexes.has(index) && isMeaningfulToken(parsed.tokens[index]),
    );
    if (!soft.length) return;
    if (soft.every((index) => parsed.ignoredIndexes.has(index))) {
      unused.push(word.text);
      return;
    }
    chips.push({
      key: `word-${wordIndex}`,
      label: `“${shortenText(word.text, 24)}”`,
      query: queryWithoutTokens(parsed, new Set(word.tokenIndexes)),
    });
  });

  return { chips, unused };
}

// A well-known place named in the text ("cerca de la UAGRM"), used like "Cerca de".
export function findPlaceInQuery(query: string, places: KnownPlace[] = knownPlaces) {
  const intent = parseSearchQuery(query, { places }).intents.find((item) => item.kind === "place");
  return intent?.kind === "place" ? intent.place : undefined;
}

function describeSearchIntent(intent: SearchIntent) {
  switch (intent.kind) {
    case "place":
      return `Cerca de ${intent.place.name}`;
    case "monoambiente":
      return "Monoambiente";
    case "type":
      return intent.type;
    case "operation":
      return intent.operation === "Compra" ? "Venta" : intent.operation;
    case "bedrooms":
      return `${intent.count}+ ${intent.count === 1 ? "dormitorio" : "dormitorios"}`;
    case "amenity":
      return amenityLabels[intent.amenity];
    case "price":
      return `Hasta ${formatPriceBound({ amount: intent.amount, currency: intent.currency })}`;
  }
}

function queryWithoutTokens(parsed: ParsedSearchQuery, remove: Set<number>) {
  const kept = parsed.words.filter(
    (word) => !(word.tokenIndexes.length > 0 && word.tokenIndexes.every((index) => remove.has(index))),
  );
  const isFiller = (word: QueryWord) => word.tokenIndexes.every((index) => !isMeaningfulToken(parsed.tokens[index]));
  while (kept.length && isFiller(kept[0])) kept.shift();
  while (kept.length && isFiller(kept[kept.length - 1])) kept.pop();
  return kept.map((word) => word.text).join(" ");
}

// Zentro Urbano only publishes monthly rentals of whole homes ("Por ahora SOLO ALQUILER").
export function getUnsupportedSearchIntent(query: string) {
  const parsed = parseSearchQuery(query);
  const tokens = parsed.tokens;
  if (tokens.some((token) => isSimilarToken(token, "anticretico") || isSimilarToken(token, "anticresis"))) {
    return "anticretico" as const;
  }
  if (tokens.some((token) => ["venta", "vendo", "vende", "vender", "compra", "comprar", "compro"].includes(token))) {
    return "venta" as const;
  }
  const singleRoom = tokens.some((token) => ["habitacion", "cuarto", "pieza"].includes(token));
  const anyRoom = singleRoom || tokens.some((token) => ["habitaciones", "cuartos", "piezas"].includes(token));
  const shared = tokens.some((token) => token.startsWith("compart"));
  if ((anyRoom && shared) || (singleRoom && parsed.bedroomCount === undefined && !parsed.propertyType)) {
    return "habitacion" as const;
  }
  return null;
}

function optionParam(value: string | null, options: string[], fallback: string) {
  if (value === null) return fallback;
  return options.includes(value) ? value : "";
}

function formatAmountParam(amount: number) {
  return String(Math.round(amount * 100) / 100);
}

function featuredRank(property: Property) {
  return property.listingPlan === "featured" ? 0 : 1;
}

// Fresh confirmations first, newest first; old or missing ones after.
function confirmationRank(property: Property) {
  const confirmedAt = property.availabilityConfirmedAt ? Date.parse(property.availabilityConfirmedAt) : NaN;
  const age = Number.isFinite(confirmedAt) ? -confirmedAt : 0;
  return (getAvailabilityState(property).fresh ? 0 : 1e15) + age + (Number.isFinite(confirmedAt) ? 0 : 1e14);
}

function shortenText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
