import {
  getPropertyBySlug,
  publishedProperties,
  type Property,
} from "@/lib/properties";
import {
  directRentalDemoProperties,
  getDirectRentalDemoBySlug,
} from "@/lib/direct-rental-demo";
import { hasDatabaseConfig, queryOne, queryRows } from "@/lib/mysql";
import { isDirectRental } from "@/lib/rentals";
import { parsePropertyExchangeRate } from "@/lib/currency";
import { getRetiredDemoSlugs } from "@/lib/demo-replacements";

export type PropertyRow = {
  id: string;
  slug: string;
  title: string;
  type: Property["type"];
  operation: Property["operation"];
  price: number;
  currency: Property["currency"];
  exchange_rate?: number | string | null;
  city: string;
  zone: string;
  address: string | null;
  bedrooms: number;
  bathrooms: number;
  garage: number;
  area: number;
  pets: boolean;
  furnished: boolean;
  security: boolean;
  pool: boolean;
  patio: boolean;
  grill: boolean;
  elevator: boolean;
  short_description: string;
  long_description: string;
  requirements: unknown;
  images: unknown;
  video: string | null;
  map_url: string | null;
  whatsapp: string | null;
  ideal_for: unknown;
  tags: unknown;
  neighborhood_highlights: unknown;
  listing_plan: Property["listingPlan"];
  featured: boolean;
  published: boolean;
  owner_profile?: unknown;
  rental_details?: unknown;
  availability_confirmed_at?: Date | string | null;
  is_seeded: boolean;
  coordinates: unknown;
};

export async function getPublishedPropertiesData() {
  try {
    const data = await queryRows<PropertyRow>(
      `select *
         from properties
        where published = 1
        order by
          case when listing_plan = 'featured' then 0 else 1 end,
          updated_at desc`,
    );

    const storedProperties = data ? data.map(mapPropertyRow) : publishedProperties;

    const retired = await getRetiredDemoSlugs();
    return mergeProperties(directRentalDemoProperties, storedProperties)
      .filter(property => !retired.has(property.slug) && isDirectRental(property))
      .sort(sortPropertiesByVisibility);
  } catch {
    if (hasDatabaseConfig()) return [];
    return mergeProperties(
      directRentalDemoProperties,
      hasDatabaseConfig() ? [] : publishedProperties,
    ).filter(isDirectRental).sort(sortPropertiesByVisibility);
  }
}

export async function getPropertyBySlugData(slug: string) {
  const demoFallback = getDirectRentalDemoBySlug(slug);
  const candidate = demoFallback ?? getPropertyBySlug(slug);
  const fallback = candidate && isDirectRental(candidate) ? candidate : undefined;

  try {
    if (demoFallback && (await getRetiredDemoSlugs()).has(slug)) return undefined;
    const data = await queryOne<PropertyRow>(
      "select * from properties where slug = :slug and published = 1 limit 1",
      { slug },
    );

    if (!data) {
      if (hasDatabaseConfig()) {
        return demoFallback;
      }

      return fallback;
    }

    const property = mapPropertyRow(data);
    return isDirectRental(property) ? property : undefined;
  } catch {
    return hasDatabaseConfig() ? undefined : fallback;
  }
}

export async function getSimilarPropertiesData(property: Property) {
  const properties = (await getPublishedPropertiesData()).filter(isDirectRental);
  const similar = properties
    .filter((candidate) => candidate.slug !== property.slug)
    .filter(
      (candidate) =>
        candidate.zone === property.zone ||
        candidate.operation === property.operation ||
        candidate.idealFor.some((tag) => property.idealFor.includes(tag)),
    )
    .slice(0, 3);

  return similar;
}

export async function getFeaturedPropertiesData() {
  const properties = await getPublishedPropertiesData();

  return properties.filter((property) => property.listingPlan === "featured");
}

