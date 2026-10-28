import { NextResponse } from "next/server";
import { editableOwner } from "@/lib/account-profile";
import { isSameSiteRequest } from "@/lib/request-origin";
import { createLinkCode, unlinkAccount, urbanitoEnabled, UrbanitoUnavailable } from "@/lib/urbanito";
import { urbanitoCodeMinutes } from "@/lib/urbanito-input";

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// Mi cuenta: the owner asks for a code to type in Urbanito, or disconnects Telegram.
async function ownerAction(request: Request, work: (accountId: string) => Promise<Response>) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  if (!urbanitoEnabled()) return reply(503, { ok: false, message: "Urbanito todavía no está disponible." });
  const account = await editableOwner();
  if (!account) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  try {
    return await work(account.id);
  } catch (error) {
    if (!(error instanceof UrbanitoUnavailable)) console.error("urbanito link failed", error);
    return reply(503, { ok: false, message: "No se pudo ahora. Intenta de nuevo en un rato." });
  }
}

export async function POST(request: Request) {
  return ownerAction(request, async (accountId) => reply(200, { ok: true, code: await createLinkCode(accountId), minutes: urbanitoCodeMinutes }));
}

export async function DELETE(request: Request) {
  return ownerAction(request, async (accountId) => {
    await unlinkAccount(accountId);
    return reply(200, { ok: true });
  });
}
