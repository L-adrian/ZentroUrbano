import type { Metadata } from "next";
import { DepartmentEmpty } from "@/components/department-empty";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getDirectRentals, withoutOwnerContact } from "@/lib/rentals";
import { inSelectedDepartment } from "@/lib/region-server";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Mapa de alquileres directos",
  description:
    "Explora casas y departamentos en alquiler directo con el propietario desde el mapa de Santa Cruz.",
  path: "/mapa",
});

export default async function MapPage() {
  const { department, properties } = await inSelectedDepartment(getDirectRentals(await getPublishedPropertiesData()));

  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mapa de alquileres en {department.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Compara ubicaciones y contacta directamente al propietario.
        </p>
      </div>
      {properties.length ? <DirectRentalExplorer properties={withoutOwnerContact(properties)} initialView="split" layout="map" /> : <DepartmentEmpty department={department} />}
    </main>
  );
}
