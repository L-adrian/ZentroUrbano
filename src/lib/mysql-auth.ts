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
import type { DemoAccount, DemoAccountKind } from "@/lib/demo-accounts";
import { getListingAudience, getUnavailableReportTimes } from "@/lib/property-audience";
import { countReportsSince } from "@/lib/property-reports";
import { ownerListingStatus, recentOwnerRequests } from "@/lib/listing-moderation";
import { listPublicationRequests } from "@/lib/publication-requests";

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
      `select ca.id, ca.kind, ca.display_name, ca.company_name, coalesce(ca.email, '') as email, ca.phone,
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
      planSummary: "0 anuncios publicados",
      propertySlugs: [],
      properties: [],
      performance: [],
      reports: [],
      listings: [],
      requests: [],
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

  // Views, WhatsApp taps and "ya no está disponible" reports come from tracking_events;
  // the panel still opens if those queries fail.
  const [audience, reportTimes, requests] = await Promise.all([
    getListingAudience(slugs).catch((error) => {
      console.error("owner audience query failed", error);
      return null;
    }),
    getUnavailableReportTimes(),
    listPublicationRequests(account.id).catch((error) => {
      console.error("owner requests query failed", error);
      return [];
    }),
  ]);
  const statusBySlug = new Map(propertyRows.map((row) => [row.property_slug, row.status]));
  const listings = properties.map((property) => ({
    slug: property.slug,
    status: ownerListingStatus(statusBySlug.get(property.slug) ?? "active", property.published),
    audience: audience ? audience.get(property.slug) ?? emptyAudience : null,
  }));
  const publishedCount = properties.filter((property) => property.published).length;

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
    planSummary: `${publishedCount} anuncio${publishedCount === 1 ? "" : "s"} publicado${publishedCount === 1 ? "" : "s"}`,
    propertySlugs: slugs,
    properties: properties.map((property) => ({
      ...property,
      availabilityReports: countReportsSince(reportTimes.get(property.slug), property.availabilityConfirmedAt),
    })),
    performance: [],
    reports: [],
    listings,
    // Older decided requests stay in /cliente/solicitudes.
    requests: recentOwnerRequests(markCorrected(requests)).map((request) => ({
      id: request.id,
      kind: request.kind === "republish" ? "republish" as const : "new" as const,
      title: request.listing?.title || request.details?.title || "Vivienda sin título",
      status: request.status,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt ?? null,
      reason: request.reviewReason ?? null,
      slug: request.propertySlug ?? null,
      corrected: request.corrected,
    })),
    audienceUnavailable: audience === null,
  };
}

// "Corregir y reenviar": a request with a newer copy that corrects it.
function markCorrected<T extends { id: string; correctionOf?: string }>(requests: T[]) {
  const corrected = new Set(requests.map((request) => request.correctionOf).filter(Boolean));
  return requests.map((request) => ({ ...request, corrected: corrected.has(request.id) }));
}

const emptyAudience = { views7: 0, views30: 0, viewsTotal: 0, contacts7: 0, contacts30: 0, contactsTotal: 0 };

// The signed-in owner, only when that owner manages this rental listing. Owner routes check this first.
export async function getListingOwner(propertySlug: string) {
  const account = await getCurrentAccount();

  if (!account || account.kind !== "owner" || account.storage === "local") {
    return null;
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

    return ownership ? account : null;
  } catch {
    return null;
  }
}

export async function canEditProperty(propertySlug: string) {
  return Boolean(await getListingOwner(propertySlug));
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
