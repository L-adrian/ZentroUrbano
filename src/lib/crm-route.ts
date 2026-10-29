import "server-only";
import { NextResponse } from "next/server";
import { editableOwner } from "@/lib/account-profile";
import { CrmUnavailable, getAgency } from "@/lib/crm";
import { isSameSiteRequest } from "@/lib/request-origin";

export const crmReply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// Every Clientes and Agentes call: a signed-in owner whose account is an agency.
export async function agencyRequest(request: Request, work: (accountId: string, body: Record<string, unknown>) => Promise<Response>) {
  const write = request.method !== "GET";
  if (write && !isSameSiteRequest(request)) return crmReply(403, { ok: false, message: "Origen no permitido." });
  const account = await editableOwner();
  if (!account) return crmReply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  try {
    if (!(await getAgency(account.id))) return crmReply(403, { ok: false, message: "Esta cuenta no es de inmobiliaria." });
    const body = write && request.method !== "DELETE" ? ((await request.json().catch(() => null)) as Record<string, unknown> | null) : {};
    if (!body) return crmReply(400, { ok: false, message: "No se pudo leer el pedido." });
    return await work(account.id, body);
  } catch (error) {
    if (error instanceof CrmUnavailable) return crmReply(503, { ok: false, message: "Clientes todavía no está listo. Intenta más tarde." });
    console.error("agency crm failed", error);
    return crmReply(503, { ok: false, message: write ? "No se pudo guardar. Intenta de nuevo." : "No se pudo cargar. Intenta de nuevo." });
  }
}

export const validRowId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/.test(value);
