import "server-only";
import { randomUUID } from "node:crypto";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows } from "@/lib/mysql";
import type { Property } from "@/lib/properties";
import { isExternalContactUrl } from "@/lib/property-contact";
import { getPropertyTeam, isMissingTable } from "@/lib/team";
import type { PropertyTeamEntry, PublicTeamMember } from "@/lib/team-roles";
import { unsetVisitSettings, visitBookingDays, type VisitSettings } from "@/lib/visit-slots";
import { normalizePublicationPhone } from "@/lib/publication-input";

// Visits booked from the listing page. Until 008_team_and_visits runs, booking is "unavailable"
// and the page keeps only the WhatsApp button.

type SettingsRow = { enabled: number; weekdays: string; start_minute: number; end_minute: number };
type BookingRow = {
  id: string;
  property_slug: string;
  starts_at: Date | string;
  visitor_name: string;
  visitor_whatsapp: string;
  note: string | null;
  host_kind: string;
  host_member_id: string | null;
  status: string;
  created_at: Date | string;
};

export type VisitBooking = {
  id: string;
  propertySlug: string;
  startsAt: string;
  visitorName: string;
  visitorWhatsapp: string;
  note: string | null;
  hostKind: "owner" | "embajador";
  hostMemberId: string | null;
  status: "reserved" | "cancelled";
  createdAt: string;
  // The visit hour is over.
  past: boolean;
};

const iso = (value: Date | string) => (value instanceof Date ? value : new Date(`${String(value).replace(" ", "T")}Z`)).toISOString();

function toBooking(row: BookingRow): VisitBooking {
  const startsAt = iso(row.starts_at);
  return {
    id: row.id,
    propertySlug: row.property_slug,
    startsAt,
    visitorName: row.visitor_name,
    visitorWhatsapp: row.visitor_whatsapp,
    note: row.note,
    hostKind: row.host_kind === "embajador" ? "embajador" : "owner",
    hostMemberId: row.host_member_id,
    status: row.status === "reserved" ? "reserved" : "cancelled",
    createdAt: iso(row.created_at),
    past: new Date(startsAt).getTime() + 60 * 60_000 < Date.now(),
  };
}

const bookingColumns = "id, property_slug, starts_at, visitor_name, visitor_whatsapp, note, host_kind, host_member_id, status, created_at";

function parseSettings(row: SettingsRow | null): VisitSettings {
  if (!row) return unsetVisitSettings;
  const weekdays = row.weekdays.split(",").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return { enabled: Boolean(row.enabled), weekdays, startMinute: Number(row.start_minute), endMinute: Number(row.end_minute) };
}

