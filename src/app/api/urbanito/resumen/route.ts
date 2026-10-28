import { saveUrbanitoSnapshot } from "@/lib/urbanito";
import { readTelegramId } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

// The bot reports what it did for a linked owner; Mi cuenta > Urbanito shows it.
export async function POST(request: Request) {
  return forUrbanito(request, async () => {
    const body = (await request.json().catch(() => null)) as { telegram_id?: unknown } | null;
    const telegramId = readTelegramId(body?.telegram_id);
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });
    const saved = await saveUrbanitoSnapshot(telegramId, body);
    if (!saved) return reply(404, { message: "Esta cuenta de Telegram no está conectada a Zentro Urbano." });
    return reply(200, { ok: true, mostrar_chat: saved.showChat });
  });
}
