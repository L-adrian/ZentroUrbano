import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BellRing, Box, ClipboardList } from "lucide-react";
import { AdminAccountsOverview } from "@/components/admin-accounts-overview";
import { AdminContactLeads } from "@/components/admin-contact-leads";
import { AdminListingFunnel } from "@/components/admin-listing-funnel";
import { AdminListingHealth } from "@/components/admin-listing-health";
import { getAdminAccountsOverview, getAdminListingHealth } from "@/lib/admin-accounts";
import { buildListingFunnel } from "@/lib/listing-funnel";
import { getListingFunnel30 } from "@/lib/property-audience";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Admin interno",
  description: "Panel privado para gestionar propiedades, cuentas y leads de Zentro Urbano.",
  path: "/admin",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [properties, accountsOverview, funnel] = await Promise.all([
    getPublishedPropertiesData(),
    getAdminAccountsOverview(),
    getListingFunnel30().catch((error) => {
      console.error("listing funnel query failed", error);
      return null;
    }),
  ]);
  const health = await getAdminListingHealth(properties);
  const titles = new Map(properties.map((property) => [property.slug, property.title]));
  const funnelRows = funnel ? buildListingFunnel(funnel.counts, funnel.sources, titles) : null;

  return (
    <main className="bg-neutral-50">
      <section className="border-b border-black/10 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
            Acceso privado
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_0.42fr] lg:items-end">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
              Panel privado para revisar cuentas, fichas y leads.
            </h1>
            <p className="text-base leading-7 text-neutral-600">
              Revisa cuentas, fichas asignadas, leads y estado operativo sin entrar al panel de
              cada cliente.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/solicitudes" className="zu-button zu-button-primary"><ClipboardList size={18} />Revisar solicitudes y fotos recibidas</Link>
            <Link href="/admin/alertas" className="zu-button zu-button-secondary"><BellRing size={18} />Alertas de búsqueda</Link>
            <Link href="/admin/recorridos" className="zu-button zu-button-secondary"><Box size={18} />Gestionar recorridos 3D</Link>
            <a href="#anuncios-con-avisos" className="zu-button zu-button-secondary">Avisos ({health.reported.length})</a>
            <a href="#disponibilidad-por-confirmar" className="zu-button zu-button-secondary">Por confirmar ({health.checks.length})</a>
            <a href="#recorrido-de-anuncios" className="zu-button zu-button-secondary"><BarChart3 size={18} />Qué hizo la gente (30 días)</a>
          </div>
          <AdminListingHealth checks={health.checks} reported={health.reported} />
          <AdminListingFunnel rows={funnelRows} />
          <AdminAccountsOverview
            databaseReady={accountsOverview.databaseReady}
            accounts={accountsOverview.accounts}
          />
          <p className="text-sm text-neutral-600">Solo el administrador puede aprobar o rechazar solicitudes. Una ficha aparece en el catálogo después de aprobarla.</p>
          <AdminContactLeads properties={properties} />
        </div>
      </section>
    </main>
  );
}
