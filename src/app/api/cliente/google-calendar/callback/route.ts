import { NextResponse, after, type NextRequest } from "next/server";
import { saveGoogleLink, syncGoogleCalendar } from "@/lib/google-calendar";
import { googleCalendarCallbackPath, googleCalendarScope, googleCalendarStateCookie } from "@/lib/google-calendar-event";
import { calendarOwnerId } from "@/lib/google-calendar-route";
import { googleOAuthConfig, readGoogleAttempt } from "@/lib/google-oauth";
import { isMissingTable } from "@/lib/team";

// Google sends the person back here. The refresh token is saved encrypted and a first sync runs.
export async function GET(request: NextRequest) {
  const config = googleOAuthConfig(request);
  const url = new URL(request.url);
  const done = (result: string) => {
    const response = NextResponse.redirect(new URL(`/cliente?google=${result}#calendario`, config.origin));
    response.cookies.delete(googleCalendarStateCookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  const accountId = await calendarOwnerId();
  if (!accountId) return NextResponse.redirect(new URL("/login?next=/cliente", config.origin));
  const redirectUri = new URL(googleCalendarCallbackPath, config.origin).toString();
  const attempt = readGoogleAttempt(request.cookies.get(googleCalendarStateCookie)?.value, url.searchParams.get("state"), redirectUri);
  const code = url.searchParams.get("code");
  if (!attempt || !code || !config.clientSecret) return done(url.searchParams.get("error") === "access_denied" ? "cancelado" : "error");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: attempt.verifier }),
  }).catch(() => null);
  const token = (await tokenResponse?.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; scope?: string; id_token?: string } | undefined;
  if (!tokenResponse?.ok || !token?.access_token) return done("error");
  // Without the calendar box ticked on Google's screen there is nothing to write to.
  if (!token.scope?.split(" ").includes(googleCalendarScope)) return done("sin-permiso");
  if (!token.refresh_token) return done("error");

  const profile = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
  const email = typeof profile?.email === "string" ? profile.email.slice(0, 190) : null;
  try {
    await saveGoogleLink(accountId, email, token.refresh_token);
  } catch (error) {
    if (isMissingTable(error)) return done("no-listo");
    console.error("google calendar link failed", error);
    return done("error");
  }
  after(() => syncGoogleCalendar(accountId).catch((error) => console.error("google calendar first sync failed", error)));
  return done("conectado");
}
