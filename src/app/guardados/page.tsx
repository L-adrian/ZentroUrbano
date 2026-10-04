import type { Metadata } from "next";
import { SavedListings } from "@/components/saved-listings";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getDirectRentals, withoutContactEmail } from "@/lib/rentals";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Tus alquileres guardados",
  description: "Las viviendas que guardaste en este teléfono, con precio, costo para entrar y disponibilidad.",
  path: "/guardados",
  // Personal list kept in the browser: nothing for Google here.
  noIndex: true,
});

export default async function SavedListingsPage() {
  const properties = withoutContactEmail(getDirectRentals(await getPublishedPropertiesData()));

  return (
    <main id="contenido" className="saved-listings-page zu-container">
      <h1>Tus alquileres guardados</h1>
      <p className="saved-listings-intro">
        Se guardan solo en este teléfono o computadora, sin crear una cuenta. Compara precio, lo que cuesta entrar y si el dueño confirmó que sigue disponible.
      </p>
      <SavedListings properties={properties} />
    </main>
  );
}
