import { NextResponse, type NextRequest } from "next/server";
import { checkFormTicket, countRateHit, filledHoneypot, passesTurnstile, requestClientKey, spendFormTicket, takeRateLimit, ticketMessages, underRateLimit } from "@/lib/form-guard";
import { hasDatabaseConfig, queryOne } from "@/lib/mysql";
import { registerWithPassword, setSessionCookie } from "@/lib/mysql-auth";
import { isSameSiteRequest } from "@/lib/request-origin";
import { checkSignup } from "@/lib/signup-rules";

const attemptLimits = [{ max: 10, windowMs: 10 * 60_000 }, { max: 30, windowMs: 24 * 60 * 60_000 }];
const accountLimits = [{ max: 3, windowMs: 60 * 60_000 }, { max: 6, windowMs: 24 * 60 * 60_000 }];
// Above this many new email accounts in an hour, across the whole site, sign-up pauses.
const siteWideHourlyLimit = 30;

const refuse = (status: number, message: string) => NextResponse.json({ ok: false, message }, { status });

export async function POST(request: NextRequest) {
  if (!isSameSiteRequest(request)) return refuse(403, "Origen no permitido.");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return refuse(400, "JSON invalido.");

  const client = requestClientKey(request.headers);
  if (!takeRateLimit(`signup-try:${client}`, attemptLimits)) {
    return refuse(429, "Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentar.");
  }
  // People never see this field; whoever fills it gets the same answer as a bad form, without detail.
  if (filledHoneypot(body)) return refuse(400, ticketMessages.invalid);
  const ticket = checkFormTicket(body.ticket, "signup");
  if (ticket !== "ok") return refuse(ticket === "too-fast" ? 429 : 400, ticketMessages[ticket]);
  if (!(await passesTurnstile(body.turnstile, request.headers))) {
    return refuse(400, "No pudimos confirmar que eres una persona. Marca la casilla de verificación e intenta de nuevo.");
  }

  const signup = checkSignup(body);
  if (!signup.ok) return refuse(400, signup.message);
  if (!underRateLimit(`signup-ok:${client}`, accountLimits)) {
    return refuse(429, "Ya se crearon varias cuentas desde esta conexión. Intenta mañana o escríbenos por WhatsApp.");
  }
  if (hasDatabaseConfig()) {
    const recent = await queryOne<{ total: number | string }>(
      "select count(*) as total from morada_users where auth_provider = 'email' and created_at >= now() - interval 1 hour",
    ).catch(() => null);
    if (Number(recent?.total ?? 0) >= siteWideHourlyLimit) {
      return refuse(503, "Estamos recibiendo muchas cuentas nuevas en este momento. Intenta en una hora o entra con Google.");
    }
  }

  const result = await registerWithPassword({
    email: signup.email,
    password: typeof body.password === "string" ? body.password : "",
    displayName: signup.name,
    companyName: "",
    accountKind: "owner",
  });

  if (!result.ok) return refuse(result.status, result.message);

  spendFormTicket(body.ticket as string);
  countRateHit(`signup-ok:${client}`, accountLimits);
  await setSessionCookie(result.session);
  return NextResponse.json({ ok: true, accountId: result.accountId });
}
