import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClientDashboard } from "@/components/client-dashboard";
import { getCurrentAccount, getCurrentDashboardAccount, getCurrentLogin } from "@/lib/mysql-auth";
import { getVisitSettingsFor, listBookingsFor } from "@/lib/visits";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Mi cuenta",
  description: "Tus anuncios de alquiler en Zentro Urbano: visitas, contactos, disponibilidad, solicitudes y tu perfil.",
  path: "/cliente",
  noIndex: true,
});

export default async function ClientPage() {
  const account = await getCurrentAccount();
  if (account && account.kind !== "owner") {
    redirect("/propiedades");
  }

  const dashboard = await getCurrentDashboardAccount();

  if (!dashboard) {
    redirect("/login?next=/cliente");
  }

  // Visits booked on the owner's listings; null while the visit tables are missing.
  const slugs = (dashboard.properties ?? []).map((property) => property.slug);
  const [bookings, settings, login] = await Promise.all([
    listBookingsFor(slugs).catch(() => null),
    getVisitSettingsFor(slugs).catch(() => null),
    getCurrentLogin(),
  ]);
  const visits = bookings && settings ? { bookings, settings } : null;

  return (
    <Suspense fallback={<DashboardFallback />}>
      <ClientDashboard
        account={dashboard}
        visits={visits}
        login={login && login.account_id === dashboard.id ? { hasPassword: Boolean(Number(login.has_password)) } : null}
      />
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <main className="min-h-[70svh] bg-neutral-50 px-4 py-16">
      <div className="mx-auto max-w-7xl rounded-[28px] border border-black/10 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-500">Cargando tu cuenta...</p>
      </div>
    </main>
  );
}
