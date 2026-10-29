import "server-only";
import { createHash } from "node:crypto";
import { addDays, boliviaParts, type CalendarEvent } from "@/lib/calendar-input";
import { googleCalendarConfigured, googleEventBody, googleEventId, openToken, sealToken } from "@/lib/google-calendar-event";
import { clientStepEvent, getCalendar, listCalendarHomes } from "@/lib/calendar";
import { getAgentLogin, listClientSteps } from "@/lib/crm";
import { googleClientId } from "@/lib/google-oauth";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows } from "@/lib/mysql";
import { siteConfig } from "@/lib/site";
import { isMissingTable } from "@/lib/team";

// Zentro copies each account's calendar into its own Google Calendar (one way: Zentro is the
// source). Owners and agencies get their whole calendar; an agent gets the next steps of their
// clients. Events carry a fixed id per Zentro event, so a new sync updates instead of duplicating.

const syncDays = 60;
const maxWritesPerSync = 150;

type LinkRow = { account_id: string; google_email: string | null; refresh_token: string; last_sync_at: Date | string | null; last_error: string | null };

export type GoogleCalendarStatus = {
  configured: boolean;
  ready: boolean;
  connected: boolean;
  email: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

const iso = (value: Date | string) => (value instanceof Date ? value : new Date(`${String(value).replace(" ", "T")}Z`)).toISOString();
const sqlTime = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

async function getLink(accountId: string) {
  return queryOne<LinkRow>("select account_id, google_email, refresh_token, last_sync_at, last_error from google_calendar_links where account_id = :accountId", { accountId });
}

export async function googleCalendarStatus(accountId: string): Promise<GoogleCalendarStatus> {
  const configured = googleCalendarConfigured();
  if (!hasDatabaseConfig()) return { configured, ready: false, connected: false, email: null, lastSyncAt: null, lastError: null };
  try {
    const link = await getLink(accountId);
    return {
      configured,
      ready: true,
      connected: Boolean(link),
      email: link?.google_email ?? null,
      lastSyncAt: link?.last_sync_at ? iso(link.last_sync_at) : null,
      lastError: link?.last_error ?? null,
    };
  } catch (error) {
    if (isMissingTable(error)) return { configured, ready: false, connected: false, email: null, lastSyncAt: null, lastError: null };
    throw error;
  }
}

export async function saveGoogleLink(accountId: string, email: string | null, refreshToken: string) {
  await executeQuery(
    `insert into google_calendar_links (account_id, google_email, refresh_token) values (:accountId, :email, :token)
     on duplicate key update google_email = values(google_email), refresh_token = values(refresh_token), last_error = null`,
    { accountId, email, token: sealToken(refreshToken) },
  );
}

// A fresh access token for each sync; Google answers invalid_grant when the person removed access.
async function accessToken(link: LinkRow) {
  const refresh = openToken(link.refresh_token);
  if (!refresh) return { ok: false as const, reason: "Hay que volver a conectar Google Calendar." };
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: googleClientId(), client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", refresh_token: refresh, grant_type: "refresh_token" }),
  }).catch(() => null);
  const token = (await response?.json().catch(() => ({}))) as { access_token?: string; error?: string } | undefined;
  if (response?.ok && token?.access_token) return { ok: true as const, token: token.access_token };
  return { ok: false as const, reason: token?.error === "invalid_grant" ? "Google quitó el permiso. Vuelve a conectar." : "Google no respondió. Probamos de nuevo más tarde." };
}


// What goes into this account's Google Calendar for the next weeks.
async function eventsFor(accountId: string, start: Date, end: Date) {
  const agent = await getAgentLogin(accountId);
  if (agent) {
    const [steps, homes] = await Promise.all([listClientSteps(agent.agencyAccountId, start, end, agent.agentId), listCalendarHomes(agent.agencyAccountId)]);
    const titles = new Map(homes.map((home) => [home.slug, home.title]));
    return steps.map((client) => clientStepEvent(client, titles)).filter((event): event is CalendarEvent => Boolean(event));
  }
  const { events } = await getCalendar(accountId, start, end);
  // Urbanito already reminds on Telegram; cancelled visits are removed.
  return events.filter((event) => !event.cancelled && event.source !== "urbanito");
}

