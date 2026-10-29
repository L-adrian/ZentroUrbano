import type { RowDataPacket } from "mysql2";
import { ownerListingStatus, ownerListingStatusLabels } from "@/lib/listing-moderation";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows, withTransaction } from "@/lib/mysql";
import { formatPrice } from "@/lib/properties";
import { mapPropertyRow, type PropertyRow } from "@/lib/property-data";
import { getListingAudience } from "@/lib/property-audience";
import { isMissingTable } from "@/lib/team";
import { hashLinkCode, listingLink, newLinkCode, normalizeLinkCode, readUrbanitoSnapshot, urbanitoCodeMinutes, urbanitoKeyMatches, type UrbanitoSnapshot } from "@/lib/urbanito-input";
import { listBookingsFor, getVisitSettingsFor, cancelBooking, getBooking, saveVisitSettings } from "@/lib/visits";
import { reconfirmDay, boliviaParts } from "@/lib/calendar-input";
import { listPublicationRequests } from "@/lib/publication-requests";
import { getAgency, getAgentLogin } from "@/lib/crm";
import { normalizeVisitSettings } from "@/lib/visit-slots";

export const urbanitoBotUsername = "UrbanitoZentroBot";

const apiKey = () => process.env.URBANITO_API_KEY?.trim() || undefined;

export const urbanitoEnabled = () => Boolean(apiKey()) && hasDatabaseConfig();

export function urbanitoAuthorized(request: Request) {
  return urbanitoKeyMatches(request.headers.get("authorization"), apiKey());
}

// Until 013_urbanito_links runs, linking answers "not available" instead of failing.
export class UrbanitoUnavailable extends Error {}

async function guard<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (isMissingTable(error)) throw new UrbanitoUnavailable();
    throw error;
  }
}

export type UrbanitoLinkStatus = {
  linked: boolean;
  linkedAt: string | null;
  // Null while 014_urbanito_snapshots is missing or the bot has not reported yet.
  snapshot: (UrbanitoSnapshot & { updatedAt: string }) | null;
  showChat: boolean;
};

export async function getUrbanitoLink(accountId: string): Promise<UrbanitoLinkStatus | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const row = await queryOne<{ telegram_id: number | null; linked_at: Date | null }>(
      "select telegram_id, linked_at from urbanito_links where account_id = :accountId",
      { accountId },
    );
    const linked = Boolean(row?.telegram_id);
    const saved = linked ? await getSnapshot(accountId) : null;
    return {
      linked,
      linkedAt: linked && row?.linked_at ? new Date(row.linked_at).toISOString() : null,
      snapshot: saved?.snapshot ?? null,
      showChat: saved?.showChat ?? true,
    };
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

async function getSnapshot(accountId: string) {
  try {
    const row = await queryOne<{ snapshot: string; show_chat: number; updated_at: Date }>(
      "select snapshot, show_chat, updated_at from urbanito_snapshots where account_id = :accountId",
      { accountId },
    );
    if (!row) return null;
    const showChat = Boolean(Number(row.show_chat));
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(row.snapshot);
    } catch {
      parsed = null;
    }
    return { showChat, snapshot: parsed ? { ...readUrbanitoSnapshot(parsed, showChat), updatedAt: new Date(row.updated_at).toISOString() } : null };
  } catch (error) {
    // Linking works before 014_urbanito_snapshots runs; the tab just shows no activity yet.
    if (isMissingTable(error)) return null;
    throw error;
  }
}

// The bot reports what it did for a linked owner. Returns null when that Telegram account is not linked.
export async function saveUrbanitoSnapshot(telegramId: number, body: unknown) {
  return guard(async () => {
    const account = await queryOne<{ id: string }>("select account_id as id from urbanito_links where telegram_id = :telegramId", { telegramId });
    if (!account) return null;
    const current = await queryOne<{ show_chat: number }>("select show_chat from urbanito_snapshots where account_id = :accountId", { accountId: account.id });
    const showChat = current ? Boolean(Number(current.show_chat)) : true;
    await executeQuery(
      `insert into urbanito_snapshots (account_id, snapshot) values (:accountId, :snapshot)
       on duplicate key update snapshot = values(snapshot)`,
      { accountId: account.id, snapshot: JSON.stringify(readUrbanitoSnapshot(body, showChat)) },
    );
    return { showChat };
  });
}

