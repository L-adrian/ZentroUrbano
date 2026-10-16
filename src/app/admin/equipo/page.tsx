import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { AdminTeamManager } from "@/components/admin-team-manager";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getDirectRentals } from "@/lib/rentals";
import { buildSeoMetadata } from "@/lib/seo";
import { listTeam } from "@/lib/team";
import { getVisitSettingsFor, listRecentBookings } from "@/lib/visits";
import "@/components/visits-team.css";

export const metadata: Metadata = buildSeoMetadata({
  title: "Equipo y visitas",
  description: "Embajadores y colaboradores de Zentro, quién trabaja en cada vivienda y las visitas reservadas.",
  path: "/admin/equipo",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const [team, properties, bookings] = await Promise.all([listTeam(false), getPublishedPropertiesData(), listRecentBookings()]);
  const homes = getDirectRentals(properties).map((property) => ({ slug: property.slug, title: property.title, zone: property.zone, owner: property.agent.name }));
  const settings = team ? await getVisitSettingsFor(homes.map((home) => home.slug)) : null;

  return (
    <main className="zu-container admin-team">
      <p className="zu-eyebrow"><UsersRound size={16} aria-hidden="true" /> EQUIPO</p>
      <h1>Equipo y visitas</h1>
      <p className="admin-team-intro">
        Registra a las personas reales de Zentro. En cada vivienda, una persona puede ser <strong>embajador</strong> (la persona a cargo, que puede mostrar la casa) o <strong>colaborador</strong> (ayuda con fotos y difusión). Si el embajador toma las visitas, las reservas le llegan a su WhatsApp; si no, le llegan al dueño. Las personas activas aparecen en <Link href="/nuestro-equipo">/nuestro-equipo</Link>.
      </p>
      {team === null ? (
        <p className="guide-note">El equipo y las reservas todavía no están activos: falta aplicar la migración 008_team_and_visits en la base de datos (guía en guias/migracion-008.sql). Mientras tanto, los anuncios siguen solo con WhatsApp.</p>
      ) : (
        <AdminTeamManager
          members={team.members}
          assignments={team.assignments}
          homes={homes}
          settings={settings ?? {}}
          bookings={bookings ?? []}
        />
      )}
    </main>
  );
}
