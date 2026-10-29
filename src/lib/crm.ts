import "server-only";
import { randomUUID } from "node:crypto";
import {
  crmLimits,
  isClientStage,
  isLostReason,
  type AgencyAgent,
  type AgencyClient,
  type AgencyClientInput,
  type ClientSource,
  type ClientStage,
  type LostReason,
} from "@/lib/crm-input";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows } from "@/lib/mysql";
import { isMissingTable } from "@/lib/team";

// Until 016_agency_crm runs nobody is an agency, and Mi cuenta stays the owner panel.
export class CrmUnavailable extends Error {}

type ClientRow = {
  id: string;
  name: string;
  whatsapp: string | null;
  stage: string;
  source: string;
  budget_bob: number | null;
  wants: string | null;
  property_slug: string | null;
  agent_id: string | null;
  next_step: string | null;
  next_step_at: Date | string | null;
  last_contact_at: Date | string | null;
  lost_reason: string | null;
  note: string | null;
  stage_changed_at: Date | string;
  created_at: Date | string;
};

const iso = (value: Date | string) => (value instanceof Date ? value : new Date(`${String(value).replace(" ", "T")}Z`)).toISOString();
const sqlTime = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

async function guard<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (isMissingTable(error)) throw new CrmUnavailable();
    throw error;
  }
}

export type Agency = { name: string };

// The agency of an account, or null for a regular owner (and while 016 is missing).
export async function getAgency(accountId: string): Promise<Agency | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const row = await queryOne<{ name: string }>("select name from agencies where account_id = :accountId and active = 1", { accountId });
    return row ? { name: row.name } : null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

// Admin: turn an owner account into an agency, or back. Turning it off keeps its clients, so
// turning it on again brings them back.
export async function setAgency(accountId: string, name: string, active: boolean) {
  return guard(async () => {
    await executeQuery(
      "insert into agencies (account_id, name, active) values (:accountId, :name, :active) on duplicate key update name = values(name), active = values(active)",
      { accountId, name, active: active ? 1 : 0 },
    );
  });
}

