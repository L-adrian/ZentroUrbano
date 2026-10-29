"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Download, ExternalLink, List, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addDays,
  boliviaParts,
  calendarKindLabels,
  calendarKinds,
  calendarLimits,
  manualCalendarKinds,
  type CalendarEvent,
  type CalendarKind,
  type ManualCalendarKind,
} from "@/lib/calendar-input";
import { GoogleCalendarCard } from "@/components/google-calendar-card";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import "./owner-calendar.css";

// Mi cuenta > Calendario: one month of visits, availability checks, Urbanito reminders and what the
// owner adds by hand. The month comes from /api/cliente/calendario each time it changes.

type Home = { slug: string; title: string };
type View = "mes" | "lista";
type Draft = {
  id: string | null;
  kind: ManualCalendarKind;
  titulo: string;
  fecha: string;
  hora: string;
  todoElDia: boolean;
  repetir: boolean;
  propiedad: string;
  persona: string;
  whatsapp: string;
  nota: string;
};

// A file download, not a page: a plain link, so the browser saves it.
const icsHref = "/api/cliente/calendario/ics";
const weekdayHeads = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const shortKindLabels: Record<CalendarKind, string> = {
  visita: "Visitas",
  llamada: "Llamadas",
  contrato: "Firmas",
  cobro: "Cobros",
  reconfirmar: "¿Sigue libre?",
  urbanito: "Urbanito",
  otro: "Otros",
};
const dayLong = new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

const button =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-[13px] font-semibold text-neutral-900 transition hover:border-[#176b4d] disabled:cursor-not-allowed disabled:opacity-50";
const greenButton =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#176b4d] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[#10533b] disabled:cursor-not-allowed disabled:opacity-50";
const field = "h-10 w-full rounded-[8px] border border-black/15 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/20";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const dayLabel = (day: string) => capitalize(dayLong.format(new Date(`${day}T12:00:00Z`)));
const eventDay = (event: CalendarEvent) => boliviaParts(event.startsAt).day;
const eventTime = (event: CalendarEvent) => (event.allDay ? "Todo el día" : boliviaParts(event.startsAt).time);
const seriesId = (event: CalendarEvent) => event.id.split("@")[0];
// Month cells are narrow: a visit shows the person, a check shows the question, the rest their title.
const chipLabel = (event: CalendarEvent) =>
  event.kind === "reconfirmar" ? "¿Sigue libre?" : (event.kind === "visita" || event.kind === "llamada") && event.personName ? event.personName : event.title;

function monthGrid(month: string) {
  const first = `${month}-01`;
  const weekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(first, -weekday);
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const weeks = Math.ceil((weekday + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index));
}

function shiftMonth(month: string, step: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + step, 1));
  return date.toISOString().slice(0, 7);
}

function emptyDraft(day: string): Draft {
  return { id: null, kind: "visita", titulo: "", fecha: day, hora: "10:00", todoElDia: false, repetir: false, propiedad: "", persona: "", whatsapp: "", nota: "" };
}

