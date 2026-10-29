import { availabilityFreshDays } from "@/lib/listing-summary";
import { normalizeAlertWhatsapp } from "@/lib/search-alert-input";

// Calendar of Mi cuenta: what the owner adds by hand plus what Zentro already knows (booked visits,
// availability checks, Urbanito reminders). Pure helpers, shared by the API, the page and the tests.

export const calendarKinds = ["visita", "llamada", "contrato", "cobro", "reconfirmar", "urbanito", "otro"] as const;
export type CalendarKind = (typeof calendarKinds)[number];
// The kinds an owner can create; the others come from Zentro or Urbanito.
export const manualCalendarKinds = ["visita", "llamada", "contrato", "cobro", "otro"] as const;
export type ManualCalendarKind = (typeof manualCalendarKinds)[number];

export const calendarKindLabels: Record<CalendarKind, string> = {
  visita: "Visita",
  llamada: "Llamada o seguimiento",
  contrato: "Firma de contrato",
  cobro: "Cobro de alquiler",
  reconfirmar: "Reconfirmar disponibilidad",
  urbanito: "Aviso de Urbanito",
  otro: "Otro",
};

export type CalendarSource = "manual" | "reserva" | "anuncio" | "urbanito" | "cliente";

export type CalendarEvent = {
  // Manual events keep their row id; a monthly one adds the month ("id@2026-11").
  id: string;
  kind: CalendarKind;
  source: CalendarSource;
  title: string;
  startsAt: string;
  allDay: boolean;
  repeatMonthly: boolean;
  propertySlug: string | null;
  propertyTitle: string | null;
  personName: string | null;
  personWhatsapp: string | null;
  note: string | null;
  cancelled: boolean;
};

export const calendarLimits = { title: 120, person: 120, note: 500, rangeDays: 62 };
// Bolivia has no daylight saving time: local time is always UTC-4.
const boliviaOffsetMinutes = -4 * 60;

const dateKey = /^\d{4}-\d{2}-\d{2}$/;
const timeKey = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !dateKey.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// "2026-10-29" + "09:30" in Bolivia -> the UTC instant.
export function boliviaInstant(day: string, time = "00:00") {
  return new Date(Date.parse(`${day}T${time}:00Z`) - boliviaOffsetMinutes * 60_000);
}

// The Bolivian calendar day and time of an instant.
export function boliviaParts(instant: string | Date) {
  const local = new Date(new Date(instant).getTime() + boliviaOffsetMinutes * 60_000).toISOString();
  return { day: local.slice(0, 10), time: local.slice(11, 16) };
}

export function addDays(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

// The range a GET asks for: both ends are Bolivian days, at most two months apart.
export function readCalendarRange(params: URLSearchParams) {
  const from = params.get("desde");
  const to = params.get("hasta");
  if (!validDateKey(from) || !validDateKey(to) || to < from) return null;
  if (Date.parse(to) - Date.parse(from) > calendarLimits.rangeDays * 86_400_000) return null;
  return { from, to, start: boliviaInstant(from), end: boliviaInstant(addDays(to, 1)) };
}

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
const cleanNote = (value: unknown) =>
  typeof value === "string" ? value.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, calendarLimits.note) : "";

// A WhatsApp number: Bolivian numbers are normalized; other countries keep their digits.
export function normalizeEventWhatsapp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const bolivian = normalizeAlertWhatsapp(value);
  if (bolivian) return bolivian;
  if (!/^\+?[\d\s().-]+$/.test(value.trim())) return null;
  const digits = value.replace(/\D/g, "");
  return value.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export type CalendarEventInput = {
  kind: ManualCalendarKind;
  title: string;
  startsAt: Date;
  allDay: boolean;
  repeatMonthly: boolean;
  propertySlug: string | null;
  personName: string | null;
  personWhatsapp: string | null;
  note: string | null;
};

export type CalendarInputResult = { ok: true; event: CalendarEventInput } | { ok: false; field: string; message: string };

