import { listCalendarHomes } from "@/lib/calendar";
import { listAgents, listClients } from "@/lib/crm";
import { clientSourceLabels, clientStageLabels, lostReasonLabels } from "@/lib/crm-input";
import { agencyRequest } from "@/lib/crm-route";
import { homeRows, panelPeriodLabels, panelPeriods, panelStats, type PanelPeriod } from "@/lib/crm-stats";
import { getListingAudience } from "@/lib/property-audience";
import { listBookingsFor } from "@/lib/visits";
import { buildCsv, buildXlsx, type XlsxCell, type XlsxColumn, type XlsxSheet } from "@/lib/xlsx";

const clientColumns: XlsxColumn[] = [
  { header: "Nombre", width: 26 },
  { header: "WhatsApp", width: 16 },
  { header: "Etapa", width: 16 },
  { header: "Llegó por", width: 18 },
  { header: "Vivienda", width: 34 },
  { header: "Qué busca", width: 30 },
  { header: "Presupuesto por mes", width: 14, format: "money" },
  { header: "Agente", width: 20 },
  { header: "Próximo paso", width: 28 },
  { header: "Fecha del próximo paso", width: 18, format: "datetime" },
  { header: "Último contacto", width: 18, format: "datetime" },
  { header: "Llegó el", width: 18, format: "datetime" },
  { header: "Motivo si se perdió", width: 18 },
  { header: "Nota", width: 40 },
];

const date = (value: string | null | undefined) => (value ? new Date(value) : null);
const phoneText = (digits: string) => (digits.length > 8 ? `+${digits.slice(0, -8)} ${digits.slice(-8)}` : digits);
const stamp = () => new Date(Date.now() - 4 * 3_600_000).toISOString().slice(0, 10);

// Mi cuenta > Panel > Excel or CSV: every client of the account (or of the agent). The Excel adds
// the agents (when there is a team) and the homes of the chosen period.
export async function GET(request: Request) {
  return agencyRequest(request, async (scope) => {
    const params = new URL(request.url).searchParams;
    const format = params.get("formato") === "csv" ? "csv" : "xlsx";
    const period: PanelPeriod = panelPeriods.find((value) => value === params.get("periodo")) ?? "30";
    const [clients, agents, homes] = await Promise.all([listClients(scope), listAgents(scope.accountId), listCalendarHomes(scope.accountId)]);
    const titles = new Map(homes.map((home) => [home.slug, home.title]));
    const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));
    // An agent who works alone gets no agent column and no agents sheet.
    const team = agents.length > 0;
    const agentColumn = clientColumns.findIndex((column) => column.header === "Agente");
    const columns = team ? clientColumns : clientColumns.filter((_, index) => index !== agentColumn);
    const fullRows: XlsxCell[][] = clients.map((client) => [
      client.name,
      // "+591 70011122": the space keeps it as text in Excel, so the number is not rounded.
      client.whatsapp ? phoneText(client.whatsapp) : null,
      clientStageLabels[client.stage],
      clientSourceLabels[client.source],
      client.propertySlug ? titles.get(client.propertySlug) ?? client.propertySlug : null,
      client.wants,
      client.budgetBob,
      client.agentId ? agentNames.get(client.agentId) ?? null : null,
      client.nextStep,
      date(client.nextStepAt),
      date(client.lastContactAt),
      date(client.createdAt),
      client.lostReason ? lostReasonLabels[client.lostReason] : null,
      client.note,
    ]);
    const rows = team ? fullRows : fullRows.map((row) => row.filter((_, index) => index !== agentColumn));
    const name = `clientes-${stamp()}`;
    if (format === "csv") {
      return new Response(buildCsv(columns, rows), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "private, no-store" },
      });
    }

    const now = Date.now();
    const stats = panelStats(clients, scope.agentId ? agents.filter((agent) => agent.id === scope.agentId) : agents, period, now);
    const slugs = homes.map((home) => home.slug);
    const [audience, bookings] = await Promise.all([getListingAudience(slugs).catch(() => null), listBookingsFor(slugs).catch(() => null)]);
    const homeTable = homeRows(
      homes.map((home) => ({ slug: home.slug, title: home.title, views30: audience?.get(home.slug)?.views30 ?? null, contacts30: audience?.get(home.slug)?.contacts30 ?? null })),
      clients,
      bookings ?? [],
      period,
      now,
    );
    const label = panelPeriodLabels[period].toLowerCase();
    const file = buildXlsx([
      { name: "Clientes", columns, rows },
      ...(team ? [{
        name: `Agentes (${label})`,
        columns: [
          { header: "Agente", width: 24 },
          { header: "Llegaron", width: 11, format: "number" },
          { header: "En curso", width: 11, format: "number" },
          { header: "Alquilaron", width: 11, format: "number" },
          { header: "Se perdieron", width: 12, format: "number" },
          { header: "Cierre", width: 10, format: "percent" },
          { header: "Horas para responder", width: 18, format: "number" },
          { header: "Respondidos en un día", width: 18, format: "percent" },
        ],
        rows: stats.agents.map((row) => [
          row.name,
          row.arrived,
          row.open,
          row.won,
          row.lost,
          row.winRate === null ? null : row.winRate / 100,
          row.responseHours === null ? null : Math.round(row.responseHours * 10) / 10,
          row.onTimeRate === null ? null : row.onTimeRate / 100,
        ]),
      } satisfies XlsxSheet] : []),
      {
        name: `Viviendas (${label})`,
        columns: [
          { header: "Vivienda", width: 40 },
          { header: "Vistas 30 días", width: 13, format: "number" },
          { header: "WhatsApp 30 días", width: 15, format: "number" },
          { header: "Visitas", width: 10, format: "number" },
          { header: "Clientes", width: 10, format: "number" },
          { header: "En curso", width: 10, format: "number" },
          { header: "Alquiló", width: 10, format: "number" },
        ],
        rows: homeTable.map((row) => [row.title, row.views, row.contacts, row.visits, row.clients, row.open, row.won]),
      },
    ]);
    return new Response(file, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}

