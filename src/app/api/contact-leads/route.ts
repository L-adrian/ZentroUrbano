import { NextResponse, type NextRequest } from "next/server";
import { hasDatabaseConfig } from "@/lib/mysql";
import { listContactLeads, saveContactLeads } from "@/lib/contact-leads";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      { ok: false, message: "DATABASE_URL no esta configurado." },
      { status: 503 },
    );
  }

  const leads = await listContactLeads();

  return NextResponse.json({ ok: true, leads: leads ?? [] });
}

export async function POST(request: NextRequest) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      { ok: false, message: "DATABASE_URL no esta configurado." },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!payload) {
    return NextResponse.json({ ok: false, message: "JSON invalido." }, { status: 400 });
  }

  const leads = await saveContactLeads({
    propertySlug: readText(payload.propertySlug),
    contactName: readText(payload.contactName),
    whatsapp: readText(payload.whatsapp),
    sourcePlatform: readText(payload.sourcePlatform),
    sourceUrl: readText(payload.sourceUrl),
    sourceText: readText(payload.sourceText),
    notes: readText(payload.notes),
  });

  if (leads.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "No se detecto ningun numero valido de WhatsApp boliviano en el texto.",
      },
      { status: 400 },
    );
  }

  const allLeads = await listContactLeads();

  return NextResponse.json({ ok: true, leads, allLeads: allLeads ?? [] }, { status: 201 });
}

function readText(value: unknown) {
  return typeof value === "string" ? value : null;
}
