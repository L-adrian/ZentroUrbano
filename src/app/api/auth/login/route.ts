import { NextResponse, type NextRequest } from "next/server";
import { countRateHit, requestClientKey, takeRateLimit, underRateLimit } from "@/lib/form-guard";
import { loginWithPassword, setSessionCookie } from "@/lib/mysql-auth";
import { isSameSiteRequest } from "@/lib/request-origin";

// Wrong passwords per connection: after 10 in 15 minutes, sign-in waits.
const failedLoginLimits = [{ max: 10, windowMs: 15 * 60_000 }];
// Every attempt per connection, counted before the password check, so many attempts sent at the
// same moment cannot all slip in before the first failure is counted.
const attemptLimits = [{ max: 30, windowMs: 15 * 60_000 }];

export async function POST(request: NextRequest) {
  // Only the login form of this site: another page cannot sign a visitor into someone else's account.
  if (!isSameSiteRequest(request) || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "JSON invalido." }, { status: 400 });
  }

  const clientKey = requestClientKey(request.headers);
  const failedKey = `login-fail:${clientKey}`;
  if (!underRateLimit(failedKey, failedLoginLimits) || !takeRateLimit(`login-try:${clientKey}`, attemptLimits)) {
    return NextResponse.json({ ok: false, message: "Demasiados intentos con datos incorrectos. Espera 15 minutos o entra con Google." }, { status: 429 });
  }

  const result = await loginWithPassword(
    typeof body.email === "string" ? body.email : "",
    typeof body.password === "string" ? body.password : "",
  );

  if (!result.ok) {
    if (result.status === 401) countRateHit(failedKey, failedLoginLimits);
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  await setSessionCookie(result.session);
  return NextResponse.json({ ok: true, accountId: result.accountId });
}
