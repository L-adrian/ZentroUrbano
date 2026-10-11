import { CalendarDays, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { VisitBooking } from "@/components/visit-booking";
import { TeamAvatar } from "@/components/team-avatar";
import { ownerFirstName } from "@/lib/property-contact";
import { teamRoleLabels, type PropertyTeamEntry } from "@/lib/team-roles";
import { visitSettingsSummary, type VisitDay } from "@/lib/visit-slots";
import type { VisitPlan } from "@/lib/visits";
import "./visits-team.css";

// Listing page: the Zentro people working on the home and the visit booking box.
export function PropertyVisitSection({ slug, plan, days }: { slug: string; plan: VisitPlan | null; days: VisitDay[] | null }) {
  if (!plan || (!plan.host && plan.team.length === 0)) return null;
  const host = plan.host;
  const hostLabel = host ? ownerFirstName(host.name) ?? (host.kind === "owner" ? "el dueño" : "la persona de Zentro") : "";
  const bookable = Boolean(host && days && plan.settings.enabled);

  return (
    <section id="agendar-visita" className="visit-section border-t border-black/10 pt-6 lg:pt-8" aria-labelledby="agendar-visita-title">
      <h2 id="agendar-visita-title" className="text-xl font-semibold tracking-tight text-neutral-950 lg:text-2xl">
        {bookable ? "Agendar una visita" : "Equipo de Zentro en esta vivienda"}
      </h2>
      {plan.team.length > 0 ? <PropertyTeamList team={plan.team} /> : null}
      {bookable && host && days ? (
        <>
          <p className="visit-intro">
            <CalendarDays size={17} aria-hidden="true" />
            <span>
              {host.kind === "embajador"
                ? <>Te muestra la vivienda <strong>{host.name}</strong>, embajador de Zentro Urbano. </>
                : <>Coordinas la visita directo con <strong>{hostLabel}</strong>, sin intermediarios. </>}
              Horarios de visita: {visitSettingsSummary(plan.settings).toLocaleLowerCase("es")}.
            </span>
          </p>
          <VisitBooking slug={slug} initialDays={days} hostLabel={hostLabel} />
          <p className="visit-links">
            <Link href={`/propiedades/${slug}/visitas`}>Ver horarios reservados</Link>
          </p>
        </>
      ) : null}
    </section>
  );
}

export function PropertyTeamList({ team }: { team: PropertyTeamEntry[] }) {
  return (
    <ul className="property-team" aria-label="Personas de Zentro que trabajan en esta vivienda">
      {team.map(({ member, role, handlesVisits }) => (
        <li key={member.id}>
          <TeamAvatar name={member.name} photoUrl={member.photoUrl} size={44} />
          <div>
            <Link href={`/nuestro-equipo#${member.slug}`}><strong>{member.name}</strong></Link>
            <span className={`team-role is-${role}`}>{teamRoleLabels[role]}{handlesVisits ? " · muestra la vivienda" : ""}</span>
          </div>
          <ShieldCheck size={17} aria-label="Persona verificada por Zentro" className="property-team-check" />
        </li>
      ))}
    </ul>
  );
}
