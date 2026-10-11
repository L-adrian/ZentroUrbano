"use client";

import { CalendarCheck, CalendarClock, LoaderCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { HoneypotField, TurnstileBox, useFormGuard } from "@/components/form-guard-fields";
import type { VisitDay } from "@/lib/visit-slots";
import "./visits-team.css";

type Booked = { when: string; whatsappUrl: string; visitsPath: string };

// "Agendar una visita" on the listing page: pick a day and a free hour, leave a name and WhatsApp,
// the slot is saved and WhatsApp opens with a message for the person who shows the home.
export function VisitBooking({ slug, initialDays, hostLabel }: { slug: string; initialDays: VisitDay[]; hostLabel: string }) {
  const [days, setDays] = useState(initialDays);
  const [dayKey, setDayKey] = useState(() => initialDays.find((day) => day.slots.some((slot) => !slot.taken))?.key ?? initialDays[0]?.key ?? "");
  const [start, setStart] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<Booked | null>(null);
  const guard = useFormGuard("visita", Boolean(start));
  const day = days.find((item) => item.key === dayKey) ?? days[0];
  const chosen = useMemo(() => days.flatMap((item) => item.slots.map((slot) => ({ ...slot, day: item }))).find((slot) => slot.start === start), [days, start]);

  async function refresh() {
    const response = await fetch(`/api/propiedades/${slug}/visitas`, { cache: "no-store" }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { days?: VisitDay[] } | null;
    if (data?.days) setDays(data.days);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !start) return;
    if (guard.siteKey && !guard.turnstileToken) { setError("Marca la casilla de verificación antes de reservar."); return; }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/propiedades/${slug}/visitas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, name, whatsapp, note, ...guard.fields(event.currentTarget) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (response.status !== 429) guard.renew();
        if (response.status === 409 || response.status === 400) void refresh();
        if (response.status === 409) setStart("");
        throw new Error(data.message || "No se pudo guardar la reserva. Intenta de nuevo.");
      }
      setBooked({ when: data.when, whatsappUrl: data.whatsappUrl, visitsPath: data.visitsPath });
      void refresh();
      // The booking is saved; now the visitor tells the host by WhatsApp.
      window.location.assign(data.whatsappUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa tu conexión e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (booked) {
    return (
      <div className="visit-booking visit-booked" role="status">
        <CalendarCheck size={26} aria-hidden="true" />
        <div>
          <strong>Reservaste el {booked.when}.</strong>
          <p>Falta un paso: envía el mensaje de WhatsApp para que {hostLabel} confirme tu visita.</p>
          <div className="visit-booked-actions">
            <a className="zu-button zu-button-primary" href={booked.whatsappUrl}><MessageCircle size={17} aria-hidden="true" />Enviar el mensaje por WhatsApp</a>
            <Link className="zu-button zu-button-secondary" href={booked.visitsPath}>Ver horarios reservados</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!days.length || !day) {
    return <p className="visit-empty">No hay horarios libres en las próximas dos semanas. Escribe por WhatsApp para coordinar otro día.</p>;
  }

  return (
    <div className="visit-booking">
      <div className="visit-days" role="group" aria-label="Elige el día">
        {days.map((item) => {
          const free = item.slots.filter((slot) => !slot.taken).length;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === day.key}
              className="visit-day"
              onClick={() => { setDayKey(item.key); setError(""); }}
            >
              <span>{item.weekday}</span>
              <strong>{item.date}</strong>
              <small>{free ? `${free} libre${free === 1 ? "" : "s"}` : "Lleno"}</small>
            </button>
          );
        })}
      </div>

      <div className="visit-slots" role="group" aria-label={`Horarios del ${day.weekday.toLocaleLowerCase("es")} ${day.date}`}>
        {day.slots.map((slot) => (
          <button
            key={slot.start}
            type="button"
            className="visit-slot"
            disabled={slot.taken}
            aria-pressed={slot.start === start}
            onClick={() => { setStart(slot.start); setError(""); }}
          >
            <span className="visit-slot-time">{slot.label}</span>
            {slot.taken ? <small>Reservado</small> : null}
          </button>
        ))}
      </div>

      {chosen ? (
        <form className="visit-form" onSubmit={submit}>
          <p className="visit-chosen"><CalendarClock size={17} aria-hidden="true" />{chosen.day.weekday} {chosen.day.date}, {chosen.label}</p>
          <div className="visit-fields">
            <label>
              <span>Tu nombre y apellido</span>
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={80} placeholder="Ej.: Carla Méndez" />
            </label>
            <label>
              <span>Tu WhatsApp</span>
              <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} placeholder="7xxxxxxx" />
            </label>
          </div>
          <label>
            <span>Nota para la visita <em>(opcional)</em></span>
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={240} placeholder="Ej.: voy con mi pareja" />
          </label>
          <HoneypotField />
          <TurnstileBox guard={guard} />
          {error ? <p role="alert" className="visit-error">{error}</p> : null}
          <button type="submit" className="zu-button zu-button-primary visit-submit" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="zu-spin" aria-hidden="true" /> : <CalendarCheck size={17} aria-hidden="true" />}
            {busy ? "Guardando..." : "Reservar y avisar por WhatsApp"}
          </button>
          <p className="visit-fine">Tu horario queda guardado y se abre WhatsApp con el mensaje listo para {hostLabel}. Zentro no cobra por la visita.</p>
        </form>
      ) : (
        <p className="visit-hint">Elige una hora para seguir.</p>
      )}
      {!chosen && error ? <p role="alert" className="visit-error">{error}</p> : null}
    </div>
  );
}
