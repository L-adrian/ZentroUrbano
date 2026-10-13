import type { Metadata } from "next";
import { DepartmentEmpty } from "@/components/department-empty";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getDirectRentals, withoutOwnerContact } from "@/lib/rentals";
import { inSelectedDepartment } from "@/lib/region-server";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Alquileres directos en Santa Cruz",
  description:
    "Busca casas, departamentos y monoambientes en alquiler directo con el propietario. Sin inmobiliarias ni comisiones.",
  path: "/propiedades",
  keywords: [
    "alquiler SCZ",
    "alquiler directo Santa Cruz",
    "departamentos en alquiler Santa Cruz",
    "casas en alquiler sin inmobiliaria",
  ],
});

// The explorer reads its filters from the URL itself (q, zone, type, minPrice, maxPrice, currency,
// bedrooms, bathrooms, amenity), so they survive going back from a listing and can be shared.
export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const typeParam = (await searchParams).type;
  const isBusiness = [typeParam].flat().includes("Local");
  const publishedProperties = await getPublishedPropertiesData();
  const { department, properties: directRentals } = await inSelectedDepartment(getDirectRentals(publishedProperties));

  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {isBusiness ? `Locales en alquiler en ${department.name}` : `Alquileres directos en ${department.name}`}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {isBusiness ? "Locales, tiendas y oficinas para tu negocio, directo con el dueño y sin comisión." : "Contacta al propietario sin intermediarios ni comisión inmobiliaria."}
        </p>
      </div>

      {directRentals.length ? <DirectRentalExplorer properties={withoutOwnerContact(directRentals)} /> : <DepartmentEmpty department={department} />}
    </main>
  );
}
