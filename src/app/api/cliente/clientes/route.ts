import { listCalendarHomes } from "@/lib/calendar";
import { createClient, deleteClient, listAgents, listClients, markContacted, moveClient, updateClient, type CrmScope } from "@/lib/crm";
import { isClientStage, isLostReason, readClientInput } from "@/lib/crm-input";
import { agencyRequest, crmReply, validRowId } from "@/lib/crm-route";

// Mi cuenta > Clientes of an agency: the people interested in renting and the stage each one is in.
// An agent with their own user gets only the clients assigned to them.
export async function GET(request: Request) {
  return agencyRequest(request, async (scope) => {
    const [clients, agents] = await Promise.all([listClients(scope), listAgents(scope.accountId)]);
    return crmReply(200, { ok: true, clients, agents: scope.agentId ? agents.filter((agent) => agent.id === scope.agentId) : agents });
  });
}

async function readClient(scope: CrmScope, body: Record<string, unknown>) {
  const result = readClientInput(body);
  if (!result.ok) return result;
  const { propertySlug, agentId } = result.client;
  if (propertySlug && !(await listCalendarHomes(scope.accountId)).some((home) => home.slug === propertySlug)) {
    return { ok: false as const, field: "propiedad", message: "Esa vivienda no está en tu cuenta." };
  }
  if (!scope.agentId && agentId && !(await listAgents(scope.accountId)).some((agent) => agent.id === agentId)) {
    return { ok: false as const, field: "agente", message: "Esa persona no está en tu equipo." };
  }
  return result;
}

export async function POST(request: Request) {
  return agencyRequest(request, async (scope, body) => {
    const result = await readClient(scope, body);
    if (!result.ok) return crmReply(400, { ok: false, field: result.field, message: result.message });
    return crmReply(200, { ok: true, client: await createClient(scope, result.client) });
  });
}

// { id, accion: "editar" | "etapa" | "contacto", ... }
export async function PATCH(request: Request) {
  return agencyRequest(request, async (scope, body) => {
    if (!validRowId(body.id)) return crmReply(400, { ok: false, message: "Falta el cliente." });
    let client = null;
    if (body.accion === "etapa") {
      if (!isClientStage(body.etapa)) return crmReply(400, { ok: false, message: "Esa etapa no existe." });
      client = await moveClient(scope, body.id, body.etapa, isLostReason(body.motivo) ? body.motivo : null);
    } else if (body.accion === "contacto") {
      client = await markContacted(scope, body.id);
    } else {
      const result = await readClient(scope, body);
      if (!result.ok) return crmReply(400, { ok: false, field: result.field, message: result.message });
      client = await updateClient(scope, body.id, result.client);
    }
    return client ? crmReply(200, { ok: true, client }) : crmReply(404, { ok: false, message: "Ese cliente ya no está." });
  });
}

export async function DELETE(request: Request) {
  return agencyRequest(
    request,
    async (scope) => {
      const id = new URL(request.url).searchParams.get("id");
      if (!validRowId(id)) return crmReply(400, { ok: false, message: "Falta el cliente." });
      return (await deleteClient(scope.accountId, id)) ? crmReply(200, { ok: true }) : crmReply(404, { ok: false, message: "Ese cliente ya no está." });
    },
    { agencyOnly: true },
  );
}
