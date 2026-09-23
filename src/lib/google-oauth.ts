import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { safeAuthNext } from "@/lib/auth-navigation";

export const googleStateCookie = "morada_google_state";
export const googleCallbackPath = "/api/auth/google/callback";
const defaultClientId = "809668723376-r025lkrb69ma9mre361aa1i17lqt9rui.apps.googleusercontent.com";
type OAuthEnvironment = { NEXT_PUBLIC_SITE_URL?: string; GOOGLE_REDIRECT_URI?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };

function isLoopback(hostname: string) { return ["localhost", "127.0.0.1", "[::1]"].includes(hostname); }

export function googleOAuthConfig(request: { url: string; headers: Headers }, env: OAuthEnvironment = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL, GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
}) {
  const requestUrl = new URL(request.url);
  const visibleHost = (request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host).split(",")[0].trim();
  const local = isLoopback(requestUrl.hostname) && isLoopback(new URL(`http://${visibleHost}`).hostname);
  // Local sign-in must return to the same browser origin, not the production callback.
  const origin = local ? new URL(`${requestUrl.protocol}//${visibleHost}`).origin : new URL(env.NEXT_PUBLIC_SITE_URL || "https://zentrourbano.com").origin;
  const redirectUri = local ? new URL(googleCallbackPath, origin) : new URL(env.GOOGLE_REDIRECT_URI || googleCallbackPath, origin);
  const validCallback = redirectUri.origin === origin && redirectUri.pathname === googleCallbackPath && !redirectUri.search && !redirectUri.hash && !redirectUri.username && !redirectUri.password && (local || redirectUri.protocol === "https:");
  return { origin, redirectUri: redirectUri.toString(), validCallback, local, canonicalHost: new URL(origin).host,
    visibleHost, secure: new URL(origin).protocol === "https:", clientId: env.GOOGLE_CLIENT_ID?.trim() || defaultClientId, clientSecret: env.GOOGLE_CLIENT_SECRET?.trim() };
}

export function createGoogleAttempt(next: string, redirectUri: string) {
  const attempt = { state: randomBytes(24).toString("hex"), next: safeAuthNext(next), redirectUri, verifier: randomBytes(32).toString("base64url"), createdAt: Date.now() };
  return { ...attempt, cookie: Buffer.from(JSON.stringify(attempt)).toString("base64url"), challenge: createHash("sha256").update(attempt.verifier).digest("base64url") };
}

export function readGoogleAttempt(cookie: string | undefined, state: string | null, redirectUri: string) {
  try {
    if (!cookie || !state || cookie.length > 2048) return null;
    const attempt = JSON.parse(Buffer.from(cookie, "base64url").toString("utf8"));
    if (typeof attempt.state !== "string" || typeof attempt.verifier !== "string" || !/^[\w-]{43}$/.test(attempt.verifier) || typeof attempt.createdAt !== "number" || Date.now() - attempt.createdAt > 600_000 || attempt.createdAt > Date.now() || attempt.redirectUri !== redirectUri) return null;
    const expected = Buffer.from(attempt.state);
    const received = Buffer.from(state);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    return { ...attempt, next: safeAuthNext(attempt.next) } as { state: string; next: string; redirectUri: string; verifier: string; createdAt: number };
  } catch { return null; }
}

export class GoogleOAuthError extends Error {
  constructor(public code: "token" | "profile" | "network") { super(code); }
}

export async function exchangeGoogleProfile(code: string, config: ReturnType<typeof googleOAuthConfig>, verifier: string) {
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret!, redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
    });
    const token = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof token.access_token !== "string") throw new GoogleOAuthError("token");
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await response.json().catch(() => ({}));
    if (!response.ok || typeof profile.email !== "string" || !profile.email.includes("@") || typeof profile.sub !== "string" || !profile.sub || profile.email_verified !== true) throw new GoogleOAuthError("profile");
    return { email: profile.email, providerSubject: profile.sub, displayName: typeof profile.name === "string" ? profile.name : profile.email, avatarUrl: typeof profile.picture === "string" ? profile.picture : undefined };
  } catch (error) {
    if (error instanceof GoogleOAuthError) throw error;
    throw new GoogleOAuthError("network");
  }
}
