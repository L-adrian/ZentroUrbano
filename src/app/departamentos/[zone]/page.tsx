import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { filterDepartmentsByZone, getDepartmentSeoRoutes } from "@/lib/seo-routes";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  return getDepartmentSeoRoutes(await getPublishedPropertiesData());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zone: string }>;
}): Promise<Metadata> {
  const { zone } = await params;
  const properties = filterDepartmentsByZone(zone, await getPublishedPropertiesData());

  if (properties.length === 0) {
    return { title: "Departamentos no encontrados", robots: { index: false, follow: false } };
  }

  const zoneName = properties[0].zone;
  return buildSeoMetadata({
    title: `Departamentos en alquiler en ${zoneName}`,
    description: `Departamentos en alquiler directo con el propietario en ${zoneName}, Santa Cruz. Sin comisión inmobiliaria.`,
    path: `/departamentos/${zone}`,
    keywords: [
      `departamentos en alquiler ${zoneName}`,
      `alquiler directo ${zoneName}`,
      "departamentos sin inmobiliaria Santa Cruz",
    ],
  });
}

export default async function DepartmentZonePage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone } = await params;
  const properties = filterDepartmentsByZone(zone, await getPublishedPropertiesData());

  if (properties.length === 0) {
    notFound();
  }

  const zoneName = properties[0].zone;
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Departamentos en alquiler en {zoneName}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">Contacto directo con el propietario.</p>
      </div>
      <DirectRentalExplorer
        properties={properties}
        initialZone={zoneName}
        initialPropertyType="Departamento"
      />
    </main>
  );
}
