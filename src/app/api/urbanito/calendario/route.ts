import { calendarAccountForTelegram, getCalendar } from "@/lib/calendar";
import { addDays, boliviaInstant, boliviaParts, calendarKindLabels } from "@/lib/calendar-input";
import { readTelegramId } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

// The linked owner's calendar for the next days, so the bot can remind them. dias = 1 to 31 (7 by default).
export async function GET(request: Request) {
  return forUrbanito(request, async () => {
    const params = new URL(request.url).searchParams;
    const telegramId = readTelegramId(params.get("telegram_id"));
    if (!telegramId) return reply(400, { message: "Falta el usuario de Telegram." });
    const accountId = await calendarAccountForTelegram(telegramId);
    if (!accountId) return reply(404, { message: "Esta cuenta de Telegram no está conectada a Zentro Urbano." });
    const days = Math.min(31, Math.max(1, Number.parseInt(params.get("dias") ?? "7", 10) || 7));
    const today = boliviaParts(new Date()).day;
    const { events } = await getCalendar(accountId, boliviaInstant(today), boliviaInstant(addDays(today, days + 1)));
    const now = Date.now();
    return reply(200, {
      eventos: events
        .filter((event) => !event.cancelled && event.source !== "urbanito" && (event.allDay || Date.parse(event.startsAt) >= now))
        .map((event) => ({
          id: event.id,
          tipo: event.kind,
          tipo_nombre: calendarKindLabels[event.kind],
          titulo: event.title,
          cuando: event.startsAt,
          todo_el_dia: event.allDay,
          casa: event.propertyTitle,
          persona: event.personName,
          whatsapp: event.personWhatsapp,
          nota: event.note,
        })),
    });
  });
}
