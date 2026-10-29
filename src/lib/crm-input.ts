import { boliviaInstant, normalizeEventWhatsapp, validDateKey } from "@/lib/calendar-input";

// Clientes of an agency (inmobiliaria) in Mi cuenta: the funnel stages, where each person came
// from, and the checks for the forms. Pure helpers, shared by the API, the page and the tests.

export const clientStages = ["nuevo", "contactado", "visita", "negocia", "alquilado", "perdido"] as const;
export type ClientStage = (typeof clientStages)[number];
export const clientStageLabels: Record<ClientStage, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  visita: "Visita agendada",
  negocia: "Negociando",
  alquilado: "Alquiló",
  perdido: "Perdido",
};
// What each stage means, for the help line under the column title.
export const clientStageHints: Record<ClientStage, string> = {
  nuevo: "Escribió o llamó, nadie le respondió todavía.",
  contactado: "Ya hablaron. Falta que vea una vivienda.",
  visita: "Tiene día y hora para ver una vivienda.",
  negocia: "Le gustó. Están hablando de precio o contrato.",
  alquilado: "Firmó. Cliente ganado.",
  perdido: "No siguió. Anota por qué para aprender.",
};
export const openClientStages: ClientStage[] = ["nuevo", "contactado", "visita", "negocia"];

export const clientSources = ["zentro", "whatsapp", "facebook", "instagram", "referido", "letrero", "otro"] as const;
export type ClientSource = (typeof clientSources)[number];
export const clientSourceLabels: Record<ClientSource, string> = {
  zentro: "Anuncio en Zentro",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  referido: "Recomendado",
  letrero: "Letrero",
  otro: "Otro",
};

export const lostReasons = ["precio", "zona", "otra", "no_responde", "otro"] as const;
export type LostReason = (typeof lostReasons)[number];
export const lostReasonLabels: Record<LostReason, string> = {
  precio: "El precio",
  zona: "La zona",
  otra: "Alquiló otra",
  no_responde: "Dejó de responder",
  otro: "Otro motivo",
};

// Each agent keeps one color in every card, row and filter. Readable on white and on dark.
export const agentColors = ["#2563c9", "#0f766e", "#a16207", "#c2410c", "#7c3aed", "#be185d", "#4d7c0f", "#475569"] as const;

// A new agent gets the first color nobody uses yet.
export const nextAgentColor = (agents: Pick<AgencyAgent, "color">[]) =>
  agentColors.find((color) => !agents.some((agent) => agent.color === color)) ?? agentColors[agents.length % agentColors.length];

export const crmLimits = { name: 120, wants: 160, nextStep: 160, note: 1000, budget: 10_000_000, agents: 30, clients: 2000 };

// username is the agent's own user, once the agency gave them one.
export type AgencyAgent = { id: string; name: string; whatsapp: string | null; color: string; active: boolean; username?: string | null };

export type AgencyClient = {
  id: string;
  name: string;
  whatsapp: string | null;
  stage: ClientStage;
  source: ClientSource;
  budgetBob: number | null;
  wants: string | null;
  propertySlug: string | null;
  agentId: string | null;
  nextStep: string | null;
  nextStepAt: string | null;
  lastContactAt: string | null;
  // The first answer, for the response time (null before 017_agency_tools).
  firstContactAt?: string | null;
  lostReason: LostReason | null;
  note: string | null;
  stageChangedAt: string;
  createdAt: string;
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
const cleanNote = (value: unknown) =>
  typeof value === "string" ? value.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, crmLimits.note) : "";
const timeKey = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isClientStage = (value: unknown): value is ClientStage => clientStages.some((stage) => stage === value);
export const isLostReason = (value: unknown): value is LostReason => lostReasons.some((reason) => reason === value);

