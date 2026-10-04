import "server-only";
import { executeQuery, hasDatabaseConfig, queryRows, type DbQueryValue } from "@/lib/mysql";
import { reportNoteMaxLength, type ReportReason } from "@/lib/property-reports";

// One person is one device: the anonymous visitor cookie. Events stored before that cookie
// existed count once per browser and day, so old page loads are not counted as people.
const personKey =
  "coalesce(json_unquote(json_extract(metadata, '$.visitor_id')), concat('legacy:', md5(coalesce(user_agent, '')), ':', date(created_at)))";
// Crawlers, link previews and scripts are not people.
const humansOnly =
  "coalesce(user_agent, '') <> '' and lower(user_agent) not regexp 'bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|^whatsapp/|curl/|wget/|python-requests|node-fetch|axios/'";

export type PublicViewStats = { total: number; last7: number };
export type ListingAudience = {
  views7: number;
  views30: number;
  viewsTotal: number;
  contacts7: number;
  contacts30: number;
  contactsTotal: number;
};

type Cached<T> = { at: number; value: T } | null;

function cached<T>(ttlMs: number, load: () => Promise<T>, empty: () => T) {
  let entry: Cached<T> = null;
  let pending: Promise<T> | null = null;
  return async () => {
    if (!hasDatabaseConfig()) return empty();
    if (entry && Date.now() - entry.at < ttlMs) return entry.value;
    pending ??= load()
      .then((value) => {
        entry = { at: Date.now(), value };
        return value;
      })
      .catch((error) => {
        console.error("property audience query failed", error);
        return entry?.value ?? empty();
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}

// Catalog cards: people per listing, refreshed every few minutes.
export const getPublicViewCounts = cached(
  5 * 60_000,
  async () => {
    const rows = await queryRows<{ slug: string; total: number | string; last7: number | string }>(
      `select property_slug as slug,
              count(distinct ${personKey}) as total,
              count(distinct case when created_at >= now() - interval 7 day then ${personKey} end) as last7
         from tracking_events
        where event_type = 'property_view' and property_slug is not null and ${humansOnly}
        group by property_slug`,
    );
    return new Map((rows ?? []).map((row) => [row.slug, { total: Number(row.total), last7: Number(row.last7) }]));
  },
  () => new Map<string, PublicViewStats>(),
);

// Listing page: the live count for one listing.
export async function getPublicViewStats(slug: string): Promise<PublicViewStats | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const rows = await queryRows<{ total: number | string; last7: number | string }>(
      `select count(distinct ${personKey}) as total,
              count(distinct case when created_at >= now() - interval 7 day then ${personKey} end) as last7
         from tracking_events
        where property_slug = :slug and event_type = 'property_view' and ${humansOnly}`,
      { slug },
    );
    const row = rows?.[0];
    return row ? { total: Number(row.total), last7: Number(row.last7) } : null;
  } catch (error) {
    console.error("property view count failed", error);
    return null;
  }
}

// Owner panel: people who opened each listing and people who asked for the owner's WhatsApp.
export async function getListingAudience(slugs: string[]) {
  const audience = new Map<string, ListingAudience>();
  if (!hasDatabaseConfig() || slugs.length === 0) return audience;
  const values: Record<string, DbQueryValue> = {};
  const placeholders = slugs.slice(0, 200).map((slug, index) => {
    values[`s${index}`] = slug;
    return `:s${index}`;
  });
  const rows = await queryRows<Record<keyof ListingAudience | "slug", number | string>>(
    `select property_slug as slug,
            count(distinct case when event_type = 'property_view' and created_at >= now() - interval 7 day then ${personKey} end) as views7,
            count(distinct case when event_type = 'property_view' and created_at >= now() - interval 30 day then ${personKey} end) as views30,
            count(distinct case when event_type = 'property_view' then ${personKey} end) as viewsTotal,
            count(distinct case when event_type = 'property_whatsapp_click' and created_at >= now() - interval 7 day then ${personKey} end) as contacts7,
            count(distinct case when event_type = 'property_whatsapp_click' and created_at >= now() - interval 30 day then ${personKey} end) as contacts30,
            count(distinct case when event_type = 'property_whatsapp_click' then ${personKey} end) as contactsTotal
       from tracking_events
      where property_slug in (${placeholders.join(",")})
        and event_type in ('property_view', 'property_whatsapp_click')
        and ${humansOnly}
      group by property_slug`,
    values,
  );
  for (const row of rows ?? []) {
    audience.set(String(row.slug), {
      views7: Number(row.views7),
      views30: Number(row.views30),
      viewsTotal: Number(row.viewsTotal),
      contacts7: Number(row.contacts7),
      contacts30: Number(row.contacts30),
      contactsTotal: Number(row.contactsTotal),
    });
  }
  return audience;
}

// /admin: last 30 days per listing, in people. See listing-funnel.ts for the table.
export async function getListingFunnel30() {
  if (!hasDatabaseConfig()) return null;
  const [counts, sources] = await Promise.all([
    queryRows<{ slug: string; viewed: number | string; gallery: number | string; shared: number | string; whatsapp: number | string }>(
      `select property_slug as slug,
              count(distinct case when event_type = 'property_view' then ${personKey} end) as viewed,
              count(distinct case when event_type = 'property_gallery_open' then ${personKey} end) as gallery,
              count(distinct case when event_type = 'property_shared_visit' then ${personKey} end) as shared,
              count(distinct case when event_type = 'property_whatsapp_click' then ${personKey} end) as whatsapp
         from tracking_events
        where created_at >= now() - interval 30 day and property_slug is not null
          and event_type in ('property_view', 'property_gallery_open', 'property_shared_visit', 'property_whatsapp_click')
          and ${humansOnly}
        group by property_slug`,
    ),
    queryRows<{ slug: string; source: string | null; people: number | string }>(
      `select property_slug as slug,
              coalesce(json_unquote(json_extract(metadata, '$.source')), 'otro') as source,
              count(distinct ${personKey}) as people
         from tracking_events
        where created_at >= now() - interval 30 day and property_slug is not null
          and event_type = 'property_whatsapp_click' and ${humansOnly}
        group by property_slug, source`,
    ),
  ]);
  return {
    counts: (counts ?? []).map((row) => ({ slug: String(row.slug), viewed: Number(row.viewed), gallery: Number(row.gallery), shared: Number(row.shared), whatsapp: Number(row.whatsapp) })),
    sources: (sources ?? []).map((row) => ({ slug: String(row.slug), source: String(row.source ?? "otro"), people: Number(row.people) })),
  };
}

// "Ya no está disponible" reports: the latest report time of each person, per listing.
export const getUnavailableReportTimes = cached(
  60_000,
  async () => {
    const rows = await queryRows<{ slug: string; last_at: Date | string }>(
      `select property_slug as slug, max(created_at) as last_at
         from tracking_events
        where event_type = 'property_report'
          and json_unquote(json_extract(metadata, '$.reason')) = 'ya_alquilada'
          and property_slug is not null
        group by property_slug, ${personKey}`,
    );
    const times = new Map<string, number[]>();
    for (const row of rows ?? []) {
      const at = new Date(row.last_at).getTime();
      if (!Number.isFinite(at)) continue;
      times.set(row.slug, [...(times.get(row.slug) ?? []), at]);
    }
    return times;
  },
  () => new Map<string, number[]>(),
);

export async function recordPropertyReport(input: {
  slug: string;
  reason: ReportReason;
  note: string;
  visitorId: string;
  userAgent: string | null;
}) {
  // One report per person, listing and reason a day; repeats are accepted but not stored again.
  const existing = await queryRows<{ id: number }>(
    `select id from tracking_events
      where event_type = 'property_report' and property_slug = :slug
        and json_unquote(json_extract(metadata, '$.visitor_id')) = :visitorId
        and json_unquote(json_extract(metadata, '$.reason')) = :reason
        and created_at >= now() - interval 1 day
      limit 1`,
    { slug: input.slug, visitorId: input.visitorId, reason: input.reason },
  );
  if (existing?.length) return { stored: false, duplicate: true };
  const recent = await queryRows<{ total: number | string }>(
    `select count(*) as total from tracking_events
      where event_type = 'property_report'
        and json_unquote(json_extract(metadata, '$.visitor_id')) = :visitorId
        and created_at >= now() - interval 1 day`,
    { visitorId: input.visitorId },
  );
  if (Number(recent?.[0]?.total ?? 0) >= 10) return { stored: false, limited: true };
  await executeQuery(
    `insert into tracking_events (event_type, property_slug, path, user_agent, metadata)
     values ('property_report', :slug, :path, :userAgent, :metadata)`,
    {
      slug: input.slug.slice(0, 180),
      path: `/propiedades/${input.slug}`.slice(0, 500),
      userAgent: input.userAgent?.slice(0, 500) ?? null,
      metadata: JSON.stringify({
        reason: input.reason,
        note: input.note.slice(0, reportNoteMaxLength),
        visitor_id: input.visitorId,
      }),
    },
  );
  return { stored: true };
}

export type ListingReportSummary = {
  slug: string;
  total: number;
  lastAt: string;
  reasons: Partial<Record<ReportReason, number>>;
  notes: string[];
};

// Admin: listings with reports in the last 60 days, one vote per person and reason.
export async function getListingReportSummaries(): Promise<ListingReportSummary[]> {
  if (!hasDatabaseConfig()) return [];
  const rows = await queryRows<{ slug: string; reason: string; people: number | string; last_at: Date | string; notes: string | null }>(
    `select property_slug as slug,
            json_unquote(json_extract(metadata, '$.reason')) as reason,
            count(distinct ${personKey}) as people,
            max(created_at) as last_at,
            substring(group_concat(nullif(json_unquote(json_extract(metadata, '$.note')), '') order by created_at desc separator '\n'), 1, 2000) as notes
       from tracking_events
      where event_type = 'property_report' and property_slug is not null
        and created_at >= now() - interval 60 day
      group by property_slug, reason`,
  );
  const summaries = new Map<string, ListingReportSummary>();
  for (const row of rows ?? []) {
    const summary = summaries.get(row.slug) ?? { slug: row.slug, total: 0, lastAt: "", reasons: {}, notes: [] };
    const reason = row.reason as ReportReason;
    summary.reasons[reason] = (summary.reasons[reason] ?? 0) + Number(row.people);
    summary.total += Number(row.people);
    const lastAt = new Date(row.last_at).toISOString();
    if (lastAt > summary.lastAt) summary.lastAt = lastAt;
    if (row.notes) summary.notes.push(...row.notes.split("\n").slice(0, 5));
    summaries.set(row.slug, summary);
  }
  return Array.from(summaries.values());
}
