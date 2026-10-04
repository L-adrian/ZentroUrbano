import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import type { Property } from "@/lib/properties";
import { withoutContactEmail } from "@/lib/rentals";
import { getPublishedPropertiesData } from "@/lib/property-data";
import {
  countRentalNeedListings,
  filterPropertiesByCity,
  filterPropertiesBySeoRoute,
  getRentalNeedRoute,
  needPageMinListings,
  rentalNeedRoutes,
  type RentalNeedRoute,
} from "@/lib/seo-routes";
import { buildSeoMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

type Params = Promise<{ operation: string; city: string; zone: string }>;

function cityLabel(city: string) {
  return city === "Santa Cruz" ? "Santa Cruz de la Sierra" : city;
}

// The last segment is a zone ("equipetrol") or a need ("monoambientes", "con-mascotas", "hasta-2000-bs").
async function loadRoute(operation: string, city: string, segment: string) {
  const all = await getPublishedPropertiesData();
  const cityProperties = filterPropertiesByCity({ operationSlugParam: operation, citySlugParam: city, properties: all });
  const need = getRentalNeedRoute(segment);
  if (need) return { kind: "need" as const, need, cityProperties };
  const zoneProperties = filterPropertiesBySeoRoute({
    operationSlugParam: operation,
    citySlugParam: city,
    zoneSlugParam: segment,
    properties: all,
  });
  return { kind: "zone" as const, zoneProperties, cityProperties };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { operation, city, zone } = await params;
  const route = await loadRoute(operation, city, zone);

  if (route.kind === "need") {
    if (route.cityProperties.length === 0) {
      return { title: "Alquileres no encontrados", robots: { index: false, follow: false } };
    }
    const name = cityLabel(route.cityProperties[0].city);
    return buildSeoMetadata({
      title: route.need.title(name),
      description: route.need.description(name),
      path: `/${operation}/${city}/${zone}`,
      // Offered to Google only with 3 or more real listings.
      noIndex: countRentalNeedListings(route.need, route.cityProperties) < needPageMinListings,
      keywords: route.need.keywords(name),
    });
  }

  const properties = route.zoneProperties;
  if (properties.length === 0) {
    return { title: "Alquileres no encontrados", robots: { index: false, follow: false } };
  }

  const zoneName = properties[0].zone;
  return buildSeoMetadata({
    title: `Alquiler directo en ${zoneName}`,
    description: `Casas y departamentos en alquiler en ${zoneName}, Santa Cruz de la Sierra, directo con el dueño. Sin inmobiliarias ni comisiones.`,
    path: `/${operation}/${city}/${zone}`,
    noIndex: properties.every((property) => property.isSeeded),
    keywords: [
      `alquiler en ${zoneName}`,
      `alquiler directo ${zoneName}`,
      `departamentos en ${zoneName}`,
      "alquiler sin inmobiliaria Santa Cruz",
    ],
  });
}

export default async function OperationZonePage({ params }: { params: Params }) {
  const { operation, city, zone } = await params;
  const route = await loadRoute(operation, city, zone);

  if (route.kind === "need") {
    if (operation !== "alquiler" || route.cityProperties.length === 0) {
      notFound();
    }
    return <NeedPage operation={operation} city={city} need={route.need} properties={route.cityProperties} />;
  }

  const properties = route.zoneProperties;
  if (operation !== "alquiler" || properties.length === 0) {
    notFound();
  }

  const zoneName = properties[0].zone;
  const cityName = properties[0].city;
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: `Alquiler en ${cityName}`, path: `/${operation}/${city}` },
    { name: zoneName, path: `/${operation}/${city}/${zone}` },
  ]);

  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbs)} />
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Alquiler directo en {zoneName}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Viviendas sin intermediarios ni comisión inmobiliaria.{" "}
          <Link href={`/${operation}/${city}`} className="font-medium text-neutral-900 underline">
            Ver todos los alquileres en {cityName}
          </Link>
        </p>
      </div>
      {/* The whole city catalog with this zone selected: "Todas las zonas" really shows everything,
          and "Cerca de {zona}" can offer homes from neighboring zones. */}
      <DirectRentalExplorer properties={withoutContactEmail(route.cityProperties)} initialFilters={{ zone: zoneName }} />
    </main>
  );
}

function NeedPage({
  operation,
  city,
  need,
  properties,
}: {
  operation: string;
  city: string;
  need: RentalNeedRoute;
  properties: Property[];
}) {
  const name = cityLabel(properties[0].city);
  const count = countRentalNeedListings(need, properties);
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: `Alquiler en ${name}`, path: `/${operation}/${city}` },
    { name: need.label, path: `/${operation}/${city}/${need.slug}` },
  ]);

  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbs)} />
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{need.title(name)}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">
          {count === 1 ? "1 vivienda publicada" : `${count} viviendas publicadas`} por sus dueños, sin inmobiliarias ni comisiones.{" "}
          <Link href={`/${operation}/${city}`} className="font-medium text-neutral-900 underline">
            Ver todos los alquileres en {name}
          </Link>
        </p>
        <nav className="need-links" aria-label="Otras búsquedas">
          {rentalNeedRoutes
            .filter((route) => route.slug !== need.slug)
            .map((route) => (
              <Link key={route.slug} href={`/${operation}/${city}/${route.slug}`}>{route.label}</Link>
            ))}
        </nav>
      </div>
      <DirectRentalExplorer properties={withoutContactEmail(properties)} initialFilters={need.filters} />
    </main>
  );
}
