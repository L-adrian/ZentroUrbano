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
