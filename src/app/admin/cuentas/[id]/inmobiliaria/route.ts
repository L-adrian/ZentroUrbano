import { NextResponse } from "next/server";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { validAccountId } from "@/lib/account-profile";
import { CrmUnavailable, setAgency } from "@/lib/crm";
import { queryOne } from "@/lib/mysql";

// Admin: an owner account becomes an agency (inmobiliaria), or goes back. Nothing is deleted.
export async function POST(request: Request, context: RouteContext<"/admin/cuentas/[id]/inmobiliaria">) {
  const admin = authenticatedAdmin(request.headers);
  if (!admin) return NextResponse.json({ ok: false, message: "Acceso exclusivo del administrador." }, { status: 403 });
  if (!sameOriginAdminMutation(request)) return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  const { id } = await context.params;
  if (!validAccountId(id)) return NextResponse.json({ ok: false }, { status: 404 });
  const payload = (await request.json().catch(() => null)) as { active?: unknown; name?: unknown } | null;
  const name = typeof payload?.name === "string" ? payload.name.replace(/\s+/g, " ").trim().slice(0, 160) : "";
  if (typeof payload?.active !== "boolean") return NextResponse.json({ ok: false, message: "Acción no válida." }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ ok: false, message: "Escribe el nombre que verán sus clientes." }, { status: 400 });
  try {
    const owner = await queryOne<{ id: string }>("select id from client_accounts where id = :id and kind = 'owner'", { id });
    if (!owner) return NextResponse.json({ ok: false, message: "Esa cuenta no es de propietario." }, { status: 404 });
    await setAgency(id, name, payload.active);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CrmUnavailable) return NextResponse.json({ ok: false, message: "Falta correr 016_agency_crm.sql en la base de datos." }, { status: 503 });
    console.error("admin agency toggle failed", error);
    return NextResponse.json({ ok: false, message: "No se pudo guardar el cambio." }, { status: 503 });
  }
}
