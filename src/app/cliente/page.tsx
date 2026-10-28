import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AliadoDashboard, type AliadoPanelData } from "@/components/aliado-dashboard";
import { ClientDashboard } from "@/components/client-dashboard";
import { getCurrentAccount, getCurrentDashboardAccount, getCurrentLogin } from "@/lib/mysql-auth";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { findDepartment } from "@/lib/regions";
import { getDirectRentals } from "@/lib/rentals";
import { getTeamMemberByAccount } from "@/lib/team";
import { teamRoleLabels } from "@/lib/team-roles";
import { visitWhenLabel } from "@/lib/visit-slots";
import { getVisitSettingsFor, listBookingsFor } from "@/lib/visits";
import { boliviaToday } from "@/lib/aliado-report-input";
import { getPanelState, listMemberReports } from "@/lib/aliado-reports";
import { buildSeoMetadata } from "@/lib/seo";
import { getUrbanitoLink, urbanitoBotUsername, urbanitoEnabled } from "@/lib/urbanito";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Mi cuenta",
  description: "Tus anuncios de alquiler en Zentro Urbano: visitas, contactos, disponibilidad, solicitudes y tu perfil.",
  path: "/cliente",
  noIndex: true,
});

export default async function ClientPage() {
  const account = await getCurrentAccount();
  if (account?.kind === "aliado" && account.storage === "mysql") {
    return <AliadoDashboard data={await aliadoPanel(account.id, account.display_name, account.role_label)} />;
  }
  if (account && account.kind !== "owner") {
    redirect("/propiedades");
  }

  const dashboard = await getCurrentDashboardAccount();

  if (!dashboard) {
    redirect("/login?next=/cliente");
  }

  // Visits booked on the owner's listings; null while the visit tables are missing.
  const slugs = (dashboard.properties ?? []).map((property) => property.slug);
  const [bookings, settings, login, urbanitoLink] = await Promise.all([
    listBookingsFor(slugs).catch(() => null),
    getVisitSettingsFor(slugs).catch(() => null),
    getCurrentLogin(),
    urbanitoEnabled() ? getUrbanitoLink(dashboard.id).catch(() => null) : null,
  ]);
  const visits = bookings && settings ? { bookings, settings } : null;

  return (
    <Suspense fallback={<DashboardFallback />}>
      <ClientDashboard
        account={dashboard}
        visits={visits}
        login={login && login.account_id === dashboard.id ? { hasPassword: Boolean(Number(login.has_password)) } : null}
        urbanito={urbanitoLink ? { linked: urbanitoLink.linked, botUsername: urbanitoBotUsername } : null}
      />
    </Suspense>
  );
}

// An aliado sees only the visits they host and the homes they work on.
async function aliadoPanel(accountId: string, name: string, roleLabel: string): Promise<AliadoPanelData> {
  const [team, login] = await Promise.all([getTeamMemberByAccount(accountId).catch(() => null), getCurrentLogin()]);
  const hasPassword = Boolean(login && login.account_id === accountId && Number(login.has_password));
  if (!team) return { name, roleLabel, hasPassword, member: null, homes: [], visits: [], reports: null, panel: null };
  const { member, assignments } = team;
  const properties = new Map(getDirectRentals(await getPublishedPropertiesData()).map((property) => [property.slug, property]));
  // The log of this month and the previous one (the last 7 days can cross a month); null while
  // 012_aliado_reports is missing.
  const today = boliviaToday();
  const previousMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1)).toISOString().slice(0, 10);
  const [bookings, reports, panel] = await Promise.all([
    listBookingsFor(assignments.map((assignment) => assignment.propertySlug)).catch(() => null),
    listMemberReports(member.id, previousMonth, today).catch(() => null),
    getPanelState(member.id).catch(() => null),
  ]);
  return {
    name,
    roleLabel,
    hasPassword,
    reports,
    panel,
    member: {
      name: member.name,
      slug: member.slug,
      photoUrl: member.photoUrl,
      department: findDepartment(member.department)?.name ?? "",
      levelLabel: teamRoleLabels[member.level],
      bio: member.bio,
    },
    homes: assignments.flatMap((assignment) => {
      const home = properties.get(assignment.propertySlug);
      return home ? [{ slug: home.slug, title: home.title, zone: home.zone, roleLabel: teamRoleLabels[assignment.role], handlesVisits: assignment.handlesVisits }] : [];
    }),
    visits: bookings === null ? null : bookings
      .filter((booking) => booking.hostMemberId === member.id && !booking.past)
      .map((booking) => ({
        id: booking.id,
        when: visitWhenLabel(booking.startsAt),
        title: properties.get(booking.propertySlug)?.title ?? "Vivienda",
        slug: booking.propertySlug,
        visitorName: booking.visitorName,
        visitorWhatsapp: booking.visitorWhatsapp,
        note: booking.note,
        cancelled: booking.status === "cancelled",
      })),
  };
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
