import { publishedProperties, type Operation, type Property } from "@/lib/properties";
import { emptyRentalSearchFilters, searchRentals, type RentalSearchFilters } from "@/lib/property-search";
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

export function filterPropertiesByCity({
  operationSlugParam,
  citySlugParam,
  properties = publishedProperties,
}: {
  operationSlugParam: string;
  citySlugParam: string;
  properties?: Property[];
}) {
  const operation = operationRouteMap[operationSlugParam];

  if (!operation) {
    return [];
  }

  return properties.filter(
    (property) => isDirectRental(property) && property.operation === operation && citySlug(property) === citySlugParam,
  );
}

export function getCitySeoRoutes(properties: Property[] = publishedProperties) {
  const uniqueRoutes = new Map<string, { operation: string; city: string }>();

  properties.filter(isDirectRental).forEach((property) => {
    const route = { operation: operationSlug(property.operation), city: citySlug(property) };
    uniqueRoutes.set(`${route.operation}/${route.city}`, route);
  });

  return Array.from(uniqueRoutes.values());
}

// Pages by need ("monoambientes", "con mascotas", "hasta Bs 2.000") at /alquiler/{ciudad}/{need}.
// They open the catalog with that filter and are offered to Google only with 3 or more real
// listings that fully match (noindex and out of the sitemap otherwise).
export const needPageMinListings = 3;

export type RentalNeedRoute = {
  slug: string;
  label: string;
  title: (city: string) => string;
  description: (city: string) => string;
  keywords: (city: string) => string[];
  filters: Partial<RentalSearchFilters>;
};

export const rentalNeedRoutes: RentalNeedRoute[] = [
  {
    slug: "monoambientes",
    label: "Monoambientes",
    title: (city) => `Monoambientes en alquiler en ${city}`,
    description: (city) => `Monoambientes en alquiler en ${city}, directo con el dueño. Precio, expensas y costo para entrar a la vista, sin comisiones.`,
    keywords: (city) => [`monoambientes en alquiler ${city}`, `monoambiente ${city}`, "alquiler monoambiente dueño directo"],
    filters: { type: "Monoambiente" },
  },
  {
    slug: "con-mascotas",
    label: "Aceptan mascotas",
    title: (city) => `Alquileres que aceptan mascotas en ${city}`,
    description: (city) => `Casas y departamentos en alquiler en ${city} donde el dueño acepta mascotas. Contacto directo, sin comisiones.`,
    keywords: (city) => [`alquiler con mascotas ${city}`, `departamento que acepta mascotas ${city}`, "alquiler pet friendly"],
    filters: { pets: true },
  },
  {
    slug: "hasta-2000-bs",
    label: "Hasta Bs 2.000",
    title: (city) => `Alquileres hasta Bs 2.000 en ${city}`,
    description: (city) => `Viviendas en alquiler de hasta Bs 2.000 por mes en ${city}, directo con el dueño y sin comisiones.`,
    keywords: (city) => [`alquiler económico ${city}`, `alquiler hasta 2000 bs ${city}`, "alquiler barato dueño directo"],
    filters: { maxPrice: "2000", priceCurrency: "BOB" },
  },
];

export function getRentalNeedRoute(slug: string) {
  return rentalNeedRoutes.find((route) => route.slug === slug);
}

// Real listings that fully match; homes where the datum is "a consultar" do not count.
export function countRentalNeedListings(route: RentalNeedRoute, properties: Property[]) {
  const real = properties.filter((property) => isDirectRental(property) && !property.isSeeded);
  return searchRentals(real, { ...emptyRentalSearchFilters, ...route.filters }, "BOB").filter(
    (match) => match.pending.length === 0,
  ).length;
}

export function getNeedSeoRoutes(properties: Property[] = publishedProperties) {
  return getCitySeoRoutes(properties).flatMap((cityRoute) => {
    const cityProperties = filterPropertiesByCity({
      operationSlugParam: cityRoute.operation,
      citySlugParam: cityRoute.city,
      properties,
    });
    return rentalNeedRoutes
      .filter((route) => countRentalNeedListings(route, cityProperties) >= needPageMinListings)
      .map((route) => ({ ...cityRoute, need: route.slug }));
  });
}