// null: bookings are not available yet (no database or no tables).
export async function getVisitSettings(propertySlug: string): Promise<VisitSettings | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    return parseSettings(await queryOne<SettingsRow>(
      "select enabled, weekdays, start_minute, end_minute from property_visit_settings where property_slug = :propertySlug",
      { propertySlug },
    ));
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function getVisitSettingsFor(slugs: string[]): Promise<Record<string, VisitSettings> | null> {
  if (!hasDatabaseConfig()) return null;
  if (!slugs.length) return {};
  try {
    const rows = (await queryRows<SettingsRow & { property_slug: string }>(
      `select property_slug, enabled, weekdays, start_minute, end_minute from property_visit_settings
        where property_slug in (${slugs.map((_, index) => `:slug${index}`).join(",")})`,
      Object.fromEntries(slugs.map((slug, index) => [`slug${index}`, slug])),
    )) ?? [];
    const found = new Map(rows.map((row) => [row.property_slug, parseSettings(row)]));
    return Object.fromEntries(slugs.map((slug) => [slug, found.get(slug) ?? unsetVisitSettings]));
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function saveVisitSettings(propertySlug: string, settings: VisitSettings) {
  await executeQuery(
    `insert into property_visit_settings (property_slug, enabled, weekdays, start_minute, end_minute)
     values (:propertySlug, :enabled, :weekdays, :startMinute, :endMinute)
     on duplicate key update enabled = values(enabled), weekdays = values(weekdays),
       start_minute = values(start_minute), end_minute = values(end_minute)`,
    { propertySlug, enabled: settings.enabled, weekdays: settings.weekdays.join(","), startMinute: settings.startMinute, endMinute: settings.endMinute },
  );
}

// Booked visits of one home from today on, oldest first.
export async function listUpcomingBookings(propertySlug: string, from = new Date()): Promise<VisitBooking[] | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const rows = (await queryRows<BookingRow>(
      `select ${bookingColumns} from visit_bookings
        where property_slug = :propertySlug and status = 'reserved' and starts_at >= :from and starts_at <= :until
        order by starts_at`,
      { propertySlug, from: new Date(from.getTime() - 60 * 60_000), until: new Date(from.getTime() + (visitBookingDays + 1) * 86_400_000) },
    )) ?? [];
    return rows.map(toBooking);
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

// The owner's panel: visits of their homes from a week ago on, cancelled ones included.
export async function listBookingsFor(slugs: string[]): Promise<VisitBooking[] | null> {
  if (!hasDatabaseConfig()) return null;
  if (!slugs.length) return [];
  try {
    const rows = (await queryRows<BookingRow>(
      `select ${bookingColumns} from visit_bookings
        where property_slug in (${slugs.map((_, index) => `:slug${index}`).join(",")})
          and starts_at >= now() - interval 7 day
        order by starts_at limit 200`,
      Object.fromEntries(slugs.map((slug, index) => [`slug${index}`, slug])),
    )) ?? [];
    return rows.map(toBooking);
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

// The calendar: visits of the owner's homes between two instants, cancelled ones included.
export async function listBookingsBetween(slugs: string[], start: Date, end: Date): Promise<VisitBooking[] | null> {
  if (!hasDatabaseConfig()) return null;
  if (!slugs.length) return [];
  try {
    const rows = (await queryRows<BookingRow>(
      `select ${bookingColumns} from visit_bookings
        where property_slug in (${slugs.map((_, index) => `:slug${index}`).join(",")})
          and starts_at >= :start and starts_at < :end
        order by starts_at limit 500`,
      {
        ...Object.fromEntries(slugs.map((slug, index) => [`slug${index}`, slug])),
        start: start.toISOString().slice(0, 19).replace("T", " "),
        end: end.toISOString().slice(0, 19).replace("T", " "),
      },
    )) ?? [];
    return rows.map(toBooking);
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function listRecentBookings(): Promise<VisitBooking[] | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const rows = (await queryRows<BookingRow>(
      `select ${bookingColumns} from visit_bookings where starts_at >= now() - interval 7 day order by starts_at limit 300`,
    )) ?? [];
    return rows.map(toBooking);
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export type BookingResult = { status: "created"; id: string } | { status: "taken" | "limited" | "unavailable" };

export async function createVisitBooking(input: {
  propertySlug: string;
  startsAt: string;
  visitorName: string;
  visitorWhatsapp: string;
  note: string | null;
  hostKind: "owner" | "embajador";
  hostMemberId: string | null;
  visitorId: string;
}): Promise<BookingResult> {
  if (!hasDatabaseConfig()) return { status: "unavailable" };
  try {
    // One device or one phone number: at most 2 upcoming visits per home and 5 bookings a day.
    const mine = await queryOne<{ home: number | string; today: number | string }>(
      `select
         sum(property_slug = :propertySlug and status = 'reserved' and starts_at >= now()) as home,
         sum(created_at >= now() - interval 1 day) as today
       from visit_bookings where visitor_id = :visitorId or visitor_whatsapp = :whatsapp`,
      { propertySlug: input.propertySlug, visitorId: input.visitorId, whatsapp: input.visitorWhatsapp },
    );
    if (Number(mine?.home ?? 0) >= 2 || Number(mine?.today ?? 0) >= 5) return { status: "limited" };
    const id = randomUUID();
    const startsAt = new Date(input.startsAt);
    await executeQuery(
      `insert into visit_bookings (id, property_slug, starts_at, slot_key, visitor_name, visitor_whatsapp, note, host_kind, host_member_id, visitor_id)
       values (:id, :propertySlug, :startsAt, :slotKey, :visitorName, :visitorWhatsapp, :note, :hostKind, :hostMemberId, :visitorId)`,
      {
        id,
        propertySlug: input.propertySlug,
        startsAt,
        slotKey: `${input.propertySlug}|${startsAt.toISOString()}`,
        visitorName: input.visitorName,
        visitorWhatsapp: input.visitorWhatsapp,
        note: input.note,
        hostKind: input.hostKind,
        hostMemberId: input.hostMemberId,
        visitorId: input.visitorId,
      },
    );
    return { status: "created", id };
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return { status: "taken" };
    if (isMissingTable(error)) return { status: "unavailable" };
    throw error;
  }
}

export async function getBooking(id: string) {
  const row = await queryOne<BookingRow>(`select ${bookingColumns} from visit_bookings where id = :id`, { id });
  return row ? toBooking(row) : null;
}

// Frees the slot so someone else can take it.
export async function cancelBooking(id: string, by: "owner" | "admin") {
  const result = await executeQuery(
    "update visit_bookings set status = 'cancelled', slot_key = null, cancelled_by = :by where id = :id and status = 'reserved'",
    { id, by },
  );
  return Boolean(result && (result as { affectedRows?: number }).affectedRows);
}

export type VisitHost =
  | { kind: "embajador"; name: string; whatsapp: string; member: PublicTeamMember }
  | { kind: "owner"; name: string; whatsapp: string; member: null };

export type VisitPlan = { settings: VisitSettings; host: VisitHost | null; team: PropertyTeamEntry[] };

// Who takes the visits of a home: its embajador when one is named for visits, otherwise the owner.
// host is null when nobody can be written to (a listing copied from another site, or no number).
// The whole plan is null while the visit tables do not exist.
export async function getVisitPlan(property: Pick<Property, "slug" | "operation" | "whatsapp" | "agent">): Promise<VisitPlan | null> {
  const [settings, entries] = await Promise.all([getVisitSettings(property.slug), getPropertyTeam(property.slug)]);
  if (!settings) return null;
  const team = entries.map(({ member, role, handlesVisits }) => ({ member, role, handlesVisits }));
  if (property.operation !== "Alquiler") return { settings, host: null, team };
  const embajador = entries.find((entry) => entry.handlesVisits && entry.whatsapp);
  if (embajador?.whatsapp) {
    return { settings, team, host: { kind: "embajador", name: embajador.member.name, whatsapp: embajador.whatsapp, member: embajador.member } };
  }
  const ownerWhatsapp = normalizePublicationPhone(property.agent.whatsapp ?? "") ?? "";
  const reachable = !isExternalContactUrl(property.whatsapp) && ownerWhatsapp !== "" && ownerWhatsapp !== "59170000000";
  return { settings, team, host: reachable ? { kind: "owner", name: property.agent.name, whatsapp: ownerWhatsapp, member: null } : null };
}
