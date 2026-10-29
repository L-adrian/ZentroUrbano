import { NextResponse, type NextRequest } from "next/server";
import { googleCalendarCallbackPath, googleCalendarConfigured, googleCalendarScope, googleCalendarStateCookie } from "@/lib/google-calendar-event";
import { calendarOwnerId } from "@/lib/google-calendar-route";
import { createGoogleAttempt, googleOAuthConfig } from "@/lib/google-oauth";

// "Conectar Google Calendar": asks Google for permission to add events to the person's calendar.
export async function GET(request: NextRequest) {
  const config = googleOAuthConfig(request);
  const back = new URL("/cliente", config.origin);
  if (!(await calendarOwnerId())) return NextResponse.redirect(new URL("/login?next=/cliente", config.origin));
  if (!googleCalendarConfigured() || !config.clientSecret) {
    back.searchParams.set("google", "no-configurado");
    return NextResponse.redirect(back);
  }
  // The state cookie must be set on the same host the callback returns to.
  if (!config.local && config.visibleHost !== config.canonicalHost) return NextResponse.redirect(new URL("/api/cliente/google-calendar/conectar", config.origin));
  const redirectUri = new URL(googleCalendarCallbackPath, config.origin).toString();
  const attempt = createGoogleAttempt("/cliente", redirectUri);
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `openid email ${googleCalendarScope}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: attempt.state,
    code_challenge: attempt.challenge,
    code_challenge_method: "S256",
  }).toString();
  const response = NextResponse.redirect(googleUrl);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(googleCalendarStateCookie, attempt.cookie, { httpOnly: true, sameSite: "lax", secure: config.secure, path: "/", maxAge: 600 });
  return response;
}
