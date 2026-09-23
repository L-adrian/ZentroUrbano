import { getPropertyPriceInCurrency } from "@/lib/currency";
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
  "la",
  "las",
  "lo",
  "los",
  "me",
  "necesito",
  "o",
  "para",
  "por",
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

export function hasSearchQuery(value: string | null | undefined) {
  const parsed = parseSearchQuery(value ?? "");
  return parsed.meaningfulTokens.length > 0;
}

export function evaluatePropertySearch(
  property: Property,
  query: string | null | undefined,
): PropertySearchEvaluation {
  const parsed = parseSearchQuery(query ?? "");

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

function parseSearchQuery(query: string): ParsedSearchQuery {
  const normalized = normalizeSearchText(query);
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
  const { maxPriceUsd, maxPriceBob } = detectPriceIntent(tokens, consumedIndexes);

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

function detectPriceIntent(tokens: string[], consumedIndexes: Set<number>) {
  let maxPriceUsd: number | undefined;
  let maxPriceBob: number | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const amount = getTokenNumber(tokens[index]);

    if (amount === null || amount <= 20) {
      continue;
    }

    const nearbyCurrency = findNearbyCurrency(tokens, index);

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
