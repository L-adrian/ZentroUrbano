import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { AdminAccountsOverview } from "@/components/admin-accounts-overview";
import { AdminContactLeads } from "@/components/admin-contact-leads";
import { getAdminAccountsOverview } from "@/lib/admin-accounts";
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
  const [properties, accountsOverview] = await Promise.all([
    getPublishedPropertiesData(),
    getAdminAccountsOverview(),
  ]);

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
          <Link href="/admin/solicitudes" className="zu-button zu-button-primary"><ClipboardList size={18} />Revisar solicitudes y fotos recibidas</Link>
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
