import type { Metadata } from "next";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getDirectRentals } from "@/lib/rentals";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Mapa de alquileres directos",
  description:
    "Explora casas y departamentos en alquiler directo con el propietario desde el mapa de Santa Cruz.",
  path: "/mapa",
});

export default async function MapPage() {
  const properties = getDirectRentals(await getPublishedPropertiesData());

  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mapa de alquileres</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Compara ubicaciones y contacta directamente al propietario.
        </p>
      </div>
      <DirectRentalExplorer properties={properties} initialView="map" />
    </main>
  );
}
