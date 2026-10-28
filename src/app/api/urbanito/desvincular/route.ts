import { unlinkTelegram } from "@/lib/urbanito";
import { readTelegramId } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

export async function POST(request: Request) {
  return forUrbanito(request, async () => {
    const body = (await request.json().catch(() => null)) as { telegram_id?: unknown } | null;
    const telegramId = readTelegramId(body?.telegram_id);
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });
    await unlinkTelegram(telegramId);
    return reply(200, { ok: true });
  });
}
