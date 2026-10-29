import { NextResponse } from "next/server";
import { disconnectGoogleCalendar, googleCalendarStatus, syncGoogleCalendar } from "@/lib/google-calendar";
import { calendarOwnerId } from "@/lib/google-calendar-route";
import { isSameSiteRequest } from "@/lib/request-origin";

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// Google Calendar card of Mi cuenta: status, "Sincronizar ahora" and "Desconectar".
export async function GET() {
  const accountId = await calendarOwnerId();
  if (!accountId) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  return reply(200, { ok: true, status: await googleCalendarStatus(accountId) });
}

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const accountId = await calendarOwnerId();
  if (!accountId) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  try {
    const result = await syncGoogleCalendar(accountId);
    return reply(200, { ok: true, result, status: await googleCalendarStatus(accountId) });
  } catch (error) {
    console.error("google calendar sync failed", error);
    return reply(503, { ok: false, message: "No se pudo sincronizar. Intenta más tarde." });
  }
}

export async function DELETE(request: Request) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const accountId = await calendarOwnerId();
  if (!accountId) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  try {
    await disconnectGoogleCalendar(accountId);
    return reply(200, { ok: true, status: await googleCalendarStatus(accountId) });
  } catch (error) {
    console.error("google calendar disconnect failed", error);
    return reply(503, { ok: false, message: "No se pudo desconectar. Intenta de nuevo." });
  }
}
