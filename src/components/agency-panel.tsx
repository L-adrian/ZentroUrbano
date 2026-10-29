"use client";

import { Download, FileSpreadsheet, FileText, Link2, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clientSourceLabels, clientStageLabels, lostReasonLabels, type AgencyAgent, type AgencyClient } from "@/lib/crm-input";
import { homeRows, hoursLabel, panelPeriodLabels, panelPeriods, panelStats, type PanelPeriod } from "@/lib/crm-stats";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import "./agency-clients.css";
import "./agency-panel.css";

// Mi cuenta > Panel of an agency: how many clients arrive, where from, how fast they get an answer,
// how many rent and why the rest are lost, per agent and per home. Export and share live here too.

type Home = { slug: string; title: string; views30: number | null; contacts30: number | null };
type Visit = { propertySlug: string; startsAt: string; status: string };
type ShareLink = { token: string; propertySlug: string; url: string; createdAt: string };

const button =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-[13px] font-semibold text-neutral-900 transition hover:border-[#176b4d] disabled:cursor-not-allowed disabled:opacity-50";
const money = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 });
const count = new Intl.NumberFormat("es-BO");
const bs = (value: number) => `Bs ${money.format(value)}`;
const weekLabel = new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", day: "numeric", month: "short" });
const plural = (value: number | null, one: string, many: string) => (value === null ? `— ${many}` : `${count.format(value)} ${value === 1 ? one : many}`);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
// Links to files and other pages: plain anchors with a variable href, so the browser downloads them.
const exportHref = (format: "csv" | "xlsx", period: PanelPeriod) => `/api/cliente/clientes/exportar?formato=${format}&periodo=${period}`;
const reportHref = (period: PanelPeriod) => `/cliente/informe?periodo=${period}`;

