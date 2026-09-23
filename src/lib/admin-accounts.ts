import "server-only";
import { hasDatabaseConfig, queryRows } from "@/lib/mysql";

export type AdminAccountSummary = {
  id: string;
  kind: string;
  displayName: string;
  companyName?: string;
  email: string;
  phone?: string;
  avatarInitials: string;
  avatarUrl?: string;
  roleLabel: string;
  location?: string;
  provider: string;
  status: string;
  authProviders: string[];
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  propertyCount: number;
  activePropertyCount: number;
  premiumCount: number;
  views: number;
  propertyClicks: number;
  mapViews: number;
  whatsappClicks: number;
  galleryOpens: number;
  properties: AdminAccountProperty[];
};

export type AdminAccountProperty = {
  accountId: string;
  id: string;
  slug: string;
  title: string;
  type: string;
  operation: string;
  city: string;
  zone: string;
  price: number;
  currency: string;
  planSlug: string;
  status: string;
  published: boolean;
  featured: boolean;
  availableUntil: Date | string | null;
  views: number;
  propertyClicks: number;
  mapViews: number;
  whatsappClicks: number;
  galleryOpens: number;
};

type AccountRow = {
  id: string;
  kind: string;
  display_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  avatar_initials: string;
  avatar_url: string | null;
  role_label: string;
  location: string | null;
  provider: string;
  status: string;
  auth_providers: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  property_count: number | string | null;
  active_property_count: number | string | null;
  premium_count: number | string | null;
  views: number | string | null;
  property_clicks: number | string | null;
  map_views: number | string | null;
  whatsapp_clicks: number | string | null;
  gallery_opens: number | string | null;
};

type PropertyRow = {
  account_id: string;
  id: string;
  property_slug: string;
  title: string | null;
  type: string | null;
  operation: string | null;
  city: string | null;
  zone: string | null;
  price: number | string | null;
  currency: string | null;
  plan_slug: string | null;
  status: string | null;
  published: number | boolean | null;
  featured: number | boolean | null;
  available_until: Date | string | null;
  views: number | string | null;
  property_clicks: number | string | null;
  map_views: number | string | null;
  whatsapp_clicks: number | string | null;
  gallery_opens: number | string | null;
};

