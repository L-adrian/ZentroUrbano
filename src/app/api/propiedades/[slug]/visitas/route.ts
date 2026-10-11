import { NextResponse, type NextRequest } from "next/server";
import { checkFormTicket, filledHoneypot, passesTurnstile, requestClientKey, spendFormTicket, takeRateLimit, ticketMessages } from "@/lib/form-guard";
import { buildVisitWhatsappMessage } from "@/lib/property-contact";
import { getPropertyBySlugData } from "@/lib/property-data";
import { isSameSiteRequest } from "@/lib/request-origin";
import { normalizeAlertWhatsapp } from "@/lib/search-alert-input";
import { normalizeSignupName } from "@/lib/signup-rules";
import { absoluteUrl } from "@/lib/site";
import { trackServerEvent } from "@/lib/tracking";
import { buildVisitDays, isBookableStart, visitLimits, visitWhenLabel } from "@/lib/visit-slots";
import { createVisitBooking, getVisitPlan, listUpcomingBookings } from "@/lib/visits";
import { getOrCreateVisitorId } from "@/lib/visitor-id";

const attemptLimits = [{ max: 8, windowMs: 60 * 60_000 }, { max: 20, windowMs: 24 * 60 * 60_000 }];
const noStore = { "Cache-Control": "private, no-store" };
const refuse = (status: number, message: string) => NextResponse.json({ ok: false, message }, { status, headers: noStore });

// The free and booked times of a home, for the booking box to refresh itself.
export async function GET(_request: NextRequest, context: RouteContext<"/api/propiedades/[slug]/visitas">) {
  const { slug } = await context.params;
  const property = await getPropertyBySlugData(slug);
  if (!property) return refuse(404, "No encontramos esta vivienda.");
  const plan = await getVisitPlan(property);
  const bookings = plan?.host ? await listUpcomingBookings(property.slug) : null;
  if (!plan?.host || !bookings) return NextResponse.json({ ok: true, available: false, days: [] }, { headers: noStore });
  return NextResponse.json(
    { ok: true, available: true, days: buildVisitDays(plan.settings, bookings.map((booking) => booking.startsAt)) },
    { headers: noStore },
  );
}

export async function POST(request: NextRequest, context: RouteContext<"/api/propiedades/[slug]/visitas">) {
  if (!isSameSiteRequest(request)) return refuse(403, "Origen no permitido.");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return refuse(400, "No pudimos leer la reserva.");
  if (!takeRateLimit(`visit-try:${requestClientKey(request.headers)}`, attemptLimits)) {
    return refuse(429, "Hiciste muchas reservas seguidas. Intenta más tarde o escribe por WhatsApp.");
  }
  if (filledHoneypot(body)) return refuse(400, ticketMessages.invalid);
  const ticket = checkFormTicket(body.ticket, "visit");
  if (ticket !== "ok") return refuse(ticket === "too-fast" ? 429 : 400, ticketMessages[ticket]);
  if (!(await passesTurnstile(body.turnstile, request.headers))) {
    return refuse(400, "No pudimos confirmar que eres una persona. Marca la casilla de verificación e intenta de nuevo.");
  }

  const { slug } = await context.params;
  const property = await getPropertyBySlugData(slug);
  if (!property) return refuse(404, "No encontramos esta vivienda.");
  const plan = await getVisitPlan(property);
  if (!plan?.host) return refuse(503, "Esta vivienda no recibe reservas en línea. Escribe por WhatsApp para coordinar.");
  if (!isBookableStart(body.start, plan.settings)) return refuse(400, "Ese horario ya no está disponible. Elige otro.");
  const visitorName = normalizeSignupName(body.name);
  if (!visitorName || visitorName.length > visitLimits.name) return refuse(400, "Escribe tu nombre y apellido, solo con letras.");
  const visitorWhatsapp = normalizeAlertWhatsapp(body.whatsapp);
  if (!visitorWhatsapp) return refuse(400, "Escribe tu WhatsApp de Bolivia: 8 dígitos que empiezan con 6 o 7.");
  const note = typeof body.note === "string" && body.note.trim() ? body.note.replace(/\s+/g, " ").trim().slice(0, visitLimits.note) : null;

  const visitorId = await getOrCreateVisitorId();
  const result = await createVisitBooking({
    propertySlug: property.slug,
    startsAt: body.start,
    visitorName,
    visitorWhatsapp,
    note,
    hostKind: plan.host.kind,
    hostMemberId: plan.host.member?.id ?? null,
    visitorId,
  });
  if (result.status !== "created") {
    if (result.status === "taken") return refuse(409, "Alguien acaba de reservar ese horario. Elige otro.");
    if (result.status === "limited") return refuse(429, "Ya tienes reservas pendientes para esta vivienda. Si necesitas cambiar el horario, escribe por WhatsApp.");
    return refuse(503, "Las reservas en línea todavía no están activas. Escribe por WhatsApp para coordinar.");
  }

  spendFormTicket(body.ticket as string);
  await trackServerEvent({
    eventType: "property_visit_booked",
    propertySlug: property.slug,
    path: `/propiedades/${property.slug}`,
    metadata: { host: plan.host.kind, visitor_id: visitorId, zone: property.zone },
  });

  const when = visitWhenLabel(body.start);
  const visitsUrl = absoluteUrl(`/propiedades/${property.slug}/visitas`);
  const message = buildVisitWhatsappMessage({
    hostKind: plan.host.kind,
    hostName: plan.host.name,
    visitorName,
    property,
    when,
    listingUrl: absoluteUrl(`/propiedades/${property.slug}`),
    visitsUrl,
  });
  return NextResponse.json(
    { ok: true, id: result.id, when, visitsPath: `/propiedades/${property.slug}/visitas`, whatsappUrl: `https://wa.me/${plan.host.whatsapp}?text=${encodeURIComponent(message)}` },
    { headers: noStore },
  );
}
