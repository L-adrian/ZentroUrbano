import { hasDatabaseConfig } from "@/lib/mysql";
import { PublicationError, requestListingRepublish, revalidateListingPages, updateListingAvailability } from "@/lib/database-publications";
import { trackServerEvent } from "@/lib/tracking";
import { getUrbanitoOwner, setUrbanitoListingPrice, urbanitoOwnsListing } from "@/lib/urbanito";
import { readTelegramId } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

export const runtime = "nodejs";

const actions = ["confirmar", "alquilada", "volver_a_publicar", "precio"] as const;

// The owner's buttons of Mi cuenta, from Telegram: "Sigue disponible", "Ya se alquiló", "Volver a
// publicar" (back to review) and a new price. Urbanito asks before sending any of them.
export async function POST(request: Request) {
  return forUrbanito(request, async () => {
    if (!hasDatabaseConfig()) return reply(503, { message: "La base de datos no está configurada." });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return reply(400, { message: "Solicitud inválida." });
    const telegramId = readTelegramId(body.telegram_id);
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });
    const action = actions.find((item) => item === body.accion);
    if (!action) return reply(400, { message: "Acción no válida." });
    const account = await getUrbanitoOwner(telegramId);
    if (!account) return reply(404, { message: "Esta cuenta de Telegram no está conectada a Zentro Urbano." });
    const slug = typeof body.slug === "string" ? body.slug : "";
    if (account.status !== "active" || !(await urbanitoOwnsListing(account.id, slug))) return reply(403, { message: "Ese anuncio no es de tu cuenta." });

    try {
      if (action === "precio") {
        const price = Number(body.precio);
        if (!Number.isFinite(price) || price <= 0 || price > 100_000_000) return reply(400, { message: "Escribe el precio por mes, solo números." });
        await setUrbanitoListingPrice(slug, Math.round(price * 100) / 100);
        revalidateListingPages(slug);
        return reply(200, { ok: true, accion: action });
      }
      if (action === "volver_a_publicar") {
        const result = await requestListingRepublish(account.id, slug);
        revalidateListingPages(null);
        return reply(200, { ok: true, accion: action, ...result });
      }
      const change = action === "confirmar" ? "confirm" : "rented";
      await updateListingAvailability(slug, change, account.id);
      await trackServerEvent({
        eventType: change === "confirm" ? "property_availability_confirmed" : "property_marked_rented",
        propertySlug: slug,
        path: "/urbanito",
        metadata: { by: "owner", via: "urbanito" },
      });
      revalidateListingPages(slug);
      return reply(200, { ok: true, accion: action });
    } catch (error) {
      if (error instanceof PublicationError) return reply(error.status, { message: error.message });
      throw error;
    }
  });
}
