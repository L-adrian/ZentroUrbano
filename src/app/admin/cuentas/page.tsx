import type { Metadata } from "next";
import { AdminAccountsOverview } from "@/components/admin-accounts-overview";
import { AdminContactLeads } from "@/components/admin-contact-leads";
import { getAdminAccountsOverview } from "@/lib/admin-accounts";
import { listAgencyAccounts } from "@/lib/crm";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { buildSeoMetadata } from "@/lib/seo";
import { AdminHeading } from "../admin-heading";

export const metadata: Metadata = buildSeoMetadata({ title: "Cuentas y contactos", description: "Cuentas de propietarios y contactos recibidos.", path: "/admin/cuentas", noIndex: true });
export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const [properties, overview, agencies] = await Promise.all([
    getPublishedPropertiesData(),
    getAdminAccountsOverview(),
    listAgencyAccounts().catch((error) => {
      console.error("admin agencies failed", error);
      return null;
    }),
  ]);
  return (
    <main className="admin-page">
      <AdminHeading eyebrow="PERSONAS" title="Cuentas y contactos">Cuentas de propietarios con sus fichas, y los contactos que llegaron desde el sitio.</AdminHeading>
      <AdminAccountsOverview databaseReady={overview.databaseReady} accounts={overview.accounts} agencies={agencies ? Object.fromEntries(agencies) : null} />
      <p className="text-sm text-neutral-600">Solo el administrador puede aprobar o rechazar solicitudes. Una ficha aparece en el catálogo después de aprobarla.</p>
      <AdminContactLeads properties={properties} />
    </main>
  );
}
