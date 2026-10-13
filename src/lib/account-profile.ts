import "server-only";
import bcrypt from "bcryptjs";
import { executeQuery, queryOne, withTransaction } from "@/lib/mysql";
import { getCurrentAccount, getCurrentLogin, getInitials } from "@/lib/mysql-auth";
import { formatAlertWhatsapp, normalizeAlertWhatsapp } from "@/lib/search-alert-input";
import { normalizeSignupName, signupLimits } from "@/lib/signup-rules";

// Owners edit their own account in "Mi cuenta": name, WhatsApp, profile photo and password.
// The photo table comes with 010_account_photos; until it runs, uploads say what is missing.

export const accountPhotoMaxBytes = 10 * 1024 * 1024;
export const accountPhotoTypes = ["image/jpeg", "image/png", "image/webp"];

export function validAccountId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function accountPhotoUrl(accountId: string, version: number) {
  return `/media/cuentas/${accountId}/${version}.webp`;
}

// Only MySQL owner accounts can be edited; the local fallback store is read-only here.
export async function editableOwner() {
  const account = await getCurrentAccount();
  if (!account || account.kind !== "owner" || account.storage !== "mysql" || !validAccountId(account.id)) return null;
  return account;
}

export type ProfileUpdate = { ok: true; displayName: string; phone: string } | { ok: false; field: "name" | "phone"; message: string };

export function checkProfileUpdate(input: { displayName?: unknown; phone?: unknown }): ProfileUpdate {
  const displayName = normalizeSignupName(input.displayName);
  if (!displayName) return { ok: false, field: "name", message: "Escribe tu nombre y apellido, solo con letras." };
  const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (!rawPhone) return { ok: true, displayName, phone: "" };
  const normalized = normalizeAlertWhatsapp(rawPhone);
  if (!normalized) return { ok: false, field: "phone", message: "Escribe un celular de Bolivia, por ejemplo 70012345." };
  return { ok: true, displayName, phone: formatAlertWhatsapp(normalized) };
}

export async function saveAccountProfile(accountId: string, displayName: string, phone: string) {
  await executeQuery(
    "update client_accounts set display_name = :displayName, avatar_initials = :initials, phone = :phone where id = :accountId",
    { accountId, displayName, initials: getInitials(displayName), phone: phone || null },
  );
}

export async function setAccountPhoto(accountId: string, photo: Buffer) {
  return withTransaction(async (connection) => {
    await connection.execute(
      `insert into client_account_photos (account_id, photo, version) values (?, ?, 1)
       on duplicate key update photo = values(photo), version = version + 1`,
      [accountId, photo],
    );
    const [rows] = await connection.execute("select version from client_account_photos where account_id = ?", [accountId]);
    const version = Number((rows as Array<{ version: number }>)[0]?.version ?? 1);
    const url = accountPhotoUrl(accountId, version);
    await connection.execute("update client_accounts set avatar_url = ? where id = ?", [url, accountId]);
    return url;
  });
}

export async function removeAccountPhoto(accountId: string) {
  await withTransaction(async (connection) => {
    await connection.execute("delete from client_account_photos where account_id = ?", [accountId]);
    await connection.execute("update client_accounts set avatar_url = null where id = ? and avatar_url like '/media/cuentas/%'", [accountId]);
  });
}

export async function readAccountPhoto(accountId: string, version: number) {
  const row = await queryOne<{ photo: Buffer }>(
    "select photo from client_account_photos where account_id = :accountId and version = :version",
    { accountId, version },
  );
  return row?.photo ?? null;
}

export type PasswordChange = { ok: true } | { ok: false; status: number; field?: "current" | "next"; message: string };

// Google-only accounts have no password yet: they can create one without the current one.
export async function changeAccountPassword(current: unknown, next: unknown): Promise<PasswordChange> {
  const login = await getCurrentLogin();
  if (!login) return { ok: false, status: 401, message: "Vuelve a ingresar a tu cuenta." };
  if (typeof next !== "string" || next.length < signupLimits.passwordMin || Buffer.byteLength(next) > signupLimits.passwordBytes) {
    return { ok: false, status: 400, field: "next", message: "La contraseña nueva necesita al menos 8 caracteres." };
  }
  const user = await queryOne<{ password_hash: string | null }>("select password_hash from morada_users where id = :id", { id: login.user_id });
  if (user?.password_hash) {
    if (typeof current !== "string" || !(await bcrypt.compare(current, user.password_hash))) {
      return { ok: false, status: 400, field: "current", message: "Tu contraseña actual no es correcta." };
    }
  }
  const passwordHash = await bcrypt.hash(next, 12);
  await withTransaction(async (connection) => {
    await connection.execute("update morada_users set password_hash = ? where id = ?", [passwordHash, login.user_id]);
  });
  return { ok: true };
}
