import { publishedProperties, type Property } from "@/lib/properties";

export type VerifiedAgency = {
  slug: string;
  name: string;
  shortName: string;
  brandColor: string;
  brandTextColor: string;
  propertyCount: number;
  featuredCount: number;
  zones: string[];
  specialties: string[];
  properties: Property[];
};

export function getVerifiedAgencies(properties: Property[] = publishedProperties): VerifiedAgency[] {
  const agencyMap = new Map<string, VerifiedAgency>();

  properties
    .filter((property) => property.publisher.kind === "agency" && property.publisher.verified)
    .forEach((property) => {
      const slug = slugifyAgency(property.publisher.name);
      const current = agencyMap.get(slug);

      if (!current) {
        agencyMap.set(slug, {
          slug,
          name: property.publisher.name,
          shortName: property.publisher.shortName,
          brandColor: property.publisher.brandColor,
          brandTextColor: property.publisher.brandTextColor,
          propertyCount: 1,
          featuredCount: property.listingPlan === "featured" ? 1 : 0,
          zones: [property.zone],
          specialties: [...property.idealFor],
          properties: [property],
        });
        return;
      }

      current.propertyCount += 1;
      current.featuredCount += property.listingPlan === "featured" ? 1 : 0;
      current.properties.push(property);

      if (!current.zones.includes(property.zone)) {
        current.zones.push(property.zone);
      }

      property.idealFor.forEach((tag) => {
        if (!current.specialties.includes(tag)) {
          current.specialties.push(tag);
        }
      });
    });

  return Array.from(agencyMap.values()).sort(
    (left, right) => right.featuredCount - left.featuredCount || right.propertyCount - left.propertyCount,
  );
}

function slugifyAgency(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
