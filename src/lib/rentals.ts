import { isExternalContactUrl } from "@/lib/property-contact";
import type { Property } from "@/lib/properties";

export const rentalPropertyTypes = ["Casa", "Departamento"] as const;

export function isRentalPropertyType(value: unknown) {
  return rentalPropertyTypes.some((type) => type === value);
}

export function isDirectRental(property: Property) {
  return (
    property.operation === "Alquiler" &&
    property.publisher.kind === "owner" &&
    isRentalPropertyType(property.type)
  );
}

export function getDirectRentals(properties: Property[]) {
  return properties.filter(isDirectRental);
}

export function getRentalZones(properties: Property[]) {
  return Array.from(new Set(properties.map((property) => property.zone)))
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, "es"));
}

// Catalog and map payloads are serialized into the page, so they leave out the owners' email and
// phone: one request would otherwise hand every number to a scraper. The listing page still shows
// them, and every card contacts through /api/propiedades/<slug>/whatsapp. A link to an original
// ad is not a phone, so it stays (the card shows "Ver anuncio original" for it).
export function withoutOwnerContact(properties: Property[]) {
  return properties.map((property) => ({
    ...property,
    whatsapp: isExternalContactUrl(property.whatsapp) ? property.whatsapp : "",
    agent: { ...property.agent, email: "", phone: "", whatsapp: "" },
  }));
}

export type RentalSummary = Pick<
  Property,
  "slug" | "title" | "zone" | "images" | "price" | "currency" | "exchangeRate" | "operation"
>;

// Just what a small strip ("Vistos recientemente") needs, so a page does not send every listing in full.
export function toRentalSummaries(properties: Property[]): RentalSummary[] {
  return properties.map(({ slug, title, zone, images, price, currency, exchangeRate, operation }) => ({
    slug,
    title,
    zone,
    images: images.slice(0, 1),
    price,
    currency,
    exchangeRate,
    operation,
  }));
}