// "Lo último que hablaron" on or off. Turning it off also deletes the messages already stored.
export async function setUrbanitoChatVisible(accountId: string, visible: boolean) {
  return guard(async () => {
    const row = await queryOne<{ snapshot: string }>("select snapshot from urbanito_snapshots where account_id = :accountId", { accountId });
    let snapshot = "{}";
    try {
      snapshot = JSON.stringify(readUrbanitoSnapshot(row ? JSON.parse(row.snapshot) : {}, visible));
    } catch {
      snapshot = JSON.stringify(readUrbanitoSnapshot({}, visible));
    }
    await executeQuery(
      `insert into urbanito_snapshots (account_id, snapshot, show_chat) values (:accountId, :snapshot, :visible)
       on duplicate key update snapshot = values(snapshot), show_chat = values(show_chat)`,
      { accountId, snapshot, visible: visible ? 1 : 0 },
    );
  });
}

async function forgetSnapshot(where: string, params: Record<string, string | number>) {
  try {
    await executeQuery(`delete from urbanito_snapshots where ${where}`, params);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
  }
}

// A new code replaces the previous one; the Telegram link, if any, stays until the bot uses it.
export async function createLinkCode(accountId: string) {
  return guard(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = newLinkCode();
      try {
        await executeQuery(
          `insert into urbanito_links (account_id, code_hash, code_expires_at)
           values (:accountId, :hash, utc_timestamp() + interval ${urbanitoCodeMinutes} minute)
           on duplicate key update code_hash = values(code_hash), code_expires_at = values(code_expires_at)`,
          { accountId, hash: hashLinkCode(code) },
        );
        return code;
      } catch (error) {
        if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
      }
    }
    throw new Error("URBANITO_CODE_COLLISION");
  });
}

// The bot sends the code the owner typed. A Telegram account can be linked to one Zentro account.
export async function linkTelegram(rawCode: unknown, telegramId: number) {
  const code = normalizeLinkCode(rawCode);
  if (!code) return null;
  const linked = await guard(() =>
    withTransaction(async (connection) => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `select ul.account_id, ca.display_name
           from urbanito_links ul join client_accounts ca on ca.id = ul.account_id
          where ul.code_hash = ? and ul.code_expires_at > utc_timestamp() for update`,
        [hashLinkCode(code)],
      );
      const row = rows[0] as { account_id: string; display_name: string } | undefined;
      if (!row) return null;
      await connection.execute("update urbanito_links set telegram_id = null where telegram_id = ? and account_id <> ?", [telegramId, row.account_id]);
      await connection.execute(
        "update urbanito_links set telegram_id = ?, code_hash = null, code_expires_at = null, linked_at = utc_timestamp() where account_id = ?",
        [telegramId, row.account_id],
      );
      return { accountId: row.account_id, nombre: row.display_name };
    }),
  );
  if (!linked) return null;
  // A new Telegram account starts with an empty Urbanito tab, never the previous one's activity.
  await forgetSnapshot("account_id = :accountId", { accountId: linked.accountId });
  return { nombre: linked.nombre };
}

export async function unlinkTelegram(telegramId: number) {
  return guard(async () => {
    await forgetSnapshot("account_id in (select account_id from urbanito_links where telegram_id = :telegramId)", { telegramId });
    return executeQuery("update urbanito_links set telegram_id = null, linked_at = null where telegram_id = :telegramId", { telegramId });
  });
}

export async function unlinkAccount(accountId: string) {
  return guard(async () => {
    await forgetSnapshot("account_id = :accountId", { accountId });
    return executeQuery("update urbanito_links set telegram_id = null, linked_at = null, code_hash = null, code_expires_at = null where account_id = :accountId", { accountId });
  });
}

