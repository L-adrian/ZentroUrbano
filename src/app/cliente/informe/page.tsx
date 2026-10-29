import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PrintButton } from "@/components/print-button";
import { listCalendarHomes } from "@/lib/calendar";
import { listAgents, listClients } from "@/lib/crm";
import { clientSourceLabels, clientStageLabels, lostReasonLabels } from "@/lib/crm-input";
import { currentCrmScope } from "@/lib/crm-route";
import { homeRows, hoursLabel, panelPeriodLabels, panelPeriods, panelStats, type PanelPeriod } from "@/lib/crm-stats";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { getListingAudience } from "@/lib/property-audience";
import { buildSeoMetadata } from "@/lib/seo";
import { listBookingsFor } from "@/lib/visits";
import "@/components/agency-clients.css";
import "./informe.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({ title: "Informe de clientes", description: "Informe de clientes y viviendas.", path: "/cliente/informe", noIndex: true });

const count = new Intl.NumberFormat("es-BO");
const money = (value: number) => `Bs ${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(value)}`;
const longDate = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "numeric", month: "long", year: "numeric" });

// Mi cuenta > Panel > PDF: the report of the period, ready to print or save as PDF with the
// agency's logo (its profile photo).
export default async function AgencyReportPage(props: PageProps<"/cliente/informe">) {
  const scope = await currentCrmScope();
  if (!scope) redirect("/cliente");
  const search = await props.searchParams;
  const period: PanelPeriod = panelPeriods.find((value) => value === search.periodo) ?? "30";
  const [account, clients, agents, homes] = await Promise.all([getCurrentAccount(), listClients(scope), listAgents(scope.accountId), listCalendarHomes(scope.accountId)]);
  const slugs = homes.map((home) => home.slug);
  const [audience, bookings] = await Promise.all([getListingAudience(slugs).catch(() => null), listBookingsFor(slugs).catch(() => null)]);
  // The clock of this request; the report shows when it was made.
  // eslint-disable-next-line react-hooks/purity -- server component rendered once per request
  const now = Date.now();
  const stats = panelStats(clients, scope.agentId ? agents.filter((agent) => agent.id === scope.agentId) : agents, period, now);
  const rows = homeRows(
    homes.map((home) => ({ slug: home.slug, title: home.title, views30: audience?.get(home.slug)?.views30 ?? null, contacts30: audience?.get(home.slug)?.contacts30 ?? null })),
    clients,
    bookings ?? [],
    period,
    now,
  );
  const logo = !scope.agentId ? account?.avatar_url ?? null : null;
  const title = scope.agentName ? `${scope.agentName} · ${scope.agencyName}` : scope.agencyName;
  const periodText = period === "todo" ? "Desde el inicio" : `Últimos ${panelPeriodLabels[period].toLowerCase()}`;
  const maxStage = Math.max(1, ...stats.byStage.map((entry) => entry.count));
  const maxSource = Math.max(1, ...stats.bySource.map((entry) => entry.count));

  return (
    <main className="bg-white">
      <div className="informe mx-auto grid max-w-[900px] gap-5 px-4 py-8 text-neutral-900">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-black/10 bg-neutral-50 p-3">
          <p className="text-sm text-neutral-700">En la ventana que se abre, elige «Guardar como PDF».</p>
          <PrintButton />
        </div>

        <header className="flex items-center justify-between gap-4 border-b-2 border-[#176b4d] pb-4">
          <div className="flex min-w-0 items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the agency's own photo
              <img src={logo} alt="" className="h-14 w-14 rounded-[10px] border border-black/10 object-cover" />
            ) : null}
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#176b4d]">Informe de clientes</p>
              <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">{title}</h1>
            </div>
          </div>
          <div className="text-right text-[12.5px] text-neutral-600">
            <p className="font-semibold text-neutral-900">{periodText}</p>
            <p>Hecho el {longDate.format(new Date(now))}</p>
          </div>
        </header>

        <dl className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-black/10">
          <Tile term="Llegaron" value={count.format(stats.arrived)} hint="Clientes nuevos" />
          <Tile term="Alquilaron" value={count.format(stats.won)} hint={stats.wonBudget ? `${money(stats.wonBudget)} por mes` : "Clientes ganados"} />
          <Tile term="Cierre" value={stats.winRate === null ? "—" : `${stats.winRate}%`} hint={`${stats.won} de ${stats.won + stats.lost} que terminaron`} />
          <Tile term="Responden en" value={hoursLabel(stats.responseHours)} hint="La mitad, antes de eso" />
          <Tile term="A tiempo" value={stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`} hint="Respondidos en menos de un día" />
          <Tile term="En curso" value={count.format(stats.open)} hint={stats.openBudget ? `${money(stats.openBudget)} por mes en juego` : "Nuevo a Negociando"} />
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <Block title="Dónde están">
            {stats.byStage.map((entry) => (
              <Bar key={entry.stage} label={clientStageLabels[entry.stage]} value={entry.count} max={maxStage} lost={entry.stage === "perdido"} />
            ))}
          </Block>
          <Block title="De dónde llegan">
            {stats.bySource.length ? (
              stats.bySource.map((entry) => <Bar key={entry.source} label={clientSourceLabels[entry.source]} value={entry.count} max={maxSource} text={`${entry.count}${entry.winRate === null ? "" : ` · ${entry.winRate}%`}`} />)
            ) : (
              <p className="text-[13px] text-neutral-500">No llegaron clientes en este periodo.</p>
            )}
          </Block>
        </div>

        {stats.lostBy.length ? (
          <Block title="Por qué se perdieron">
            <p className="text-[13px] text-neutral-700">
              {stats.lostBy.map((entry) => `${entry.reason === "sin-motivo" ? "Sin motivo anotado" : lostReasonLabels[entry.reason]}: ${entry.count}`).join(" · ")}
            </p>
          </Block>
        ) : null}

        {agents.length && stats.agents.length ? (
          <Block title="Agentes">
            <Table
              head={["Agente", "Llegaron", "En curso", "Alquilaron", "Cierre", "Responde en", "A tiempo"]}
              rows={stats.agents.map((row) => [
                row.name,
                row.arrived,
                row.open,
                row.won,
                row.winRate === null ? "—" : `${row.winRate}%`,
                hoursLabel(row.responseHours),
                row.onTimeRate === null ? "—" : `${row.onTimeRate}%`,
              ])}
            />
          </Block>
        ) : null}

        {rows.length ? (
          <Block title="Viviendas">
            <Table head={["Vivienda", "Vistas 30 d", "WhatsApp 30 d", "Visitas", "Clientes", "En curso", "Alquiló"]} rows={rows.map((row) => [row.title, row.views ?? "—", row.contacts ?? "—", row.visits, row.clients, row.open, row.won])} />
          </Block>
        ) : null}

        <footer className="border-t border-black/10 pt-3 text-[11.5px] text-neutral-500">
          Hecho con Zentro Urbano · zentrourbano.com. Vistas y WhatsApp cuentan personas distintas, una vez por teléfono o computadora.
        </footer>
      </div>
    </main>
  );
}

function Tile({ term, value, hint }: { term: string; value: string; hint: string }) {
  return (
    <div className="border-b border-r border-black/[0.07] px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{term}</dt>
      <dd className="crm-num mt-1 text-[22px] font-semibold leading-none">{value}</dd>
      <dd className="mt-1 text-[11.5px] text-neutral-500">{hint}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-2 rounded-[10px] border border-black/10 p-4">
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Bar({ label, value, max, text, lost = false }: { label: string; value: number; max: number; text?: string; lost?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)_70px] items-center gap-2 text-[12.5px]">
      <span className="truncate text-neutral-800">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-[3px] bg-[#eef2ef]">
        <span className={`block h-full rounded-r-[3px] ${lost ? "bg-[#64748b]" : "bg-[#176b4d]"}`} style={{ width: `${(value / max) * 100}%`, minWidth: value ? 3 : 0 }} />
      </span>
      <span className="crm-num text-right font-semibold">{text ?? value}</span>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <table className="w-full border-collapse text-[12.5px]">
      <thead>
        <tr className="border-b border-black/15">
          {head.map((cell, index) => (
            <th key={cell} className={`py-1.5 pr-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-500 ${index ? "text-right" : "text-left"}`}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-black/[0.06] last:border-0">
            {row.map((cell, index) => (
              <td key={index} className={`py-1.5 pr-2 ${index ? "crm-num text-right" : "font-semibold"}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
