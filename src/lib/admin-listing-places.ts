import { curatedRentalProperties } from "@/lib/curated-rentals";
import type { Property } from "@/lib/properties";

// Listings written in the site's code are fixed there, so only database listings are editable.
export function adminListingPlaces(properties: Property[]) {
  const curated = new Set(curatedRentalProperties.map((property) => property.slug));
  return properties
    .filter((property) => !curated.has(property.slug))
    .map((property) => ({ slug: property.slug, title: property.title, city: property.city, zone: property.zone, lat: property.coordinates.lat, lng: property.coordinates.lng, ownerConfirmed: Boolean(property.rentalDetails?.locationConfirmedAt) }));
}