const bolivianDate = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// What the bot shows an owner who linked their account: their homes, views and upcoming visits.
export async function getUrbanitoAccount(telegramId: number, origin: string) {
  return guard(async () => {
    const account = await queryOne<{ id: string; display_name: string }>(
      `select ca.id, ca.display_name from urbanito_links ul join client_accounts ca on ca.id = ul.account_id
        where ul.telegram_id = :telegramId`,
      { telegramId },
    );
    if (!account) return null;
    const links =
      (await queryRows<{ property_slug: string; status: string }>(
        `select cap.property_slug, cap.status from client_account_properties cap
          where cap.account_id = :accountId and cap.status <> 'closed'`,
        { accountId: account.id },
      )) ?? [];
    const slugs = links.map((row) => row.property_slug);
    const properties = slugs.length
      ? ((await queryRows<PropertyRow>(
          `select * from properties where slug in (${slugs.map((_, index) => `:slug${index}`).join(",")}) order by updated_at desc`,
          Object.fromEntries(slugs.map((slug, index) => [`slug${index}`, slug])),
        )) ?? []).map(mapPropertyRow)
      : [];
    const [audience, bookings, hours, requests, agency, agent] = await Promise.all([
      getListingAudience(slugs).catch(() => null),
      listBookingsFor(slugs).catch(() => null),
      getVisitSettingsFor(slugs).catch(() => null),
      listPublicationRequests(account.id).catch(() => []),
      getAgency(account.id).catch(() => null),
      getAgentLogin(account.id).catch(() => null),
    ]);
    const today = boliviaParts(new Date()).day;
    const statusBySlug = new Map(links.map((row) => [row.property_slug, row.status]));
    const titleBySlug = new Map(properties.map((property) => [property.slug, property.title]));
    return {
      cuenta: { nombre: account.display_name },
      // The bot offers Clientes only to agents and agencies.
      es_agente: Boolean(agency || agent),
      casas: properties.map((property) => ({
        slug: property.slug,
        titulo: property.title,
        link: listingLink(origin, property.slug),
        estado: ownerListingStatusLabels[ownerListingStatus(statusBySlug.get(property.slug) ?? "active", property.published)],
        zona: property.zone,
        precio: formatPrice(property),
        vistas_total: audience ? audience.get(property.slug)?.viewsTotal ?? 0 : null,
        vistas_7_dias: audience ? audience.get(property.slug)?.views7 ?? 0 : null,
        disponible_confirmada: property.availabilityConfirmedAt ?? null,
        // A live home asks every 21 days whether it is still free (the same date as the calendar).
        confirmar_desde: property.published ? reconfirmDay(property.availabilityConfirmedAt) : null,
        toca_confirmar: Boolean(property.published && (reconfirmDay(property.availabilityConfirmedAt) ?? today) <= today),
        horarios_visita: hours?.[property.slug] ?? null,
      })),
      // Requests of the last 30 days: in review, published, rejected or asked to be corrected.
      solicitudes: requests
        .filter((request) => Date.now() - Date.parse(request.reviewedAt ?? request.createdAt) < 30 * 86_400_000)
        .slice(0, 10)
        .map((request) => ({
          id: request.id,
          titulo: request.listing?.title || request.details?.title || "Vivienda sin título",
          estado: request.status,
          motivo: request.reviewReason ?? null,
          corregir: request.status === "changes_requested" ? `${origin}/publicar?corregir=${encodeURIComponent(request.id)}` : null,
          fecha: request.reviewedAt ?? request.createdAt,
        })),
      visitas: (bookings ?? [])
        .filter((booking) => !booking.past && booking.status === "reserved")
        .slice(0, 20)
        .map((booking) => ({
          id: booking.id,
          slug: booking.propertySlug,
          casa: titleBySlug.get(booking.propertySlug) ?? booking.propertySlug,
          fecha: bolivianDate.format(new Date(booking.startsAt)),
          nombre: booking.visitorName,
          whatsapp: booking.visitorWhatsapp,
          estado: booking.hostKind === "embajador" ? "La atiende un aliado de Zentro" : "La atendés vos",
        })),
    };
  });
}

// The linked account that /publicar sends a home for: only active owners can publish (as in the wizard).
export async function getUrbanitoOwner(telegramId: number) {
  return guard(() =>
    queryOne<{ id: string; kind: string; status: string; email: string; display_name: string; phone: string | null }>(
      `select ca.id, ca.kind, ca.status, ca.email, ca.display_name, ca.phone from urbanito_links ul join client_accounts ca on ca.id = ul.account_id
        where ul.telegram_id = :telegramId`,
      { telegramId },
    ),
  );
}

// The linked account's own home (not closed): every change from Telegram checks this first.
export async function urbanitoOwnsListing(accountId: string, slug: string) {
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return false;
  const row = await queryOne<{ id: string }>(
    "select id from client_account_properties where account_id = :accountId and property_slug = :slug and status <> 'closed' limit 1",
    { accountId, slug },
  );
  return Boolean(row);
}

// New monthly price of a home, in its own currency. Same limits as the editor in Mi cuenta.
export async function setUrbanitoListingPrice(slug: string, price: number) {
  await executeQuery(
    `update properties set price = :price,
            rental_details = case when rental_details is null then null else JSON_SET(rental_details, '$.price', :price) end,
            updated_at = current_timestamp
      where slug = :slug`,
    { slug, price },
  );
}

// Cancel a visit booked on one of the account's homes. Returns null when it is not theirs.
export async function cancelUrbanitoVisit(accountId: string, bookingId: string) {
  const booking = await getBooking(bookingId);
  if (!booking || !(await urbanitoOwnsListing(accountId, booking.propertySlug))) return null;
  return { cancelled: await cancelBooking(booking.id, "owner"), booking };
}

// Days and hours a home can be visited; null when the settings are not valid.
export async function saveUrbanitoVisitHours(slug: string, raw: unknown) {
  const settings = normalizeVisitSettings(raw);
  if (!settings) return null;
  await saveVisitSettings(slug, settings);
  return settings;
}