export function AgencyPanel({ homes, visits, agencyName }: { homes: Home[]; visits: Visit[]; agencyName: string }) {
  const [now] = useState(() => Date.now());
  const [clients, setClients] = useState<AgencyClient[] | null>(null);
  const [agents, setAgents] = useState<AgencyAgent[]>([]);
  const [failed, setFailed] = useState("");
  const [period, setPeriod] = useState<PanelPeriod>("30");
  const [agentId, setAgentId] = useState("todos");
  const [sharing, setSharing] = useState<Home | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/cliente/clientes", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudo cargar el panel.");
        if (!live) return;
        setClients(result.clients);
        setAgents(result.agents);
      })
      .catch((error: unknown) => live && setFailed(error instanceof Error ? error.message : "No se pudo cargar el panel."));
    return () => {
      live = false;
    };
  }, []);

  const scoped = useMemo(() => (clients ?? []).filter((client) => agentId === "todos" || client.agentId === agentId), [clients, agentId]);
  const stats = useMemo(() => panelStats(scoped, agents, period, now), [scoped, agents, period, now]);
  const rows = useMemo(() => homeRows(homes, scoped, visits, period, now), [homes, scoped, visits, period, now]);

  if (failed) return <p className="rounded-[10px] border border-black/10 bg-white p-5 text-sm text-neutral-700">{failed}</p>;
  if (!clients) return <div className="grid h-48 place-items-center rounded-[10px] border border-black/10 bg-white text-sm text-neutral-500">Cargando el panel…</div>;

  const periodWord = period === "todo" ? "desde el inicio" : `en ${panelPeriodLabels[period].toLowerCase()}`;
  const maxWeek = Math.max(1, ...stats.weeks.map((week) => week.count));

  return (
    <div className="crm-panel grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[8px] border border-black/10 bg-white p-0.5" role="group" aria-label="Periodo">
          {panelPeriods.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={period === id}
              onClick={() => setPeriod(id)}
              className={`h-8 cursor-pointer rounded-[6px] px-3 text-[13px] font-semibold ${period === id ? "bg-[#e2f2e9] text-[#0d4d36]" : "text-neutral-600 hover:text-neutral-950"}`}
            >
              {panelPeriodLabels[id]}
            </button>
          ))}
        </div>
        {agents.length > 1 ? (
          <select
            className="h-9 min-w-0 rounded-[8px] border border-black/15 bg-white px-3 text-sm text-neutral-950"
            aria-label="Agente"
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
          >
            <option value="todos">Todos los agentes</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-1.5" aria-label="Bajar">
          <a className={button} href={exportHref("xlsx", period)} download>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Excel
          </a>
          <a className={button} href={exportHref("csv", period)} download>
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV
          </a>
          <a className={button} href={reportHref(period)} target="_blank" rel="noreferrer">
            <FileText className="h-4 w-4" aria-hidden="true" />
            PDF
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-black/10 bg-white sm:grid-cols-3 xl:grid-cols-6">
        <Tile term="Llegaron" value={count.format(stats.arrived)} hint={`Clientes nuevos ${periodWord}`} />
        <Tile term="Alquilaron" value={count.format(stats.won)} hint={stats.wonBudget ? `${bs(stats.wonBudget)} por mes` : "Clientes ganados"} />
        <Tile term="Cierre" value={stats.winRate === null ? "—" : `${stats.winRate}%`} hint={`${stats.won} de ${stats.won + stats.lost} que terminaron`} />
        <Tile term="Responden en" value={hoursLabel(stats.responseHours)} hint="La mitad recibe respuesta antes" />
        <Tile
          term="A tiempo"
          value={stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`}
          hint="Respondidos en menos de un día"
          tone={stats.onTimeRate !== null && stats.onTimeRate < 60 ? "late" : undefined}
        />
        <Tile term="En curso" value={count.format(stats.open)} hint={stats.openBudget ? `${bs(stats.openBudget)} por mes en juego` : "Nuevo a Negociando"} />
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-2">
        <Card title="Clientes nuevos por semana" note="Últimas 8 semanas">
          <div className="crm-cols relative grid h-44 grid-cols-8 items-end gap-2 border-b border-black/10 pt-6" role="img" aria-label={stats.weeks.map((week) => `Semana del ${weekLabel.format(new Date(`${week.start}T12:00:00Z`))}: ${week.count}`).join(". ")}>
            {stats.weeks.map((week, index) => (
              <div key={week.start} tabIndex={0} className="crm-colwrap group relative flex h-full flex-col items-center justify-end outline-none">
                <span className="crm-num mb-1 text-[11.5px] font-semibold text-neutral-700">{week.count || ""}</span>
                <span className="crm-colbar w-full max-w-9 rounded-t-[4px]" style={{ height: `${(week.count / maxWeek) * 100}%`, minHeight: week.count ? 4 : 0 }} />
                <span className={`crm-tip pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-[6px] border border-black/10 bg-white px-2 py-1 text-[12px] text-neutral-800 group-hover:block group-focus-visible:block ${index > 5 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                  Semana del {weekLabel.format(new Date(`${week.start}T12:00:00Z`))}: <b className="crm-num">{week.count}</b> {week.count === 1 ? "cliente" : "clientes"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-8 gap-2 text-center text-[11px] text-neutral-500">
            {stats.weeks.map((week, index) => (
              <span key={week.start} className={`whitespace-nowrap ${index % 2 ? "max-sm:invisible" : ""}`}>{weekLabel.format(new Date(`${week.start}T12:00:00Z`)).replace(".", "")}</span>
            ))}
          </div>
        </Card>

        <Card title="Dónde están" note={`En curso hoy, y los que terminaron ${periodWord}`}>
          <Bars
            rows={stats.byStage.map((entry) => ({
              key: entry.stage,
              label: (
                <span className={`crm-s-${entry.stage} flex items-center gap-2`}>
                  <i className="crm-dot h-2 w-2 shrink-0 rounded-full" />
                  {clientStageLabels[entry.stage]}
                </span>
              ),
              value: entry.count,
              text: count.format(entry.count),
              lost: entry.stage === "perdido",
            }))}
          />
        </Card>

        <Card title="De dónde llegan" note={`Clientes nuevos ${periodWord}, y cuántos de ellos alquilaron`}>
          {stats.bySource.length ? (
            <Bars
              rows={stats.bySource.map((entry) => ({
                key: entry.source,
                label: clientSourceLabels[entry.source],
                value: entry.count,
                text: `${count.format(entry.count)}${entry.winRate === null ? "" : ` · ${entry.winRate}% cierre`}`,
              }))}
            />
          ) : (
            <Empty>Todavía no llegaron clientes en este periodo.</Empty>
          )}
        </Card>

        <Card title="Por qué se pierden" note={`Clientes perdidos ${periodWord}`}>
          {stats.lostBy.length ? (
            <Bars
              rows={stats.lostBy.map((entry) => ({
                key: entry.reason,
                label: entry.reason === "sin-motivo" ? "Sin motivo anotado" : lostReasonLabels[entry.reason],
                value: entry.count,
                text: count.format(entry.count),
                lost: true,
              }))}
            />
          ) : (
            <Empty>No se perdió ningún cliente en este periodo.</Empty>
          )}
        </Card>
      </div>

      {agents.length && stats.agents.length ? (
        <Card title="Agentes" note={`Clientes que llegaron, cerraron y qué tan rápido respondieron ${periodWord}`} flush>
          {/* On the phone each agent is a short block; the table needs a wider screen. */}
          <ul className="border-t border-black/10 sm:hidden">
            {stats.agents.map((row) => (
              <li key={row.agentId ?? "sin"} className="grid gap-1.5 border-b border-black/[0.06] px-4 py-3 last:border-0">
                <AgentName row={row} />
                <p className="crm-num text-[12.5px] text-neutral-600">
                  {plural(row.arrived, "llegó", "llegaron")} · {row.open} en curso · {plural(row.won, "alquiló", "alquilaron")}{row.winRate === null ? "" : ` · ${row.winRate}% cierre`}
                </p>
                <p className="flex items-center gap-2 text-[12.5px] text-neutral-600">
                  Responde en {hoursLabel(row.responseHours)}
                  {row.onTimeRate === null ? null : <OnTime rate={row.onTimeRate} />}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead className="border-y border-black/10 bg-neutral-50">
                <tr>
                  <Th>Agente</Th>
                  <Th right>Llegaron</Th>
                  <Th right>En curso</Th>
                  <Th right>Alquilaron</Th>
                  <Th right>Cierre</Th>
                  <Th right>Responde en</Th>
                  <Th>A tiempo</Th>
                </tr>
              </thead>
              <tbody>
                {stats.agents.map((row) => (
                  <tr key={row.agentId ?? "sin"} className="border-b border-black/[0.06] last:border-0">
                    <td className="px-3 py-2.5">
                      <AgentName row={row} />
                    </td>
                    <Td>{row.arrived}</Td>
                    <Td>{row.open}</Td>
                    <Td>{row.won}</Td>
                    <Td>{row.winRate === null ? "—" : `${row.winRate}%`}</Td>
                    <Td>{hoursLabel(row.responseHours)}</Td>
                    <td className="px-3 py-2.5">
                      {row.onTimeRate === null ? <span className="text-neutral-400">—</span> : <OnTime rate={row.onTimeRate} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card title="Viviendas" note="Vistas y WhatsApp de los últimos 30 días; visitas y clientes del periodo elegido" flush>
        {rows.length ? (
          <>
          <ul className="border-t border-black/10 sm:hidden">
            {rows.map((row) => (
              <li key={row.slug} className="grid gap-2 border-b border-black/[0.06] px-4 py-3 last:border-0">
                <p className="text-[13.5px] font-semibold leading-5 text-neutral-900">{row.title}</p>
                <p className="crm-num text-[12.5px] text-neutral-600">
                  {plural(row.views, "vista", "vistas")} · {row.contacts ?? "—"} WhatsApp · {plural(row.visits, "visita", "visitas")} · {plural(row.clients, "cliente", "clientes")} · {row.won} alquiló
                </p>
                <button type="button" className={`${button} justify-self-start`} onClick={() => setSharing(homes.find((home) => home.slug === row.slug) ?? null)}>
                  <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Compartir con el dueño
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead className="border-y border-black/10 bg-neutral-50">
                <tr>
                  <Th>Vivienda</Th>
                  <Th right>Vistas</Th>
                  <Th right>WhatsApp</Th>
                  <Th right>Visitas</Th>
                  <Th right>Clientes</Th>
                  <Th right>En curso</Th>
                  <Th right>Alquiló</Th>
                  <Th>Dueño</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.slug} className="border-b border-black/[0.06] last:border-0">
                    <td className="max-w-[260px] px-3 py-2.5 font-semibold text-neutral-900"><span className="line-clamp-2">{row.title}</span></td>
                    <Td>{row.views ?? "—"}</Td>
                    <Td>{row.contacts ?? "—"}</Td>
                    <Td>{row.visits}</Td>
                    <Td>{row.clients}</Td>
                    <Td>{row.open}</Td>
                    <Td>{row.won}</Td>
                    <td className="px-3 py-2">
                      <button type="button" className={button} onClick={() => setSharing(homes.find((home) => home.slug === row.slug) ?? null)}>
                        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Compartir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="px-4 pb-4"><Empty>Cuando tengas viviendas publicadas, aquí verás cómo le va a cada una.</Empty></div>
        )}
      </Card>

      <p className="text-[12px] text-neutral-500">
        Excel y CSV bajan todos {agents.length ? `los clientes de ${agencyName}` : "tus clientes"}. El PDF arma un informe del periodo con tu logo, que es tu foto de perfil.
      </p>

      {sharing ? <ShareDialog home={sharing} onClose={() => setSharing(null)} /> : null}
    </div>
  );
}

function AgentName({ row }: { row: { name: string; color: string | null } }) {
  return (
    <span className="flex items-center gap-2 font-semibold text-neutral-900">
      {row.color ? (
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: row.color }}>{initials(row.name)}</span>
      ) : (
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-dashed border-black/25 text-[10px] text-neutral-400">?</span>
      )}
      {row.name}
    </span>
  );
}

// Share answered within a day; below 60% the bar and the number turn orange.
function OnTime({ rate }: { rate: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="crm-track h-1.5 w-20 overflow-hidden rounded-full">
        <span className={`block h-full rounded-full ${rate < 60 ? "bg-[#c2410c]" : "crm-bar"}`} style={{ width: `${rate}%` }} />
      </span>
      <span className={`crm-num text-[12.5px] font-semibold ${rate < 60 ? "crm-late" : "text-neutral-800"}`}>{rate}%</span>
      <span className="sr-only">a tiempo</span>
    </span>
  );
}

function Tile({ term, value, hint, tone }: { term: string; value: string; hint: string; tone?: "late" }) {
  return (
    <div className="grid content-start border-b border-r border-black/[0.07] px-4 py-3">
      <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{term}</dt>
      <dd className={`crm-num mt-1 text-[22px] font-semibold leading-none tracking-tight ${tone === "late" ? "crm-late" : "text-neutral-950"}`}>{value}</dd>
      <dd className="mt-1 text-[12px] text-neutral-500">{hint}</dd>
    </div>
  );
}

function Card({ title, note, children, flush = false }: { title: string; note: string; children: ReactNode; flush?: boolean }) {
  return (
    <section className={`grid min-w-0 content-start rounded-[10px] border border-black/10 bg-white ${flush ? "" : "pb-4"}`}>
      <header className="px-4 pb-3 pt-3.5">
        <h2 className="text-[14.5px] font-semibold text-neutral-950">{title}</h2>
        <p className="text-[12px] text-neutral-500">{note}</p>
      </header>
      <div className={`min-w-0 ${flush ? "" : "px-4"}`}>{children}</div>
    </section>
  );
}

function Bars({ rows }: { rows: Array<{ key: string; label: ReactNode; value: number; text: string; lost?: boolean }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="grid gap-2.5">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
          <span className="truncate text-neutral-800">{row.label}</span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="crm-track h-3 min-w-0 flex-1 overflow-hidden rounded-[3px]">
              <span className={`block h-full rounded-r-[4px] ${row.lost ? "crm-bar-lost" : "crm-bar"}`} style={{ width: `${(row.value / max) * 100}%`, minWidth: row.value ? 4 : 0 }} />
            </span>
            <span className="crm-num w-[112px] shrink-0 text-right text-[12.5px] font-semibold text-neutral-800">{row.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const Th = ({ children, right = false }: { children: ReactNode; right?: boolean }) => (
  <th className={`whitespace-nowrap px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-neutral-500 ${right ? "text-right" : "text-left"}`}>{children}</th>
);
const Td = ({ children }: { children: ReactNode }) => <td className="crm-num px-3 py-2.5 text-right text-neutral-800">{children}</td>;
const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-[8px] border border-dashed border-black/15 px-3 py-4 text-[13px] text-neutral-500">{children}</p>;

// A read-only page of one home for its owner: views, messages, visits and how many interested
// people there are, without names or phone numbers.
function ShareDialog({ home, onClose }: { home: Home; onClose: () => void }) {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/cliente/compartir?propiedad=${encodeURIComponent(home.slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudo cargar.");
        if (live) setLinks(result.links);
      })
      .catch((loadError: unknown) => live && setError(loadError instanceof Error ? loadError.message : "No se pudo cargar."));
    return () => {
      live = false;
    };
  }, [home.slug]);

  async function call(method: "POST" | "DELETE", token?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(method === "POST" ? "/api/cliente/compartir" : `/api/cliente/compartir?token=${encodeURIComponent(token ?? "")}`, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify({ propiedad: home.slug }) : undefined,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudo guardar.");
      setLinks(result.links);
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  const link = links?.[0] ?? null;
  const message = link ? `Hola, este es el informe de tu vivienda "${home.title}" en Zentro Urbano. Se actualiza solo: ${link.url}` : "";

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-end bg-black/40 sm:place-items-center sm:p-4" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="grid w-full gap-4 rounded-t-[14px] bg-white p-5 shadow-[0_24px_60px_rgb(0_0_0/0.25)] sm:max-w-[500px] sm:rounded-[10px]" role="dialog" aria-modal="true" aria-label="Compartir con el dueño">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-neutral-950">Compartir con el dueño</h3>
            <p className="text-[13px] text-neutral-600">{home.title}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 cursor-pointer place-items-center rounded-[8px] text-neutral-600 hover:bg-neutral-100" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[13px] leading-5 text-neutral-600">
          El dueño ve las vistas, los mensajes por WhatsApp, las visitas y cuántos interesados hay en cada etapa. No ve nombres ni teléfonos. Se actualiza solo y no necesita cuenta.
        </p>
        {!links ? (
          <p className="text-[13px] text-neutral-500">{error || "Cargando…"}</p>
        ) : link ? (
          <div className="grid gap-2">
            <div className="flex items-center gap-2 rounded-[8px] border border-black/10 bg-neutral-50 px-3 py-2">
              <Link2 className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-800">{link.url}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#176b4d] px-3.5 text-[13px] font-semibold text-white hover:bg-[#10533b]" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="h-4 w-4" />
                Mandar por WhatsApp
              </a>
              <button
                type="button"
                className={button}
                onClick={() => {
                  void navigator.clipboard?.writeText(link.url).then(() => setCopied(true));
                }}
              >
                {copied ? "Copiado" : "Copiar enlace"}
              </button>
              <a className={button} href={link.url} target="_blank" rel="noreferrer">Ver como el dueño</a>
              <button type="button" className={`${button} ml-auto text-red-900`} disabled={busy} onClick={() => call("DELETE", link.token)}>Dejar de compartir</button>
            </div>
          </div>
        ) : (
          <button type="button" className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#176b4d] px-4 text-sm font-semibold text-white hover:bg-[#10533b] disabled:opacity-50" disabled={busy} onClick={() => call("POST")}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Crear enlace para el dueño
          </button>
        )}
        {error && links ? <p className="text-[13px] font-semibold text-red-700" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
