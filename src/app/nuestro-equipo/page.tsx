import type { Metadata } from "next";
import { Home, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { RegionFlag } from "@/components/region-flag";
import { TeamAvatar } from "@/components/team-avatar";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getSelectedDepartment } from "@/lib/region-server";
import { bolivia } from "@/lib/regions";
import { getDirectRentals } from "@/lib/rentals";
import { buildSeoMetadata } from "@/lib/seo";
import { listTeam } from "@/lib/team";
import { teamRoleDescriptions, teamRoleLabels, teamRoles } from "@/lib/team-roles";
import "@/components/visits-team.css";

export const metadata: Metadata = buildSeoMetadata({
  title: "Nuestro equipo",
  description: "Las personas reales de Zentro Urbano en Bolivia: embajadores que muestran las viviendas y colaboradores que ayudan a los dueños, sin comisiones.",
  path: "/nuestro-equipo",
});

export const dynamic = "force-dynamic";

// Public team page ("Equipo" in the header): the real people of Zentro in the department the
// visitor chose, and the homes they work on.
export default async function TeamPage() {
  const [team, properties, department] = await Promise.all([listTeam(true).catch(() => null), getPublishedPropertiesData(), getSelectedDepartment()]);
  const homes = new Map(getDirectRentals(properties).map((property) => [property.slug, property]));
  const members = (team?.members ?? []).filter((member) => member.department === department.slug);

  return (
    <main id="contenido" className="team-page">
      <section className="team-hero">
        <div className="zu-container">
          <p className="zu-eyebrow"><UsersRound size={16} aria-hidden="true" />EQUIPO</p>
          <p className="team-place">
            <RegionFlag code={department.slug} className="region-flag is-country" />
            <strong>{department.name}</strong>
            <span aria-hidden="true">·</span>
            <RegionFlag code={bolivia.code} />
            {bolivia.name}
          </p>
          <h1>{`Personas reales, en ${department.name}.`}</h1>
          <p>
            Detrás de Zentro Urbano hay gente de carne y hueso. Cada persona de esta página está registrada y verificada por nosotros. Nunca te van a cobrar comisión por alquilar.
          </p>
          <ul className="team-roles-explained">
            {teamRoles.map((role) => (
              <li key={role}>
                <span className={`team-role is-${role}`}>{teamRoleLabels[role]}</span>
                <p>{teamRoleDescriptions[role]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="zu-container team-list-section" aria-label="Personas del equipo">
        {members.length === 0 ? (
          <div className="guide-note team-empty">
            <p><strong>{`Aún no hay equipo en ${department.name}.`}</strong></p>
            <p>Muy pronto vas a conocer aquí a las personas que muestran las viviendas y ayudan a los dueños. Puedes ver el equipo de otra ciudad cambiándola desde el menú de arriba.</p>
          </div>
        ) : (
          <ul className="team-grid">
            {members.map((member) => {
              const memberHomes = (team?.assignments ?? [])
                .filter((assignment) => assignment.memberId === member.id && homes.has(assignment.propertySlug))
                .map((assignment) => ({ ...assignment, home: homes.get(assignment.propertySlug)! }));
              return (
                <li key={member.id} id={member.slug} className="team-card">
                  <div className="team-card-head">
                    <TeamAvatar name={member.name} photoUrl={member.photoUrl} size={72} />
                    <div>
                      <h2>{member.name}</h2>
                      <span className={`team-role is-${member.level}`}>{teamRoleLabels[member.level]}</span>
                      {member.zone ? <p className="team-zone"><MapPin size={14} aria-hidden="true" />{member.zone}</p> : null}
                    </div>
                  </div>
                  {member.bio ? <p className="team-bio">{member.bio}</p> : null}
                  <p className="team-verified"><ShieldCheck size={15} aria-hidden="true" />Verificado por Zentro Urbano</p>
                  {memberHomes.length > 0 ? (
                    <div className="team-homes">
                      <h3>{memberHomes.length === 1 ? "Vivienda a su cargo" : `${memberHomes.length} viviendas`}</h3>
                      <ul>
                        {memberHomes.slice(0, 4).map(({ home, role }) => (
                          <li key={home.slug}>
                            <Link href={`/propiedades/${home.slug}`}><Home size={14} aria-hidden="true" />{home.title}</Link>
                            <small>{teamRoleLabels[role]} · {home.zone}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
