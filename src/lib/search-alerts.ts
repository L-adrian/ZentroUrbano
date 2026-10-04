import "server-only";
import { randomUUID } from "node:crypto";
import { executeQuery, hasDatabaseConfig, queryRows } from "@/lib/mysql";
import { rentalSearchParamKeys } from "@/lib/property-search";
import { searchAlertConsentText, searchAlertLimits, type SearchAlertStatus } from "@/lib/search-alert-input";

export type SearchAlert = {
  id: string;
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  params: string;
  summary: string;
  status: SearchAlertStatus;
  lastNotifiedAt: string | null;
  createdAt: string;
};

type SearchAlertRow = {
  id: string;
  contact_name: string | null;
  whatsapp_normalized: string | null;
  email: string | null;
  search_params: string;
  search_summary: string;
  status: SearchAlertStatus;
  last_notified_at: Date | string | null;
  created_at: Date | string;
};

// Production applies migrations by hand. Until 007_search_alerts runs, alerts are "unavailable"
// and the form falls back to WhatsApp instead of failing.
function isMissingTable(error: unknown) {
  const code = (error as { code?: string; errno?: number } | null)?.code;
  return code === "ER_NO_SUCH_TABLE" || (error as { errno?: number } | null)?.errno === 1146;
}

// Only the catalog's own filters are stored, so the admin can reopen the same search.
export function cleanAlertParams(raw: string) {
  const source = new URLSearchParams(raw.replace(/^\?/, ""));
  const clean = new URLSearchParams();
  for (const key of rentalSearchParamKeys as readonly string[]) {
    for (const value of source.getAll(key)) {
      if (value.trim()) clean.append(key, value.trim().slice(0, 120));
    }
  }
  return clean.toString().slice(0, searchAlertLimits.params);
}

export async function createSearchAlert(input: {
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  params: string;
  summary: string;
  visitorId: string;
}): Promise<"created" | "duplicate" | "limited" | "unavailable"> {
  if (!hasDatabaseConfig()) return "unavailable";
  try {
    const existing = await queryRows<{ id: string }>(
      `select id from search_alerts
        where status = 'active' and search_params = :params
          and ((:whatsapp is not null and whatsapp_normalized = :whatsapp) or (:email is not null and email = :email))
        limit 1`,
      { params: input.params, whatsapp: input.whatsapp, email: input.email },
    );
    if (existing?.length) return "duplicate";
    const recent = await queryRows<{ total: number | string }>(
      "select count(*) as total from search_alerts where visitor_id = :visitorId and created_at >= now() - interval 1 day",
      { visitorId: input.visitorId },
    );
    if (Number(recent?.[0]?.total ?? 0) >= 5) return "limited";
    await executeQuery(
      `insert into search_alerts (id, contact_name, whatsapp_normalized, email, search_params, search_summary, consent_text, visitor_id)
       values (:id, :name, :whatsapp, :email, :params, :summary, :consent, :visitorId)`,
      {
        id: randomUUID(),
        name: input.name,
        whatsapp: input.whatsapp,
        email: input.email,
        params: input.params,
        summary: input.summary.slice(0, searchAlertLimits.summary),
        consent: searchAlertConsentText.slice(0, 400),
        visitorId: input.visitorId,
      },
    );
    return "created";
  } catch (error) {
    if (isMissingTable(error)) return "unavailable";
    throw error;
  }
}

function toIso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Admin list. Returns null while the table does not exist yet.
export async function listSearchAlerts(status: SearchAlertStatus = "active"): Promise<SearchAlert[] | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const rows = await queryRows<SearchAlertRow>(
      `select id, contact_name, whatsapp_normalized, email, search_params, search_summary, status, last_notified_at, created_at
         from search_alerts where status = :status order by created_at desc limit 300`,
      { status },
    );
    return (rows ?? []).map((row) => ({
      id: row.id,
      name: row.contact_name,
      whatsapp: row.whatsapp_normalized,
      email: row.email,
      params: row.search_params,
      summary: row.search_summary,
      status: row.status,
      lastNotifiedAt: toIso(row.last_notified_at),
      createdAt: toIso(row.created_at) ?? "",
    }));
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export function validAlertId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
}

// "notified" records that the team wrote to the person; "remove" stops the alert (the row is kept).
export async function updateSearchAlert(id: string, action: "notified" | "remove") {
  if (!hasDatabaseConfig() || !validAlertId(id)) return false;
  const result = (await executeQuery(
    action === "notified"
      ? "update search_alerts set last_notified_at = current_timestamp where id = :id and status = 'active'"
      : "update search_alerts set status = 'removed' where id = :id",
    { id },
  )) as { affectedRows?: number } | null;
  return Boolean(result?.affectedRows);
}
