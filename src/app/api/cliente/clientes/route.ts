import { listCalendarHomes } from "@/lib/calendar";
import { createClient, deleteClient, listAgents, listClients, markContacted, moveClient, updateClient } from "@/lib/crm";
import { isClientStage, isLostReason, readClientInput } from "@/lib/crm-input";
import { agencyRequest, crmReply, validRowId } from "@/lib/crm-route";

// Mi cuenta > Clientes of an agency: the people interested in renting and the stage each one is in.
export async function GET(request: Request) {
  return agencyRequest(request, async (accountId) => {
    const [clients, agents] = await Promise.all([listClients(accountId), listAgents(accountId)]);
    return crmReply(200, { ok: true, clients, agents });
  });
}

async function readClient(accountId: string, body: Record<string, unknown>) {
  const result = readClientInput(body);
  if (!result.ok) return result;
  const { propertySlug, agentId } = result.client;
  if (propertySlug && !(await listCalendarHomes(accountId)).some((home) => home.slug === propertySlug)) {
    return { ok: false as const, field: "propiedad", message: "Esa vivienda no es de tu cuenta." };
  }
  if (agentId && !(await listAgents(accountId)).some((agent) => agent.id === agentId)) {
    return { ok: false as const, field: "agente", message: "Ese agente no es de tu inmobiliaria." };
  }
  return result;
}

export async function POST(request: Request) {
  return agencyRequest(request, async (accountId, body) => {
    const result = await readClient(accountId, body);
    if (!result.ok) return crmReply(400, { ok: false, field: result.field, message: result.message });
    return crmReply(200, { ok: true, client: await createClient(accountId, result.client) });
  });
}

// { id, accion: "editar" | "etapa" | "contacto", ... }
export async function PATCH(request: Request) {
  return agencyRequest(request, async (accountId, body) => {
    if (!validRowId(body.id)) return crmReply(400, { ok: false, message: "Falta el cliente." });
    let client = null;
    if (body.accion === "etapa") {
      if (!isClientStage(body.etapa)) return crmReply(400, { ok: false, message: "Esa etapa no existe." });
      client = await moveClient(accountId, body.id, body.etapa, isLostReason(body.motivo) ? body.motivo : null);
    } else if (body.accion === "contacto") {
      client = await markContacted(accountId, body.id);
    } else {
      const result = await readClient(accountId, body);
      if (!result.ok) return crmReply(400, { ok: false, field: result.field, message: result.message });
      client = await updateClient(accountId, body.id, result.client);
    }
    return client ? crmReply(200, { ok: true, client }) : crmReply(404, { ok: false, message: "Ese cliente ya no está." });
  });
}

export async function DELETE(request: Request) {
  return agencyRequest(request, async (accountId) => {
    const id = new URL(request.url).searchParams.get("id");
    if (!validRowId(id)) return crmReply(400, { ok: false, message: "Falta el cliente." });
    return (await deleteClient(accountId, id)) ? crmReply(200, { ok: true }) : crmReply(404, { ok: false, message: "Ese cliente ya no está." });
  });
}
