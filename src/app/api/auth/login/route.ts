import { NextResponse, type NextRequest } from "next/server";
import { countRateHit, requestClientKey, underRateLimit } from "@/lib/form-guard";
import { loginWithPassword, setSessionCookie } from "@/lib/mysql-auth";

// Wrong passwords per connection: after 10 in 15 minutes, sign-in waits.
const failedLoginLimits = [{ max: 10, windowMs: 15 * 60_000 }];

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "JSON invalido." }, { status: 400 });
  }

  const failedKey = `login-fail:${requestClientKey(request.headers)}`;
  if (!underRateLimit(failedKey, failedLoginLimits)) {
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
