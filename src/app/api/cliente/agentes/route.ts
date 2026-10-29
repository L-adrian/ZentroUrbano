import { createAgent, listAgents, updateAgent } from "@/lib/crm";
import { crmLimits, readAgentInput } from "@/lib/crm-input";
import { agencyRequest, crmReply, validRowId } from "@/lib/crm-route";

// The agency's agents. They do not sign in yet; the agency assigns clients to them.
export async function POST(request: Request) {
  return agencyRequest(request, async (accountId, body) => {
    const result = readAgentInput(body);
    if (!result.ok) return crmReply(400, { ok: false, field: result.field, message: result.message });
    const id = await createAgent(accountId, result.agent);
    if (!id) return crmReply(400, { ok: false, message: `Puedes tener hasta ${crmLimits.agents} agentes.` });
    return crmReply(200, { ok: true, agents: await listAgents(accountId) });
  });
}

// { id, nombre, whatsapp, color, activo }
export async function PATCH(request: Request) {
  return agencyRequest(request, async (accountId, body) => {
    if (!validRowId(body.id)) return crmReply(400, { ok: false, message: "Falta el agente." });
    const result = readAgentInput(body);
    if (!result.ok) return crmReply(400, { ok: false, field: result.field, message: result.message });
    const saved = await updateAgent(accountId, body.id, { ...result.agent, active: body.activo !== false });
    return saved ? crmReply(200, { ok: true, agents: await listAgents(accountId) }) : crmReply(404, { ok: false, message: "Ese agente ya no está." });
  });
}
