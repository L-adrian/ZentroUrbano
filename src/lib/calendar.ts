import "server-only";
import { randomUUID } from "node:crypto";
import {
  boliviaInstant,
  boliviaParts,
  monthlyOccurrences,
  reconfirmDay,
  sortCalendar,
  type CalendarEvent,
  type CalendarEventInput,
  type CalendarKind,
} from "@/lib/calendar-input";
import { listClientSteps } from "@/lib/crm";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows } from "@/lib/mysql";
import { mapPropertyRow, type PropertyRow } from "@/lib/property-data";
import { isMissingTable } from "@/lib/team";
import { getUrbanitoLink } from "@/lib/urbanito";
import { listBookingsBetween } from "@/lib/visits";

// Until 015_calendar_events runs, the calendar still shows visits and availability checks; only
// adding events by hand waits for the table.
export class CalendarUnavailable extends Error {}

type EventRow = {
  id: string;
  kind: string;
  title: string;
  starts_at: Date | string;
  all_day: number;
  repeat_monthly: number;
  property_slug: string | null;
  person_name: string | null;
  person_whatsapp: string | null;
  note: string | null;
};

const iso = (value: Date | string) => (value instanceof Date ? value : new Date(`${String(value).replace(" ", "T")}Z`)).toISOString();
const sqlTime = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");
const dueLabel = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "numeric", month: "long" });
const manualKinds = new Set<CalendarKind>(["visita", "llamada", "contrato", "cobro", "otro"]);

export type CalendarHome = { slug: string; title: string; published: boolean; availabilityConfirmedAt: string | null };

// The owner's homes that are not closed, for the calendar and its form.
export async function listCalendarHomes(accountId: string): Promise<CalendarHome[]> {
  if (!hasDatabaseConfig()) return [];
  const rows =
    (await queryRows<PropertyRow>(
      `select p.* from client_account_properties cap join properties p on p.slug = cap.property_slug
        where cap.account_id = :accountId and cap.status <> 'closed' order by p.updated_at desc limit 100`,
      { accountId },
    )) ?? [];
  return rows.map(mapPropertyRow).map((property) => ({
    slug: property.slug,
    title: property.title,
    published: property.published,
    availabilityConfirmedAt: property.availabilityConfirmedAt ?? null,
  }));
}

export type CalendarData = { events: CalendarEvent[]; manualAvailable: boolean };

export async function getCalendar(accountId: string, start: Date, end: Date, homes?: CalendarHome[]): Promise<CalendarData> {
  const ownHomes = homes ?? (await listCalendarHomes(accountId));
  const titles = new Map(ownHomes.map((home) => [home.slug, home.title]));
  const [manual, bookings, urbanito, steps] = await Promise.all([
    listManualEvents(accountId, start, end),
    listBookingsBetween(ownHomes.map((home) => home.slug), start, end).catch(() => null),
    getUrbanitoLink(accountId).catch(() => null),
    // Only agencies have clients; for an owner this is empty.
    listClientSteps(accountId, start, end).catch(() => []),
  ]);
  const events: CalendarEvent[] = (manual ?? []).map((event) => ({ ...event, propertyTitle: event.propertySlug ? titles.get(event.propertySlug) ?? null : null }));

  for (const booking of bookings ?? []) {
    events.push({
      id: `reserva-${booking.id}`,
      kind: "visita",
      source: "reserva",
      title: `Visita · ${booking.visitorName}`,
      startsAt: booking.startsAt,
      allDay: false,
      repeatMonthly: false,
      propertySlug: booking.propertySlug,
      propertyTitle: titles.get(booking.propertySlug) ?? null,
      personName: booking.visitorName,
      personWhatsapp: booking.visitorWhatsapp,
      note: [booking.hostKind === "embajador" ? "La muestra un aliado de Zentro." : null, booking.note].filter(Boolean).join(" ") || null,
      cancelled: booking.status === "cancelled",
    });
  }

  // A check that is already late shows on today, until the owner confirms.
  const today = boliviaParts(new Date()).day;
  for (const home of ownHomes) {
    const due = home.published ? reconfirmDay(home.availabilityConfirmedAt) : null;
    if (!due) continue;
    const day = due < today ? today : due;
    const at = boliviaInstant(day);
    if (at < start || at >= end) continue;
    events.push({
      id: `reconfirmar-${home.slug}-${day}`,
      kind: "reconfirmar",
      source: "anuncio",
      title: `¿Sigue libre? ${home.title}`,
      startsAt: at.toISOString(),
      allDay: true,
      repeatMonthly: false,
      propertySlug: home.slug,
      propertyTitle: home.title,
      personName: null,
      personWhatsapp: null,
      note: due < today
        ? `Te tocaba confirmarlo el ${dueLabel.format(boliviaInstant(due))}. Mientras no lo confirmes, tu anuncio pide a los interesados que pregunten primero.`
        : "Confírmalo en Anuncios para que siga viéndose disponible.",
      cancelled: false,
    });
  }

  (urbanito?.snapshot?.recordatorios ?? []).forEach((reminder, index) => {
    const at = new Date(reminder.cuando);
    if (at < start || at >= end) return;
    events.push({
      id: `urbanito-${at.getTime()}-${index}`,
      kind: "urbanito",
      source: "urbanito",
      title: reminder.texto,
      startsAt: at.toISOString(),
      allDay: false,
      repeatMonthly: false,
      propertySlug: null,
      propertyTitle: null,
      personName: null,
      personWhatsapp: null,
      note: "Urbanito te avisa por Telegram.",
      cancelled: false,
    });
  });

  for (const client of steps) {
    if (!client.nextStepAt) continue;
    events.push({
      id: `cliente-${client.id}`,
      kind: client.stage === "visita" ? "visita" : "llamada",
      source: "cliente",
      title: `${client.nextStep ?? "Seguimiento"} · ${client.name}`,
      startsAt: client.nextStepAt,
      allDay: false,
      repeatMonthly: false,
      propertySlug: client.propertySlug,
      propertyTitle: client.propertySlug ? titles.get(client.propertySlug) ?? null : null,
      personName: client.name,
      personWhatsapp: client.whatsapp,
      note: client.wants,
      cancelled: false,
    });
  }

  return { events: sortCalendar(events), manualAvailable: manual !== null };
}

