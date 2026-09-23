import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClientDashboard } from "@/components/client-dashboard";
import { getCurrentAccount, getCurrentDashboardAccount } from "@/lib/mysql-auth";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Panel cliente",
  description: "Panel de reportes para propietarios con viviendas en alquiler en Zentro Urbano.",
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

  return (
    <Suspense fallback={<DashboardFallback />}>
      <ClientDashboard account={dashboard} />
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <main className="min-h-[70svh] bg-neutral-50 px-4 py-16">
      <div className="mx-auto max-w-7xl rounded-[28px] border border-black/10 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-500">Cargando panel...</p>
      </div>
    </main>
  );
}
