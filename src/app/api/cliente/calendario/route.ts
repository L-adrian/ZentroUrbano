import { NextResponse, after } from "next/server";
import { editableOwner } from "@/lib/account-profile";
import {
  CalendarUnavailable,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendar,
  listCalendarHomes,
  updateCalendarEvent,
} from "@/lib/calendar";
import { readCalendarEventInput, readCalendarRange } from "@/lib/calendar-input";
import { queueGoogleSync, syncIfStale } from "@/lib/google-calendar";
import { isSameSiteRequest } from "@/lib/request-origin";
import { validTeamId } from "@/lib/team";

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// Mi cuenta > Calendario: what is coming up in a range, and the events the owner adds by hand.
export async function GET(request: Request) {
  const account = await editableOwner();
  if (!account) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  const range = readCalendarRange(new URL(request.url).searchParams);
  if (!range) return reply(400, { ok: false, message: "Ese rango de fechas no es válido." });
  try {
    const data = await getCalendar(account.id, range.start, range.end);
    after(() => syncIfStale(account.id));
    return reply(200, { ok: true, ...data });
  } catch (error) {
    console.error("calendar read failed", error);
    return reply(503, { ok: false, message: "No se pudo cargar el calendario. Intenta de nuevo." });
  }
}

async function ownerWrite(request: Request, work: (accountId: string, body: Record<string, unknown>) => Promise<Response>) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const account = await editableOwner();
  if (!account) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  const body = request.method === "DELETE" ? {} : ((await request.json().catch(() => null)) as Record<string, unknown> | null);
  if (!body) return reply(400, { ok: false, message: "No se pudo leer el pedido." });
  try {
    const response = await work(account.id, body);
    // A change here also reaches the owner's Google Calendar, if connected.
    if (response.ok) after(() => queueGoogleSync(account.id));
    return response;
  } catch (error) {
    if (error instanceof CalendarUnavailable) return reply(503, { ok: false, message: "El calendario todavía no está listo para agregar eventos." });
    console.error("calendar write failed", error);
    return reply(503, { ok: false, message: "No se pudo guardar. Intenta de nuevo." });
  }
}

async function readEvent(accountId: string, body: Record<string, unknown>) {
  const result = readCalendarEventInput(body);
  if (!result.ok) return result;
  if (result.event.propertySlug) {
    const homes = await listCalendarHomes(accountId);
    if (!homes.some((home) => home.slug === result.event.propertySlug)) return { ok: false as const, field: "propiedad", message: "Esa vivienda no es de tu cuenta." };
  }
  return result;
}

export async function POST(request: Request) {
  return ownerWrite(request, async (accountId, body) => {
    const result = await readEvent(accountId, body);
    if (!result.ok) return reply(400, { ok: false, field: result.field, message: result.message });
    return reply(200, { ok: true, id: await createCalendarEvent(accountId, result.event) });
  });
}

export async function PATCH(request: Request) {
  return ownerWrite(request, async (accountId, body) => {
    if (!validTeamId(body.id)) return reply(404, { ok: false, message: "No encontramos ese evento." });
    const result = await readEvent(accountId, body);
    if (!result.ok) return reply(400, { ok: false, field: result.field, message: result.message });
    if (!(await updateCalendarEvent(accountId, body.id, result.event))) return reply(404, { ok: false, message: "No encontramos ese evento." });
    return reply(200, { ok: true });
  });
}

export async function DELETE(request: Request) {
  return ownerWrite(request, async (accountId) => {
    const id = new URL(request.url).searchParams.get("id");
    if (!validTeamId(id)) return reply(404, { ok: false, message: "No encontramos ese evento." });
    if (!(await deleteCalendarEvent(accountId, id))) return reply(404, { ok: false, message: "No encontramos ese evento." });
    return reply(200, { ok: true });
  });
}
