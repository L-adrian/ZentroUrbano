import { hasDatabaseConfig } from "@/lib/mysql";
import { isMissingTable, validTeamId } from "@/lib/team";
import { cancelUrbanitoVisit, getUrbanitoOwner, saveUrbanitoVisitHours, urbanitoOwnsListing } from "@/lib/urbanito";
import { readTelegramId } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

export const runtime = "nodejs";

// Visits of the linked account's homes: cancel a booked time ("cancelar") or change the days and
// hours a home can be visited ("horarios"), the same as Mi cuenta.
export async function POST(request: Request) {
  return forUrbanito(request, async () => {
    if (!hasDatabaseConfig()) return reply(503, { message: "La base de datos no está configurada." });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return reply(400, { message: "Solicitud inválida." });
    const telegramId = readTelegramId(body.telegram_id);
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });
    const account = await getUrbanitoOwner(telegramId);
    if (!account) return reply(404, { message: "Esta cuenta de Telegram no está conectada a Zentro Urbano." });
    if (account.status !== "active") return reply(403, { message: "La cuenta de Zentro Urbano no está activa." });
    try {
      if (body.accion === "cancelar") {
        if (!validTeamId(body.id)) return reply(404, { message: "No encontré esa visita." });
        const result = await cancelUrbanitoVisit(account.id, body.id);
        if (!result) return reply(404, { message: "No encontré esa visita en tus anuncios." });
        if (!result.cancelled) return reply(409, { message: "Esa visita ya estaba cancelada." });
        return reply(200, { ok: true, visitante: { nombre: result.booking.visitorName, whatsapp: result.booking.visitorWhatsapp } });
      }
      if (body.accion === "horarios") {
        const slug = typeof body.slug === "string" ? body.slug : "";
        if (!(await urbanitoOwnsListing(account.id, slug))) return reply(403, { message: "Ese anuncio no es de tu cuenta." });
        const settings = await saveUrbanitoVisitHours(slug, body.horarios);
        if (!settings) return reply(400, { message: "Elige al menos un día y deja una hora o más entre el inicio y el fin, en horas y medias horas entre 06:00 y 22:00." });
        return reply(200, { ok: true, horarios: settings });
      }
      return reply(400, { message: "Acción no válida." });
    } catch (error) {
      if (isMissingTable(error)) return reply(503, { message: "Las visitas en línea todavía no están activas." });
      throw error;
    }
  });
}
