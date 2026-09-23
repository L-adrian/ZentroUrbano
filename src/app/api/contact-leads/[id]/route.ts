import { NextResponse, type NextRequest } from "next/server";
import {
  deleteContactLead,
  updateContactLeadStatus,
  type ContactLeadStatus,
} from "@/lib/contact-leads";
import { hasDatabaseConfig } from "@/lib/mysql";

const statuses = new Set<ContactLeadStatus>(["pending", "contacted", "authorized", "rejected"]);

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/contact-leads/[id]">,
) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      { ok: false, message: "DATABASE_URL no esta configurado." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const status = typeof payload?.status === "string" ? payload.status : "";

  if (!statuses.has(status as ContactLeadStatus)) {
    return NextResponse.json({ ok: false, message: "Estado invalido." }, { status: 400 });
  }

  const lead = await updateContactLeadStatus(
    id,
    status as ContactLeadStatus,
    typeof payload?.notes === "string" ? payload.notes : null,
  );

  if (!lead) {
    return NextResponse.json({ ok: false, message: "Contacto no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/contact-leads/[id]">,
) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      { ok: false, message: "DATABASE_URL no esta configurado." },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  await deleteContactLead(id);

  return NextResponse.json({ ok: true });
}
