"use client";

import { AlertTriangle, Check, Columns3, Home, List, Pencil, Plus, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { addDays, boliviaParts } from "@/lib/calendar-input";
import {
  agentColors,
  clientAlert,
  clientSourceLabels,
  clientSources,
  clientStageHints,
  clientStageLabels,
  clientStages,
  clientTotals,
  crmLimits,
  daysInStage,
  filterClients,
  lostReasonLabels,
  lostReasons,
  nextAgentColor,
  openClientStages,
  type AgencyAgent,
  type AgencyClient,
  type ClientFilters,
  type ClientSource,
  type ClientStage,
  type LostReason,
} from "@/lib/crm-input";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import "./agency-clients.css";

// Mi cuenta > Clientes of an agency: every person interested in renting, in the stage they are in.
// Embudo shows the stages side by side (drag a card to move it); Tabla shows everyone in rows.

type Home = { slug: string; title: string };
type View = "embudo" | "tabla";
type Draft = {
  id: string | null;
  nombre: string;
  whatsapp: string;
  etapa: ClientStage;
  origen: ClientSource;
  presupuesto: string;
  busca: string;
  propiedad: string;
  agente: string;
  proximoPaso: string;
  proximaFecha: string;
  proximaHora: string;
  motivo: LostReason | "";
  nota: string;
};
type SortKey = "reciente" | "nombre" | "presupuesto" | "contacto";

const button =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-[13px] font-semibold text-neutral-900 transition hover:border-[#176b4d] disabled:cursor-not-allowed disabled:opacity-50";
const greenButton =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#176b4d] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[#10533b] disabled:cursor-not-allowed disabled:opacity-50";
const field = "h-10 w-full rounded-[8px] border border-black/15 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-[#176b4d] focus:ring-2 focus:ring-[#176b4d]/20";
const label = "grid gap-1.5 text-[13px] font-semibold text-neutral-800";

const money = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 });
const bs = (value: number) => `Bs ${money.format(value)}`;
const weekdayShort = new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
const sourceShort: Record<ClientSource, string> = { zentro: "ZENTRO", whatsapp: "WA", facebook: "FB", instagram: "IG", referido: "REF", letrero: "LETRERO", otro: "OTRO" };

