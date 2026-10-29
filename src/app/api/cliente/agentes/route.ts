import { createAgent, listAgents, setAgentLogin, updateAgent } from "@/lib/crm";
import { crmLimits, readAgentInput, readAgentLoginInput } from "@/lib/crm-input";
import { agencyRequest, crmReply, validRowId } from "@/lib/crm-route";

// The agency's agents. Only the agency account manages them.
export async function POST(request: Request) {
  return agencyRequest(
    request,
    async ({ accountId }, body) => {
      const result = readAgentInput(body);
      if (!result.ok) return crmReply(400, { ok: false, field: result.field, message: result.message });
      const id = await createAgent(accountId, result.agent);
      if (!id) return crmReply(400, { ok: false, message: `Puedes tener hasta ${crmLimits.agents} agentes.` });
      return crmReply(200, { ok: true, agents: await listAgents(accountId) });
    },
    { agencyOnly: true },
  );
}

// { id, nombre, whatsapp, color, activo } edits the agent; { id, accion: "usuario", usuario,
// contrasena } gives them their own user or a new password.
export async function PATCH(request: Request) {
  return agencyRequest(
    request,
    async ({ accountId }, body) => {
      if (!validRowId(body.id)) return crmReply(400, { ok: false, message: "Falta el agente." });
      if (body.accion === "usuario") {
        const login = readAgentLoginInput(body);
        if (!login.ok) return crmReply(400, { ok: false, field: login.field, message: login.message });
        const saved = await setAgentLogin(accountId, body.id, login.username, login.password);
        if (!saved.ok) return crmReply(400, { ok: false, field: saved.field, message: saved.message });
        return crmReply(200, { ok: true, agents: await listAgents(accountId) });
      }
      const result = readAgentInput(body);
      if (!result.ok) return crmReply(400, { ok: false, field: result.field, message: result.message });
      const saved = await updateAgent(accountId, body.id, { ...result.agent, active: body.activo !== false });
      return saved ? crmReply(200, { ok: true, agents: await listAgents(accountId) }) : crmReply(404, { ok: false, message: "Ese agente ya no está." });
    },
    { agencyOnly: true },
  );
}
