import { NextResponse } from "next/server";
import { changeAccountPassword, checkProfileUpdate, editableOwner, saveAccountProfile } from "@/lib/account-profile";
import { isSameSiteRequest } from "@/lib/request-origin";

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// "Mi perfil": the owner changes their name and WhatsApp, or their password.
export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const account = await editableOwner();
  if (!account) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return reply(400, { ok: false, message: "No se pudo leer el pedido." });
  try {
    if (body.action === "profile") {
      const check = checkProfileUpdate({ displayName: body.displayName, phone: body.phone });
      if (!check.ok) return reply(400, check);
      await saveAccountProfile(account.id, check.displayName, check.phone);
      return reply(200, { ok: true, displayName: check.displayName, phone: check.phone });
    }
    if (body.action === "password") {
      const result = await changeAccountPassword(body.current, body.next);
      return result.ok ? reply(200, { ok: true }) : reply(result.status, result);
    }
    return reply(400, { ok: false });
  } catch (error) {
    console.error("profile update failed", error);
    return reply(503, { ok: false, message: "No se pudo guardar. Intenta de nuevo." });
  }
}