export type AgencyClientInput = {
  name: string;
  whatsapp: string | null;
  stage: ClientStage;
  source: ClientSource;
  budgetBob: number | null;
  wants: string | null;
  propertySlug: string | null;
  agentId: string | null;
  nextStep: string | null;
  nextStepAt: Date | null;
  lostReason: LostReason | null;
  note: string | null;
};

export type ClientInputResult = { ok: true; client: AgencyClientInput } | { ok: false; field: string; message: string };

// What the client form sends. The home and the agent are checked against the agency by the caller.
export function readClientInput(body: unknown): ClientInputResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = clean(input.nombre, crmLimits.name);
  if (name.length < 2) return { ok: false, field: "nombre", message: "Escribe el nombre del cliente." };
  const rawPhone = typeof input.whatsapp === "string" ? input.whatsapp.trim() : "";
  const whatsapp = normalizeEventWhatsapp(rawPhone);
  if (rawPhone && !whatsapp) return { ok: false, field: "whatsapp", message: "Escribe un celular, por ejemplo 70012345, o con + y el código del país." };
  const stage = isClientStage(input.etapa) ? input.etapa : "nuevo";
  const source = clientSources.find((option) => option === input.origen) ?? "otro";
  const rawBudget = typeof input.presupuesto === "string" ? input.presupuesto.replace(/[.\s]/g, "") : input.presupuesto;
  let budgetBob: number | null = null;
  if (rawBudget !== undefined && rawBudget !== null && rawBudget !== "") {
    const value = Number(rawBudget);
    if (!Number.isInteger(value) || value <= 0 || value > crmLimits.budget) return { ok: false, field: "presupuesto", message: "Escribe el presupuesto en bolivianos, solo números." };
    budgetBob = value;
  }
  const nextStep = clean(input.proximoPaso, crmLimits.nextStep) || null;
  let nextStepAt: Date | null = null;
  if (input.proximaFecha) {
    if (!validDateKey(input.proximaFecha)) return { ok: false, field: "proximaFecha", message: "Elige el día del próximo paso." };
    const time = typeof input.proximaHora === "string" && input.proximaHora ? input.proximaHora : "09:00";
    if (!timeKey.test(time)) return { ok: false, field: "proximaHora", message: "Elige la hora, por ejemplo 10:30." };
    nextStepAt = boliviaInstant(input.proximaFecha, time);
  }
  const propertySlug = typeof input.propiedad === "string" && /^[a-z0-9-]{1,180}$/.test(input.propiedad) ? input.propiedad : null;
  const agentId = typeof input.agente === "string" && /^[0-9a-f-]{36}$/.test(input.agente) ? input.agente : null;
  return {
    ok: true,
    client: {
      name,
      whatsapp,
      stage,
      source,
      budgetBob,
      wants: clean(input.busca, crmLimits.wants) || null,
      propertySlug,
      agentId,
      nextStep,
      nextStepAt,
      lostReason: stage === "perdido" && isLostReason(input.motivo) ? input.motivo : null,
      note: cleanNote(input.nota) || null,
    },
  };
}

export type AgentInputResult = { ok: true; agent: { name: string; whatsapp: string | null; color: string } } | { ok: false; field: string; message: string };

export function readAgentInput(body: unknown): AgentInputResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = clean(input.nombre, crmLimits.name);
  if (name.length < 2) return { ok: false, field: "nombre", message: "Escribe el nombre del agente." };
  const rawPhone = typeof input.whatsapp === "string" ? input.whatsapp.trim() : "";
  const whatsapp = normalizeEventWhatsapp(rawPhone);
  if (rawPhone && !whatsapp) return { ok: false, field: "whatsapp", message: "Escribe un celular, por ejemplo 70012345." };
  const color = agentColors.find((option) => option === input.color) ?? agentColors[0];
  return { ok: true, agent: { name, whatsapp, color } };
}

// The agent's user: letters, numbers, dot, dash. The password is at least 8 characters.
export type AgentLoginInputResult = { ok: true; username: string; password: string } | { ok: false; field: string; message: string };

