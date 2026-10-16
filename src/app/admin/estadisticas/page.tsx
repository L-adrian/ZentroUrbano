import type { Metadata } from "next";
import { AdminListingFunnel } from "@/components/admin-listing-funnel";
import { buildListingFunnel } from "@/lib/listing-funnel";
import { getListingFunnel30 } from "@/lib/property-audience";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { buildSeoMetadata } from "@/lib/seo";
import { AdminHeading } from "../admin-heading";

export const metadata: Metadata = buildSeoMetadata({ title: "Qué hizo la gente", description: "Recorrido de la gente en cada anuncio durante 30 días.", path: "/admin/estadisticas", noIndex: true });
export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const [properties, funnel] = await Promise.all([
    getPublishedPropertiesData(),
    getListingFunnel30().catch((error) => {
      console.error("listing funnel query failed", error);
      return null;
    }),
  ]);
  // Listings written in the site's code are not in the table of properties; their titles come from here.
  const titles = new Map([...properties.map((property) => [property.slug, property.title] as const), ...(funnel?.listings ?? []).map((listing) => [listing.slug, listing.title] as const)]);
  const live = new Set(properties.map((property) => property.slug));
  const hidden = new Set((funnel?.listings ?? []).filter((listing) => !live.has(listing.slug)).map((listing) => listing.slug));
  const rows = funnel ? buildListingFunnel(funnel.counts, funnel.sources, titles, 60, hidden) : null;
  return (
    <main className="admin-page">
      <AdminHeading eyebrow="DATOS" title="Qué hizo la gente" />
      <AdminListingFunnel rows={rows} />
    </main>
  );
}
