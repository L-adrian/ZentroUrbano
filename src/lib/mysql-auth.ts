import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { executeQuery, hasDatabaseConfig, requiresDatabase, queryOne, queryRows, type DbQueryValue } from "@/lib/mysql";
import { registerDatabaseOwner, loginDatabasePassword, loginDatabaseGoogle, databaseAuthUnavailable } from "@/lib/database-identity";
import { mapPropertyRow, type PropertyRow } from "@/lib/property-data";
import {
  createLocalPasswordAccount,
  createLocalSession,
  deleteLocalSession,
  findLocalUserByEmail,
  getLocalAccountBySessionHash,
  upsertLocalGoogleAccount,
  type LocalAuthAccount,
} from "@/lib/local-auth-store";
import type { DemoAccount, DemoAccountKind, DemoPlan } from "@/lib/demo-accounts";
import type { PropertyPerformance, WeeklyReport } from "@/lib/demo-accounts";

export const authSessionCookie = "morada_session";
const sessionDays = 30;

type AccountRow = {
  id: string;
  kind: DemoAccountKind;
  display_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  avatar_initials: string;
  avatar_url: string | null;
  role_label: string;
  location: string | null;
  storage?: "mysql" | "local";
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  account_id: string;
  status: "active" | "disabled";
};

type AccountPropertyRow = {
  id: string;
  property_slug: string;
  plan_slug: string | null;
  status: string;
};

type PerformanceRow = {
  account_property_id: string;
  views: number;
  property_clicks: number | null;
  map_views: number;
  whatsapp_clicks: number;
  gallery_opens: number;
  weekly_views: unknown;
  recommendation: string | null;
};

type WeeklyReportRow = {
  id: string;
  period_label: string;
  headline: string;
  summary: string;
  views: number;
  property_clicks: number | null;
  whatsapp_clicks: number;
  action: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  companyName?: string;
  accountKind: DemoAccountKind;
};

export type GoogleProfileInput = {
  email: string;
  displayName: string;
  providerSubject: string;
  avatarUrl?: string;
};

export async function registerWithPassword(input: RegisterInput) {
  if (hasDatabaseConfig()) return registerDatabaseOwner(input);
  if (requiresDatabase()) return databaseAuthUnavailable();
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const companyName = input.companyName?.trim() || null;

  if (!email || !displayName || input.password.length < 8) {
    return {
      ok: false as const,
      status: 400,
      message: "Ingresa nombre, correo valido y una contrasena de al menos 8 caracteres.",
    };
  }

  const localExisting = await findLocalUserByEmail(email);
  if (localExisting) {
    return { ok: false as const, status: 409, message: "Ese correo ya tiene una cuenta." };
  }

  if (hasDatabaseConfig()) {
    try {
      const databaseExisting = await queryOne<{ id: string }>(
        "select id from morada_users where email = :email limit 1",
        { email },
      );
      if (databaseExisting) {
        return { ok: false as const, status: 409, message: "Ese correo ya tiene una cuenta." };
      }
    } catch {
      // Local storage keeps registration available while MySQL is offline.
    }
  }

  const accountId = `acct_${randomId(18)}`;
  const userId = `user_${randomId(18)}`;
  const roleLabel = input.accountKind === "agency" ? "Cuenta inmobiliaria" : "Propietario";
  const avatarInitials = getInitials(companyName || displayName || email);
  const passwordHash = await bcrypt.hash(input.password, 12);

  const created = await createLocalPasswordAccount({
    account: {
      id: accountId,
      kind: input.accountKind,
      displayName,
      companyName: input.accountKind === "agency" ? companyName || displayName : companyName,
      email,
      phone: "",
      avatarInitials,
      avatarUrl: null,
      roleLabel,
      location: "Bolivia",
    },
    user: {
      id: userId,
      accountId,
      email,
      passwordHash,
      authProvider: "email",
      providerSubject: null,
      status: "active",
    },
  });

  if (!created) {
    return { ok: false as const, status: 409, message: "Ese correo ya tiene una cuenta." };
  }

  const session = await createFallbackSession(userId, accountId);

  return { ok: true as const, accountId, session };
}