// "hace 12 min", "hace 3 h", "ayer", "hace 4 d".
function ago(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} d`;
}

// "hoy 11:00", "mañana 09:30", "sáb 2 nov 15:00".
function whenLabel(iso: string, today: string) {
  const { day, time } = boliviaParts(iso);
  const prefix = day === today ? "hoy" : day === addDays(today, 1) ? "mañana" : day === addDays(today, -1) ? "ayer" : weekdayShort.format(new Date(`${day}T12:00:00Z`)).replace(".", "");
  return `${prefix} ${time}`;
}

function emptyDraft(stage: ClientStage = "nuevo"): Draft {
  return { id: null, nombre: "", whatsapp: "", etapa: stage, origen: "zentro", presupuesto: "", busca: "", propiedad: "", agente: "", proximoPaso: "", proximaFecha: "", proximaHora: "", motivo: "", nota: "" };
}

function draftOf(client: AgencyClient): Draft {
  const next = client.nextStepAt ? boliviaParts(client.nextStepAt) : null;
  return {
    id: client.id,
    nombre: client.name,
    whatsapp: client.whatsapp ?? "",
    etapa: client.stage,
    origen: client.source,
    presupuesto: client.budgetBob ? String(client.budgetBob) : "",
    busca: client.wants ?? "",
    propiedad: client.propertySlug ?? "",
    agente: client.agentId ?? "",
    proximoPaso: client.nextStep ?? "",
    proximaFecha: next?.day ?? "",
    proximaHora: next?.time ?? "",
    motivo: client.lostReason ?? "",
    nota: client.note ?? "",
  };
}

async function send(method: string, url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || result.ok !== true) throw new Error(typeof result.message === "string" ? result.message : "No se pudo guardar. Intenta de nuevo.");
  return result;
}

export function AgencyClients({ homes, agencyName }: { homes: Home[]; agencyName: string }) {
  // Read the clock once per visit, so ages and alerts stay put while the page is open.
  const [{ now, today }] = useState(() => ({ now: Date.now(), today: boliviaParts(new Date()).day }));
  const [clients, setClients] = useState<AgencyClient[] | null>(null);
  const [agents, setAgents] = useState<AgencyAgent[]>([]);
  const [failed, setFailed] = useState("");
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<View>("embudo");
  const [filters, setFilters] = useState<ClientFilters>({ query: "", agentId: "todos", source: "todos", onlyAlerts: false });
  const [sort, setSort] = useState<SortKey>("reciente");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [losing, setLosing] = useState<AgencyClient | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/cliente/clientes", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudieron cargar tus clientes.");
        if (!live) return;
        setClients(result.clients);
        setAgents(result.agents);
        setFailed("");
      })
      .catch((error: unknown) => live && setFailed(error instanceof Error ? error.message : "No se pudieron cargar tus clientes."));
    return () => {
      live = false;
    };
  }, [reload]);

  const titles = useMemo(() => new Map(homes.map((home) => [home.slug, home.title])), [homes]);
  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const all = useMemo(() => clients ?? [], [clients]);
  const visible = useMemo(() => filterClients(all, filters, now, titles), [all, filters, now, titles]);
  const totals = useMemo(() => clientTotals(all, now), [all, now]);

  const replace = useCallback((client: AgencyClient) => {
    setClients((current) => [client, ...(current ?? []).filter((other) => other.id !== client.id)]);
  }, []);

  async function move(client: AgencyClient, stage: ClientStage, motivo: LostReason | null = null) {
    if (stage === "perdido" && !motivo) {
      setLosing(client);
      return;
    }
    if (client.stage === stage && stage !== "perdido") return;
    // Move the card right away; put it back if the save fails.
    const before = client;
    replace({ ...client, stage, stageChangedAt: new Date().toISOString(), lostReason: stage === "perdido" ? motivo : null });
    try {
      const result = await send("PATCH", "/api/cliente/clientes", { id: client.id, accion: "etapa", etapa: stage, motivo });
      replace(result.client as AgencyClient);
      setNotice(`${client.name} pasó a ${clientStageLabels[stage]}.`);
    } catch (error) {
      replace(before);
      setNotice(error instanceof Error ? error.message : "No se pudo mover.");
    }
  }

  const sorted = useMemo(() => {
    const list = [...visible];
    if (sort === "nombre") list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (sort === "presupuesto") list.sort((a, b) => (b.budgetBob ?? 0) - (a.budgetBob ?? 0));
    if (sort === "contacto") list.sort((a, b) => Date.parse(a.lastContactAt ?? a.createdAt) - Date.parse(b.lastContactAt ?? b.createdAt));
    return list;
  }, [visible, sort]);

  if (failed && !clients) {
    return (
      <section className="rounded-[10px] border border-black/10 bg-white p-5 text-sm text-neutral-700">
        <p>{failed}</p>
        <button type="button" className={`${button} mt-3`} onClick={() => setReload((value) => value + 1)}>Intentar de nuevo</button>
      </section>
    );
  }

  const activeAgents = agents.filter((agent) => agent.active);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[8px] border border-black/10 bg-white p-0.5" role="group" aria-label="Vista">
          {([["embudo", "Embudo", <Columns3 key="e" className="h-4 w-4" aria-hidden="true" />], ["tabla", "Tabla", <List key="t" className="h-4 w-4" aria-hidden="true" />]] as const).map(([id, text, icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-semibold ${view === id ? "bg-[#e2f2e9] text-[#0d4d36]" : "text-neutral-600 hover:text-neutral-950"}`}
            >
              {icon}
              {text}
            </button>
          ))}
        </div>
        <button type="button" className={button} onClick={() => setAgentsOpen(true)}>
          <Users className="h-4 w-4" aria-hidden="true" />
          Agentes{activeAgents.length ? ` · ${activeAgents.length}` : ""}
        </button>
        <button type="button" className={`${greenButton} ml-auto`} onClick={() => setDraft(emptyDraft())} disabled={!clients}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo cliente
        </button>
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-black/10 bg-white sm:grid-cols-3 xl:grid-cols-6">
        <Stat term="En curso" value={String(totals.open)} hint="Nuevo a Negociando" />
        <Stat
          term="Por responder"
          value={String(totals.alerts)}
          hint={totals.alerts ? "Toca para verlos" : "Todos al día"}
          tone={totals.alerts ? "late" : undefined}
          onClick={totals.alerts ? () => setFilters((current) => ({ ...current, onlyAlerts: !current.onlyAlerts })) : undefined}
        />
        <Stat term="Alquilaron" value={String(totals.won)} hint="Clientes ganados" />
        <Stat term="Se perdieron" value={String(totals.lost)} hint="Con su motivo" />
        <Stat term="Cierre" value={totals.winRate === null ? "—" : `${totals.winRate}%`} hint="De los que ya terminaron" />
        <Stat term="Presupuesto" value={totals.openBudget ? bs(totals.openBudget) : "—"} hint="Por mes, de los que están en curso" />
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-[1_1_240px]">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            className={`${field} h-9 pl-9`}
            placeholder="Buscar nombre, celular o vivienda"
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
          />
        </label>
        <select
          className={`${field} h-9 w-auto min-w-0 flex-[0_1_200px]`}
          aria-label="Agente"
          value={filters.agentId}
          onChange={(event) => setFilters((current) => ({ ...current, agentId: event.target.value }))}
        >
          <option value="todos">Todos los agentes</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}{agent.active ? "" : " (ya no está)"}</option>
          ))}
          <option value="sin-agente">Sin agente</option>
        </select>
        <select
          className={`${field} h-9 w-auto min-w-0 flex-[0_1_190px]`}
          aria-label="De dónde llegó"
          value={filters.source}
          onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as ClientFilters["source"] }))}
        >
          <option value="todos">Llegó por: todos</option>
          {clientSources.map((source) => (
            <option key={source} value={source}>{clientSourceLabels[source]}</option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={filters.onlyAlerts}
          className="crm-alert-chip inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-semibold"
          onClick={() => setFilters((current) => ({ ...current, onlyAlerts: !current.onlyAlerts }))}
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Por responder · {totals.alerts}
        </button>
        {view === "tabla" ? (
          <select className={`${field} h-9 w-auto min-w-0 flex-[0_1_210px]`} aria-label="Ordenar" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="reciente">Últimos cambios</option>
            <option value="contacto">Más tiempo sin contacto</option>
            <option value="presupuesto">Mayor presupuesto</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
        ) : null}
      </div>

      {notice ? (
        <p className="flex items-center justify-between gap-3 rounded-[8px] border border-[#cfe3d7] bg-[#f1f8f4] px-3 py-2 text-[13px] text-[#0d4d36]" role="status">
          {notice}
          <button type="button" className="cursor-pointer text-neutral-500 hover:text-neutral-900" onClick={() => setNotice("")} aria-label="Cerrar aviso">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </p>
      ) : null}

      {!clients ? (
        <div className="grid h-48 place-items-center rounded-[10px] border border-black/10 bg-white text-sm text-neutral-500">Cargando clientes…</div>
      ) : all.length === 0 ? (
        <section className="rounded-[10px] border border-dashed border-black/15 bg-white p-6">
          <h2 className="text-base font-semibold text-neutral-950">Todavía no hay clientes en {agencyName}</h2>
          <p className="mt-1 max-w-[62ch] text-sm leading-6 text-neutral-600">
            Anota aquí a cada persona que pregunta por una vivienda: por WhatsApp, Facebook, el letrero o el anuncio en Zentro. Así nadie se queda sin respuesta y sabes en qué va cada uno.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={greenButton} onClick={() => setDraft(emptyDraft())}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar el primer cliente
            </button>
            {agents.length === 0 ? (
              <button type="button" className={button} onClick={() => setAgentsOpen(true)}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Agregar agentes
              </button>
            ) : null}
          </div>
        </section>
      ) : view === "embudo" ? (
        <Board clients={visible} agentById={agentById} titles={titles} now={now} today={today} onOpen={(client) => setDraft(draftOf(client))} onMove={move} onAdd={(stage) => setDraft(emptyDraft(stage))} onShowTable={() => setView("tabla")} />
      ) : (
        <ClientTable clients={sorted} agentById={agentById} titles={titles} now={now} today={today} onOpen={(client) => setDraft(draftOf(client))} />
      )}

      {clients && all.length > 0 && visible.length === 0 ? (
        <p className="text-sm text-neutral-600">Ningún cliente coincide con la búsqueda o los filtros.</p>
      ) : null}

      {draft ? (
        <ClientForm
          draft={draft}
          homes={homes}
          agents={agents}
          client={draft.id ? all.find((client) => client.id === draft.id) ?? null : null}
          now={now}
          onClose={() => setDraft(null)}
          onSaved={(client, message) => {
            if (client) replace(client);
            else setClients((current) => (current ?? []).filter((other) => other.id !== draft.id));
            setDraft(null);
            setNotice(message);
          }}
          onContacted={(client) => {
            replace(client);
            setDraft(draftOf(client));
          }}
        />
      ) : null}

      {agentsOpen ? <AgentsPanel agents={agents} clients={all} onChange={setAgents} onClose={() => setAgentsOpen(false)} /> : null}

      {losing ? (
        <LostPrompt
          client={losing}
          onClose={() => setLosing(null)}
          onPick={(reason) => {
            const client = losing;
            setLosing(null);
            void move(client, "perdido", reason);
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ term, value, hint, tone, onClick }: { term: string; value: string; hint: string; tone?: "late"; onClick?: () => void }) {
  const body = (
    <>
      <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{term}</dt>
      <dd className={`crm-num mt-1 text-[22px] font-semibold leading-none tracking-tight ${tone === "late" ? "crm-late" : "text-neutral-950"}`}>{value}</dd>
      <dd className="mt-1 text-[12px] text-neutral-500">{hint}</dd>
    </>
  );
  const cell = "grid content-start border-b border-r border-black/[0.07] px-4 py-3 text-left";
  return onClick ? (
    <button type="button" className={`${cell} cursor-pointer hover:bg-neutral-50`} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cell}>{body}</div>
  );
}

function AgentAvatar({ agent, size = 22 }: { agent: AgencyAgent | undefined; size?: number }) {
  if (!agent) {
    return (
      <span className="grid shrink-0 place-items-center rounded-full border border-dashed border-black/25 text-[10px] font-semibold text-neutral-400" style={{ width: size, height: size }} title="Sin agente">
        ?
      </span>
    );
  }
  return (
    <span className="grid shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ width: size, height: size, background: agent.color }} title={agent.name}>
      {initials(agent.name)}
    </span>
  );
}

function StageBadge({ stage }: { stage: ClientStage }) {
  return (
    <span className={`crm-s-${stage} crm-badge inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[12px] font-semibold`}>
      <i className="crm-dot h-1.5 w-1.5 rounded-full" />
      {clientStageLabels[stage]}
    </span>
  );
}

// The line under the name: what is next, in red when it is late.
function NextLine({ client, now, today }: { client: AgencyClient; now: number; today: string }) {
  const alert = clientAlert(client, now);
  const text =
    client.stage === "perdido"
      ? client.lostReason
        ? `Motivo: ${lostReasonLabels[client.lostReason]}`
        : "Sin motivo anotado"
      : client.nextStep || client.nextStepAt
        ? `${client.nextStep ?? "Seguimiento"}${client.nextStepAt ? ` · ${whenLabel(client.nextStepAt, today)}` : ""}`
        : client.stage === "alquilado"
          ? "Cliente ganado"
          : "Sin próximo paso";
  return (
    <div className="grid gap-0.5">
      <p className={`text-[12.5px] font-medium ${alert?.kind === "vencido" ? "crm-late" : "text-neutral-800"}`}>{text}</p>
      {alert && alert.kind !== "vencido" ? (
        <p className="crm-late flex items-center gap-1 text-[12px] font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {alert.label}
        </p>
      ) : null}
    </div>
  );
}

function Board({
  clients,
  agentById,
  titles,
  now,
  today,
  onOpen,
  onMove,
  onAdd,
  onShowTable,
}: {
  clients: AgencyClient[];
  agentById: Map<string, AgencyAgent>;
  titles: Map<string, string>;
  now: number;
  today: string;
  onOpen: (client: AgencyClient) => void;
  onMove: (client: AgencyClient, stage: ClientStage) => void;
  onAdd: (stage: ClientStage) => void;
  onShowTable: () => void;
}) {
  const [over, setOver] = useState<ClientStage | null>(null);
  const byId = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  function drop(event: DragEvent, stage: ClientStage) {
    event.preventDefault();
    setOver(null);
    const client = byId.get(event.dataTransfer.getData("text/plain"));
    if (client) onMove(client, stage);
  }

  // Drop target props shared by the open columns and the closed boxes.
  const target = (stage: ClientStage) => ({
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setOver(stage);
    },
    onDragLeave: () => setOver((current) => (current === stage ? null : current)),
    onDrop: (event: DragEvent) => drop(event, stage),
  });
  const card = (client: AgencyClient) => (
    <ClientCard key={client.id} client={client} agent={client.agentId ? agentById.get(client.agentId) : undefined} homeTitle={client.propertySlug ? titles.get(client.propertySlug) : undefined} now={now} today={today} onOpen={() => onOpen(client)} />
  );
  const header = (stage: ClientStage, count: number, budget: number) => (
    <header className="crm-top rounded-t-[8px] border-x border-black/10 bg-white px-3 pb-2 pt-2.5">
      <div className="flex items-center gap-2">
        <i className="crm-dot h-2 w-2 shrink-0 rounded-[2px]" />
        <h3 className="text-[13.5px] font-semibold text-neutral-950">{clientStageLabels[stage]}</h3>
        <span className="crm-num text-[12px] font-semibold text-neutral-500">{count}</span>
        {budget ? <span className="crm-num ml-auto whitespace-nowrap text-[11.5px] text-neutral-500" title="Suma de presupuestos por mes">{bs(budget)}</span> : null}
      </div>
      <p className="mt-0.5 text-[11.5px] leading-4 text-neutral-500">{clientStageHints[stage]}</p>
    </header>
  );
  const sum = (list: AgencyClient[]) => list.reduce((total, client) => total + (client.budgetBob ?? 0), 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {/* The four open stages side by side; on the phone they slide sideways. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="grid snap-x snap-mandatory auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3 lg:auto-cols-[minmax(210px,1fr)]">
          {openClientStages.map((stage) => {
            const column = clients.filter((client) => client.stage === stage);
            return (
              <section key={stage} aria-label={clientStageLabels[stage]} className={`crm-s-${stage} grid snap-start content-start`} {...target(stage)}>
                {header(stage, column.length, stage === "negocia" ? sum(column) : 0)}
                <div className="crm-col grid min-h-[180px] content-start gap-2 rounded-b-[8px] border border-t-0 border-black/10 p-2" data-over={over === stage}>
                  {column.map(card)}
                  <button type="button" className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] px-2 text-[12.5px] font-semibold text-neutral-500 hover:bg-white hover:text-neutral-900" onClick={() => onAdd(stage)}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Agregar aquí
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* The ones that ended, below: the latest of each, the rest in Tabla. */}
      <div className="grid gap-3 md:grid-cols-2">
        {(["alquilado", "perdido"] as const).map((stage) => {
          const column = clients.filter((client) => client.stage === stage);
          const shown = column.slice(0, closedShown);
          return (
            <section key={stage} aria-label={clientStageLabels[stage]} className={`crm-s-${stage} grid content-start`} {...target(stage)}>
              {header(stage, column.length, stage === "alquilado" ? sum(column) : 0)}
              <div className="crm-col grid min-h-[84px] grid-cols-[repeat(auto-fill,minmax(200px,1fr))] content-start gap-2 rounded-b-[8px] border border-t-0 border-black/10 p-2" data-over={over === stage}>
                {shown.map(card)}
                {column.length === 0 ? <p className="self-center px-2 text-[12.5px] text-neutral-500">Arrastra aquí una tarjeta, o cámbiala de etapa en su ficha.</p> : null}
                {column.length > shown.length ? (
                  <button type="button" className="h-8 cursor-pointer self-end rounded-[6px] px-2 text-left text-[12.5px] font-semibold text-neutral-600 hover:bg-white" onClick={onShowTable}>
                    +{column.length - shown.length} más en Tabla
                  </button>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const closedShown = 4;

function ClientCard({ client, agent, homeTitle, now, today, onOpen }: { client: AgencyClient; agent?: AgencyAgent; homeTitle?: string; now: number; today: string; onOpen: () => void }) {
  const days = daysInStage(client, now);
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", client.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      className="grid cursor-pointer gap-1.5 rounded-[8px] border border-black/10 bg-white p-2.5 text-left shadow-[0_1px_0_rgb(0_0_0/0.03)] transition hover:border-[color:var(--s)]"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[13.5px] font-semibold leading-5 text-neutral-950 [overflow-wrap:anywhere]">{client.name}</span>
        <AgentAvatar agent={agent} />
      </span>
      {homeTitle || client.wants ? (
        <span className="flex items-start gap-1.5 text-[12px] leading-4 text-neutral-600">
          <Home className="mt-px h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
          <span className="line-clamp-2">{homeTitle ?? client.wants}</span>
        </span>
      ) : null}
      <NextLine client={client} now={now} today={today} />
      <span className="flex items-center justify-between gap-2 border-t border-black/[0.06] pt-1.5 text-[11.5px] text-neutral-500">
        <span className="crm-num font-semibold text-neutral-700">{client.budgetBob ? bs(client.budgetBob) : "Sin presupuesto"}</span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-[4px] bg-neutral-100 px-1 py-px text-[10.5px] font-bold tracking-[0.04em] text-neutral-600">{sourceShort[client.source]}</span>
          <span className="crm-num">{days === 0 ? "hoy" : `${days} d`}</span>
        </span>
      </span>
    </button>
  );
}

function ClientTable({
  clients,
  agentById,
  titles,
  now,
  today,
  onOpen,
}: {
  clients: AgencyClient[];
  agentById: Map<string, AgencyAgent>;
  titles: Map<string, string>;
  now: number;
  today: string;
  onOpen: (client: AgencyClient) => void;
}) {
  const head = "whitespace-nowrap px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-neutral-500";
  const cell = "px-3 py-2.5 align-top";
  return (
    <div className="overflow-x-auto rounded-[10px] border border-black/10 bg-white">
      <table className="w-full min-w-[820px] border-collapse text-[13px]">
        <thead className="border-b border-black/10 bg-neutral-50">
          <tr>
            <th className={head}>Cliente</th>
            <th className={head}>Etapa</th>
            <th className={head}>Agente</th>
            <th className={head}>Vivienda o qué busca</th>
            <th className={`${head} text-right`}>Presupuesto</th>
            <th className={head}>Próximo paso</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const agent = client.agentId ? agentById.get(client.agentId) : undefined;
            return (
              <tr key={client.id} className="cursor-pointer border-b border-black/[0.06] last:border-0 hover:bg-neutral-50" onClick={() => onOpen(client)}>
                <td className={cell}>
                  <button type="button" className="cursor-pointer whitespace-nowrap text-left font-semibold text-neutral-950 hover:underline" onClick={() => onOpen(client)}>{client.name}</button>
                  <p className="crm-num whitespace-nowrap text-[12px] text-neutral-500">{client.whatsapp ? `+${client.whatsapp}` : "Sin celular"} · {clientSourceLabels[client.source]}</p>
                </td>
                <td className={cell}>
                  <StageBadge stage={client.stage} />
                  <p className="crm-num mt-1 whitespace-nowrap text-[12px] text-neutral-500">{client.lastContactAt ? `Contacto ${ago(client.lastContactAt, now)}` : "Sin contacto"}</p>
                </td>
                <td className={cell}>
                  <span className="flex items-center gap-2">
                    <AgentAvatar agent={agent} />
                    <span className="whitespace-nowrap text-neutral-700">{agent?.name.split(" ")[0] ?? "—"}</span>
                  </span>
                </td>
                <td className={`${cell} max-w-[180px] text-neutral-700`}>
                  <span className="line-clamp-2">{(client.propertySlug ? titles.get(client.propertySlug) : null) ?? client.wants ?? "—"}</span>
                </td>
                <td className={`${cell} crm-num text-right font-semibold text-neutral-900`}>{client.budgetBob ? bs(client.budgetBob) : "—"}</td>
                <td className={`${cell} min-w-[170px]`}><NextLine client={client} now={now} today={today} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-end bg-black/40 sm:place-items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className={`grid max-h-[92svh] w-full gap-4 overflow-y-auto rounded-t-[14px] bg-white p-5 shadow-[0_24px_60px_rgb(0_0_0/0.25)] sm:rounded-[10px] ${wide ? "sm:max-w-[640px]" : "sm:max-w-[480px]"}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-neutral-950">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 cursor-pointer place-items-center rounded-[8px] text-neutral-600 hover:bg-neutral-100" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ClientForm({
  draft,
  homes,
  agents,
  client,
  now,
  onClose,
  onSaved,
  onContacted,
}: {
  draft: Draft;
  homes: Home[];
  agents: AgencyAgent[];
  client: AgencyClient | null;
  now: number;
  onClose: () => void;
  onSaved: (client: AgencyClient | null, message: string) => void;
  onContacted: (client: AgencyClient) => void;
}) {
  const [value, setValue] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const set = <K extends keyof Draft>(key: K, next: Draft[K]) => setValue((current) => ({ ...current, [key]: next }));
  const fieldError = (name: string) => (error?.field === name ? <span className="text-[12px] font-semibold text-red-700">{error.message}</span> : null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { id, ...body } = value;
      const result = await send(id ? "PATCH" : "POST", "/api/cliente/clientes", id ? { id, accion: "editar", ...body } : body);
      onSaved(result.client as AgencyClient, id ? "Cambios guardados." : `${value.nombre.trim()} está en ${clientStageLabels[value.etapa]}.`);
    } catch (saveError) {
      setError({ field: "", message: saveError instanceof Error ? saveError.message : "No se pudo guardar." });
      setBusy(false);
    }
  }

  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (actionError) {
      setError({ field: "", message: actionError instanceof Error ? actionError.message : "No se pudo guardar." });
    } finally {
      setBusy(false);
    }
  }

  const firstName = value.nombre.trim().split(" ")[0] ?? "";
  const homeTitle = homes.find((home) => home.slug === value.propiedad)?.title;
  const message = `Hola ${firstName}, te escribo de parte de la inmobiliaria${homeTitle ? ` por ${homeTitle}` : ""}.`;

  return (
    <Modal title={value.id ? value.nombre || "Cliente" : "Nuevo cliente"} onClose={onClose} wide>
      {client ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-black/10 bg-neutral-50 p-2.5">
          <StageBadge stage={client.stage} />
          <span className="text-[12.5px] text-neutral-600">
            {client.lastContactAt ? `Último contacto ${ago(client.lastContactAt, now)}` : "Nadie le escribió todavía"}
          </span>
          <span className="ml-auto flex flex-wrap gap-1.5">
            {client.whatsapp ? (
              <a className={greenButton} href={`https://wa.me/${client.whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="h-4 w-4" />
                Escribir
              </a>
            ) : null}
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => action(async () => onContacted((await send("PATCH", "/api/cliente/clientes", { id: client.id, accion: "contacto" })).client as AgencyClient))}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Ya le escribí
            </button>
          </span>
        </div>
      ) : null}

      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Nombre
            <input className={field} value={value.nombre} maxLength={crmLimits.name} onChange={(event) => set("nombre", event.target.value)} required autoFocus={!value.id} />
            {fieldError("nombre")}
          </label>
          <label className={label}>
            WhatsApp
            <input className={field} value={value.whatsapp} inputMode="tel" placeholder="70012345" onChange={(event) => set("whatsapp", event.target.value)} />
            {fieldError("whatsapp")}
          </label>
        </div>

        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-[13px] font-semibold text-neutral-800">Etapa</legend>
          <div className="flex flex-wrap gap-1.5">
            {clientStages.map((stage) => (
              <button
                key={stage}
                type="button"
                aria-pressed={value.etapa === stage}
                onClick={() => set("etapa", stage)}
                className={`crm-s-${stage} inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border px-3 text-[13px] font-semibold ${value.etapa === stage ? "crm-badge border-transparent ring-2 ring-[color:var(--s)]" : "border-black/10 bg-white text-neutral-700"}`}
              >
                <i className="crm-dot h-2 w-2 rounded-full" />
                {clientStageLabels[stage]}
              </button>
            ))}
          </div>
          {value.etapa === "perdido" ? (
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Por qué se perdió">
              {lostReasons.map((reason) => (
                <button key={reason} type="button" aria-pressed={value.motivo === reason} onClick={() => set("motivo", reason)} className={`${button} ${value.motivo === reason ? "border-neutral-900 bg-neutral-100" : ""}`}>
                  {lostReasonLabels[reason]}
                </button>
              ))}
            </div>
          ) : null}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Vivienda que le interesa
            <select className={field} value={value.propiedad} onChange={(event) => set("propiedad", event.target.value)}>
              <option value="">Ninguna todavía</option>
              {homes.map((home) => (
                <option key={home.slug} value={home.slug}>{home.title}</option>
              ))}
            </select>
            {fieldError("propiedad")}
          </label>
          <label className={label}>
            Agente a cargo
            <select className={field} value={value.agente} onChange={(event) => set("agente", event.target.value)}>
              <option value="">Sin agente</option>
              {agents.filter((agent) => agent.active || agent.id === value.agente).map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            {fieldError("agente")}
          </label>
          <label className={label}>
            Qué busca
            <input className={field} value={value.busca} maxLength={crmLimits.wants} placeholder="2 dormitorios, Equipetrol, con garaje" onChange={(event) => set("busca", event.target.value)} />
          </label>
          <label className={label}>
            Presupuesto por mes (Bs)
            <input className={`${field} crm-num`} value={value.presupuesto} inputMode="numeric" placeholder="3500" onChange={(event) => set("presupuesto", event.target.value)} />
            {fieldError("presupuesto")}
          </label>
          <label className={label}>
            Llegó por
            <select className={field} value={value.origen} onChange={(event) => set("origen", event.target.value as ClientSource)}>
              {clientSources.map((source) => (
                <option key={source} value={source}>{clientSourceLabels[source]}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="grid gap-3 rounded-[8px] border border-black/10 p-3 sm:grid-cols-[minmax(0,1fr)_150px_130px]">
          <legend className="px-1 text-[13px] font-semibold text-neutral-800">Próximo paso</legend>
          <label className={label}>
            Qué toca
            <input className={field} value={value.proximoPaso} maxLength={crmLimits.nextStep} placeholder="Llamar para confirmar la visita" onChange={(event) => set("proximoPaso", event.target.value)} />
          </label>
          <label className={label}>
            Día
            <input type="date" className={field} value={value.proximaFecha} onChange={(event) => set("proximaFecha", event.target.value)} />
            {fieldError("proximaFecha")}
          </label>
          <label className={label}>
            Hora
            <input type="time" className={field} value={value.proximaHora} onChange={(event) => set("proximaHora", event.target.value)} />
          </label>
          <p className="text-[12px] text-neutral-500 sm:col-span-3">Con día, aparece en tu Calendario y te avisamos aquí si se pasa la hora.</p>
        </fieldset>

        <label className={label}>
          Nota
          <textarea className={`${field} h-24 py-2`} value={value.nota} maxLength={crmLimits.note} placeholder="Tiene una mascota, se muda en diciembre…" onChange={(event) => set("nota", event.target.value)} />
        </label>

        {error && !error.field ? <p className="text-[13px] font-semibold text-red-700" role="alert">{error.message}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className={greenButton} disabled={busy}>{value.id ? "Guardar cambios" : "Agregar cliente"}</button>
          <button type="button" className={button} onClick={onClose}>Cancelar</button>
          {value.id ? (
            confirming ? (
              <span className="ml-auto flex gap-1.5">
                <button
                  type="button"
                  className={`${button} border-red-300 text-red-900`}
                  disabled={busy}
                  onClick={() => action(async () => {
                    await send("DELETE", `/api/cliente/clientes?id=${encodeURIComponent(value.id ?? "")}`);
                    onSaved(null, `${value.nombre} se borró.`);
                  })}
                >
                  Sí, borrar
                </button>
                <button type="button" className={button} onClick={() => setConfirming(false)}>No</button>
              </span>
            ) : (
              <button type="button" className={`${button} ml-auto`} onClick={() => setConfirming(true)} aria-label="Borrar cliente">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )
          ) : null}
        </div>
      </form>
    </Modal>
  );
}

function LostPrompt({ client, onClose, onPick }: { client: AgencyClient; onClose: () => void; onPick: (reason: LostReason) => void }) {
  return (
    <Modal title={`¿Por qué no siguió ${client.name.split(" ")[0]}?`} onClose={onClose}>
      <p className="text-sm text-neutral-600">Anotarlo ayuda a ver qué se repite: si es el precio, la zona o que no respondemos a tiempo.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {lostReasons.map((reason) => (
          <button key={reason} type="button" className={`${button} h-11 justify-start`} onClick={() => onPick(reason)}>
            {lostReasonLabels[reason]}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function AgentsPanel({ agents, clients, onChange, onClose }: { agents: AgencyAgent[]; clients: AgencyClient[]; onChange: (agents: AgencyAgent[]) => void; onClose: () => void }) {
  const [editing, setEditing] = useState<{ id: string | null; nombre: string; whatsapp: string; color: string; activo: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = (agentId: string) => clients.filter((client) => client.agentId === agentId && client.stage !== "alquilado" && client.stage !== "perdido").length;
  const won = (agentId: string) => clients.filter((client) => client.agentId === agentId && client.stage === "alquilado").length;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError("");
    try {
      const { id, ...body } = editing;
      const result = await send(id ? "PATCH" : "POST", "/api/cliente/agentes", id ? { id, ...body } : body);
      onChange(result.agents as AgencyAgent[]);
      setEditing(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Agentes" onClose={onClose} wide>
      <p className="text-sm text-neutral-600">Cada agente tiene un color. Asígnale clientes y verás en el embudo quién atiende a quién. Por ahora entran con la cuenta de la inmobiliaria.</p>
      {agents.length ? (
        <ul className="grid divide-y divide-black/[0.06] rounded-[8px] border border-black/10">
          {agents.map((agent) => (
            <li key={agent.id} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${agent.active ? "" : "opacity-60"}`}>
              <AgentAvatar agent={agent} size={30} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-950">{agent.name}{agent.active ? "" : " · ya no está"}</p>
                <p className="crm-num text-[12px] text-neutral-500">
                  {agent.whatsapp ? `+${agent.whatsapp}` : "Sin celular"} · {open(agent.id)} en curso · {won(agent.id)} alquilaron
                </p>
              </div>
              <button type="button" className={button} onClick={() => setEditing({ id: agent.id, nombre: agent.name, whatsapp: agent.whatsapp ?? "", color: agent.color, activo: agent.active })}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Editar
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {editing ? (
        <form onSubmit={save} className="grid gap-3 rounded-[8px] border border-black/10 bg-neutral-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Nombre
              <input className={field} value={editing.nombre} maxLength={crmLimits.name} onChange={(event) => setEditing({ ...editing, nombre: event.target.value })} required autoFocus />
            </label>
            <label className={label}>
              WhatsApp
              <input className={field} value={editing.whatsapp} inputMode="tel" placeholder="70012345" onChange={(event) => setEditing({ ...editing, whatsapp: event.target.value })} />
            </label>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-neutral-800">Color</legend>
            <div className="flex flex-wrap gap-2">
              {agentColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  aria-pressed={editing.color === color}
                  onClick={() => setEditing({ ...editing, color })}
                  className={`h-8 w-8 cursor-pointer rounded-full ${editing.color === color ? "ring-2 ring-neutral-900 ring-offset-2" : ""}`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </fieldset>
          {editing.id ? (
            <label className="flex items-center gap-2 text-[13px] font-semibold text-neutral-800">
              <input type="checkbox" checked={!editing.activo} onChange={(event) => setEditing({ ...editing, activo: !event.target.checked })} />
              Ya no trabaja con nosotros (sus clientes guardan su nombre)
            </label>
          ) : null}
          {error ? <p className="text-[13px] font-semibold text-red-700" role="alert">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" className={greenButton} disabled={busy}>{editing.id ? "Guardar" : "Agregar agente"}</button>
            <button type="button" className={button} onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button type="button" className={`${button} justify-self-start`} onClick={() => setEditing({ id: null, nombre: "", whatsapp: "", color: nextAgentColor(agents), activo: true })}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Agregar agente
        </button>
      )}
    </Modal>
  );
}