export function OwnerCalendar({ homes }: { homes: Home[] }) {
  const [today] = useState(() => boliviaParts(new Date()).day);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<View>("mes");
  const [hidden, setHidden] = useState<Set<CalendarKind>>(() => new Set());
  const [state, setState] = useState<{ month: string; events: CalendarEvent[]; manualAvailable: boolean } | null>(null);
  const [failedMonth, setFailedMonth] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);

  const grid = useMemo(() => monthGrid(month), [month]);
  const failed = failedMonth === month;
  const loading = state?.month !== month && !failed;

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ desde: grid[0], hasta: grid[grid.length - 1] });
    fetch(`/api/cliente/calendario?${params}`, { cache: "no-store" })
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (!alive) return;
        if (!ok || !body?.ok) throw new Error(body?.message ?? "calendar");
        setFailedMonth(null);
        setState({ month, events: body.events as CalendarEvent[], manualAvailable: Boolean(body.manualAvailable) });
      })
      .catch(() => {
        if (alive) setFailedMonth(month);
      });
    return () => {
      alive = false;
    };
  }, [grid, month, reload]);

  const events = useMemo(() => (state?.events ?? []).filter((event) => !hidden.has(event.kind)), [state, hidden]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = eventDay(event);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);
  const counts = useMemo(() => {
    const result: Partial<Record<CalendarKind, number>> = {};
    for (const event of state?.events ?? []) if (eventDay(event).startsWith(month) && !event.cancelled) result[event.kind] = (result[event.kind] ?? 0) + 1;
    return result;
  }, [state, month]);
  const presentKinds = calendarKinds.filter((kind) => counts[kind] || manualCalendarKinds.includes(kind as ManualCalendarKind));
  const manualAvailable = state?.manualAvailable ?? false;
  const [year, monthNumber] = month.split("-").map(Number);
  const monthTitle = `${capitalize(monthNames[monthNumber - 1])} ${year}`;
  const selectedEvents = byDay.get(selected) ?? [];
  const upcoming = events.filter((event) => eventDay(event).startsWith(month) && eventDay(event) >= (month === today.slice(0, 7) ? today : `${month}-01`));

  const refresh = useCallback(() => setReload((value) => value + 1), []);

  function goMonth(step: number) {
    const next = shiftMonth(month, step);
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
    setOpenId(null);
  }

  function goToday() {
    setMonth(today.slice(0, 7));
    setSelected(today);
    setOpenId(null);
  }

  function pick(day: string, eventId: string | null = null) {
    if (!day.startsWith(month)) setMonth(day.slice(0, 7));
    setSelected(day);
    setOpenId(eventId);
  }

  function toggleKind(kind: CalendarKind) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function edit(event: CalendarEvent) {
    const { day, time } = boliviaParts(event.startsAt);
    setDraft({
      id: seriesId(event),
      kind: (manualCalendarKinds as readonly string[]).includes(event.kind) ? (event.kind as ManualCalendarKind) : "otro",
      titulo: event.title,
      fecha: day,
      hora: event.allDay ? "10:00" : time,
      todoElDia: event.allDay,
      repetir: event.repeatMonthly,
      propiedad: event.propertySlug ?? "",
      persona: event.personName ?? "",
      whatsapp: event.personWhatsapp ? `+${event.personWhatsapp}` : "",
      nota: event.note ?? "",
    });
  }

  return (
    <section className="grid gap-4" aria-labelledby="calendar-title">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className={`${button} w-9 px-0`} onClick={() => goMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className={`${button} w-9 px-0`} onClick={() => goMonth(1)} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <h2 id="calendar-title" className="mr-auto text-lg font-semibold tracking-[-0.01em] text-neutral-950">{monthTitle}</h2>
        <button type="button" className={button} onClick={goToday}>Hoy</button>
        <div className="inline-flex h-9 rounded-[8px] border border-black/10 bg-white p-0.5" role="group" aria-label="Cómo ver el calendario">
          {([["mes", "Mes", CalendarDays], ["lista", "Lista", List]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-semibold ${view === id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-950"}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <a href={icsHref} download className={button} title="Las próximas 8 semanas, para el calendario de tu celular">
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Bajar al celular</span>
        </a>
        <button type="button" className={greenButton} disabled={!manualAvailable} onClick={() => setDraft(emptyDraft(selected))}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agendar
        </button>
      </div>

      {failed ? (
        <p className="rounded-[8px] border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          No se pudo cargar el calendario.{" "}
          <button type="button" className="cursor-pointer font-semibold underline" onClick={refresh}>Intentar de nuevo</button>
        </p>
      ) : null}
      {state && !manualAvailable ? (
        <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Ya ves tus visitas y avisos. Agregar llamadas, firmas y cobros a mano se activa en unos días.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Qué mostrar">
        {presentKinds.map((kind) => {
          const on = !hidden.has(kind);
          return (
            <button
              key={kind}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggleKind(kind)}
              className={`cal-k-${kind} inline-flex h-8 cursor-pointer items-center gap-2 rounded-[8px] border border-black/10 bg-white px-2.5 text-[12.5px] font-medium ${on ? "text-neutral-900" : "text-neutral-400"}`}
            >
              <span className="cal-check grid h-3.5 w-3.5 place-items-center rounded-[3px] border-2" aria-checked={on}>
                {on ? <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="#fff" strokeWidth="4" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg> : null}
              </span>
              {shortKindLabels[kind]}
              <span className="tabular-nums text-neutral-500">{counts[kind] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        {view === "mes" ? (
          <div className={`overflow-hidden rounded-[8px] border border-black/10 bg-white transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            <div className="grid grid-cols-7 border-b border-black/10 bg-neutral-50">
              {weekdayHeads.map((head) => (
                <span key={head} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500">{head}</span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((day, index) => {
                const inMonth = day.startsWith(month);
                const dayEvents = byDay.get(day) ?? [];
                const isToday = day === today;
                const isSelected = day === selected;
                return (
                  <div
                    key={day}
                    className={`relative min-h-[64px] min-w-0 border-black/[0.07] p-1 sm:min-h-[112px] sm:p-1.5 ${index % 7 ? "border-l" : ""} ${index >= 7 ? "border-t" : ""} ${inMonth ? "" : "bg-neutral-50/70"} ${isSelected ? "bg-[#f0f7f3] ring-2 ring-inset ring-[#176b4d]/40" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => pick(day)}
                      className="absolute inset-0 cursor-pointer"
                      aria-label={`${dayLabel(day)}: ${dayEvents.length ? `${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"}` : "sin eventos"}`}
                    />
                    <span className={`relative inline-grid h-6 min-w-6 place-items-center rounded-[6px] px-1 text-[12.5px] font-semibold tabular-nums ${isToday ? "bg-[#176b4d] text-white" : inMonth ? "text-neutral-900" : "text-neutral-400"}`}>
                      {Number(day.slice(8))}
                    </span>
                    <span className="relative mt-1 flex flex-wrap gap-[3px] sm:hidden" aria-hidden="true">
                      {dayEvents.slice(0, 4).map((event) => (
                        <i key={event.id} className={`cal-k-${event.kind} cal-dot h-[5px] w-[5px] rounded-full ${event.cancelled ? "opacity-40" : ""}`} />
                      ))}
                    </span>
                    <span className="relative mt-1 hidden gap-[3px] sm:grid">
                      {dayEvents.slice(0, 3).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => pick(day, event.id)}
                          className={`cal-k-${event.kind} cal-chip flex min-w-0 cursor-pointer items-center gap-1 rounded-[4px] px-1.5 py-[3px] text-left text-[11.5px] font-semibold leading-tight ${event.cancelled ? "line-through opacity-50" : ""}`}
                        >
                          {event.allDay ? null : <span className="shrink-0 tabular-nums">{eventTime(event)}</span>}
                          <span className="truncate">{chipLabel(event)}</span>
                        </button>
                      ))}
                      {dayEvents.length > 3 ? <span className="px-1 text-[11.5px] text-neutral-500">+{dayEvents.length - 3} más</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[8px] border border-black/10 bg-white">
            {upcoming.length ? (
              groupByDay(upcoming).map(([day, list]) => (
                <div key={day} className="border-b border-black/[0.07] last:border-b-0">
                  <p className="bg-neutral-50 px-4 py-2 text-[12px] font-semibold text-neutral-600">{dayLabel(day)}{day === today ? " · Hoy" : ""}</p>
                  {list.map((event) => (
                    <EventRow key={event.id} event={event} open={openId === event.id} onToggle={() => { setSelected(day); setOpenId(openId === event.id ? null : event.id); }} onEdit={edit} onDeleted={refresh} />
                  ))}
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-neutral-600">{loading ? "Cargando..." : `No hay nada agendado en ${monthNames[monthNumber - 1]} desde hoy.`}</p>
            )}
          </div>
        )}

        <aside className="grid grid-cols-[minmax(0,1fr)] content-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-[8px] border border-black/10 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
              <h3 className="text-[14px] font-semibold text-neutral-950">{dayLabel(selected)}{selected === today ? " · Hoy" : ""}</h3>
              <span className="text-[12px] text-neutral-500">{selectedEvents.length ? `${selectedEvents.length} ${selectedEvents.length === 1 ? "evento" : "eventos"}` : ""}</span>
            </div>
            {selectedEvents.length ? (
              selectedEvents.map((event) => (
                <EventRow key={event.id} event={event} open={openId === event.id} onToggle={() => setOpenId(openId === event.id ? null : event.id)} onEdit={edit} onDeleted={refresh} />
              ))
            ) : (
              <div className="grid gap-3 px-4 py-5 text-sm text-neutral-600">
                <p>{loading ? "Cargando..." : "Nada agendado este día."}</p>
                {manualAvailable && !loading ? (
                  <button type="button" className={`${button} justify-self-start`} onClick={() => setDraft(emptyDraft(selected))}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Agendar este día
                  </button>
                ) : null}
              </div>
            )}
          </div>
          <GoogleCalendarCard />
        </aside>
      </div>

      {draft ? (
        <EventForm
          draft={draft}
          homes={homes}
          onClose={() => setDraft(null)}
          onSaved={(day) => {
            setDraft(null);
            pick(day);
            refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function groupByDay(events: CalendarEvent[]) {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) groups.set(eventDay(event), [...(groups.get(eventDay(event)) ?? []), event]);
  return [...groups.entries()];
}

const sourceNotes: Record<CalendarEvent["source"], string> = {
  manual: "Lo agregaste tú",
  reserva: "Reservada desde tu anuncio",
  anuncio: "Aviso de tu anuncio",
  urbanito: "Recordatorio de Urbanito",
  cliente: "Próximo paso de un cliente",
};

function EventRow({
  event,
  open,
  onToggle,
  onEdit,
  onDeleted,
}: {
  event: CalendarEvent;
  open: boolean;
  onToggle: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/cliente/calendario?id=${encodeURIComponent(seriesId(event))}`, { method: "DELETE" }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setBusy(false);
    if (!response?.ok || !body?.ok) {
      setError(body?.message ?? "No se pudo borrar. Intenta de nuevo.");
      return;
    }
    onDeleted();
  }

  const whatsappText = event.kind === "visita" ? `Hola ${event.personName ?? ""}, te escribo de Zentro Urbano por la visita${event.propertyTitle ? ` a ${event.propertyTitle}` : ""}.` : "Hola, te escribo de Zentro Urbano.";
  return (
    <div className={`cal-k-${event.kind} border-b border-black/[0.07] last:border-b-0`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="grid w-full cursor-pointer grid-cols-[58px_minmax(0,1fr)] items-start gap-3 px-4 py-2.5 text-left hover:bg-neutral-50">
        <span className={`pt-0.5 text-[12.5px] font-semibold tabular-nums text-neutral-900 ${event.allDay ? "text-[11.5px] text-neutral-600" : ""}`}>{eventTime(event)}</span>
        <span className="cal-bar min-w-0 pl-3">
          <span className={`block text-[13.5px] font-semibold text-neutral-950 ${event.cancelled ? "line-through opacity-60" : ""}`}>{event.title}</span>
          <span className="block truncate text-[12px] text-neutral-600">
            {event.cancelled ? "Cancelada · " : ""}
            {[calendarKindLabels[event.kind], event.propertyTitle].filter(Boolean).join(" · ")}
          </span>
        </span>
      </button>
      {open ? (
        <div className="grid gap-2 px-4 pb-3 pl-[86px] text-[13px] text-neutral-700">
          {event.personName ? <p>Con <b className="font-semibold text-neutral-900">{event.personName}</b>{event.personWhatsapp ? <span className="tabular-nums text-neutral-600"> · +{event.personWhatsapp}</span> : null}</p> : null}
          {event.note ? <p className="whitespace-pre-line">{event.note}</p> : null}
          <p className="text-[12px] text-neutral-500">{sourceNotes[event.source]}{event.repeatMonthly ? " · Se repite cada mes" : ""}</p>
          <div className="flex flex-wrap gap-1.5">
            {event.personWhatsapp && !event.cancelled ? (
              <a className={greenButton} href={`https://wa.me/${event.personWhatsapp}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="h-4 w-4" />
                Escribir
              </a>
            ) : null}
            {event.kind === "reconfirmar" ? (
              <Link className={button} href="/cliente#anuncios">Confirmar en Anuncios</Link>
            ) : null}
            {event.source === "cliente" ? (
              <Link className={button} href="/cliente#clientes">Ver en Clientes</Link>
            ) : null}
            {event.propertySlug ? (
              <Link className={button} href={`/propiedades/${event.propertySlug}`} target="_blank">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Ver anuncio
              </Link>
            ) : null}
            {event.source === "manual" ? (
              confirming ? (
                <>
                  <button type="button" className={`${button} border-red-300 text-red-900`} disabled={busy} onClick={remove}>
                    {event.repeatMonthly ? "Sí, borrar todos los meses" : "Sí, borrar"}
                  </button>
                  <button type="button" className={button} onClick={() => setConfirming(false)}>No</button>
                </>
              ) : (
                <>
                  <button type="button" className={button} onClick={() => onEdit(event)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Editar
                  </button>
                  <button type="button" className={button} onClick={() => setConfirming(true)} aria-label="Borrar">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              )
            ) : null}
          </div>
          {error ? <p className="text-red-900" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function EventForm({ draft, homes, onClose, onSaved }: { draft: Draft; homes: Home[]; onClose: () => void; onSaved: (day: string) => void }) {
  const [value, setValue] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const set = <K extends keyof Draft>(key: K, next: Draft[K]) => setValue((current) => ({ ...current, [key]: next }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/cliente/calendario", {
      method: value.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...value, kind: value.kind }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setBusy(false);
    if (!response?.ok || !body?.ok) {
      setError({ field: body?.field ?? "", message: body?.message ?? "No se pudo guardar. Intenta de nuevo." });
      return;
    }
    onSaved(value.fecha);
  }

  const label = "grid gap-1 text-[13px] font-semibold text-neutral-800";
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-end bg-black/40 sm:place-items-center sm:p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="grid max-h-[92svh] w-full gap-4 overflow-y-auto rounded-t-[14px] bg-white p-5 shadow-[0_24px_60px_rgb(0_0_0/0.25)] sm:max-w-[520px] sm:rounded-[10px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id="event-form-title" className="text-lg font-semibold text-neutral-950">{value.id ? "Editar evento" : "Agendar"}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 cursor-pointer place-items-center rounded-[8px] text-neutral-600 hover:bg-neutral-100" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-[13px] font-semibold text-neutral-800">¿Qué es?</legend>
          <div className="flex flex-wrap gap-1.5">
            {manualCalendarKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={value.kind === kind}
                onClick={() => set("kind", kind)}
                className={`cal-k-${kind} inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border px-3 text-[13px] font-semibold ${value.kind === kind ? "cal-chip border-transparent ring-2 ring-[color:var(--k)]" : "border-black/10 bg-white text-neutral-700"}`}
              >
                <i className="cal-dot h-2 w-2 rounded-full" />
                {calendarKindLabels[kind]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Día
            <input id="event-day" type="date" required className={field} value={value.fecha} onChange={(event) => set("fecha", event.target.value)} />
          </label>
          <label className={label}>
            Hora
            <input id="event-time" type="time" step={300} className={field} value={value.hora} disabled={value.todoElDia} onChange={(event) => set("hora", event.target.value)} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-neutral-800">
          <input id="event-all-day" type="checkbox" checked={value.todoElDia} onChange={(event) => set("todoElDia", event.target.checked)} className="h-4 w-4 accent-[#176b4d]" />
          Todo el día
        </label>
        {value.kind === "cobro" ? (
          <label className="flex items-center gap-2 text-[13px] text-neutral-800">
            <input id="event-repeat" type="checkbox" checked={value.repetir} onChange={(event) => set("repetir", event.target.checked)} className="h-4 w-4 accent-[#176b4d]" />
            Repetir el mismo día cada mes
          </label>
        ) : null}

        <label className={label}>
          Título <span className="font-normal text-neutral-500">(si lo dejas vacío, usamos el tipo y la persona)</span>
          <input id="event-title" className={field} maxLength={calendarLimits.title} value={value.titulo} onChange={(event) => set("titulo", event.target.value)} placeholder={`${calendarKindLabels[value.kind]}${value.persona ? ` · ${value.persona}` : ""}`} />
        </label>
        {homes.length ? (
          <label className={label}>
            Vivienda
            <select id="event-home" className={field} value={value.propiedad} onChange={(event) => set("propiedad", event.target.value)}>
              <option value="">Ninguna</option>
              {homes.map((home) => <option key={home.slug} value={home.slug}>{home.title}</option>)}
            </select>
          </label>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Persona
            <input id="event-person" className={field} maxLength={calendarLimits.person} value={value.persona} onChange={(event) => set("persona", event.target.value)} placeholder="Nombre" />
          </label>
          <label className={label}>
            WhatsApp
            <input id="event-whatsapp" className={field} inputMode="tel" value={value.whatsapp} onChange={(event) => set("whatsapp", event.target.value)} placeholder="70012345" aria-invalid={error?.field === "whatsapp"} />
          </label>
        </div>
        <label className={label}>
          Nota
          <textarea id="event-note" className={`${field} h-20 py-2`} maxLength={calendarLimits.note} value={value.nota} onChange={(event) => set("nota", event.target.value)} placeholder="Ej.: llevar las llaves, pide 2 meses de garantía" />
        </label>

        {error ? <p className="rounded-[8px] border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">{error.message}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={button} onClick={onClose}>Cancelar</button>
          <button type="submit" className={greenButton} disabled={busy}>{busy ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}
