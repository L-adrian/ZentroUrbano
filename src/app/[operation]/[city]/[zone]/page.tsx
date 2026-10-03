import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import { withoutContactEmail } from "@/lib/rentals";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { filterPropertiesBySeoRoute } from "@/lib/seo-routes";
import { buildSeoMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ operation: string; city: string; zone: string }>;
}): Promise<Metadata> {
  const { operation, city, zone } = await params;
  const properties = filterPropertiesBySeoRoute({
    operationSlugParam: operation,
    citySlugParam: city,
    zoneSlugParam: zone,
    properties: await getPublishedPropertiesData(),
  });

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

export default async function OperationZonePage({
  params,
}: {
  params: Promise<{ operation: string; city: string; zone: string }>;
}) {
  const { operation, city, zone } = await params;
  const properties = filterPropertiesBySeoRoute({
    operationSlugParam: operation,
    citySlugParam: city,
    zoneSlugParam: zone,
    properties: await getPublishedPropertiesData(),
  });

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
    <main className="min-h-screen bg-white text-neutral-950">
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
      <DirectRentalExplorer properties={withoutContactEmail(properties)} initialZone={zoneName} />
    </main>
  );
}
