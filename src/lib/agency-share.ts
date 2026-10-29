import "server-only";
import { randomBytes } from "node:crypto";
import { listCalendarHomes } from "@/lib/calendar";
import { CrmUnavailable } from "@/lib/crm";
import { clientStages, isClientStage, type ClientStage } from "@/lib/crm-input";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows } from "@/lib/mysql";
import { formatPrice } from "@/lib/properties";
import { mapPropertyRow, type PropertyRow } from "@/lib/property-data";
import { getListingAudience } from "@/lib/property-audience";
import { siteConfig } from "@/lib/site";
import { isMissingTable } from "@/lib/team";
import { listBookingsFor } from "@/lib/visits";

// Read-only report of one home for its owner, opened with a secret link (43 characters). The
// agency can stop sharing at any time; the old link then shows nothing.

export const validShareToken = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
const shareUrl = (token: string) => `${siteConfig.url.replace(/\/$/, "")}/informe/${token}`;

async function guard<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (isMissingTable(error)) throw new CrmUnavailable();
    throw error;
  }
}

export async function listShareLinks(accountId: string, propertySlug: string) {
  return guard(async () => {
    const rows =
      (await queryRows<{ token: string; property_slug: string; created_at: Date | string }>(
        "select token, property_slug, created_at from agency_share_links where account_id = :accountId and property_slug = :propertySlug and revoked_at is null order by created_at desc",
        { accountId, propertySlug },
      )) ?? [];
    return rows.map((row) => ({ token: row.token, propertySlug: row.property_slug, url: shareUrl(row.token), createdAt: new Date(row.created_at).toISOString() }));
  });
}

// One live link per home: asking again returns the same one.
export async function createShareLink(accountId: string, propertySlug: string) {
  return guard(async () => {
    if (!(await listCalendarHomes(accountId)).some((home) => home.slug === propertySlug)) return null;
    const current = await listShareLinks(accountId, propertySlug);
    if (current.length) return current;
    await executeQuery("insert into agency_share_links (token, account_id, property_slug) values (:token, :accountId, :propertySlug)", {
      token: randomBytes(32).toString("base64url"),
      accountId,
      propertySlug,
    });
    return listShareLinks(accountId, propertySlug);
  });
}

export async function revokeShareLink(accountId: string, token: string) {
  return guard(async () => {
    const row = await queryOne<{ property_slug: string }>("select property_slug from agency_share_links where token = :token and account_id = :accountId", { token, accountId });
    if (!row) return null;
    await executeQuery("update agency_share_links set revoked_at = utc_timestamp() where token = :token and account_id = :accountId", { token, accountId });
    return listShareLinks(accountId, row.property_slug);
  });
}

export type OwnerReport = {
  agencyName: string;
  agencyLogo: string | null;
  agencyPhone: string | null;
  title: string;
  slug: string;
  published: boolean;
  image: string | null;
  price: string | null;
  availabilityConfirmedAt: string | null;
  views7: number | null;
  views30: number | null;
  viewsTotal: number | null;
  contacts30: number | null;
  contactsTotal: number | null;
  visitsPast: number;
  visitsNext: string[];
  interested: Array<{ stage: ClientStage; count: number }>;
};

// What the owner sees. Never names or phone numbers of the interested people.
export async function getOwnerReport(token: string): Promise<OwnerReport | null> {
  if (!hasDatabaseConfig() || !validShareToken(token)) return null;
  try {
    const link = await queryOne<{ account_id: string; property_slug: string; agency_name: string; avatar_url: string | null; phone: string | null }>(
      `select l.account_id, l.property_slug, a.name as agency_name, c.avatar_url, c.phone
         from agency_share_links l join agencies a on a.account_id = l.account_id and a.active = 1
         join client_accounts c on c.id = l.account_id
        where l.token = :token and l.revoked_at is null`,
      { token },
    );
    if (!link) return null;
    const owned = await queryOne<{ slug: string }>(
      "select property_slug as slug from client_account_properties where account_id = :accountId and property_slug = :slug and status <> 'closed'",
      { accountId: link.account_id, slug: link.property_slug },
    );
    if (!owned) return null;
    const propertyRow = await queryOne<PropertyRow>("select * from properties where slug = :slug", { slug: link.property_slug });
    if (!propertyRow) return null;
    const property = mapPropertyRow(propertyRow);
    const [audience, bookings, stages] = await Promise.all([
      getListingAudience([property.slug]).catch(() => null),
      listBookingsFor([property.slug]).catch(() => null),
      queryRows<{ stage: string; total: number }>(
        "select stage, count(*) as total from agency_clients where account_id = :accountId and property_slug = :slug group by stage",
        { accountId: link.account_id, slug: property.slug },
      ).catch(() => null),
    ]);
    const seen = audience?.get(property.slug) ?? null;
    const reserved = (bookings ?? []).filter((booking) => booking.status !== "cancelled");
    const counts = new Map((stages ?? []).filter((row) => isClientStage(row.stage)).map((row) => [row.stage as ClientStage, Number(row.total)]));
    return {
      agencyName: link.agency_name,
      agencyLogo: link.avatar_url,
      agencyPhone: link.phone,
      title: property.title,
      slug: property.slug,
      published: property.published,
      image: property.images?.[0] ?? null,
      price: formatPrice(property),
      availabilityConfirmedAt: property.availabilityConfirmedAt ?? null,
      views7: seen?.views7 ?? null,
      views30: seen?.views30 ?? null,
      viewsTotal: seen?.viewsTotal ?? null,
      contacts30: seen?.contacts30 ?? null,
      contactsTotal: seen?.contactsTotal ?? null,
      visitsPast: reserved.filter((booking) => booking.past).length,
      visitsNext: reserved.filter((booking) => !booking.past).map((booking) => booking.startsAt).slice(0, 10),
      interested: clientStages.map((stage) => ({ stage, count: counts.get(stage) ?? 0 })),
    };
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}
