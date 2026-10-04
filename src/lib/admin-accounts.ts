import "server-only";
import { hasDatabaseConfig, queryRows, type DbQueryValue } from "@/lib/mysql";
import { getCuratedRentalBySlug } from "@/lib/curated-rentals";
import { availabilityPrompt, sortReportedListings } from "@/lib/listing-moderation";
import { getListingAudience, getListingReportSummaries, type ListingAudience, type ListingReportSummary } from "@/lib/property-audience";
import type { Property } from "@/lib/properties";

export type AdminListingCheck = {
  slug: string;
  title: string;
  zone: string;
  ownerName: string;
  ownerWhatsapp: string | null;
  label: string;
  detail: string;
  fresh: boolean;
  days: number | null;
  reports: number;
  canConfirm: boolean;
  canHide: boolean;
};

export type AdminReportedListing = ListingReportSummary & {
  title: string;
  published: boolean;
  ownerWhatsapp: string | null;
  canConfirm: boolean;
  canHide: boolean;
};

type ListingControlRow = { slug: string; title: string; published: number | boolean; whatsapp: string | null };

// Published listings whose availability is stale or about to be, and listings tenants reported.
// Actions only apply to listings stored in MySQL; listings written in code are shown without buttons.
export async function getAdminListingHealth(published: Property[]) {
  const stale = published.filter((property) => availabilityPrompt(property).ask);
  let reports: ListingReportSummary[] = [];
  try {
    reports = await getListingReportSummaries();
  } catch (error) {
    console.error("admin report summaries failed", error);
  }
  const slugs = Array.from(new Set([...stale.map((property) => property.slug), ...reports.map((report) => report.slug)])).slice(0, 300);
  const controls = new Map<string, ListingControlRow>();
  if (hasDatabaseConfig() && slugs.length > 0) {
    const values: Record<string, DbQueryValue> = {};
    const placeholders = slugs.map((slug, index) => {
      values[`s${index}`] = slug;
      return `:s${index}`;
    });
    const rows = await queryRows<ListingControlRow>(
      `select slug, title, published, whatsapp from properties where slug in (${placeholders.join(",")})`,
      values,
    ).catch((error) => {
      console.error("admin listing controls failed", error);
      return null;
    });
    for (const row of rows ?? []) controls.set(row.slug, row);
  }
  const permissions = (slug: string) => {
    const row = controls.get(slug);
    const live = Boolean(row?.published);
    return { canConfirm: live, canHide: live && !getCuratedRentalBySlug(slug) };
  };
  const bySlug = new Map(published.map((property) => [property.slug, property]));

  const checks: AdminListingCheck[] = stale
    .map((property) => {
      const { state } = availabilityPrompt(property);
      return {
        slug: property.slug,
        title: property.title,
        zone: property.zone,
        ownerName: property.agent.name,
        ownerWhatsapp: property.agent.whatsapp || null,
        label: state.label,
        detail: state.detail,
        fresh: state.fresh,
        days: state.days,
        reports: property.availabilityReports ?? 0,
        ...permissions(property.slug),
      };
    })
    .sort((a, b) => Number(a.fresh) - Number(b.fresh) || (b.days ?? 999) - (a.days ?? 999));

  const reported: AdminReportedListing[] = sortReportedListings(
    reports.map((report) => {
      const property = bySlug.get(report.slug);
      const row = controls.get(report.slug);
      return {
        ...report,
        title: property?.title ?? row?.title ?? report.slug,
        published: Boolean(property) || Boolean(row?.published),
        ownerWhatsapp: property?.agent.whatsapp ?? row?.whatsapp ?? null,
        ...permissions(report.slug),
      };
    }),
  );

  return { checks, reported };
}

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
  // Distinct people (one per phone or computer), from tracking_events.
  views30: number;
  whatsapp30: number;
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
  status: string;
  published: boolean;
  featured: boolean;
  availableUntil: Date | string | null;
  views30: number;
  viewsTotal: number;
  whatsapp30: number;
  whatsappTotal: number;
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
  status: string | null;
  published: number | boolean | null;
  featured: number | boolean | null;
  available_until: Date | string | null;
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
          coalesce(ca.email, '') as email,
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
          coalesce(m.active_property_count, 0) as active_property_count
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
            sum(case when cap.status = 'active' then 1 else 0 end) as active_property_count
          from client_account_properties cap
          join properties p on p.slug = cap.property_slug
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
          p.featured
        from client_account_properties cap
        join client_accounts ca on ca.id = cap.account_id and ca.kind = 'owner'
        left join properties p on p.slug = cap.property_slug
        where cap.status <> 'closed'
          and p.operation = 'Alquiler' and p.type in ('Casa', 'Departamento')
        order by cap.created_at desc`,
    ),
  ]);

  const audience = await getListingAudience((propertyRows ?? []).map((row) => row.property_slug)).catch((error) => {
    console.error("admin audience query failed", error);
    return new Map<string, ListingAudience>();
  });
  const propertiesByAccount = new Map<string, AdminAccountProperty[]>();

  for (const row of propertyRows ?? []) {
    const property = toProperty(row, audience.get(row.property_slug));
    const current = propertiesByAccount.get(property.accountId) ?? [];
    current.push(property);
    propertiesByAccount.set(property.accountId, current);
  }

  return {
    databaseReady: true as const,
    accounts: (accountRows ?? []).map((row) => {
      const properties = propertiesByAccount.get(row.id) ?? [];
      return {
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
        views30: properties.reduce((total, property) => total + property.views30, 0),
        whatsapp30: properties.reduce((total, property) => total + property.whatsapp30, 0),
        properties,
      };
    }),
  };
}

function toProperty(row: PropertyRow, audience?: ListingAudience): AdminAccountProperty {
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
    status: row.status ?? "active",
    published: Boolean(row.published),
    featured: Boolean(row.featured),
    availableUntil: row.available_until,
    views30: audience?.views30 ?? 0,
    viewsTotal: audience?.viewsTotal ?? 0,
    whatsapp30: audience?.contacts30 ?? 0,
    whatsappTotal: audience?.contactsTotal ?? 0,
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