export async function loginWithPassword(emailInput: string, password: string) {
  if (hasDatabaseConfig()) return loginDatabasePassword(emailInput, password);
  if (requiresDatabase()) return databaseAuthUnavailable();
  const email = normalizeEmail(emailInput);
  const localUser = await findLocalUserByEmail(email);

  if (localUser) {
    if (localUser.status !== "active") {
      return { ok: false as const, status: 401, message: "Correo o contrasena incorrectos." };
    }
    if (!localUser.passwordHash) {
      return {
        ok: false as const,
        status: 401,
        message: "Esta cuenta usa Google. Ingresa con Google.",
      };
    }
    const validLocalPassword = await bcrypt.compare(password, localUser.passwordHash);
    if (!validLocalPassword) {
      return { ok: false as const, status: 401, message: "Correo o contrasena incorrectos." };
    }
    const session = await createFallbackSession(localUser.id, localUser.accountId);
    return { ok: true as const, accountId: localUser.accountId, session };
  }

  if (!hasDatabaseConfig()) {
    return { ok: false as const, status: 401, message: "Correo o contrasena incorrectos." };
  }

  let user: UserRow | null = null;
  try {
    user = await queryOne<UserRow>(
      "select id, email, password_hash, account_id, status from morada_users where email = :email limit 1",
      { email },
    );
  } catch {
    return {
      ok: false as const,
      status: 503,
      message: "El acceso histórico está temporalmente fuera de servicio. Las cuentas nuevas siguen disponibles.",
    };
  }

  if (!user || user.status !== "active") {
    return { ok: false as const, status: 401, message: "Correo o contrasena incorrectos." };
  }

  if (!user.password_hash) {
    return {
      ok: false as const,
      status: 401,
      message: "Esta cuenta usa Google. Ingresa con Google o crea una contrasena nueva.",
    };
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    return { ok: false as const, status: 401, message: "Correo o contrasena incorrectos." };
  }

  const session = await createDatabaseSession(user.id, user.account_id);

  return { ok: true as const, accountId: user.account_id, session };
}

export async function loginWithGoogleProfile(input: GoogleProfileInput) {
  if (hasDatabaseConfig()) return loginDatabaseGoogle(input);
  if (requiresDatabase()) return databaseAuthUnavailable();
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim() || email;
  const providerSubject = input.providerSubject.trim();
  const avatarUrl = sanitizeProfileImageUrl(input.avatarUrl);

  if (!email || !providerSubject) {
    return { ok: false as const, status: 400, message: "Google no devolvio un perfil valido." };
  }

  const existingLocalUser = await findLocalUserByEmail(email);
  const accountId = existingLocalUser?.accountId ?? `acct_${randomId(18)}`;
  const userId = existingLocalUser?.id ?? `user_${randomId(18)}`;
  const result = await upsertLocalGoogleAccount({
    account: {
      id: accountId,
      kind: "owner",
      displayName,
      companyName: null,
      email,
      phone: "",
      avatarInitials: getInitials(displayName || email),
      avatarUrl,
      roleLabel: "Propietario",
      location: "Bolivia",
    },
    user: {
      id: userId,
      accountId,
      email,
      passwordHash: existingLocalUser?.passwordHash ?? null,
      authProvider: "google",
      providerSubject,
      status: "active",
    },
  });

  const session = await createFallbackSession(result.user.id, result.accountId);
  return { ok: true as const, accountId: result.accountId, session };
}

export async function getCurrentAccount() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(authSessionCookie)?.value;

  if (!sessionToken) {
    return null;
  }

  const sessionHash = hashToken(sessionToken);
  const localAccount = !hasDatabaseConfig() && !requiresDatabase() ? await getLocalAccountBySessionHash(sessionHash) : null;
  if (localAccount) {
    return mapLocalAccountRow(localAccount);
  }

  if (!hasDatabaseConfig()) {
    return null;
  }

  try {
    const row = await queryOne<AccountRow>(
      `select ca.id, ca.kind, ca.display_name, ca.company_name, ca.email, ca.phone,
              ca.avatar_initials, ca.avatar_url, ca.role_label, ca.location
         from morada_sessions s
         join client_accounts ca on ca.id = s.account_id
         join morada_users u on u.id = s.user_id and u.account_id = ca.id and u.status = 'active'
        where s.token_hash = :sessionHash
          and s.expires_at > current_timestamp
          and ca.status = 'active'
        limit 1`,
      { sessionHash },
    );

    return row ? { ...row, storage: "mysql" as const } : null;
  } catch {
    return null;
  }
}

