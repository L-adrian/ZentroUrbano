import {
  convertPrice,
  getPropertyPriceInCurrency,
  parseCurrencyAmount,
  type DisplayCurrency,
} from "@/lib/currency";
import type { Operation, Property, PropertyType } from "@/lib/properties";

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

type ParsedSearchQuery = {
  normalized: string;
  tokens: string[];
  meaningfulTokens: string[];
  consumedIndexes: Set<number>;
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
      "monoambiente",
      "mono ambiente",
      "studio",
      "estudio",
    ],
  },
  {
    type: "Terreno",
    aliases: ["lote", "lotes", "terreno", "terrenos"],
  },
];

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

  const searchableText = normalizeSearchText(buildPropertySearchText(property));
  const searchableWords = getSearchableWords(searchableText);
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

  const hasHardIntent =
    Boolean(parsed.propertyType) ||
    Boolean(parsed.operation) ||
    parsed.bedroomCount !== undefined ||
    parsed.amenities.length > 0 ||
    parsed.maxPriceBob !== undefined ||
    parsed.maxPriceUsd !== undefined;
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
    .replace(/[\u0300-\u036f]/g, "")
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

function parseSearchQuery(query: string, options: PropertySearchOptions = {}): ParsedSearchQuery {
  const normalized = normalizeSearchText(normalizeQueryAmounts(query));
  const tokens = normalized.split(" ").filter(Boolean);
  const meaningfulTokens = tokens.filter(isMeaningfulToken);
  const consumedIndexes = new Set<number>();
  const propertyType = detectPropertyType(normalized, tokens, consumedIndexes);
  const operation = detectOperation(normalized, tokens, consumedIndexes);
  const monoambiente =
    normalized.includes("mono ambiente") ||
    tokens.some((token) => isSimilarToken(token, "monoambiente")) ||
    tokens.some((token) => isSimilarToken(token, "studio")) ||
    tokens.some((token) => isSimilarToken(token, "estudio"));
  const bedroomCount = monoambiente ? 1 : detectBedroomCount(tokens, consumedIndexes);
  const amenities = detectAmenities(tokens, consumedIndexes);
  const { maxPriceUsd, maxPriceBob } = detectPriceIntent(
    tokens,
    consumedIndexes,
    options.currency ?? "BOB",
  );

  return {
    normalized,
    tokens,
    meaningfulTokens,
    consumedIndexes,
    propertyType,
    operation,
    bedroomCount,
    monoambiente,
    amenities,
    maxPriceUsd,
    maxPriceBob,
  };
}

function detectPropertyType(
  normalized: string,
  tokens: string[],
  consumedIndexes: Set<number>,
) {
  for (const group of typeAliases) {
    const match = findAliasMatch(normalized, tokens, group.aliases);

    if (match) {
      match.indexes.forEach((index) => consumedIndexes.add(index));
      return group.type;
    }
  }

  return undefined;
}

function detectOperation(
  normalized: string,
  tokens: string[],
  consumedIndexes: Set<number>,
) {
  for (const group of operationAliases) {
    const match = findAliasMatch(normalized, tokens, group.aliases);

    if (match) {
      match.indexes.forEach((index) => consumedIndexes.add(index));
      return group.operation;
    }
  }

  return undefined;
}

function detectBedroomCount(tokens: string[], consumedIndexes: Set<number>) {
  for (let index = 0; index < tokens.length; index += 1) {
    const count = getTokenNumber(tokens[index]);

    if (count === null || count < 0 || count > 20) {
      continue;
    }

    const nearbyRoomIndex = findNearbyIndex(tokens, index, roomTerms, 3);

    if (nearbyRoomIndex !== null) {
      consumedIndexes.add(index);
      consumedIndexes.add(nearbyRoomIndex);
      return count;
    }
  }

  return undefined;
}

function detectAmenities(tokens: string[], consumedIndexes: Set<number>) {
  const amenities: SearchAmenity[] = [];

  for (const group of amenityAliases) {
    for (let index = 0; index < tokens.length; index += 1) {
      if (group.aliases.some((alias) => isSimilarToken(tokens[index], alias))) {
        amenities.push(group.amenity);
        consumedIndexes.add(index);
        break;
      }
    }
  }

  return amenities;
}

