import { visibleOrigin } from "@/lib/request-origin";
import { getUrbanitoAccount } from "@/lib/urbanito";
import { readTelegramId } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

export async function GET(request: Request) {
  return forUrbanito(request, async () => {
    const telegramId = readTelegramId(new URL(request.url).searchParams.get("telegram_id"));
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });
    const account = await getUrbanitoAccount(telegramId, visibleOrigin(request));
    if (!account) return reply(404, { message: "Esta cuenta de Telegram no está conectada a Zentro Urbano." });
    return reply(200, account);
  });
}