export function readAgentLoginInput(body: unknown): AgentLoginInputResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const username = typeof input.usuario === "string" ? input.usuario.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) return { ok: false, field: "usuario", message: "Usa de 3 a 40 letras sin tilde, números, punto o guion. Por ejemplo ana.mercado" };
  const password = typeof input.contrasena === "string" ? input.contrasena : "";
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) return { ok: false, field: "contrasena", message: "La contraseña necesita 8 caracteres como mínimo." };
  return { ok: true, username, password };
}

// A suggested user from the agent's name: "Ana Mercado" -> "ana.mercado".
export const suggestedUsername = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").split(".").slice(0, 2).join(".").slice(0, 40);

// Who needs a message today. A new person waits at most one day; anyone else three days without
// contact. A next step whose time passed always counts.
export type ClientAlert = { kind: "vencido" | "sin-respuesta" | "sin-contacto"; label: string; days: number };

export function clientAlert(client: Pick<AgencyClient, "stage" | "nextStepAt" | "lastContactAt" | "createdAt">, now: number): ClientAlert | null {
  if (!openClientStages.includes(client.stage)) return null;
  if (client.nextStepAt && Date.parse(client.nextStepAt) < now) {
    const days = Math.floor((now - Date.parse(client.nextStepAt)) / 86_400_000);
    return { kind: "vencido", label: days < 1 ? "Próximo paso vencido hoy" : `Próximo paso vencido hace ${days} ${days === 1 ? "día" : "días"}`, days };
  }
  const since = Date.parse(client.lastContactAt ?? client.createdAt);
  const days = Math.floor((now - since) / 86_400_000);
  if (client.stage === "nuevo" && !client.lastContactAt && days >= 1) return { kind: "sin-respuesta", label: `Sin respuesta hace ${days} ${days === 1 ? "día" : "días"}`, days };
  if (days >= 3) return { kind: "sin-contacto", label: `Sin contacto hace ${days} días`, days };
  return null;
}

// Days a client has been in the current stage, for the card ("hace 4 días en Negociando").
export const daysInStage = (client: Pick<AgencyClient, "stageChangedAt">, now: number) => Math.max(0, Math.floor((now - Date.parse(client.stageChangedAt)) / 86_400_000));

// Search and filters of the Clientes screen.
export type ClientFilters = { query: string; agentId: string | "todos" | "sin-agente"; source: ClientSource | "todos"; onlyAlerts: boolean };

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterClients(clients: AgencyClient[], filters: ClientFilters, now: number, titles: Map<string, string> = new Map()) {
  const query = fold(filters.query.trim());
  const digits = filters.query.replace(/\D/g, "");
  return clients.filter((client) => {
    if (filters.agentId === "sin-agente" ? client.agentId : filters.agentId !== "todos" && client.agentId !== filters.agentId) return false;
    if (filters.source !== "todos" && client.source !== filters.source) return false;
    if (filters.onlyAlerts && !clientAlert(client, now)) return false;
    if (!query) return true;
    const text = fold([client.name, client.wants, client.nextStep, client.note, client.propertySlug ? titles.get(client.propertySlug) : null].filter(Boolean).join(" "));
    return text.includes(query) || (digits.length >= 3 && (client.whatsapp ?? "").includes(digits));
  });
}

// Totals for the strip above the funnel.
export function clientTotals(clients: AgencyClient[], now: number) {
  const open = clients.filter((client) => openClientStages.includes(client.stage));
  const won = clients.filter((client) => client.stage === "alquilado").length;
  const lost = clients.filter((client) => client.stage === "perdido").length;
  return {
    open: open.length,
    alerts: open.filter((client) => clientAlert(client, now)).length,
    won,
    lost,
    // Out of the clients that already ended, how many rented.
    winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null,
    openBudget: open.reduce((sum, client) => sum + (client.budgetBob ?? 0), 0),
  };
}