function detectPriceIntent(
  tokens: string[],
  consumedIndexes: Set<number>,
  defaultCurrency: DisplayCurrency,
) {
  let maxPriceUsd: number | undefined;
  let maxPriceBob: number | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const amount = getTokenNumber(tokens[index]);

    if (amount === null || amount <= 20) {
      continue;
    }

    const nearbyCurrency =
      findNearbyCurrency(tokens, index) ??
      (tokens.slice(Math.max(0, index - 2), index).some((token) => priceLimitTerms.has(token))
        ? defaultCurrency
        : null);

    if (nearbyCurrency === "USD") {
      maxPriceUsd = maxPriceUsd === undefined ? amount : Math.max(maxPriceUsd, amount);
      consumedIndexes.add(index);
    }

    if (nearbyCurrency === "BOB") {
      maxPriceBob = maxPriceBob === undefined ? amount : Math.max(maxPriceBob, amount);
      consumedIndexes.add(index);
    }
  }

  return { maxPriceUsd, maxPriceBob };
}

function findAliasMatch(normalized: string, tokens: string[], aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeSearchText(alias);

    if (normalizedAlias.includes(" ") && normalized.includes(normalizedAlias)) {
      return { indexes: [] };
    }

    for (let index = 0; index < tokens.length; index += 1) {
      if (isSimilarToken(tokens[index], normalizedAlias)) {
        return { indexes: [index] };
      }
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

  if (parsed.bedroomCount !== undefined) {
    if (parsed.monoambiente) {
      if (property.type !== "Departamento" || property.bedrooms !== 1) {
        return null;
      }
      score += 36;
    } else if (property.bedrooms < parsed.bedroomCount) {
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
    if (parsed.consumedIndexes.has(index)) {
      return false;
    }

    return isMeaningfulToken(token);
  });
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
    terms.push("un dormitorio una habitacion monoambiente mono ambiente studio estudio");
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

function findNearbyCurrency(tokens: string[], originIndex: number) {
  for (
    let index = Math.max(0, originIndex - 2);
    index <= Math.min(tokens.length - 1, originIndex + 2);
    index += 1
  ) {
    const token = tokens[index];

    if (currencyUsdTerms.has(token)) {
      return "USD";
    }

    if (currencyBobTerms.has(token)) {
      return "BOB";
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

export type RentalTypeFilter = "" | "Casa" | "Departamento" | "Monoambiente";
export type PetsPolicy = "allowed" | "consult" | "not_allowed";
export type PriceBound = { amount: number; currency: DisplayCurrency };

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
};

export type RentalFilterKey = Exclude<keyof RentalSearchFilters, "priceCurrency">;

export type RentalSearchMatch = { property: Property; petsPolicy: PetsPolicy };

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
};

export const rentalBedroomOptions = ["1", "2", "3", "4"];
export const rentalBathroomOptions = ["1", "2", "3"];
export const rentalSearchParamKeys = [
  "q",
  "zone",
  "type",
  "minPrice",
  "maxPrice",
  "currency",
  "bedrooms",
  "bathrooms",
  "amenity",
];

const rentalFilterKeys: RentalFilterKey[] = [
  "query",
  "zone",
  "type",
  "minPrice",
  "maxPrice",
  "bedrooms",
  "bathrooms",
  "pets",
  "garage",
];

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

// URL values win over the page defaults (for example the zone of a zone page).
export function readRentalSearchParams(
  params: SearchParamsReader,
  defaults: Partial<RentalSearchFilters> = {},
): RentalSearchFilters {
  const base = { ...emptyRentalSearchFilters, ...defaults };
  const text = (key: string, max: number) => {
    const value = params.get(key);
    return value === null ? null : value.trim().slice(0, max);
  };
  const typeParam = text("type", 20);
  const bedroomsParam = text("bedrooms", 20);
  const amenityParams = params.getAll("amenity");
  const amenities = new Set(amenityParams.flatMap((value) => value.split(",").map((item) => item.trim())));
  const currencyParam = params.get("currency");
  const hasPriceParam = params.get("minPrice") !== null || params.get("maxPrice") !== null;

  let type = base.type;
  if (typeParam === "Monoambiente" || bedroomsParam === "Monoambiente") type = "Monoambiente";
  else if (typeParam !== null) type = typeParam === "Casa" || typeParam === "Departamento" ? typeParam : "";

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
  };
}

export function buildRentalSearchParams(
  filters: RentalSearchFilters,
  displayCurrency: DisplayCurrency,
) {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  const { min, max } = getPriceBounds(filters, displayCurrency);
  const currency = (max ?? min)?.currency;

  if (query) params.set("q", query);
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.type) params.set("type", filters.type);
  if (min && currency) {
    params.set("minPrice", formatAmountParam(convertPrice(min.amount, min.currency, currency)));
  }
  if (max) params.set("maxPrice", formatAmountParam(max.amount));
  if (currency) params.set("currency", currency);
  if (filters.bedrooms) params.set("bedrooms", filters.bedrooms);
  if (filters.bathrooms) params.set("bathrooms", filters.bathrooms);
  if (filters.pets) params.append("amenity", "pets");
  if (filters.garage) params.append("amenity", "garage");
  return params;
}

export function getPriceBounds(filters: RentalSearchFilters, displayCurrency: DisplayCurrency) {
  const currency = filters.priceCurrency ?? displayCurrency;
  return {
    min: parsePriceInput(filters.minPrice, currency),
    max: parsePriceInput(filters.maxPrice, currency),
  };
}

export function getActiveRentalFilters(filters: RentalSearchFilters) {
  return rentalFilterKeys.filter((key) => {
    const value = filters[key];
    return typeof value === "boolean" ? value : value.trim() !== "";
  });
}

export function withoutRentalFilter(
  filters: RentalSearchFilters,
  key: RentalFilterKey,
): RentalSearchFilters {
  const next = { ...filters, [key]: emptyRentalSearchFilters[key] };
  if (!next.minPrice.trim() && !next.maxPrice.trim()) next.priceCurrency = null;
  return next;
}

// Featured listings first; with a text search, relevance first. With "Acepta mascotas",
// listings where pets are "a consultar" come after the confirmed ones and "no" never shows.
export function searchRentals(
  properties: Property[],
  filters: RentalSearchFilters,
  displayCurrency: DisplayCurrency,
): RentalSearchMatch[] {
  const parsed = parseSearchQuery(filters.query, { currency: displayCurrency });
  const hasQuery = parsed.meaningfulTokens.length > 0;
  const { min, max } = getPriceBounds(filters, displayCurrency);
  const bedrooms = Number(filters.bedrooms) || 0;
  const bathrooms = Number(filters.bathrooms) || 0;

  return properties
    .map((property, index) => ({
      property,
      index,
      evaluation: evaluateParsedSearch(property, parsed),
      petsPolicy: getPetsPolicy(property),
    }))
    .filter(({ property, evaluation, petsPolicy }) => {
      const matchesType =
        !filters.type ||
        (filters.type === "Monoambiente"
          ? isMonoambiente(property)
          : property.type === filters.type);

      return (
        (!hasQuery || evaluation.matches) &&
        (!filters.zone || property.zone === filters.zone) &&
        matchesType &&
        (!min || getPropertyPriceInCurrency(property, min.currency) >= min.amount) &&
        (!max || getPropertyPriceInCurrency(property, max.currency) <= max.amount) &&
        property.bedrooms >= bedrooms &&
        property.bathrooms >= bathrooms &&
        (!filters.pets || petsPolicy !== "not_allowed") &&
        (!filters.garage || property.garage > 0)
      );
    })
    .sort(
      (first, second) =>
        (filters.pets ? petsRank(first.petsPolicy) - petsRank(second.petsPolicy) : 0) ||
        (hasQuery ? second.evaluation.score - first.evaluation.score : 0) ||
        featuredRank(first.property) - featuredRank(second.property) ||
        first.index - second.index,
    )
    .map(({ property, petsPolicy }) => ({ property, petsPolicy }));
}

// Plain-language summary of the search, for the price hint and the WhatsApp messages.
export function describeRentalSearch(filters: RentalSearchFilters, displayCurrency: DisplayCurrency) {
  const { min, max } = getPriceBounds(filters, displayCurrency);
  const query = filters.query.trim();
  const bedrooms = Number(filters.bedrooms);
  const bathrooms = Number(filters.bathrooms);
  const kind = filters.type ? filters.type.toLocaleLowerCase("es") : filters.zone ? "vivienda" : "";
  return [
    kind ? `${kind}${filters.zone ? ` en ${filters.zone}` : ""}` : null,
    describePriceBounds(min, max),
    bedrooms ? `${bedrooms} ${bedrooms === 1 ? "dormitorio" : "dormitorios"} o más` : null,
    bathrooms ? `${bathrooms} ${bathrooms === 1 ? "baño" : "baños"} o más` : null,
    filters.pets ? "que acepte mascotas" : null,
    filters.garage ? "con parqueo" : null,
    query ? `búsqueda “${query}”` : null,
  ].filter((part): part is string => Boolean(part));
}

export function describePriceBounds(min: PriceBound | null, max: PriceBound | null) {
  if (min && max) return `entre ${formatPriceBound(min)} y ${formatPriceBound(max)} por mes`;
  if (max) return `hasta ${formatPriceBound(max)} por mes`;
  if (min) return `desde ${formatPriceBound(min)} por mes`;
  return null;
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

function petsRank(policy: PetsPolicy) {
  return policy === "allowed" ? 0 : 1;
}

function featuredRank(property: Property) {
  return property.listingPlan === "featured" ? 0 : 1;
}
