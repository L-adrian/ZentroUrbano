import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Anti-bot checks for public forms (sign-up and visit booking):
// - a signed form ticket, fetched when the form opens, that must be a few seconds old and is used once;
// - an invisible field that people never see and bots tend to fill;
// - attempt limits per connection, kept in memory;
// - Cloudflare Turnstile, only when TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set.
// Server code only (node:crypto); it has no "server-only" import so the tests can load it.

export type FormPurpose = "signup" | "visit";
export const formTicketMinAgeMs = 2_000;
const formTicketMaxAgeMs = 2 * 60 * 60 * 1000;

const state = globalThis as typeof globalThis & {
  zentroFormSecret?: Buffer;
  zentroUsedTickets?: Map<string, number>;
  zentroRateHits?: Map<string, number[]>;
};

// ZENTRO_FORM_SECRET when set; otherwise derived from settings production already has. The last
// fallback is random per process, so open forms only need a new ticket after a restart.
function formSecret() {
  if (state.zentroFormSecret) return state.zentroFormSecret;
  const configured = process.env.ZENTRO_FORM_SECRET?.trim();
  const derivedFrom = configured || [process.env.DATABASE_URL, process.env.ZENTRO_URBANO_ADMIN_PASSWORD].filter(Boolean).join("|");
  state.zentroFormSecret = derivedFrom
    ? createHash("sha256").update(`zentro-form-ticket|${derivedFrom}`).digest()
    : randomBytes(32);
  return state.zentroFormSecret;
}

function sign(payload: string) {
  return createHmac("sha256", formSecret()).update(payload).digest("base64url");
}

export function issueFormTicket(purpose: FormPurpose, now = Date.now()) {
  const payload = `${purpose}.${now}.${randomBytes(12).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export type TicketCheck = "ok" | "too-fast" | "expired" | "used" | "invalid";

export function checkFormTicket(ticket: unknown, purpose: FormPurpose, now = Date.now()): TicketCheck {
  if (typeof ticket !== "string" || ticket.length > 200) return "invalid";
  const parts = ticket.split(".");
  if (parts.length !== 4 || parts[0] !== purpose) return "invalid";
  const payload = parts.slice(0, 3).join(".");
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(parts[3]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return "invalid";
  const issuedAt = Number(parts[1]);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60_000) return "invalid";
  if (now - issuedAt > formTicketMaxAgeMs) return "expired";
  if (now - issuedAt < formTicketMinAgeMs) return "too-fast";
  if (usedTickets().has(parts[2])) return "used";
  return "ok";
}

function usedTickets() {
  state.zentroUsedTickets ??= new Map();
  return state.zentroUsedTickets;
}

// Called once the form did its job (account created, visit booked), so the same ticket cannot repeat it.
export function spendFormTicket(ticket: string, now = Date.now()) {
  const used = usedTickets();
  for (const [nonce, expiresAt] of used) if (expiresAt < now) used.delete(nonce);
  const nonce = ticket.split(".")[2];
  if (nonce) used.set(nonce, now + formTicketMaxAgeMs);
}

export const ticketMessages: Record<Exclude<TicketCheck, "ok">, string> = {
  "too-fast": "Espera unos segundos y vuelve a intentar.",
  expired: "El formulario estuvo abierto mucho tiempo. Recarga la página e intenta de nuevo.",
  used: "Este formulario ya se envió. Recarga la página si necesitas hacerlo otra vez.",
  invalid: "No pudimos verificar el formulario. Recarga la página e intenta de nuevo.",
};

// The invisible field ("sitio web") is empty for people.
export const honeypotField = "sitioWeb";
export function filledHoneypot(body: Record<string, unknown> | null) {
  const value = body?.[honeypotField];
  return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
}

// The address the request came from. X-Real-IP or the last X-Forwarded-For entry is the one written
// by the server's own proxy; earlier entries are whatever the browser sent and can be invented.
export function requestClientKey(headers: Headers) {
  const real = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  const address = real || forwarded?.at(-1) || "local";
  return createHash("sha256").update(`zentro-client|${address}`).digest("hex").slice(0, 32);
}

export type RateLimit = { max: number; windowMs: number };

function rateHits() {
  state.zentroRateHits ??= new Map();
  return state.zentroRateHits;
}

// True while every limit still has room. Does not count the attempt.
export function underRateLimit(key: string, limits: RateLimit[], now = Date.now()) {
  const hits = rateHits().get(key) ?? [];
  return limits.every((limit) => hits.filter((time) => now - time < limit.windowMs).length < limit.max);
}

export function countRateHit(key: string, limits: RateLimit[], now = Date.now()) {
  const map = rateHits();
  const longest = Math.max(...limits.map((limit) => limit.windowMs));
  const hits = (map.get(key) ?? []).filter((time) => now - time < longest);
  hits.push(now);
  map.set(key, hits);
  if (map.size > 20_000) {
    for (const [other, times] of map) if (!times.some((time) => now - time < 24 * 60 * 60 * 1000)) map.delete(other);
  }
}

// Checks and counts in one step.
export function takeRateLimit(key: string, limits: RateLimit[], now = Date.now()) {
  if (!underRateLimit(key, limits, now)) return false;
  countRateHit(key, limits, now);
  return true;
}

export function turnstileSiteKey() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  return siteKey && process.env.TURNSTILE_SECRET_KEY?.trim() ? siteKey : null;
}

// With Turnstile configured the answer is required; if Cloudflare cannot be reached the form is refused.
export async function passesTurnstile(token: unknown, headers: Headers) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !turnstileSiteKey()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(6000),
    });
    const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
    return result?.success === true;
  } catch {
    return false;
  }
}