async function google(method: string, path: string, token: string, body?: unknown) {
  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events${path}`, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
}

export type SyncResult = { ok: boolean; written: number; removed: number; message: string | null };

// Creates, updates and removes the account's events in Google. Runs after changes and when the
// calendar is opened (at most every 10 minutes), and with "Sincronizar ahora".
export async function syncGoogleCalendar(accountId: string): Promise<SyncResult> {
  if (!googleCalendarConfigured() || !hasDatabaseConfig()) return { ok: false, written: 0, removed: 0, message: null };
  let link: LinkRow | null;
  try {
    link = await getLink(accountId);
  } catch (error) {
    if (isMissingTable(error)) return { ok: false, written: 0, removed: 0, message: null };
    throw error;
  }
  if (!link) return { ok: false, written: 0, removed: 0, message: null };
  const fail = async (message: string) => {
    await executeQuery("update google_calendar_links set last_error = :message where account_id = :accountId", { accountId, message: message.slice(0, 255) }).catch(() => null);
    return { ok: false, written: 0, removed: 0, message };
  };
  const auth = await accessToken(link);
  if (!auth.ok) return fail(auth.reason);

  const origin = siteConfig.url.replace(/\/$/, "");
  const today = boliviaParts(new Date()).day;
  const start = new Date(Date.parse(`${addDays(today, -1)}T04:00:00Z`));
  const end = new Date(Date.parse(`${addDays(today, syncDays)}T04:00:00Z`));
  const events = await eventsFor(accountId, start, end);
  const known = new Map(
    (
      (await queryRows<{ zentro_id: string; google_id: string; fingerprint: string }>(
        "select zentro_id, google_id, fingerprint from google_calendar_events where account_id = :accountId",
        { accountId },
      )) ?? []
    ).map((row) => [row.zentro_id, row]),
  );

  let written = 0;
  let removed = 0;
  for (const event of events) {
    if (written >= maxWritesPerSync) break;
    const body = googleEventBody(event, origin);
    const fingerprint = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const current = known.get(event.id);
    if (current?.fingerprint === fingerprint) continue;
    const googleId = current?.google_id ?? googleEventId(accountId, event.id);
    // Update first; a 404 means it is not in Google yet, so it is created with our id.
    let response = await google("PUT", `/${googleId}`, auth.token, body);
    if (response?.status === 404) response = await google("POST", "", auth.token, { id: googleId, ...body });
    if (!response?.ok) {
      if (response?.status === 401 || response?.status === 403) return fail("Google no dio permiso para el calendario. Vuelve a conectar.");
      continue;
    }
    written += 1;
    await executeQuery(
      `insert into google_calendar_events (account_id, zentro_id, google_id, fingerprint, starts_at) values (:accountId, :zentroId, :googleId, :fingerprint, :startsAt)
       on duplicate key update google_id = values(google_id), fingerprint = values(fingerprint), starts_at = values(starts_at)`,
      { accountId, zentroId: event.id, googleId, fingerprint, startsAt: sqlTime(new Date(event.startsAt)) },
    );
  }

  // Events that left Zentro (deleted, moved out of range, cancelled visit) leave Google too.
  // Old ones stay as a record.
  const live = new Set(events.map((event) => event.id));
  const gone =
    (await queryRows<{ zentro_id: string; google_id: string }>(
      "select zentro_id, google_id from google_calendar_events where account_id = :accountId and starts_at >= :start",
      { accountId, start: sqlTime(start) },
    )) ?? [];
  for (const row of gone) {
    if (live.has(row.zentro_id) || removed >= maxWritesPerSync) continue;
    const response = await google("DELETE", `/${row.google_id}`, auth.token);
    if (response && (response.ok || response.status === 404 || response.status === 410)) {
      removed += 1;
      await executeQuery("delete from google_calendar_events where account_id = :accountId and zentro_id = :zentroId", { accountId, zentroId: row.zentro_id });
    }
  }
  await executeQuery("update google_calendar_links set last_sync_at = utc_timestamp(), last_error = null where account_id = :accountId", { accountId });
  return { ok: true, written, removed, message: null };
}

// Several quick changes become one sync a few seconds later.
const pending = new Map<string, ReturnType<typeof setTimeout>>();
export function queueGoogleSync(accountId: string, delay = 4_000) {
  if (!googleCalendarConfigured()) return;
  const current = pending.get(accountId);
  if (current) clearTimeout(current);
  pending.set(
    accountId,
    setTimeout(() => {
      pending.delete(accountId);
      syncGoogleCalendar(accountId).catch((error) => console.error("google calendar sync failed", error));
    }, delay),
  );
}

// After a change in an agency's clients: its own calendar and its agents' calendars.
export async function queueAgencySync(agencyAccountId: string) {
  if (!googleCalendarConfigured()) return;
  queueGoogleSync(agencyAccountId);
  const agents =
    (await queryRows<{ login_account_id: string }>(
      `select g.login_account_id from agency_agents g join google_calendar_links l on l.account_id = g.login_account_id where g.account_id = :agencyAccountId`,
      { agencyAccountId },
    ).catch(() => null)) ?? [];
  for (const agent of agents) queueGoogleSync(agent.login_account_id);
}

// When the calendar is opened: a sync if the last one is older than 10 minutes (new visits booked
// by tenants arrive this way).
export async function syncIfStale(accountId: string) {
  const status = await googleCalendarStatus(accountId).catch(() => null);
  if (!status?.connected) return;
  if (status.lastSyncAt && Date.now() - Date.parse(status.lastSyncAt) < 10 * 60_000) return;
  queueGoogleSync(accountId, 0);
}

// "Desconectar": removes the Zentro events from today on from Google, gives the permission back and
// forgets the token.
export async function disconnectGoogleCalendar(accountId: string) {
  const link = await getLink(accountId);
  if (!link) return;
  const auth = await accessToken(link);
  if (auth.ok) {
    const rows =
      (await queryRows<{ google_id: string }>("select google_id from google_calendar_events where account_id = :accountId and starts_at >= :today", {
        accountId,
        today: sqlTime(new Date(`${boliviaParts(new Date()).day}T04:00:00Z`)),
      })) ?? [];
    for (const row of rows.slice(0, maxWritesPerSync)) await google("DELETE", `/${row.google_id}`, auth.token);
  }
  const refresh = openToken(link.refresh_token);
  if (refresh) {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refresh }),
    }).catch(() => null);
  }
  await executeQuery("delete from google_calendar_links where account_id = :accountId", { accountId });
}