export async function getAdminAccountsOverview() {
  if (!hasDatabaseConfig()) {
    return {
      databaseReady: false as const,
      accounts: [] as AdminAccountSummary[],
    };
  }

  const [accountRows, propertyRows] = await Promise.all([
    queryRows<AccountRow>(
      `select
          ca.id,
          ca.kind,
          ca.display_name,
          ca.company_name,
          ca.email,
          ca.phone,
          ca.avatar_initials,
          ca.avatar_url,
          ca.role_label,
          ca.location,
          ca.provider,
          ca.status,
          ca.created_at,
          ca.updated_at,
          coalesce(u.auth_providers, ca.provider) as auth_providers,
          coalesce(m.property_count, 0) as property_count,
          coalesce(m.active_property_count, 0) as active_property_count,
          coalesce(m.premium_count, 0) as premium_count,
          coalesce(m.views, 0) as views,
          coalesce(m.property_clicks, 0) as property_clicks,
          coalesce(m.map_views, 0) as map_views,
          coalesce(m.whatsapp_clicks, 0) as whatsapp_clicks,
          coalesce(m.gallery_opens, 0) as gallery_opens
        from client_accounts ca
        left join (
          select
            account_id,
            group_concat(distinct auth_provider order by auth_provider separator ',') as auth_providers
          from morada_users
          group by account_id
        ) u on u.account_id = ca.id
        left join (
          select
            cap.account_id,
            count(*) as property_count,
            sum(case when cap.status = 'active' then 1 else 0 end) as active_property_count,
            sum(case when cap.plan_slug = 'premium' then 1 else 0 end) as premium_count,
            sum(coalesce(perf.views, 0)) as views,
            sum(coalesce(perf.property_clicks, 0)) as property_clicks,
            sum(coalesce(perf.map_views, 0)) as map_views,
            sum(coalesce(perf.whatsapp_clicks, 0)) as whatsapp_clicks,
            sum(coalesce(perf.gallery_opens, 0)) as gallery_opens
          from client_account_properties cap
          join properties p on p.slug = cap.property_slug
          left join (
            select
              account_property_id,
              sum(views) as views,
              sum(property_clicks) as property_clicks,
              sum(map_views) as map_views,
              sum(whatsapp_clicks) as whatsapp_clicks,
              sum(gallery_opens) as gallery_opens
            from property_performance_snapshots
            group by account_property_id
          ) perf on perf.account_property_id = cap.id
          where cap.status <> 'closed'
            and p.operation = 'Alquiler' and p.type in ('Casa', 'Departamento')
          group by cap.account_id
        ) m on m.account_id = ca.id
        where ca.kind = 'owner'
        order by ca.created_at desc`,
    ),
    queryRows<PropertyRow>(
      `select
          cap.account_id,
          cap.id,
          cap.property_slug,
          cap.plan_slug,
          cap.status,
          cap.available_until,
          p.title,
          p.type,
          p.operation,
          p.city,
          p.zone,
          p.price,
          p.currency,
          p.published,
          p.featured,
          coalesce(perf.views, 0) as views,
          coalesce(perf.property_clicks, 0) as property_clicks,
          coalesce(perf.map_views, 0) as map_views,
          coalesce(perf.whatsapp_clicks, 0) as whatsapp_clicks,
          coalesce(perf.gallery_opens, 0) as gallery_opens
        from client_account_properties cap
        join client_accounts ca on ca.id = cap.account_id and ca.kind = 'owner'
        left join properties p on p.slug = cap.property_slug
        left join (
          select
            account_property_id,
            sum(views) as views,
            sum(property_clicks) as property_clicks,
            sum(map_views) as map_views,
            sum(whatsapp_clicks) as whatsapp_clicks,
            sum(gallery_opens) as gallery_opens
          from property_performance_snapshots
          group by account_property_id
        ) perf on perf.account_property_id = cap.id
        where cap.status <> 'closed'
          and p.operation = 'Alquiler' and p.type in ('Casa', 'Departamento')
        order by cap.created_at desc`,
    ),
  ]);

  const propertiesByAccount = new Map<string, AdminAccountProperty[]>();

  for (const row of propertyRows ?? []) {
    const property = toProperty(row);
    const current = propertiesByAccount.get(property.accountId) ?? [];
    current.push(property);
    propertiesByAccount.set(property.accountId, current);
  }

  return {
    databaseReady: true as const,
    accounts: (accountRows ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      displayName: row.display_name,
      companyName: row.company_name ?? undefined,
      email: row.email,
      phone: row.phone ?? undefined,
      avatarInitials: row.avatar_initials,
      avatarUrl: row.avatar_url ?? undefined,
      roleLabel: row.role_label,
      location: row.location ?? undefined,
      provider: row.provider,
      status: row.status,
      authProviders: parseProviders(row.auth_providers),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      propertyCount: toNumber(row.property_count),
      activePropertyCount: toNumber(row.active_property_count),
      premiumCount: toNumber(row.premium_count),
      views: toNumber(row.views),
      propertyClicks: toNumber(row.property_clicks),
      mapViews: toNumber(row.map_views),
      whatsappClicks: toNumber(row.whatsapp_clicks),
      galleryOpens: toNumber(row.gallery_opens),
      properties: propertiesByAccount.get(row.id) ?? [],
    })),
  };
}

function toProperty(row: PropertyRow): AdminAccountProperty {
  return {
    accountId: row.account_id,
    id: row.id,
    slug: row.property_slug,
    title: row.title ?? row.property_slug,
    type: row.type ?? "Propiedad",
    operation: row.operation ?? "Sin operacion",
    city: row.city ?? "Sin ciudad",
    zone: row.zone ?? "Sin zona",
    price: toNumber(row.price),
    currency: row.currency ?? "USD",
    planSlug: row.plan_slug ?? "basic",
    status: row.status ?? "active",
    published: Boolean(row.published),
    featured: Boolean(row.featured),
    availableUntil: row.available_until,
    views: toNumber(row.views),
    propertyClicks: toNumber(row.property_clicks),
    mapViews: toNumber(row.map_views),
    whatsappClicks: toNumber(row.whatsapp_clicks),
    galleryOpens: toNumber(row.gallery_opens),
  };
}

function parseProviders(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
