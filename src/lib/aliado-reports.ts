import "server-only";
import { randomUUID } from "node:crypto";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows } from "@/lib/mysql";
import { reportChannels, type AliadoReport, type ReportChannel, type ReportInput } from "@/lib/aliado-report-input";

// The aliado daily log and personal panel live in 012_aliado_reports. Until it runs, the panel
// keeps its default order and says the log is not active yet; callers check isMissingTable.

type ReportRow = {
  id: string;
  member_id: string;
  report_date: string;
  channel: string;
  place: string;
  url: string | null;
  people: number;
  owners: number;
  note: string | null;
};

const reportColumns = "id, member_id, date_format(report_date, '%Y-%m-%d') as report_date, channel, place, url, people, owners, note";

function toReport(row: ReportRow): AliadoReport {
  return {
    id: row.id,
    date: row.report_date,
    channel: (reportChannels.find((channel) => channel.key === row.channel)?.key ?? "otro") as ReportChannel,
    place: row.place,
    url: row.url,
    people: Number(row.people),
    owners: Number(row.owners),
    note: row.note,
  };
}

// One aliado's reports between two days (inclusive), newest first.
export async function listMemberReports(memberId: string, from: string, to: string): Promise<AliadoReport[]> {
  const rows = await queryRows<ReportRow>(
    `select ${reportColumns} from aliado_reports where member_id = :memberId and report_date between :from and :to order by report_date desc, created_at`,
    { memberId, from, to },
  );
  return (rows ?? []).map(toReport);
}

// Everyone's reports between two days, for the admin calendar.
export async function listAllReports(from: string, to: string): Promise<(AliadoReport & { memberId: string })[] | null> {
  if (!hasDatabaseConfig()) return null;
  const rows = await queryRows<ReportRow>(
    `select ${reportColumns} from aliado_reports where report_date between :from and :to order by report_date, created_at`,
    { from, to },
  );
  return (rows ?? []).map((row) => ({ ...toReport(row), memberId: row.member_id }));
}

// The first day anyone logged: before it, a day without reports is not "missing".
export async function firstReportDate() {
  const row = await queryOne<{ first: string | null }>("select date_format(min(report_date), '%Y-%m-%d') as first from aliado_reports");
  return row?.first ?? null;
}

const affected = (result: unknown) => Number((result as { affectedRows?: number } | null)?.affectedRows ?? 0);

export async function createReport(memberId: string, input: ReportInput) {
  const id = randomUUID();
  await executeQuery(
    `insert into aliado_reports (id, member_id, report_date, channel, place, url, people, owners, note)
     values (:id, :memberId, :date, :channel, :place, :url, :people, :owners, :note)`,
    { id, memberId, ...input },
  );
  return id;
}

// Only the aliado who wrote a report can change or delete it.
export async function updateReport(memberId: string, id: string, input: ReportInput) {
  const result = await executeQuery(
    `update aliado_reports set report_date = :date, channel = :channel, place = :place, url = :url, people = :people, owners = :owners, note = :note
     where id = :id and member_id = :memberId`,
    { id, memberId, ...input },
  );
  return affected(result) > 0;
}

export async function deleteReport(memberId: string, id: string) {
  const result = await executeQuery("delete from aliado_reports where id = :id and member_id = :memberId", { id, memberId });
  return affected(result) > 0;
}

export type PanelTodo = { id: string; text: string; done: boolean };
export type PanelLayout = { main: string[]; side: string[] };
export type AliadoPanelState = { layout: PanelLayout | null; todos: PanelTodo[] };

export const panelLimits = { todos: 30, todoText: 140 } as const;

function parseLayout(value: string | null): PanelLayout | null {
  if (!value) return null;
  const [main = "", side = ""] = value.split("|");
  const keys = (text: string) => text.split(",").filter((key) => /^[a-z]{2,20}$/.test(key));
  return { main: keys(main), side: keys(side) };
}

export function readLayout(value: unknown): PanelLayout | null {
  if (!value || typeof value !== "object") return null;
  const { main, side } = value as Record<string, unknown>;
  const keys = (list: unknown) => (Array.isArray(list) ? list.filter((key): key is string => typeof key === "string" && /^[a-z]{2,20}$/.test(key)).slice(0, 20) : null);
  const mainKeys = keys(main);
  const sideKeys = keys(side);
  return mainKeys && sideKeys ? { main: mainKeys, side: sideKeys } : null;
}

export function readTodos(value: unknown): PanelTodo[] | null {
  if (!Array.isArray(value)) return null;
  return value.slice(0, panelLimits.todos).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { id, text, done } = item as Record<string, unknown>;
    const clean = typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, panelLimits.todoText) : "";
    if (!clean || typeof id !== "string" || !/^[\w-]{1,40}$/.test(id)) return [];
    return [{ id, text: clean, done: done === true }];
  });
}

export async function getPanelState(memberId: string): Promise<AliadoPanelState> {
  const row = await queryOne<{ card_order: string | null; todos: string | null }>(
    "select card_order, todos from aliado_panels where member_id = :memberId",
    { memberId },
  );
  let todos: PanelTodo[] = [];
  try {
    todos = readTodos(row?.todos ? JSON.parse(row.todos) : []) ?? [];
  } catch {
    todos = [];
  }
  return { layout: parseLayout(row?.card_order ?? null), todos };
}

export async function savePanelLayout(memberId: string, layout: PanelLayout) {
  await executeQuery(
    `insert into aliado_panels (member_id, card_order) values (:memberId, :order)
     on duplicate key update card_order = values(card_order)`,
    { memberId, order: `${layout.main.join(",")}|${layout.side.join(",")}` },
  );
}

export async function savePanelTodos(memberId: string, todos: PanelTodo[]) {
  await executeQuery(
    `insert into aliado_panels (member_id, todos) values (:memberId, :todos)
     on duplicate key update todos = values(todos)`,
    { memberId, todos: JSON.stringify(todos) },
  );
}

// Team members who can sign in and log (they have an aliado account); null while
// 011_team_accounts is missing.
export async function reportingMemberIds(): Promise<Set<string> | null> {
  try {
    const rows = await queryRows<{ id: string }>("select id from team_members where account_id is not null and status = 'active'");
    return new Set((rows ?? []).map((row) => row.id));
  } catch {
    return null;
  }
}
