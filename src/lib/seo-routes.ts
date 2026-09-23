import { publishedProperties, type Operation, type Property } from "@/lib/properties";
import { isDirectRental } from "@/lib/rentals";

export const operationRouteMap: Record<string, Operation> = {
  alquiler: "Alquiler",
};

export function slugifyForRoute(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function citySlug(property: Pick<Property, "city">) {
  return slugifyForRoute(property.city);
}

export function zoneSlug(property: Pick<Property, "zone">) {
  return slugifyForRoute(property.zone);
}

export function operationSlug(operation: Operation) {
  if (operation === "Compra") {
    return "venta";
  }

  return slugifyForRoute(operation);
}

export function getOperationSeoRoutes(properties: Property[] = publishedProperties) {
  const uniqueRoutes = new Map<string, { operation: string; city: string; zone: string }>();

  properties.filter(isDirectRental).forEach((property) => {
    const route = {
      operation: operationSlug(property.operation),
      city: citySlug(property),
      zone: zoneSlug(property),
    };
    uniqueRoutes.set(`${route.operation}/${route.city}/${route.zone}`, route);
  });

  return Array.from(uniqueRoutes.values());
}

export function getDepartmentSeoRoutes(properties: Property[] = publishedProperties) {
  const uniqueRoutes = new Map<string, { zone: string }>();

  properties
    .filter((property) => isDirectRental(property) && property.type === "Departamento")
    .forEach((property) => {
      uniqueRoutes.set(zoneSlug(property), { zone: zoneSlug(property) });
    });

  return Array.from(uniqueRoutes.values());
}

export function filterPropertiesBySeoRoute({
  operationSlugParam,
  citySlugParam,
  zoneSlugParam,
  properties = publishedProperties,
}: {
  operationSlugParam: string;
  citySlugParam: string;
  zoneSlugParam: string;
  properties?: Property[];
}) {
  const operation = operationRouteMap[operationSlugParam];

  if (!operation) {
    return [];
  }

  return properties.filter(
    (property) =>
      isDirectRental(property) &&
      property.operation === operation &&
      citySlug(property) === citySlugParam &&
      zoneSlug(property) === zoneSlugParam,
  );
}

export function filterDepartmentsByZone(
  zoneSlugParam: string,
  properties: Property[] = publishedProperties,
) {
  return properties.filter(
    (property) =>
      isDirectRental(property) &&
      property.type === "Departamento" &&
      zoneSlug(property) === zoneSlugParam,
  );
}