// null while 015_calendar_events is missing.
async function listManualEvents(accountId: string, start: Date, end: Date): Promise<Omit<CalendarEvent, "propertyTitle">[] | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const rows =
      (await queryRows<EventRow>(
        `select id, kind, title, starts_at, all_day, repeat_monthly, property_slug, person_name, person_whatsapp, note
           from calendar_events
          where account_id = :accountId and starts_at < :end and (starts_at >= :start or repeat_monthly = 1)
          order by starts_at limit 500`,
        { accountId, start: sqlTime(start), end: sqlTime(end) },
      )) ?? [];
    return rows.flatMap((row) => {
      const base = {
        kind: (manualKinds.has(row.kind as CalendarKind) ? row.kind : "otro") as CalendarKind,
        source: "manual" as const,
        title: row.title,
        allDay: Boolean(row.all_day),
        repeatMonthly: Boolean(row.repeat_monthly),
        propertySlug: row.property_slug,
        personName: row.person_name,
        personWhatsapp: row.person_whatsapp,
        note: row.note,
        cancelled: false,
      };
      const startsAt = iso(row.starts_at);
      if (!row.repeat_monthly) return [{ ...base, id: row.id, startsAt }];
      return monthlyOccurrences(startsAt, start, end).map((at) => ({ ...base, id: `${row.id}@${at.toISOString().slice(0, 7)}`, startsAt: at.toISOString() }));
    });
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

async function guard<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (isMissingTable(error)) throw new CalendarUnavailable();
    throw error;
  }
}

const eventParams = (event: CalendarEventInput) => ({
  kind: event.kind,
  title: event.title,
  startsAt: sqlTime(event.startsAt),
  allDay: event.allDay ? 1 : 0,
  repeatMonthly: event.repeatMonthly ? 1 : 0,
  propertySlug: event.propertySlug,
  personName: event.personName,
  personWhatsapp: event.personWhatsapp,
  note: event.note,
});

export async function createCalendarEvent(accountId: string, event: CalendarEventInput) {
  return guard(async () => {
    const id = randomUUID();
    await executeQuery(
      `insert into calendar_events (id, account_id, kind, title, starts_at, all_day, repeat_monthly, property_slug, person_name, person_whatsapp, note)
       values (:id, :accountId, :kind, :title, :startsAt, :allDay, :repeatMonthly, :propertySlug, :personName, :personWhatsapp, :note)`,
      { id, accountId, ...eventParams(event) },
    );
    return id;
  });
}

// Only the account's own rows change; false when the id is not theirs.
export async function updateCalendarEvent(accountId: string, id: string, event: CalendarEventInput) {
  return guard(async () => {
    const own = await queryOne<{ id: string }>("select id from calendar_events where id = :id and account_id = :accountId", { id, accountId });
    if (!own) return false;
    await executeQuery(
      `update calendar_events set kind = :kind, title = :title, starts_at = :startsAt, all_day = :allDay, repeat_monthly = :repeatMonthly,
              property_slug = :propertySlug, person_name = :personName, person_whatsapp = :personWhatsapp, note = :note
        where id = :id and account_id = :accountId`,
      { id, accountId, ...eventParams(event) },
    );
    return true;
  });
}

export async function deleteCalendarEvent(accountId: string, id: string) {
  return guard(async () => {
    const own = await queryOne<{ id: string }>("select id from calendar_events where id = :id and account_id = :accountId", { id, accountId });
    if (!own) return false;
    await executeQuery("delete from calendar_events where id = :id and account_id = :accountId", { id, accountId });
    return true;
  });
}

// The linked account of a Telegram user, so Urbanito can read the same calendar.
export async function calendarAccountForTelegram(telegramId: number) {
  if (!hasDatabaseConfig()) return null;
  try {
    return (await queryOne<{ account_id: string }>("select account_id from urbanito_links where telegram_id = :telegramId", { telegramId }))?.account_id ?? null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}
