import "server-only";
import { NextResponse, after } from "next/server";
import { editableOwner } from "@/lib/account-profile";
import { CrmUnavailable, getAgency, getAgentLogin, type CrmScope } from "@/lib/crm";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { queueAgencySync } from "@/lib/google-calendar";
import { isSameSiteRequest } from "@/lib/request-origin";

export const crmReply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// The signed-in agency, or one of its agents with their own user.
export async function currentCrmScope(): Promise<(CrmScope & { agencyName: string; agentName: string | null }) | null> {
  const owner = await editableOwner();
  if (owner) {
    const agency = await getAgency(owner.id);
    return agency ? { accountId: owner.id, agentId: null, agencyName: agency.name, agentName: null } : null;
  }
  const account = await getCurrentAccount();
  if (account?.kind !== "agente" || account.storage !== "mysql") return null;
  const agent = await getAgentLogin(account.id);
  return agent ? { accountId: agent.agencyAccountId, agentId: agent.agentId, agencyName: agent.agencyName, agentName: agent.agentName } : null;
}

// Every Clientes and Agentes call. agencyOnly keeps agents out (agents, deleting, sharing).
export async function agencyRequest(
  request: Request,
  work: (scope: CrmScope, body: Record<string, unknown>) => Promise<Response>,
  options: { agencyOnly?: boolean } = {},
) {
  const write = request.method !== "GET";
  if (write && !isSameSiteRequest(request)) return crmReply(403, { ok: false, message: "Origen no permitido." });
  try {
    const scope = await currentCrmScope();
    if (!scope) return crmReply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
    if (options.agencyOnly && scope.agentId) return crmReply(403, { ok: false, message: "Esto lo hace la cuenta principal." });
    const body = write && request.method !== "DELETE" ? ((await request.json().catch(() => null)) as Record<string, unknown> | null) : {};
    if (!body) return crmReply(400, { ok: false, message: "No se pudo leer el pedido." });
    const response = await work({ accountId: scope.accountId, agentId: scope.agentId }, body);
    // Next steps with a date also reach the Google Calendars of the agency and its agents.
    if (write && response.ok) after(() => queueAgencySync(scope.accountId));
    return response;
  } catch (error) {
    if (error instanceof CrmUnavailable) return crmReply(503, { ok: false, message: "Esto todavía no está listo. Intenta más tarde." });
    console.error("agency crm failed", error);
    return crmReply(503, { ok: false, message: write ? "No se pudo guardar. Intenta de nuevo." : "No se pudo cargar. Intenta de nuevo." });
  }
}

export const validRowId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/.test(value);
