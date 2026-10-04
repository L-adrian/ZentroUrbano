import { NextResponse } from "next/server";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { updateSearchAlert, validAlertId } from "@/lib/search-alerts";

export async function POST(request: Request, context: RouteContext<"/admin/alertas/[id]">) {
  if (!authenticatedAdmin(request.headers)) return NextResponse.json({ ok: false, message: "Acceso exclusivo del administrador." }, { status: 403 });
  if (!sameOriginAdminMutation(request)) return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  const { id } = await context.params;
  if (!validAlertId(id)) return NextResponse.json({ ok: false }, { status: 404 });
  const payload = (await request.json().catch(() => null)) as { action?: unknown } | null;
  const action = payload?.action;
  if (action !== "notified" && action !== "remove") return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const updated = await updateSearchAlert(id, action);
    return NextResponse.json({ ok: updated }, { status: updated ? 200 : 404 });
  } catch (error) {
    console.error("search alert update failed", error);
    return NextResponse.json({ ok: false, message: "No se pudo guardar. Actualiza y reintenta." }, { status: 503 });
  }
}