// Admin list: which accounts are agencies right now.
export async function listAgencyAccounts() {
  if (!hasDatabaseConfig()) return null;
  try {
    const rows = (await queryRows<{ account_id: string; name: string; active: number }>("select account_id, name, active from agencies")) ?? [];
    return new Map(rows.map((row) => [row.account_id, { name: row.name, active: Boolean(row.active) }]));
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

export async function listAgents(accountId: string): Promise<AgencyAgent[]> {
  return guard(async () => {
    const rows =
      (await queryRows<{ id: string; name: string; whatsapp: string | null; color: string; active: number }>(
        "select id, name, whatsapp, color, active from agency_agents where account_id = :accountId order by active desc, created_at limit 100",
        { accountId },
      )) ?? [];
    return rows.map((row) => ({ id: row.id, name: row.name, whatsapp: row.whatsapp, color: row.color, active: Boolean(row.active) }));
  });
}

export async function createAgent(accountId: string, agent: { name: string; whatsapp: string | null; color: string }) {
  return guard(async () => {
    const count = await queryOne<{ total: number }>("select count(*) as total from agency_agents where account_id = :accountId", { accountId });
    if (Number(count?.total ?? 0) >= crmLimits.agents) return null;
    const id = randomUUID();
    await executeQuery(
      "insert into agency_agents (id, account_id, name, whatsapp, color) values (:id, :accountId, :name, :whatsapp, :color)",
      { id, accountId, ...agent },
    );
    return id;
  });
}

// An agent who leaves is turned off, not deleted, so their past clients keep the name.
export async function updateAgent(accountId: string, id: string, agent: { name: string; whatsapp: string | null; color: string; active: boolean }) {
  return guard(async () => {
    const result = await executeQuery(
      "update agency_agents set name = :name, whatsapp = :whatsapp, color = :color, active = :active where id = :id and account_id = :accountId",
      { id, accountId, name: agent.name, whatsapp: agent.whatsapp, color: agent.color, active: agent.active ? 1 : 0 },
    );
    return affected(result) > 0 || Boolean(await queryOne("select id from agency_agents where id = :id and account_id = :accountId", { id, accountId }));
  });
}

const affected = (result: unknown) => Number((result as { affectedRows?: number } | null)?.affectedRows ?? 0);

const clientColumns =
  "id, name, whatsapp, stage, source, budget_bob, wants, property_slug, agent_id, next_step, next_step_at, last_contact_at, lost_reason, note, stage_changed_at, created_at";

function mapClient(row: ClientRow): AgencyClient {
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp,
    stage: isClientStage(row.stage) ? row.stage : "nuevo",
    source: row.source as ClientSource,
    budgetBob: row.budget_bob === null ? null : Number(row.budget_bob),
    wants: row.wants,
    propertySlug: row.property_slug,
    agentId: row.agent_id,
    nextStep: row.next_step,
    nextStepAt: row.next_step_at ? iso(row.next_step_at) : null,
    lastContactAt: row.last_contact_at ? iso(row.last_contact_at) : null,
    lostReason: isLostReason(row.lost_reason) ? row.lost_reason : null,
    note: row.note,
    stageChangedAt: iso(row.stage_changed_at),
    createdAt: iso(row.created_at),
  };
}

export async function listClients(accountId: string): Promise<AgencyClient[]> {
  return guard(async () => {
    const rows =
      (await queryRows<ClientRow>(
        `select ${clientColumns} from agency_clients where account_id = :accountId order by updated_at desc limit ${crmLimits.clients}`,
        { accountId },
      )) ?? [];
    return rows.map(mapClient);
  });
}

async function getClient(accountId: string, id: string) {
  const row = await queryOne<ClientRow>(`select ${clientColumns} from agency_clients where id = :id and account_id = :accountId`, { id, accountId });
  return row ? mapClient(row) : null;
}

const clientParams = (client: AgencyClientInput) => ({
  name: client.name,
  whatsapp: client.whatsapp,
  stage: client.stage,
  source: client.source,
  budgetBob: client.budgetBob,
  wants: client.wants,
  propertySlug: client.propertySlug,
  agentId: client.agentId,
  nextStep: client.nextStep,
  nextStepAt: client.nextStepAt ? sqlTime(client.nextStepAt) : null,
  lostReason: client.lostReason,
  note: client.note,
});

export async function createClient(accountId: string, client: AgencyClientInput) {
  return guard(async () => {
    const id = randomUUID();
    const now = sqlTime(new Date());
    await executeQuery(
      `insert into agency_clients (id, account_id, name, whatsapp, stage, source, budget_bob, wants, property_slug, agent_id, next_step, next_step_at,
              last_contact_at, lost_reason, note, stage_changed_at)
       values (:id, :accountId, :name, :whatsapp, :stage, :source, :budgetBob, :wants, :propertySlug, :agentId, :nextStep, :nextStepAt,
              :lastContact, :lostReason, :note, :now)`,
      // Someone added past "Nuevo" was already spoken to.
      { id, accountId, now, lastContact: client.stage === "nuevo" ? null : now, ...clientParams(client) },
    );
    return getClient(accountId, id);
  });
}

export async function updateClient(accountId: string, id: string, client: AgencyClientInput) {
  return guard(async () => {
    const current = await getClient(accountId, id);
    if (!current) return null;
    const now = sqlTime(new Date());
    const moved = current.stage !== client.stage;
    await executeQuery(
      `update agency_clients set name = :name, whatsapp = :whatsapp, stage = :stage, source = :source, budget_bob = :budgetBob, wants = :wants,
              property_slug = :propertySlug, agent_id = :agentId, next_step = :nextStep, next_step_at = :nextStepAt, lost_reason = :lostReason,
              note = :note, stage_changed_at = ${moved ? ":now" : "stage_changed_at"},
              last_contact_at = ${moved && client.stage !== "nuevo" ? ":now" : "last_contact_at"}
        where id = :id and account_id = :accountId`,
      { id, accountId, now, ...clientParams(client) },
    );
    return getClient(accountId, id);
  });
}

// Dragging a card to another column. Moving forward means somebody talked to the client.
export async function moveClient(accountId: string, id: string, stage: ClientStage, lostReason: LostReason | null) {
  return guard(async () => {
    const current = await getClient(accountId, id);
    if (!current) return null;
    if (current.stage === stage && current.lostReason === lostReason) return current;
    const now = sqlTime(new Date());
    await executeQuery(
      `update agency_clients set stage = :stage, lost_reason = :lostReason, stage_changed_at = :now,
              last_contact_at = ${stage === "nuevo" ? "last_contact_at" : ":now"}
        where id = :id and account_id = :accountId`,
      { id, accountId, stage, lostReason: stage === "perdido" ? lostReason : null, now },
    );
    return getClient(accountId, id);
  });
}

// "Ya le escribí": the contact clock starts again; a passed next step is cleared.
export async function markContacted(accountId: string, id: string) {
  return guard(async () => {
    const current = await getClient(accountId, id);
    if (!current) return null;
    const now = new Date();
    const passed = current.nextStepAt && Date.parse(current.nextStepAt) < now.getTime();
    await executeQuery(
      `update agency_clients set last_contact_at = :now, stage = :stage, stage_changed_at = ${current.stage === "nuevo" ? ":now" : "stage_changed_at"}
              ${passed ? ", next_step = null, next_step_at = null" : ""}
        where id = :id and account_id = :accountId`,
      { id, accountId, now: sqlTime(now), stage: current.stage === "nuevo" ? "contactado" : current.stage },
    );
    return getClient(accountId, id);
  });
}

export async function deleteClient(accountId: string, id: string) {
  return guard(async () => {
    const result = await executeQuery("delete from agency_clients where id = :id and account_id = :accountId", { id, accountId });
    return affected(result) > 0;
  });
}

// Next steps with a date, for the agency's calendar.
export async function listClientSteps(accountId: string, start: Date, end: Date) {
  try {
    const rows =
      (await queryRows<ClientRow>(
        `select ${clientColumns} from agency_clients
          where account_id = :accountId and next_step_at >= :start and next_step_at < :end and stage in ('nuevo','contactado','visita','negocia')
          order by next_step_at limit 500`,
        { accountId, start: sqlTime(start), end: sqlTime(end) },
      )) ?? [];
    return rows.map(mapClient);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
