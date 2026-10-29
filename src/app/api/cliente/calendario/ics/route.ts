import { editableOwner } from "@/lib/account-profile";
import { getCalendar } from "@/lib/calendar";
import { addDays, boliviaInstant, boliviaParts, calendarToIcs } from "@/lib/calendar-input";
import { visibleOrigin } from "@/lib/request-origin";

// "Bajar al celular": the next 60 days (and the last week) as a .ics file the phone's calendar opens.
export async function GET(request: Request) {
  const account = await editableOwner();
  if (!account) return new Response("Vuelve a ingresar a tu cuenta.", { status: 401 });
  const today = boliviaParts(new Date()).day;
  try {
    const { events } = await getCalendar(account.id, boliviaInstant(addDays(today, -7)), boliviaInstant(addDays(today, 60)));
    const body = calendarToIcs(events, { name: "Zentro Urbano", origin: visibleOrigin(request) });
    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="zentro-calendario-${today}.ics"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("calendar ics failed", error);
    return new Response("No se pudo preparar el calendario. Intenta de nuevo.", { status: 503 });
  }
}
