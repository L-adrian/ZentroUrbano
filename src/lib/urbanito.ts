import type { RowDataPacket } from "mysql2";
import { ownerListingStatus, ownerListingStatusLabels } from "@/lib/listing-moderation";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows, withTransaction } from "@/lib/mysql";
import { formatPrice } from "@/lib/properties";
import { mapPropertyRow, type PropertyRow } from "@/lib/property-data";
import { getListingAudience } from "@/lib/property-audience";
import { isMissingTable } from "@/lib/team";
import { hashLinkCode, listingLink, newLinkCode, normalizeLinkCode, urbanitoCodeMinutes, urbanitoKeyMatches } from "@/lib/urbanito-input";
import { listBookingsFor } from "@/lib/visits";

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

export type UrbanitoLinkStatus = { linked: boolean; linkedAt: string | null };

export async function getUrbanitoLink(accountId: string): Promise<UrbanitoLinkStatus | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const row = await queryOne<{ telegram_id: number | null; linked_at: Date | null }>(
      "select telegram_id, linked_at from urbanito_links where account_id = :accountId",
      { accountId },
    );
    return { linked: Boolean(row?.telegram_id), linkedAt: row?.telegram_id && row.linked_at ? new Date(row.linked_at).toISOString() : null };
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
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
  return guard(() =>
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
      return { nombre: row.display_name };
    }),
  );
}

export async function unlinkTelegram(telegramId: number) {
  return guard(() => executeQuery("update urbanito_links set telegram_id = null, linked_at = null where telegram_id = :telegramId", { telegramId }));
}

export async function unlinkAccount(accountId: string) {
  return guard(() =>
    executeQuery("update urbanito_links set telegram_id = null, linked_at = null, code_hash = null, code_expires_at = null where account_id = :accountId", { accountId }),
  );
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
    const [audience, bookings] = await Promise.all([
      getListingAudience(slugs).catch(() => null),
      listBookingsFor(slugs).catch(() => null),
    ]);
    const statusBySlug = new Map(links.map((row) => [row.property_slug, row.status]));
    const titleBySlug = new Map(properties.map((property) => [property.slug, property.title]));
    return {
      cuenta: { nombre: account.display_name },
      casas: properties.map((property) => ({
        titulo: property.title,
        link: listingLink(origin, property.slug),
        estado: ownerListingStatusLabels[ownerListingStatus(statusBySlug.get(property.slug) ?? "active", property.published)],
        zona: property.zone,
        precio: formatPrice(property),
        vistas_total: audience ? audience.get(property.slug)?.viewsTotal ?? 0 : null,
        vistas_7_dias: audience ? audience.get(property.slug)?.views7 ?? 0 : null,
        disponible_confirmada: property.availabilityConfirmedAt ?? null,
      })),
      visitas: (bookings ?? [])
        .filter((booking) => !booking.past && booking.status === "reserved")
        .slice(0, 20)
        .map((booking) => ({
          casa: titleBySlug.get(booking.propertySlug) ?? booking.propertySlug,
          fecha: bolivianDate.format(new Date(booking.startsAt)),
          nombre: booking.visitorName,
          whatsapp: booking.visitorWhatsapp,
          estado: booking.hostKind === "embajador" ? "La atiende un aliado de Zentro" : "La atendés vos",
        })),
    };
  });
}
