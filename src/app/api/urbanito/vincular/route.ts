import { linkTelegram } from "@/lib/urbanito";
import { readTelegramId } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

export async function POST(request: Request) {
  return forUrbanito(request, async () => {
    const body = (await request.json().catch(() => null)) as { codigo?: unknown; telegram_id?: unknown } | null;
    const telegramId = readTelegramId(body?.telegram_id);
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });
    const linked = await linkTelegram(body?.codigo, telegramId);
    if (!linked) return reply(404, { message: "Ese código no sirve o ya venció. Pedí uno nuevo en Mi cuenta de Zentro Urbano." });
    return reply(200, linked);
  });
}
