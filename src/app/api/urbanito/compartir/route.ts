import { createShareLink } from "@/lib/agency-share";
import { CrmUnavailable, getAgency } from "@/lib/crm";
import { hasDatabaseConfig } from "@/lib/mysql";
import { getUrbanitoOwner } from "@/lib/urbanito";
import { readTelegramId } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

export const runtime = "nodejs";

// The read-only report of one home for its owner (no names or phones of the interested people),
// the same link as "Compartir" in the agent's Panel. Asking again returns the same link.
export async function POST(request: Request) {
  return forUrbanito(request, async () => {
    if (!hasDatabaseConfig()) return reply(503, { message: "La base de datos no está configurada." });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return reply(400, { message: "Solicitud inválida." });
    const telegramId = readTelegramId(body.telegram_id);
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });
    const account = await getUrbanitoOwner(telegramId);
    if (!account) return reply(404, { message: "Esta cuenta de Telegram no está conectada a Zentro Urbano." });
    if (account.status !== "active" || !(await getAgency(account.id))) {
      return reply(403, { code: "NOT_AGENCY", message: "El informe para el dueño es para cuentas de agente inmobiliario." });
    }
    const slug = typeof body.slug === "string" && /^[a-z0-9-]{1,180}$/.test(body.slug) ? body.slug : null;
    if (!slug) return reply(400, { message: "Falta la vivienda." });
    try {
      const links = await createShareLink(account.id, slug);
      if (!links?.length) return reply(404, { message: "Esa vivienda no está en tu cuenta." });
      return reply(200, { ok: true, url: links[0].url });
    } catch (error) {
      if (error instanceof CrmUnavailable) return reply(503, { message: "El informe para el dueño todavía no está disponible." });
      throw error;
    }
  });
}