export async function getCurrentDashboardAccount(): Promise<DemoAccount | null> {
  const account = await getCurrentAccount();

  if (!account) {
    return null;
  }

  if (account.storage === "local") {
    return {
      id: account.id,
      kind: account.kind,
      displayName: account.display_name,
      companyName: account.company_name ?? undefined,
      email: account.email,
      phone: account.phone ?? "",
      avatarInitials: account.avatar_initials,
      avatarUrl: account.avatar_url ?? undefined,
      roleLabel: account.role_label,
      location: account.location ?? "Bolivia",
      planSummary: "0 propiedades activas",
      propertySlugs: [],
      properties: [],
      performance: [],
      reports: [],
    };
  }

  const propertyRows =
    (await queryRows<AccountPropertyRow>(
      `select cap.id, cap.property_slug, cap.plan_slug, cap.status
         from client_account_properties cap
         join properties p on p.slug = cap.property_slug
        where cap.account_id = :accountId and cap.status <> 'closed'
          and p.operation = 'Alquiler' and p.type in ('Casa', 'Departamento')`,
      { accountId: account.id },
    )) ?? [];
  const performanceRows =
    propertyRows.length > 0
      ? ((await queryRows<PerformanceRow>(
          `select account_property_id, views, property_clicks, map_views, whatsapp_clicks,
                  gallery_opens, weekly_views, recommendation
             from property_performance_snapshots
            where account_property_id in (${propertyRows.map((_, index) => `:id${index}`).join(",")})`,
          Object.fromEntries(
            propertyRows.map((row, index) => [`id${index}`, row.id]),
          ) as Record<string, DbQueryValue>,
        )) ?? [])
      : [];
  const reports =
    (await queryRows<WeeklyReportRow>(
      `select id, period_label, headline, summary, views, property_clicks, whatsapp_clicks, action
         from weekly_reports
        where account_id = :accountId
        order by period_start desc`,
      { accountId: account.id },
    )) ?? [];
  const performanceByPropertyId = new Map(
    performanceRows.map((performance) => [performance.account_property_id, performance]),
  );
  const slugs = propertyRows.map((row) => row.property_slug);
  const properties =
    slugs.length > 0
      ? ((await queryRows<PropertyRow>(
          `select *
             from properties
            where slug in (${slugs.map((_, index) => `:slug${index}`).join(",")})
            order by
              case when listing_plan = 'featured' then 0 else 1 end,
              updated_at desc`,
          Object.fromEntries(slugs.map((slug, index) => [`slug${index}`, slug])) as Record<
            string,
            DbQueryValue
          >,
        )) ?? []).map(mapPropertyRow)
      : [];

  return {
    id: account.id,
    kind: account.kind,
    displayName: account.display_name,
    companyName: account.company_name ?? undefined,
    email: account.email,
    phone: account.phone ?? "",
    avatarInitials: account.avatar_initials,
    avatarUrl: account.avatar_url ?? undefined,
    roleLabel: account.role_label,
    location: account.location ?? "Bolivia",
    planSummary: buildPlanSummary(propertyRows),
    propertySlugs: slugs,
    properties,
    performance: propertyRows.map((row) => toPropertyPerformance(row, performanceByPropertyId.get(row.id))),
    reports: reports.map(toWeeklyReport),
  };
}

