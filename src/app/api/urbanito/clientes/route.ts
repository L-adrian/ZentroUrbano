import { hasDatabaseConfig } from "@/lib/mysql";
import { CrmUnavailable, createClient, getAgency, getAgentLogin, listClients, markContacted, moveClient, updateClient, type CrmScope } from "@/lib/crm";
import { clientAlert, isClientStage, isLostReason, readClientInput, type AgencyClient } from "@/lib/crm-input";
import { boliviaParts } from "@/lib/calendar-input";
import { getUrbanitoOwner } from "@/lib/urbanito";
import { clientFormFields, clientNameMatches, readTelegramId, toUrbanitoClient, urbanitoResultLimit } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

export const runtime = "nodejs";

// Clientes of an agent (or agency) linked to Urbanito. GET finds clients by name, or with hoy=1 the
// ones to contact today (late, unanswered, or with a next step today). POST creates one or changes
// the one with that id; with "accion" it moves it to another stage or marks it as contacted.
// Urbanito always shows the change and asks before sending it.
type Who = { scope: CrmScope } | { error: Response };

async function crmScope(telegramIdValue: unknown): Promise<Who> {
  const telegramId = readTelegramId(telegramIdValue);
  if (!telegramId) return { error: reply(400, { message: "Falta el usuario de Telegram." }) };
  const account = await getUrbanitoOwner(telegramId);
  if (!account) return { error: reply(404, { message: "Esta cuenta de Telegram no está conectada a Zentro Urbano." }) };
  if (account.status !== "active") return { error: reply(403, { code: "NOT_AGENCY", message: "La cuenta de Zentro Urbano no está activa." }) };
  // An agent's own user only sees and keeps the clients assigned to them.
  const agent = await getAgentLogin(account.id);
  if (agent) return { scope: { accountId: agent.agencyAccountId, agentId: agent.agentId } };
  if (!(await getAgency(account.id))) {
    return { error: reply(403, { code: "NOT_AGENCY", message: "Clientes es para cuentas de agente inmobiliario. Pídele al equipo de Zentro que active tu cuenta." }) };
  }
  return { scope: { accountId: account.id, agentId: null } };
}

const unavailable = () => reply(503, { message: "Clientes todavía no está disponible en Zentro Urbano." });

export async function GET(request: Request) {
  return forUrbanito(request, async () => {
    if (!hasDatabaseConfig()) return reply(503, { message: "La base de datos no está configurada." });
    const params = new URL(request.url).searchParams;
    const who = await crmScope(params.get("telegram_id"));
    if ("error" in who) return who.error;
    try {
      if (params.get("hoy") === "1") {
        const now = Date.now();
        const today = boliviaParts(new Date(now)).day;
        const due = (await listClients(who.scope))
          .map((client) => ({ client, alert: clientAlert(client, now) }))
          .filter(({ client, alert }) => alert || (client.nextStepAt && boliviaParts(client.nextStepAt).day === today))
          .sort((a, b) => (b.alert?.days ?? -1) - (a.alert?.days ?? -1));
        return reply(200, {
          pendientes: due.slice(0, 15).map(({ client, alert }) => ({ ...toUrbanitoClient(client), aviso: alert?.label ?? "Próximo paso hoy" })),
          total: due.length,
        });
      }
      const query = (params.get("q") ?? "").slice(0, 120);
      const clients = (await listClients(who.scope)).filter((client) => !query || clientNameMatches(client.name, query));
      return reply(200, { clientes: clients.slice(0, urbanitoResultLimit).map(toUrbanitoClient), total: clients.length });
    } catch (error) {
      if (error instanceof CrmUnavailable) return unavailable();
      throw error;
    }
  });
}

export async function POST(request: Request) {
  return forUrbanito(request, async () => {
    if (!hasDatabaseConfig()) return reply(503, { message: "La base de datos no está configurada." });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return reply(400, { message: "Solicitud inválida." });
    const who = await crmScope(body.telegram_id);
    if ("error" in who) return who.error;
    if (body.accion !== undefined) {
      const id = typeof body.id === "string" ? body.id : "";
      try {
        if (body.accion === "contactado") {
          const saved = await markContacted(who.scope, id);
          return saved ? reply(200, { ok: true, cliente: toUrbanitoClient(saved) }) : reply(404, { message: "No encontré ese cliente en tu cuenta." });
        }
        if (body.accion === "etapa" && isClientStage(body.etapa)) {
          const reason = body.etapa === "perdido" ? (isLostReason(body.motivo) ? body.motivo : "otro") : null;
          const saved = await moveClient(who.scope, id, body.etapa, reason);
          return saved ? reply(200, { ok: true, cliente: toUrbanitoClient(saved) }) : reply(404, { message: "No encontré ese cliente en tu cuenta." });
        }
        return reply(400, { message: "Acción no válida." });
      } catch (error) {
        if (error instanceof CrmUnavailable) return unavailable();
        throw error;
      }
    }
    const changes = body.cambios && typeof body.cambios === "object" ? (body.cambios as Record<string, unknown>) : {};
    try {
      let current: AgencyClient | null = null;
      if (body.id !== undefined) {
        current = typeof body.id === "string" ? ((await listClients(who.scope)).find((client) => client.id === body.id) ?? null) : null;
        if (!current) return reply(404, { message: "No encontré ese cliente en tu cuenta." });
      }
      // A change keeps what Urbanito did not mention; the home and the agent never come from Telegram.
      const input = readClientInput({ ...(current ? clientFormFields(current) : {}), ...changes, propiedad: current?.propertySlug, agente: current?.agentId });
      if (!input.ok) return reply(400, { code: "VALIDATION_ERROR", field: input.field, message: input.message });
      const saved = current ? await updateClient(who.scope, current.id, input.client) : await createClient(who.scope, input.client);
      if (!saved) return reply(404, { message: "No encontré ese cliente en tu cuenta." });
      return reply(current ? 200 : 201, { ok: true, creado: !current, cliente: toUrbanitoClient(saved) });
    } catch (error) {
      if (error instanceof CrmUnavailable) return unavailable();
      throw error;
    }
  });
}
