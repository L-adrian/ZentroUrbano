import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { filterPropertiesBySeoRoute } from "@/lib/seo-routes";
import { buildSeoMetadata } from "@/lib/seo";

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
    description: `Casas y departamentos en alquiler directo con el propietario en ${zoneName}, Santa Cruz. Sin comisión inmobiliaria.`,
    path: `/${operation}/${city}/${zone}`,
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

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Alquiler directo en {zoneName}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Viviendas sin intermediarios ni comisión inmobiliaria.
        </p>
      </div>
      <DirectRentalExplorer properties={properties} initialZone={zoneName} />
    </main>
  );
}
