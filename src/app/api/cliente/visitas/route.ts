import { NextResponse } from "next/server";
import { getListingOwner } from "@/lib/mysql-auth";
import { isSameSiteRequest } from "@/lib/request-origin";
import { isMissingTable, validTeamId } from "@/lib/team";
import { normalizeVisitSettings } from "@/lib/visit-slots";
import { cancelBooking, getBooking, saveVisitSettings } from "@/lib/visits";

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// The owner's own visits: cancel a booked time or change the days and hours a home can be visited.
export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return reply(400, { ok: false, message: "No se pudo leer el pedido." });
  try {
    if (body.action === "cancel") {
      if (!validTeamId(body.id)) return reply(404, { ok: false });
      const booking = await getBooking(body.id);
      if (!booking || !(await getListingOwner(booking.propertySlug))) return reply(404, { ok: false, message: "No encontramos esa visita en tus anuncios." });
      return reply(200, { ok: await cancelBooking(booking.id, "owner") });
    }
    if (body.action === "settings") {
      if (typeof body.slug !== "string" || !(await getListingOwner(body.slug))) return reply(403, { ok: false, message: "Ese anuncio no es de tu cuenta." });
      const settings = normalizeVisitSettings(body.settings);
      if (!settings) return reply(400, { ok: false, message: "Elige al menos un día y deja una hora o más entre el inicio y el fin." });
      await saveVisitSettings(body.slug, settings);
      return reply(200, { ok: true });
    }
    return reply(400, { ok: false });
  } catch (error) {
    if (isMissingTable(error)) return reply(503, { ok: false, message: "Las visitas en línea todavía no están activas." });
    console.error("owner visit action failed", error);
    return reply(503, { ok: false, message: "No se pudo guardar. Intenta de nuevo." });
  }
}