export async function canEditProperty(propertySlug: string) {
  const account = await getCurrentAccount();

  if (!account || account.kind !== "owner") {
    return false;
  }

  if (account.storage === "local") {
    return false;
  }

  try {
    const ownership = await queryOne<{ id: string }>(
      `select cap.id from client_account_properties cap
         join properties p on p.slug = cap.property_slug
        where cap.account_id = :accountId and cap.property_slug = :propertySlug and cap.status <> 'closed'
          and p.operation = 'Alquiler' and p.type in ('Casa', 'Departamento')
        limit 1`,
      { accountId: account.id, propertySlug },
    );

    return Boolean(ownership);
  } catch {
    return false;
  }
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(authSessionCookie)?.value;

  if (sessionToken) {
    const tokenHash = hashToken(sessionToken);
    if (!hasDatabaseConfig()) await deleteLocalSession(tokenHash);

    if (hasDatabaseConfig()) {
      await executeQuery("delete from morada_sessions where token_hash = :tokenHash", {
          tokenHash,
        });
    }
  }

  cookieStore.set(authSessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function setSessionCookie(session: { token: string; expiresAt: Date }) {
  const cookieStore = await cookies();
  cookieStore.set(authSessionCookie, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
}

async function createDatabaseSession(userId: string, accountId: string) {
  const token = `${randomId(32)}.${randomId(32)}`;
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await executeQuery(
    `insert into morada_sessions (id, user_id, account_id, token_hash, expires_at)
     values (:id, :userId, :accountId, :tokenHash, :expiresAt)`,
    {
      id: `sess_${randomId(18)}`,
      userId,
      accountId,
      tokenHash,
      expiresAt,
    },
  );

  return { token, expiresAt };
}

async function createFallbackSession(userId: string, accountId: string) {
  const token = `${randomId(32)}.${randomId(32)}`;
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await createLocalSession({
    userId,
    accountId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

function toPropertyPerformance(
  propertyRow: AccountPropertyRow,
  performance?: PerformanceRow,
): PropertyPerformance {
  return {
    propertySlug: propertyRow.property_slug,
    plan: planLabel(propertyRow.plan_slug),
    status: propertyRow.status === "paused" ? "Pausada" : "Activa",
    views: performance?.views ?? 0,
    propertyClicks: performance?.property_clicks ?? performance?.views ?? 0,
    mapViews: performance?.map_views ?? 0,
    whatsappClicks: performance?.whatsapp_clicks ?? 0,
    galleryOpens: performance?.gallery_opens ?? 0,
    weeklyViews: normalizeWeeklyViews(performance?.weekly_views),
    recommendation:
      performance?.recommendation ?? "Revisar fotos, precio y descripcion en el reporte semanal.",
  };
}

function toWeeklyReport(row: WeeklyReportRow): WeeklyReport {
  return {
    id: row.id,
    period: row.period_label,
    headline: row.headline,
    summary: row.summary,
    views: row.views,
    propertyClicks: row.property_clicks ?? row.views,
    whatsappClicks: row.whatsapp_clicks,
    action: row.action,
  };
}

function buildPlanSummary(properties: AccountPropertyRow[]) {
  const count = properties.length;
  const premiumCount = properties.filter((property) => property.plan_slug === "premium").length;

  if (premiumCount > 0) {
    return `${count} propiedad${count === 1 ? "" : "es"} activa${count === 1 ? "" : "s"} - ${premiumCount} Premium`;
  }

  return `${count} propiedad${count === 1 ? "" : "es"} activa${count === 1 ? "" : "s"}`;
}

function planLabel(planSlug: string | null): DemoPlan {
  if (planSlug === "premium") {
    return "Premium";
  }

  if (planSlug === "pro") {
    return "Pro";
  }

  return "B\u00e1sico";
}

function normalizeWeeklyViews(value: unknown) {
  if (!value) {
    return [0, 0, 0, 0, 0, 0, 0];
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return value;
  }

  if (typeof value !== "string") {
    return [0, 0, 0, 0, 0, 0, 0];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "number")) {
      return parsed;
    }
  } catch {
    return [0, 0, 0, 0, 0, 0, 0];
  }

  return [0, 0, 0, 0, 0, 0, 0];
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapLocalAccountRow(account: LocalAuthAccount): AccountRow {
  return {
    id: account.id,
    kind: account.kind,
    display_name: account.displayName,
    company_name: account.companyName,
    email: account.email,
    phone: account.phone,
    avatar_initials: account.avatarInitials,
    avatar_url: account.avatarUrl,
    role_label: account.roleLabel,
    location: account.location,
    storage: "local",
  };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function randomId(bytes: number) {
  return randomBytes(bytes).toString("hex");
}

function sanitizeProfileImageUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getInitials(value: string) {
  const words = value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  return (words.length > 0 ? words : ["Zentro Urbano"])
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
