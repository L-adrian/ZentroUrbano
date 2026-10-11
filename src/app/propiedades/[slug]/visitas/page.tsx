import type { Metadata } from "next";
import { CalendarCheck, CalendarPlus, ChevronLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPropertyBySlugData } from "@/lib/property-data";
import { ownerFirstName } from "@/lib/property-contact";
import { boliviaDayKey, visitShortLabel, visitSettingsSummary } from "@/lib/visit-slots";
import { getVisitPlan, listUpcomingBookings } from "@/lib/visits";
import "@/components/visits-team.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlugData(slug);
  return {
    title: property ? `Horarios reservados: ${property.title}` : "Horarios reservados",
    robots: { index: false, follow: false, noarchive: true },
  };
}

// The link sent in the booking message: which times of this home are already taken. Only the
// visitor's first name shows here; the owner sees name and WhatsApp in their account.
export default async function VisitTimesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getPropertyBySlugData(slug);
  if (!property) notFound();
  const [plan, bookings] = await Promise.all([getVisitPlan(property), listUpcomingBookings(property.slug)]);
  const upcoming = (bookings ?? []).filter((booking) => !booking.past);
  const byDay = new Map<string, typeof upcoming>();
  for (const booking of upcoming) {
    const key = boliviaDayKey(booking.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), booking]);
  }
  const host = plan?.host;

  return (
    <main id="contenido" className="visit-times zu-container">
      <Link href={`/propiedades/${property.slug}`} className="visit-times-back"><ChevronLeft size={17} aria-hidden="true" />Volver al anuncio</Link>
      <p className="zu-eyebrow"><CalendarCheck size={16} aria-hidden="true" />VISITAS</p>
      <h1>Horarios reservados</h1>
      <p className="visit-times-home"><strong>{property.title}</strong> · {property.zone}</p>
      {host ? (
        <p className="visit-times-host">
          <UserRound size={16} aria-hidden="true" />
          {host.kind === "embajador"
            ? <>Muestra la vivienda {host.name}, embajador de Zentro Urbano.</>
            : <>Las visitas se coordinan con {ownerFirstName(host.name) ?? "el dueño"}.</>}
          {plan?.settings.enabled ? ` Horario: ${visitSettingsSummary(plan.settings).toLocaleLowerCase("es")}.` : ""}
        </p>
      ) : null}

      {bookings === null ? (
        <p className="guide-note">Las reservas en línea todavía no están activas para esta vivienda.</p>
      ) : upcoming.length === 0 ? (
        <p className="guide-note">Todavía no hay visitas reservadas en los próximos días.</p>
      ) : (
        <ol className="visit-times-days">
          {[...byDay.entries()].map(([key, items]) => (
            <li key={key}>
              <h2>{visitShortLabel(items[0].startsAt).split(" · ")[0]}</h2>
              <ul>
                {items.map((booking) => (
                  <li key={booking.id}>
                    <strong>{visitShortLabel(booking.startsAt).split(" · ")[1]}</strong>
                    <em>Reservado</em>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <div className="visit-times-actions">
        {host && plan?.settings.enabled ? (
          <Link className="zu-button zu-button-primary" href={`/propiedades/${property.slug}#agendar-visita`}><CalendarPlus size={17} aria-hidden="true" />Reservar un horario</Link>
        ) : null}
        <Link className="zu-button zu-button-secondary" href="/cliente">Soy el dueño: ver datos y cancelar</Link>
      </div>
      <p className="visit-times-note">
        El dueño ve el nombre y el WhatsApp de cada persona en su cuenta y puede cancelar un horario. Zentro Urbano no cobra comisión por la visita ni por el alquiler.
      </p>
    </main>
  );
}
