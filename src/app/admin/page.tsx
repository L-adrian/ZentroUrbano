import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, BellRing, Box, CalendarDays, ClipboardList, Contact, MapPinned, UsersRound, type LucideIcon } from "lucide-react";
import { getAdminAccountsOverview, getAdminListingHealth } from "@/lib/admin-accounts";
import { adminListingPlaces } from "@/lib/admin-listing-places";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { listPublicationRequests } from "@/lib/publication-requests";
import { listSearchAlerts } from "@/lib/search-alerts";
import { buildSeoMetadata } from "@/lib/seo";
import { AdminHeading } from "./admin-heading";

export const metadata: Metadata = buildSeoMetadata({
  title: "Admin interno",
  description: "Panel privado para gestionar propiedades, cuentas y leads de Zentro Urbano.",
  path: "/admin",
  noIndex: true,
});

export const dynamic = "force-dynamic";

type Card = { href: string; icon: LucideIcon; title: string; count?: number; detail: string; urgent?: boolean };

export default async function AdminPage() {
  const [properties, accounts, requests, alerts] = await Promise.all([
    getPublishedPropertiesData(),
    getAdminAccountsOverview(),
    listPublicationRequests().catch(() => null),
    listSearchAlerts().catch(() => null),
  ]);
  const health = await getAdminListingHealth(properties);
  const places = adminListingPlaces(properties);
  const pending = requests?.filter((request) => request.status === "pending_review").length;
  const unconfirmed = places.filter((place) => !place.ownerConfirmed).length;
  const notices = health.reported.length + health.checks.length;

  const cards: Card[] = [
    { href: "/admin/solicitudes", icon: ClipboardList, title: "Solicitudes", count: pending, detail: pending === 1 ? "solicitud por revisar" : "solicitudes por revisar", urgent: Boolean(pending) },
    { href: "/admin/anuncios", icon: MapPinned, title: "Avisos y ubicación", count: notices, detail: `${health.reported.length} avisos · ${health.checks.length} por confirmar · ${unconfirmed} ubicaciones sin confirmar`, urgent: health.reported.length > 0 },
    { href: "/admin/alertas", icon: BellRing, title: "Alertas de búsqueda", count: alerts?.length, detail: "personas esperando una vivienda" },
    { href: "/admin/cuentas", icon: Contact, title: "Cuentas y contactos", count: accounts.accounts.length, detail: "cuentas registradas" },
    { href: "/admin/equipo", icon: UsersRound, title: "Equipo y visitas", detail: "Personas del equipo y visitas reservadas" },
    { href: "/admin/aliados", icon: CalendarDays, title: "Calendario de aliados", detail: "Lo que cada aliado registró por día" },
    { href: "/admin/recorridos", icon: Box, title: "Recorridos 3D", detail: "Recreaciones por revisar y publicar" },
    { href: "/admin/estadisticas", icon: BarChart3, title: "Qué hizo la gente", detail: "Visitas y contactos de los últimos 30 días" },
  ];

  return (
    <main className="admin-page">
      <AdminHeading eyebrow="ACCESO PRIVADO" title="Resumen">Lo que necesita tu atención hoy. Toca una tarjeta o usa el menú para ir a cada sección.</AdminHeading>
      <div className="admin-cards">
        {cards.map(({ href, icon: Icon, title, count, detail, urgent }) => (
          <Link key={href} href={href} className={`admin-card${urgent ? " is-urgent" : ""}`}>
            <span className="admin-card-title"><Icon size={18} aria-hidden="true" />{title}</span>
            {count !== undefined && <strong>{count}</strong>}
            <span className="admin-card-detail">{detail}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
