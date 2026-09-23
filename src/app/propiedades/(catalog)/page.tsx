import type { Metadata } from "next";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import type { PropertyType } from "@/lib/properties";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getDirectRentals } from "@/lib/rentals";
import { buildSeoMetadata } from "@/lib/seo";

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

const validPropertyTypes: PropertyType[] = ["Casa", "Departamento"];

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const zone = firstParam(params.zone);
  const typeParam = firstParam(params.type);
  const minPrice = firstParam(params.minPrice);
  const maxPrice = firstParam(params.maxPrice);
  const bedrooms = firstParam(params.bedrooms);
  const bathrooms = firstParam(params.bathrooms);
  const amenity = firstParam(params.amenity);
  const propertyType = validPropertyTypes.find((type) => type === typeParam);
  const publishedProperties = await getPublishedPropertiesData();
  const directRentals = getDirectRentals(publishedProperties);

  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Alquileres directos en Santa Cruz
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Contacta al propietario sin intermediarios ni comisión inmobiliaria.
        </p>
      </div>

      <DirectRentalExplorer
        properties={directRentals}
        initialQuery={q}
        initialZone={zone}
        initialPropertyType={propertyType}
        initialMinPrice={minPrice}
        initialMaxPrice={maxPrice}
        initialBedrooms={bedrooms}
        initialBathrooms={bathrooms}
        initialAmenity={amenity}
      />
    </main>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
