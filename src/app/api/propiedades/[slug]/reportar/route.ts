import { NextResponse, type NextRequest } from "next/server";
import { recordPropertyReport } from "@/lib/property-audience";
import { getPropertyBySlugData } from "@/lib/property-data";
import { isReportReason, reportNoteMaxLength } from "@/lib/property-reports";
import { hasDatabaseConfig } from "@/lib/mysql";
import { getOrCreateVisitorId } from "@/lib/visitor-id";

// Tenant reports ("ya se alquiló", "pidió dinero"...). Five "ya se alquiló" reports since the
// last confirmation turn the listing to "Disponibilidad por confirmar".
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/propiedades/[slug]/reportar">,
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  }
  let body: { reason?: unknown; note?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2048) return NextResponse.json({ ok: false, message: "Mensaje demasiado largo." }, { status: 413 });
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }
  if (!isReportReason(body.reason)) {
    return NextResponse.json({ ok: false, message: "Elige un motivo." }, { status: 400 });
  }
  const { slug } = await context.params;
  const property = await getPropertyBySlugData(slug);
  if (!property) {
    return NextResponse.json({ ok: false, message: "No encontramos este anuncio." }, { status: 404 });
  }
  if (!hasDatabaseConfig()) {
    return NextResponse.json({ ok: false, message: "No pudimos guardar el aviso. Escríbenos por WhatsApp." }, { status: 503 });
  }
  const note = typeof body.note === "string" ? body.note.replace(/\s+/g, " ").trim().slice(0, reportNoteMaxLength) : "";
  try {
    const result = await recordPropertyReport({
      slug: property.slug,
      reason: body.reason,
      note,
      visitorId: await getOrCreateVisitorId(),
      userAgent: request.headers.get("user-agent"),
    });
    if (result.limited) {
      return NextResponse.json({ ok: false, message: "Ya enviaste varios avisos hoy. Escríbenos por WhatsApp si es urgente." }, { status: 429 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("property report failed", error);
    return NextResponse.json({ ok: false, message: "No pudimos guardar el aviso. Escríbenos por WhatsApp." }, { status: 500 });
  }
}
