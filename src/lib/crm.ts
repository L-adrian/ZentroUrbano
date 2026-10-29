import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
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
import { executeQuery, hasDatabaseConfig, queryOne, queryRows, withTransaction } from "@/lib/mysql";
import { isMissingTable } from "@/lib/team";

// Until 016_agency_crm runs nobody is an agency, and Mi cuenta stays the owner panel.
export class CrmUnavailable extends Error {}

// Who is asking: the agency itself, or one of its agents (who only sees their own clients).
export type CrmScope = { accountId: string; agentId: string | null };

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
  first_contact_at?: Date | string | null;
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

// 017_agency_tools adds first_contact_at and agent logins. Until it runs, the CRM keeps working
// without response times and without agent users.
let toolsChecked: { ready: boolean; at: number } | null = null;
export async function agencyToolsReady() {
  if (!hasDatabaseConfig()) return false;
  if (toolsChecked && (toolsChecked.ready || Date.now() - toolsChecked.at < 60_000)) return toolsChecked.ready;
  const row = await queryOne<{ total: number }>(
    `select count(*) as total from information_schema.columns
      where table_schema = database() and ((table_name = 'agency_clients' and column_name = 'first_contact_at') or (table_name = 'agency_agents' and column_name = 'login_account_id'))`,
  ).catch(() => null);
  toolsChecked = { ready: Number(row?.total ?? 0) === 2, at: Date.now() };
  return toolsChecked.ready;
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

// An agent's own user: which agency and which agent it is. Null when the agent was turned off.
export async function getAgentLogin(loginAccountId: string) {
  if (!(await agencyToolsReady())) return null;
  const row = await queryOne<{ id: string; name: string; color: string; account_id: string; agency_name: string }>(
    `select g.id, g.name, g.color, g.account_id, a.name as agency_name from agency_agents g join agencies a on a.account_id = g.account_id
      where g.login_account_id = :loginAccountId and g.active = 1 and a.active = 1`,
    { loginAccountId },
  ).catch((error) => {
    if (isMissingTable(error)) return null;
    throw error;
  });
  return row ? { agentId: row.id, agentName: row.name, color: row.color, agencyAccountId: row.account_id, agencyName: row.agency_name } : null;
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
    const tools = await agencyToolsReady();
    const rows =
      (await queryRows<{ id: string; name: string; whatsapp: string | null; color: string; active: number; username?: string | null }>(
        tools
          ? `select g.id, g.name, g.whatsapp, g.color, g.active, u.username from agency_agents g
               left join morada_users u on u.account_id = g.login_account_id
              where g.account_id = :accountId order by g.active desc, g.created_at limit 100`
          : "select id, name, whatsapp, color, active from agency_agents where account_id = :accountId order by active desc, created_at limit 100",
        { accountId },
      )) ?? [];
    return rows.map((row) => ({ id: row.id, name: row.name, whatsapp: row.whatsapp, color: row.color, active: Boolean(row.active), username: row.username ?? null }));
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

// An agent who leaves is turned off, not deleted, so their past clients keep the name. Their
// user stops working at the same time.
export async function updateAgent(accountId: string, id: string, agent: { name: string; whatsapp: string | null; color: string; active: boolean }) {
  return guard(async () => {
    const own = await queryOne<{ id: string }>("select id from agency_agents where id = :id and account_id = :accountId", { id, accountId });
    if (!own) return false;
    await executeQuery(
      "update agency_agents set name = :name, whatsapp = :whatsapp, color = :color, active = :active where id = :id and account_id = :accountId",
      { id, accountId, name: agent.name, whatsapp: agent.whatsapp, color: agent.color, active: agent.active ? 1 : 0 },
    );
    if (!agent.active && (await agencyToolsReady())) {
      await executeQuery(
        "delete s from morada_sessions s join agency_agents g on g.login_account_id = s.account_id where g.id = :id",
        { id },
      ).catch(() => null);
    }
    return true;
  });
}

export type AgentLoginResult = { ok: true; username: string } | { ok: false; field: string; message: string };

// The agency gives an agent a user and a password, or a new password. The agent signs in at
// /login with the user (no email needed) and only sees the clients assigned to them.
export async function setAgentLogin(accountId: string, agentId: string, username: string, password: string): Promise<AgentLoginResult> {
  if (!(await agencyToolsReady())) throw new CrmUnavailable();
  const agent = await queryOne<{ id: string; name: string; login_account_id: string | null; agency_name: string }>(
    "select g.id, g.name, g.login_account_id, a.name as agency_name from agency_agents g join agencies a on a.account_id = g.account_id where g.id = :agentId and g.account_id = :accountId",
    { agentId, accountId },
  );
  if (!agent) return { ok: false, field: "agente", message: "Ese agente ya no está." };
  const hash = await bcrypt.hash(password, 12);
  try {
    return await withTransaction(async (connection) => {
      if (agent.login_account_id) {
        await connection.execute("UPDATE morada_users SET username = ?, password_hash = ?, status = 'active' WHERE account_id = ?", [username, hash, agent.login_account_id]);
        // A new password closes the sessions opened with the old one.
        await connection.execute("DELETE FROM morada_sessions WHERE account_id = ?", [agent.login_account_id]);
        await connection.execute("UPDATE client_accounts SET display_name = ?, role_label = ? WHERE id = ?", [agent.name, `Agente · ${agent.agency_name}`.slice(0, 120), agent.login_account_id]);
        return { ok: true as const, username };
      }
      const loginAccountId = `acct_${randomBytes(18).toString("hex")}`;
      const initials = agent.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
      // client_accounts needs an email; agents sign in with their user, so this one is never used.
      await connection.execute(
        "INSERT INTO client_accounts (id, kind, display_name, email, avatar_initials, role_label, location) VALUES (?, 'agente', ?, ?, ?, ?, 'Bolivia')",
        [loginAccountId, agent.name, `${username}@agentes.zentrourbano.com`, initials, `Agente · ${agent.agency_name}`.slice(0, 120)],
      );
      await connection.execute("INSERT INTO morada_users (id, account_id, email, username, password_hash) VALUES (?, ?, NULL, ?, ?)", [
        `user_${randomBytes(18).toString("hex")}`,
        loginAccountId,
        username,
        hash,
      ]);
      await connection.execute("UPDATE agency_agents SET login_account_id = ? WHERE id = ?", [loginAccountId, agentId]);
      return { ok: true as const, username };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return { ok: false, field: "usuario", message: "Ese usuario ya existe. Prueba con otro." };
    throw error;
  }
}

const affected = (result: unknown) => Number((result as { affectedRows?: number } | null)?.affectedRows ?? 0);

const baseColumns =
  "id, name, whatsapp, stage, source, budget_bob, wants, property_slug, agent_id, next_step, next_step_at, last_contact_at, lost_reason, note, stage_changed_at, created_at";
const columns = async () => (await agencyToolsReady() ? `${baseColumns}, first_contact_at` : baseColumns);
// The time of a contact: the first one is kept for the response time.
const contactSet = async (value: string) => (await agencyToolsReady() ? `last_contact_at = ${value}, first_contact_at = coalesce(first_contact_at, ${value})` : `last_contact_at = ${value}`);

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
    firstContactAt: row.first_contact_at ? iso(row.first_contact_at) : null,
    lostReason: isLostReason(row.lost_reason) ? row.lost_reason : null,
    note: row.note,
    stageChangedAt: iso(row.stage_changed_at),
    createdAt: iso(row.created_at),
  };
}

const agentFilter = (scope: CrmScope) => (scope.agentId ? " and agent_id = :agentId" : "");

export async function listClients(scope: CrmScope): Promise<AgencyClient[]> {
  return guard(async () => {
    const rows =
      (await queryRows<ClientRow>(
        `select ${await columns()} from agency_clients where account_id = :accountId${agentFilter(scope)} order by updated_at desc limit ${crmLimits.clients}`,
        { accountId: scope.accountId, agentId: scope.agentId },
      )) ?? [];
    return rows.map(mapClient);
  });
}

async function getClient(scope: CrmScope, id: string) {
  const row = await queryOne<ClientRow>(`select ${await columns()} from agency_clients where id = :id and account_id = :accountId${agentFilter(scope)}`, {
    id,
    accountId: scope.accountId,
    agentId: scope.agentId,
  });
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

// An agent always keeps the client: what they add or edit stays assigned to them.
const scoped = (scope: CrmScope, client: AgencyClientInput) => (scope.agentId ? { ...client, agentId: scope.agentId } : client);

export async function createClient(scope: CrmScope, input: AgencyClientInput) {
  return guard(async () => {
    const client = scoped(scope, input);
    const id = randomUUID();
    const now = sqlTime(new Date());
    // Someone added past "Nuevo" was already spoken to.
    const contacted = client.stage !== "nuevo";
    const tools = await agencyToolsReady();
    await executeQuery(
      `insert into agency_clients (id, account_id, name, whatsapp, stage, source, budget_bob, wants, property_slug, agent_id, next_step, next_step_at,
              last_contact_at, ${tools ? "first_contact_at, " : ""}lost_reason, note, stage_changed_at)
       values (:id, :accountId, :name, :whatsapp, :stage, :source, :budgetBob, :wants, :propertySlug, :agentId, :nextStep, :nextStepAt,
              :lastContact, ${tools ? ":lastContact, " : ""}:lostReason, :note, :now)`,
      { id, accountId: scope.accountId, now, lastContact: contacted ? now : null, ...clientParams(client) },
    );
    return getClient(scope, id);
  });
}

export async function updateClient(scope: CrmScope, id: string, input: AgencyClientInput) {
  return guard(async () => {
    const current = await getClient(scope, id);
    if (!current) return null;
    const client = scoped(scope, input);
    const now = sqlTime(new Date());
    const moved = current.stage !== client.stage;
    await executeQuery(
      `update agency_clients set name = :name, whatsapp = :whatsapp, stage = :stage, source = :source, budget_bob = :budgetBob, wants = :wants,
              property_slug = :propertySlug, agent_id = :agentId, next_step = :nextStep, next_step_at = :nextStepAt, lost_reason = :lostReason,
              note = :note, stage_changed_at = ${moved ? ":now" : "stage_changed_at"}
              ${moved && client.stage !== "nuevo" ? `, ${await contactSet(":now")}` : ""}
        where id = :id and account_id = :accountId`,
      { id, accountId: scope.accountId, now, ...clientParams(client) },
    );
    return getClient(scope, id);
  });
}

// Dragging a card to another column. Moving forward means somebody talked to the client.
export async function moveClient(scope: CrmScope, id: string, stage: ClientStage, lostReason: LostReason | null) {
  return guard(async () => {
    const current = await getClient(scope, id);
    if (!current) return null;
    if (current.stage === stage && current.lostReason === lostReason) return current;
    const now = sqlTime(new Date());
    await executeQuery(
      `update agency_clients set stage = :stage, lost_reason = :lostReason, stage_changed_at = :now
              ${stage === "nuevo" ? "" : `, ${await contactSet(":now")}`}
        where id = :id and account_id = :accountId`,
      { id, accountId: scope.accountId, stage, lostReason: stage === "perdido" ? lostReason : null, now },
    );
    return getClient(scope, id);
  });
}

// "Ya le escribí": the contact clock starts again; a passed next step is cleared.
export async function markContacted(scope: CrmScope, id: string) {
  return guard(async () => {
    const current = await getClient(scope, id);
    if (!current) return null;
    const now = new Date();
    const passed = current.nextStepAt && Date.parse(current.nextStepAt) < now.getTime();
    await executeQuery(
      `update agency_clients set ${await contactSet(":now")}, stage = :stage, stage_changed_at = ${current.stage === "nuevo" ? ":now" : "stage_changed_at"}
              ${passed ? ", next_step = null, next_step_at = null" : ""}
        where id = :id and account_id = :accountId`,
      { id, accountId: scope.accountId, now: sqlTime(now), stage: current.stage === "nuevo" ? "contactado" : current.stage },
    );
    return getClient(scope, id);
  });
}

// Only the agency deletes clients; an agent can mark one as lost.
export async function deleteClient(accountId: string, id: string) {
  return guard(async () => {
    const result = await executeQuery("delete from agency_clients where id = :id and account_id = :accountId", { id, accountId });
    return affected(result) > 0;
  });
}

// Next steps with a date, for the calendar of the agency (or of one agent).
export async function listClientSteps(accountId: string, start: Date, end: Date, agentId: string | null = null) {
  try {
    const rows =
      (await queryRows<ClientRow>(
        `select ${baseColumns} from agency_clients
          where account_id = :accountId${agentId ? " and agent_id = :agentId" : ""} and next_step_at >= :start and next_step_at < :end
            and stage in ('nuevo','contactado','visita','negocia')
          order by next_step_at limit 500`,
        { accountId, agentId, start: sqlTime(start), end: sqlTime(end) },
      )) ?? [];
    return rows.map(mapClient);
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
