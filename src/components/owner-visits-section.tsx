"use client";

import { CalendarCheck, CalendarX, ChevronDown, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VisitSettingsEditor } from "@/components/visit-settings-editor";
import { formatAlertWhatsapp } from "@/lib/search-alert-input";
import { defaultVisitSettings, visitSettingsSummary, visitShortLabel, visitWhenLabel, type VisitSettings } from "@/lib/visit-slots";
import type { VisitBooking } from "@/lib/visits";
import "./visits-team.css";

export type OwnerVisits = { bookings: VisitBooking[]; settings: Record<string, VisitSettings> };

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/cliente/visitas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.message || "No se pudo guardar.");
}

// Owner's account: visits booked on their listings (with name and WhatsApp) and the hours each
// home can be visited.
export function OwnerVisitsSection({ visits, homes }: { visits: OwnerVisits; homes: { slug: string; title: string }[] }) {
  const router = useRouter();
  const titles = new Map(homes.map((home) => [home.slug, home.title]));
  const upcoming = visits.bookings.filter((booking) => booking.status === "reserved" && !booking.past);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <section className="owner-visits rounded-[28px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="owner-visits-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#58745f]">Visitas</p>
      <h2 id="owner-visits-title" className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        {upcoming.length ? `${upcoming.length} visita${upcoming.length === 1 ? "" : "s"} reservada${upcoming.length === 1 ? "" : "s"}` : "Visitas reservadas"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Las personas eligen un horario en tu anuncio y te escriben por WhatsApp para confirmar. Si no puedes, cancela el horario y avísales.
      </p>

      {upcoming.length === 0 ? (
        <p className="owner-visits-empty">Todavía no hay visitas reservadas en tus anuncios.</p>
      ) : (
        <ul className="owner-visits-list">
          {upcoming.map((booking) => (
            <OwnerBooking key={booking.id} booking={booking} title={titles.get(booking.propertySlug) ?? booking.propertySlug} onCancelled={() => router.refresh()} />
          ))}
        </ul>
      )}

      <div className="owner-visit-hours">
        <h3>Días y horas para visitar</h3>
        <ul>
          {homes.map((home) => {
            const settings = visits.settings[home.slug] ?? defaultVisitSettings;
            const open = openSlug === home.slug;
            return (
              <li key={home.slug}>
                <button type="button" aria-expanded={open} onClick={() => setOpenSlug(open ? null : home.slug)}>
                  <span><strong>{home.title}</strong><small>{visitSettingsSummary(settings)}</small></span>
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                {open ? (
                  <VisitSettingsEditor
                    initial={settings}
                    onSave={async (next) => { await post({ action: "settings", slug: home.slug, settings: next }); router.refresh(); }}
                  />
                ) : null}
                <Link href={`/propiedades/${home.slug}/visitas`} className="owner-visit-link">Ver página de horarios reservados</Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function OwnerBooking({ booking, title, onCancelled }: { booking: VisitBooking; title: string; onCancelled: () => void }) {
  const [busy, setBusy] = useState(false);
  const message = `Hola ${booking.visitorName.split(" ")[0]}, te escribo por la visita que reservaste en Zentro Urbano para el ${visitWhenLabel(booking.startsAt)}.`;
  return (
    <li>
      <CalendarCheck size={20} aria-hidden="true" className="owner-visit-icon" />
      <div>
        <strong>{visitShortLabel(booking.startsAt)}</strong>
        <span>{booking.visitorName} · {title}</span>
        {booking.note ? <small>&ldquo;{booking.note}&rdquo;</small> : null}
        {booking.hostKind === "embajador" ? <small>Muestra la vivienda el embajador de Zentro.</small> : null}
      </div>
      <div className="owner-visit-actions">
        <a className="zu-button zu-button-secondary" href={`https://wa.me/${booking.visitorWhatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" title={formatAlertWhatsapp(booking.visitorWhatsapp)}>
          <MessageCircle size={16} aria-hidden="true" />Escribir
        </a>
        <button
          type="button"
          className="zu-button zu-button-secondary"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("¿Cancelar esta visita? El horario queda libre otra vez. Avísale a la persona por WhatsApp.")) return;
            setBusy(true);
            try { await post({ action: "cancel", id: booking.id }); onCancelled(); } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo cancelar."); } finally { setBusy(false); }
          }}
        >
          <CalendarX size={16} aria-hidden="true" />Cancelar
        </button>
      </div>
    </li>
  );
}
