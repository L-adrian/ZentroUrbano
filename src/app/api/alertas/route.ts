import { NextResponse, type NextRequest } from "next/server";
import { isSameSiteRequest } from "@/lib/request-origin";
import { cleanAlertParams, createSearchAlert } from "@/lib/search-alerts";
import { normalizeAlertEmail, normalizeAlertWhatsapp, searchAlertLimits } from "@/lib/search-alert-input";
import { getOrCreateVisitorId } from "@/lib/visitor-id";

// "Avísame cuando haya una así": stores a contact with consent. The team writes by hand when
// a matching home is published; nothing is sent automatically.
export async function POST(request: NextRequest) {
  if (!isSameSiteRequest(request)) {
    return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  }
  let body: { name?: unknown; whatsapp?: unknown; email?: unknown; params?: unknown; summary?: unknown; consent?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ ok: false, message: "Datos demasiado largos." }, { status: 413 });
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ ok: false, message: "Marca la casilla para que podamos guardar tu contacto." }, { status: 400 });
  }
  const whatsapp = normalizeAlertWhatsapp(body.whatsapp);
  const email = normalizeAlertEmail(body.email);
  if (!whatsapp && !email) {
    return NextResponse.json({ ok: false, message: "Escribe un WhatsApp de Bolivia (8 dígitos) o un correo." }, { status: 400 });
  }
  const params = typeof body.params === "string" ? cleanAlertParams(body.params) : "";
  const summary = typeof body.summary === "string" ? body.summary.replace(/\s+/g, " ").trim().slice(0, searchAlertLimits.summary) : "";
  if (!params || !summary) {
    return NextResponse.json({ ok: false, message: "Elige al menos un filtro para tu alerta." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim().slice(0, searchAlertLimits.name) || null : null;
  try {
    const result = await createSearchAlert({ name, whatsapp, email, params, summary, visitorId: await getOrCreateVisitorId() });
    if (result === "unavailable") {
      return NextResponse.json({ ok: false, fallback: "whatsapp", message: "Todavía no podemos guardar alertas aquí. Escríbenos por WhatsApp con tu búsqueda." }, { status: 503 });
    }
    if (result === "limited") {
      return NextResponse.json({ ok: false, message: "Ya guardaste varias alertas hoy. Escríbenos por WhatsApp si necesitas otra." }, { status: 429 });
    }
    return NextResponse.json({ ok: true, duplicate: result === "duplicate" });
  } catch (error) {
    console.error("search alert failed", error);
    return NextResponse.json({ ok: false, fallback: "whatsapp", message: "No pudimos guardar tu alerta. Escríbenos por WhatsApp con tu búsqueda." }, { status: 500 });
  }
}
