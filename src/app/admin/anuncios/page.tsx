import type { Metadata } from "next";
import { AdminListingHealth } from "@/components/admin-listing-health";
import { AdminListingPlaces } from "@/components/admin-listing-places";
import { getAdminListingHealth } from "@/lib/admin-accounts";
import { adminListingPlaces } from "@/lib/admin-listing-places";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { buildSeoMetadata } from "@/lib/seo";
import { AdminHeading } from "../admin-heading";

export const metadata: Metadata = buildSeoMetadata({ title: "Avisos y ubicación", description: "Anuncios con avisos, disponibilidad por confirmar y ubicación.", path: "/admin/anuncios", noIndex: true });
export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  const properties = await getPublishedPropertiesData();
  const health = await getAdminListingHealth(properties);
  const places = adminListingPlaces(properties);
  return (
    <main className="admin-page">
      <AdminHeading eyebrow="ANUNCIOS" title="Avisos y ubicación">Anuncios que la gente marcó como no disponibles, anuncios que hace tiempo no confirman disponibilidad y la zona y ubicación de cada anuncio.</AdminHeading>
      <nav className="admin-jump" aria-label="Ir a">
        <a href="#anuncios-con-avisos">Avisos ({health.reported.length})</a>
        <a href="#disponibilidad-por-confirmar">Por confirmar ({health.checks.length})</a>
        <a href="#zona-y-ubicacion">Zona y ubicación ({places.length})</a>
      </nav>
      <AdminListingHealth checks={health.checks} reported={health.reported} />
      <AdminListingPlaces listings={places} />
    </main>
  );
}