// What the "Agendar" form sends. The home is checked against the owner's homes by the caller.
export function readCalendarEventInput(body: unknown): CalendarInputResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const kind = manualCalendarKinds.find((option) => option === input.kind);
  if (!kind) return { ok: false, field: "kind", message: "Elige qué es: visita, llamada, firma, cobro u otro." };
  if (!validDateKey(input.fecha)) return { ok: false, field: "fecha", message: "Elige el día." };
  const allDay = input.todoElDia === true;
  const time = typeof input.hora === "string" ? input.hora : "";
  if (!allDay && !timeKey.test(time)) return { ok: false, field: "hora", message: "Elige la hora, por ejemplo 10:30." };
  const personName = clean(input.persona, calendarLimits.person) || null;
  const title = clean(input.titulo, calendarLimits.title) || (personName ? `${calendarKindLabels[kind]} · ${personName}` : calendarKindLabels[kind]);
  const rawPhone = typeof input.whatsapp === "string" ? input.whatsapp.trim() : "";
  const personWhatsapp = normalizeEventWhatsapp(rawPhone);
  if (rawPhone && !personWhatsapp) return { ok: false, field: "whatsapp", message: "Escribe un celular, por ejemplo 70012345, o con + y el código del país." };
  const propertySlug = typeof input.propiedad === "string" && /^[a-z0-9-]{1,180}$/.test(input.propiedad) ? input.propiedad : null;
  return {
    ok: true,
    event: {
      kind,
      title,
      startsAt: boliviaInstant(input.fecha, allDay ? "00:00" : time),
      allDay,
      repeatMonthly: kind === "cobro" && input.repetir === true,
      propertySlug,
      personName,
      personWhatsapp,
      note: cleanNote(input.nota) || null,
    },
  };
}

// A monthly event on the 31st falls on the last day of shorter months.
export function monthlyOccurrences(startsAt: string, from: Date, to: Date) {
  const first = new Date(startsAt);
  const { day, time } = boliviaParts(first);
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  const out: Date[] = [];
  for (let step = 0; step < 600; step += 1) {
    const monthIndex = month - 1 + step;
    const targetYear = year + Math.floor(monthIndex / 12);
    const targetMonth = (monthIndex % 12) + 1;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const key = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, "0")}`;
    const instant = boliviaInstant(key, time);
    if (instant >= to) break;
    if (instant >= from) out.push(instant);
  }
  return out;
}

// When a live home asks the owner to say it is still free: 21 days after the last confirmation.
export function reconfirmDay(availabilityConfirmedAt: string | null | undefined) {
  if (!availabilityConfirmedAt) return null;
  const confirmed = new Date(availabilityConfirmedAt);
  if (Number.isNaN(confirmed.getTime())) return null;
  return addDays(boliviaParts(confirmed).day, availabilityFreshDays);
}

export function sortCalendar(events: CalendarEvent[]) {
  return [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || Number(b.allDay) - Number(a.allDay) || a.title.localeCompare(b.title));
}

// iCalendar (.ics) for the phone's calendar app. Times go in UTC; all-day events use dates.
const icsText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const icsStamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function foldIcsLine(line: string) {
  // Lines longer than 75 bytes continue on the next line after a space (RFC 5545).
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (parts.length ? 74 : 75), bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    parts.push(decoder.decode(bytes.subarray(start, end)));
    start = end;
  }
  return parts.join("\r\n ");
}

export function calendarToIcs(events: CalendarEvent[], options: { name: string; origin: string; now?: Date }) {
  const stamp = icsStamp(options.now ?? new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Zentro Urbano//Calendario//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${icsText(options.name)}`, "X-WR-TIMEZONE:America/La_Paz"];
  for (const event of events) {
    if (event.cancelled) continue;
    const start = new Date(event.startsAt);
    const details = [
      calendarKindLabels[event.kind],
      event.propertyTitle,
      event.personName ? `Con ${event.personName}` : null,
      event.personWhatsapp ? `WhatsApp +${event.personWhatsapp}` : null,
      event.note,
    ].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${event.id.replace(/[^a-zA-Z0-9._-]/g, "-")}@zentrourbano`, `DTSTAMP:${stamp}`);
    if (event.allDay) {
      const day = boliviaParts(start).day;
      lines.push(`DTSTART;VALUE=DATE:${day.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(day, 1).replace(/-/g, "")}`);
    } else {
      lines.push(`DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(new Date(start.getTime() + (event.kind === "visita" ? 30 : 60) * 60_000))}`);
    }
    lines.push(`SUMMARY:${icsText(event.title)}`);
    if (details) lines.push(`DESCRIPTION:${icsText(details)}`);
    if (event.propertySlug) lines.push(`URL:${options.origin}/propiedades/${event.propertySlug}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
