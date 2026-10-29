import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { queryOne, withTransaction } from "@/lib/mysql";
import type { RegisterInput, GoogleProfileInput } from "@/lib/mysql-auth";

const id = (prefix: string) => `${prefix}_${randomBytes(18).toString("hex")}`;
const denied = () => ({ ok: false as const, status: 401, message: "Correo o contraseña incorrectos." });
// A Google-only account trying a password: point to the button that works.
const googleOnly = () => ({ ok: false as const, status: 401, message: "Esta cuenta entra con Google. Toca «Continuar con Google»." });
export const databaseAuthUnavailable = () => ({ ok: false as const, status: 503, message: "El acceso no está disponible en este momento. Intenta nuevamente en unos minutos." });

async function session(connection: PoolConnection, userId: string, accountId: string) {
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 86400_000);
  await connection.execute("INSERT INTO morada_sessions (id,user_id,account_id,token_hash,expires_at) VALUES (?,?,?,?,?)", [id("sess"),userId,accountId,createHash("sha256").update(token).digest("hex"),expiresAt]);
  return {token,expiresAt};
}

async function createAccount(connection: PoolConnection, email: string, name: string, avatar: string | null = null) {
  const accountId = id("acct");
  const initials = name.split(/\s+/).slice(0,2).map(word=>word[0]).join("").toUpperCase();
  await connection.execute("INSERT INTO client_accounts (id,kind,display_name,email,avatar_initials,avatar_url,role_label,location) VALUES (?,'owner',?,?,?,?, 'Propietario','Bolivia')", [accountId,name,email,initials,avatar]);
  return accountId;
}

export async function registerDatabaseOwner(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190 || !input.displayName.trim() || input.displayName.length > 160 || input.password.length < 8 || Buffer.byteLength(input.password) > 72) {
    return {ok:false as const,status:400,message:"Revisa nombre, correo y contraseña (8 caracteres como mínimo, máximo 72 bytes)."};
  }
  const hash = await bcrypt.hash(input.password,12);
  try {
    return await withTransaction(async connection => {
      const accountId = await createAccount(connection,email,input.displayName.trim());
      const userId = id("user");
      await connection.execute("INSERT INTO morada_users (id,account_id,email,password_hash) VALUES (?,?,?,?)",[userId,accountId,email,hash]);
      return {ok:true as const,accountId,session:await session(connection,userId,accountId)};
    });
  } catch(error) {
    if ((error as {code?:string}).code === "ER_DUP_ENTRY") return {ok:false as const,status:409,message:"Ese correo ya tiene una cuenta. Toca «Ingresar», o «Continuar con Google» si la creaste así."};
    return databaseAuthUnavailable();
  }
}

export async function loginDatabasePassword(identifier: string, password: string) {
  const login = identifier.trim().toLowerCase();
  const emailLogin = login.includes("@");
  if (!login || login.length > 190 || (!emailLogin && !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(login)) || !password || Buffer.byteLength(password) > 72) return denied();
  try {
    const user = await queryOne<{id:string;account_id:string;password_hash:string|null;status:string}>(`SELECT id,account_id,password_hash,status FROM morada_users WHERE ${emailLogin ? "email" : "username"}=:login`,{login});
    if (user && user.status === "active" && !user.password_hash) return googleOnly();
    if (!user || user.status !== "active" || !user.password_hash || !await bcrypt.compare(password,user.password_hash)) return denied();
    return await withTransaction(async connection => {
      const [rows] = await connection.execute<RowDataPacket[]>("SELECT u.status FROM morada_users u JOIN client_accounts a ON a.id=u.account_id WHERE u.id=? AND a.status='active' AND u.status='active' FOR UPDATE",[user.id]);
      if (!rows.length) return denied();
      return {ok:true as const,accountId:user.account_id,session:await session(connection,user.id,user.account_id)};
    });
  } catch { return databaseAuthUnavailable(); }
}

export async function loginDatabaseGoogle(input: GoogleProfileInput) {
  const email = input.email.trim().toLowerCase();
  const subject = input.providerSubject.trim();
  if (!email || email.length > 190 || !subject || subject.length > 190) return denied();
  const avatar = input.avatarUrl?.startsWith("https://") && input.avatarUrl.length <= 600 ? input.avatarUrl : null;
  try {
    let claimedAccount: string | null = null;
    const result = await withTransaction(async connection => {
      const [users] = await connection.execute<RowDataPacket[]>("SELECT * FROM morada_users WHERE email=? OR provider_subject=? FOR UPDATE",[email,subject]);
      if (users.length > 1 || users.some(user=>user.email !== email || user.status !== "active" || (user.provider_subject && user.provider_subject !== subject))) return denied();
      const [accounts] = await connection.execute<RowDataPacket[]>("SELECT id,status FROM client_accounts WHERE email=? FOR UPDATE",[email]);
      if (accounts[0] && accounts[0].status !== "active") return denied();
      const name = (input.displayName.trim() || email).slice(0,160);
      const accountId: string = users[0]?.account_id || accounts[0]?.id || await createAccount(connection,email,name,avatar);
      const userId: string = users[0]?.id || id("user");
      if (users.length && !users[0].provider_subject) {
        // First Google sign-in on an account made with email and password. Sign-up does not verify the
        // email, so whoever chose that password may not own the address: Google proves it does, so the
        // old password and every open session stop working. The owner can create a new password in Mi cuenta.
        await connection.execute("UPDATE morada_users SET auth_provider='google',provider_subject=?,password_hash=NULL WHERE id=?",[subject,userId]);
        await connection.execute("DELETE FROM morada_sessions WHERE user_id=?",[userId]);
        claimedAccount = accountId;
      }
      else if (users.length) await connection.execute("UPDATE morada_users SET auth_provider='google',provider_subject=? WHERE id=?",[subject,userId]);
      else await connection.execute("INSERT INTO morada_users (id,account_id,email,auth_provider,provider_subject) VALUES (?,?,?,'google',?)",[userId,accountId,email,subject]);
      // A photo uploaded in "Mi cuenta" wins over the Google picture.
      if (avatar) await connection.execute("UPDATE client_accounts SET avatar_url=? WHERE id=? AND (avatar_url IS NULL OR avatar_url NOT LIKE '/media/cuentas/%')",[avatar,accountId]);
      return {ok:true as const,accountId,session:await session(connection,userId,accountId)};
    });
    // The Telegram linked with that password stops working too.
    if (claimedAccount) await (await import("@/lib/urbanito")).revokeUrbanitoLink(claimedAccount);
    return result;
  } catch { return databaseAuthUnavailable(); }
}
