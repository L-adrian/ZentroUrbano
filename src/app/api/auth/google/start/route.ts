import { NextResponse, type NextRequest } from "next/server";
import { safeAuthNext } from "@/lib/auth-navigation";
import { createGoogleAttempt, googleOAuthConfig, googleStateCookie } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const next = safeAuthNext(new URL(request.url).searchParams.get("next"));
  let config: ReturnType<typeof googleOAuthConfig>;
  try { config = googleOAuthConfig(request); } catch {
    return NextResponse.redirect(new URL("/login?google_error=config", request.url));
  }
  const login = new URL(`/login?next=${encodeURIComponent(next)}`, config.origin);
  if (!config.validCallback || !config.clientSecret) {
    login.searchParams.set("google_error", config.validCallback ? "config" : "callback");
    return NextResponse.redirect(login);
  }
  // Set the verification cookie on the canonical host before leaving for Google.
  if (!config.local && config.visibleHost !== config.canonicalHost) {
    return NextResponse.redirect(new URL(`/api/auth/google/start?next=${encodeURIComponent(next)}`, config.origin));
  }
  const attempt = createGoogleAttempt(next, config.redirectUri);
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: "openid email profile", state: attempt.state, prompt: "select_account", code_challenge: attempt.challenge, code_challenge_method: "S256" }).toString();
  const response = NextResponse.redirect(googleUrl);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(googleStateCookie, attempt.cookie, { httpOnly: true, sameSite: "lax", secure: config.secure, path: "/", maxAge: 600 });
  return response;
}
