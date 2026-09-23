import { NextResponse, type NextRequest } from "next/server";
import { authSessionCookie, loginWithGoogleProfile } from "@/lib/mysql-auth";
import { exchangeGoogleProfile, GoogleOAuthError, googleOAuthConfig, googleStateCookie, readGoogleAttempt } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  let config: ReturnType<typeof googleOAuthConfig>;
  try { config = googleOAuthConfig(request); } catch {
    return NextResponse.redirect(new URL("/login?google_error=config", request.url));
  }
  const attempt = readGoogleAttempt(request.cookies.get(googleStateCookie)?.value, url.searchParams.get("state"), config.redirectUri);
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: config.secure, path: "/" };
  function fail(error: string) {
    const login = new URL("/login", config.origin);
    login.search = new URLSearchParams({ next: attempt?.next || "/cliente", google_error: error }).toString();
    const response = NextResponse.redirect(login);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(googleStateCookie, "", { ...cookieOptions, maxAge: 0 });
    return response;
  }
  if (!attempt) return fail("state");
  if (url.searchParams.get("error") === "access_denied") return fail("cancelled");
  if (!config.validCallback || !config.clientSecret) return fail("config");
  const code = url.searchParams.get("code");
  if (!code) return fail("token");
  try {
    const profile = await exchangeGoogleProfile(code, config, attempt.verifier);
    const result = await loginWithGoogleProfile(profile);
    if (!result.ok) return fail("account");
    const response = NextResponse.redirect(new URL(attempt.next, config.origin));
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(googleStateCookie, "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set(authSessionCookie, result.session.token, { ...cookieOptions, expires: result.session.expiresAt });
    return response;
  } catch (error) { return fail(error instanceof GoogleOAuthError ? error.code : "account"); }
}
