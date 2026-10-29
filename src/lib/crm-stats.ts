import { addDays, boliviaParts } from "@/lib/calendar-input";
import {
  clientSources,
  lostReasons,
  openClientStages,
  type AgencyAgent,
  type AgencyClient,
  type ClientSource,
  type ClientStage,
  type LostReason,
} from "@/lib/crm-input";

// Numbers of the agency Panel. Pure, so the page, the PDF report and the tests share them.

export const panelPeriods = ["30", "90", "365", "todo"] as const;
export type PanelPeriod = (typeof panelPeriods)[number];
export const panelPeriodLabels: Record<PanelPeriod, string> = { "30": "30 días", "90": "3 meses", "365": "12 meses", todo: "Todo" };

const day = 86_400_000;
export const periodStart = (period: PanelPeriod, now: number) => (period === "todo" ? 0 : now - Number(period) * day);

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// Hours from arrival to the first answer, for clients who were answered.
const responseHours = (client: AgencyClient) =>
  client.firstContactAt ? Math.max(0, (Date.parse(client.firstContactAt) - Date.parse(client.createdAt)) / 3_600_000) : null;

// Answered within a day. A client still waiting after a day counts as late; one who arrived less
// than a day ago and is still waiting is not counted yet.
function onTime(client: AgencyClient, now: number): boolean | null {
  const hours = responseHours(client);
  if (hours !== null) return hours <= 24;
  if (!client.lastContactAt && now - Date.parse(client.createdAt) > day) return false;
  return null;
}

const share = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);

export type AgentRow = {
  agentId: string | null;
  name: string;
  color: string | null;
  arrived: number;
  open: number;
  won: number;
  lost: number;
  winRate: number | null;
  responseHours: number | null;
  onTimeRate: number | null;
};

export type PanelStats = {
  arrived: number;
  won: number;
  lost: number;
  winRate: number | null;
  open: number;
  openBudget: number;
  wonBudget: number;
  responseHours: number | null;
  onTimeRate: number | null;
  byStage: Array<{ stage: ClientStage; count: number }>;
  bySource: Array<{ source: ClientSource; count: number; won: number; winRate: number | null }>;
  lostBy: Array<{ reason: LostReason | "sin-motivo"; count: number }>;
  weeks: Array<{ start: string; count: number }>;
  agents: AgentRow[];
};

export function panelStats(clients: AgencyClient[], agents: AgencyAgent[], period: PanelPeriod, now: number): PanelStats {
  const from = periodStart(period, now);
  const arrivedList = clients.filter((client) => Date.parse(client.createdAt) >= from);
  // Rented or lost inside the period: the stage changed then.
  const ended = (stage: ClientStage) => clients.filter((client) => client.stage === stage && Date.parse(client.stageChangedAt) >= from);
  const wonList = ended("alquilado");
  const lostList = ended("perdido");
  const openList = clients.filter((client) => openClientStages.includes(client.stage));
  const timing = arrivedList.map((client) => onTime(client, now)).filter((value): value is boolean => value !== null);

  // Eight weeks, Monday to Sunday in Bolivia, the current one last.
  const today = boliviaParts(new Date(now)).day;
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const thisMonday = addDays(today, -weekday);
  const weeks = Array.from({ length: 8 }, (_, index) => ({ start: addDays(thisMonday, (index - 7) * 7), count: 0 }));
  for (const client of clients) {
    const arrived = boliviaParts(client.createdAt).day;
    const week = weeks.findLast((entry) => entry.start <= arrived);
    if (week && arrived < addDays(thisMonday, 7)) week.count += 1;
  }

  const agentRow = (agentId: string | null, name: string, color: string | null): AgentRow => {
    const mine = (list: AgencyClient[]) => list.filter((client) => client.agentId === agentId);
    const won = mine(wonList).length;
    const lost = mine(lostList).length;
    const arrived = mine(arrivedList);
    const agentTiming = arrived.map((client) => onTime(client, now)).filter((value): value is boolean => value !== null);
    return {
      agentId,
      name,
      color,
      arrived: arrived.length,
      open: mine(openList).length,
      won,
      lost,
      winRate: share(won, won + lost),
      responseHours: median(arrived.map(responseHours).filter((value): value is number => value !== null)),
      onTimeRate: share(agentTiming.filter(Boolean).length, agentTiming.length),
    };
  };
  const agentRows = agents.map((agent) => agentRow(agent.id, agent.name, agent.color)).filter((row) => row.arrived || row.open || row.won || row.lost || agents.find((agent) => agent.id === row.agentId)?.active);
  const unassigned = agentRow(null, "Sin agente", null);
  if (unassigned.arrived || unassigned.open || unassigned.won || unassigned.lost) agentRows.push(unassigned);

  const lostBy = [...lostReasons, "sin-motivo" as const]
    .map((reason) => ({ reason, count: lostList.filter((client) => (client.lostReason ?? "sin-motivo") === reason).length }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    arrived: arrivedList.length,
    won: wonList.length,
    lost: lostList.length,
    winRate: share(wonList.length, wonList.length + lostList.length),
    open: openList.length,
    openBudget: openList.reduce((sum, client) => sum + (client.budgetBob ?? 0), 0),
    wonBudget: wonList.reduce((sum, client) => sum + (client.budgetBob ?? 0), 0),
    responseHours: median(arrivedList.map(responseHours).filter((value): value is number => value !== null)),
    onTimeRate: share(timing.filter(Boolean).length, timing.length),
    byStage: (["nuevo", "contactado", "visita", "negocia", "alquilado", "perdido"] as const).map((stage) => ({
      stage,
      count: (stage === "alquilado" ? wonList : stage === "perdido" ? lostList : openList).filter((client) => client.stage === stage).length,
    })),
    bySource: clientSources
      .map((source) => {
        const arrived = arrivedList.filter((client) => client.source === source).length;
        const won = wonList.filter((client) => client.source === source).length;
        const lost = lostList.filter((client) => client.source === source).length;
        return { source, count: arrived, won, winRate: share(won, won + lost) };
      })
      .filter((entry) => entry.count > 0 || entry.won > 0)
      .sort((a, b) => b.count - a.count),
    lostBy,
    weeks,
    agents: agentRows,
  };
}

// "45 min", "3 h", "2 días".
export function hoursLabel(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} días`;
}

// What each home of the agency did: people who looked, who wrote, visits and interested clients.
export type HomeRow = {
  slug: string;
  title: string;
  views: number | null;
  contacts: number | null;
  visits: number;
  clients: number;
  open: number;
  won: number;
};

export function homeRows(
  homes: Array<{ slug: string; title: string; views30?: number | null; contacts30?: number | null }>,
  clients: AgencyClient[],
  visits: Array<{ propertySlug: string; startsAt: string; status: string }>,
  period: PanelPeriod,
  now: number,
): HomeRow[] {
  const from = periodStart(period, now);
  return homes
    .map((home) => {
      const mine = clients.filter((client) => client.propertySlug === home.slug);
      return {
        slug: home.slug,
        title: home.title,
        views: home.views30 ?? null,
        contacts: home.contacts30 ?? null,
        visits: visits.filter((visit) => visit.propertySlug === home.slug && visit.status !== "cancelled" && Date.parse(visit.startsAt) >= from).length,
        clients: mine.filter((client) => Date.parse(client.createdAt) >= from).length,
        open: mine.filter((client) => openClientStages.includes(client.stage)).length,
        won: mine.filter((client) => client.stage === "alquilado" && Date.parse(client.stageChangedAt) >= from).length,
      };
    })
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || b.clients - a.clients);
}