export function mapPropertyRow(row: PropertyRow): Property {
  const fallback = getDirectRentalDemoBySlug(row.slug) ?? getPropertyBySlug(row.slug);
  const coordinates = parseCoordinates(row.coordinates, fallback?.coordinates);
  const owner = parseJson(row.owner_profile) as {name:string;email:string;phone:string;avatar:string;verified:boolean}|null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    operation: row.operation,
    price: Number(row.price),
    currency: row.currency,
    exchangeRate: row.currency === "USD" ? parsePropertyExchangeRate(row.exchange_rate) : null,
    rentalDetails: parseJson(row.rental_details) || undefined,
    city: row.city,
    zone: row.zone,
    address: row.address ?? `${row.zone}, ${row.city}`,
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    garage: Number(row.garage),
    area: Number(row.area),
    pets: Boolean(row.pets),
    furnished: Boolean(row.furnished),
    security: Boolean(row.security),
    pool: Boolean(row.pool),
    patio: Boolean(row.patio),
    grill: Boolean(row.grill),
    elevator: Boolean(row.elevator),
    shortDescription: row.short_description,
    longDescription: row.long_description,
    requirements: parseStringArray(row.requirements, fallback?.requirements ?? []),
    images: parseStringArray(row.images, fallback?.images ?? []),
    video: row.video ?? undefined,
    mapUrl:
      row.map_url ??
      `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`,
    whatsapp: row.whatsapp ?? fallback?.whatsapp ?? "59170000000",
    idealFor: parseStringArray(row.ideal_for, fallback?.idealFor ?? []),
    tags: parseStringArray(row.tags, fallback?.tags ?? []),
    listingPlan: row.listing_plan,
    publisher:
      owner ? {name:owner.name,shortName:owner.name.slice(0,2).toUpperCase(),kind:"owner",verified:owner.verified === true,brandColor:"#087c65",brandTextColor:"#ffffff"} : fallback?.publisher ?? {
        name: "Zentro Urbano verificada",
        shortName: "M",
        kind: "agency",
        verified: true,
        brandColor: "#21352b",
        brandTextColor: "#ffffff",
      },
    agent:
      owner ? {name:owner.name,role:"Propietario",email:owner.email,phone:row.whatsapp || owner.phone,whatsapp:row.whatsapp || owner.phone,photo:owner.avatar || "",areas:[row.zone],verified:owner.verified === true,responseTime:"Contacta directamente con el propietario"} : fallback?.agent ?? {
        name: "Equipo Zentro Urbano",
        role: "Asesor inmobiliario",
        email: "hola@zentrourbano.com",
        phone: "+591 7000 0000",
        whatsapp: row.whatsapp ?? "59170000000",
        photo:
          "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=82",
        areas: [row.zone],
        verified: true,
        responseTime: "Responde normalmente durante el dia",
      },
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    availabilityConfirmedAt: row.availability_confirmed_at
      ? new Date(row.availability_confirmed_at).toISOString()
      : undefined,
    isSeeded: Boolean(row.is_seeded),
    coordinates,
    neighborhoodHighlights: parseStringArray(
      row.neighborhood_highlights,
      fallback?.neighborhoodHighlights ?? [],
    ),
  };
}

function mergeProperties(primary: Property[], secondary: Property[]) {
  const merged = new Map<string, Property>();

  for (const property of [...primary, ...secondary]) {
    merged.set(property.slug, property);
  }

  return Array.from(merged.values());
}

function sortPropertiesByVisibility(a: Property, b: Property) {
  const planRank = (a.listingPlan === "featured" ? 0 : 1) - (b.listingPlan === "featured" ? 0 : 1);

  if (planRank !== 0) {
    return planRank;
  }

  return a.id.localeCompare(b.id);
}

function parseStringArray(value: unknown, fallback: string[]) {
  const parsed = parseJson(value);

  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is string => typeof item === "string");
  }

  return fallback;
}

function parseCoordinates(value: unknown, fallback?: Property["coordinates"]) {
  const parsed = parseJson(value);

  if (
    parsed &&
    typeof parsed === "object" &&
    "lat" in parsed &&
    "lng" in parsed &&
    typeof parsed.lat === "number" &&
    typeof parsed.lng === "number"
  ) {
    return { lat: parsed.lat, lng: parsed.lng };
  }

  return fallback ?? { lat: -17.7833, lng: -63.1821 };
}

function parseJson(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}
