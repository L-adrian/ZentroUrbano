import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clientAlert,
  clientTotals,
  filterClients,
  nextAgentColor,
  readAgentInput,
  readClientInput,
  type AgencyClient,
} from "../src/lib/crm-input";

const now = Date.parse("2026-10-29T16:00:00.000Z");
const day = 86_400_000;
const base: AgencyClient = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Carla Méndez",
  whatsapp: "59170012345",
  stage: "nuevo",
  source: "zentro",
  budgetBob: 3500,
  wants: "2 dormitorios en Equipetrol",
  propertySlug: null,
  agentId: null,
  nextStep: null,
  nextStepAt: null,
  lastContactAt: null,
  lostReason: null,
  note: null,
  stageChangedAt: new Date(now - day).toISOString(),
  createdAt: new Date(now - 2 * day).toISOString(),
};

test("the client form needs a name and cleans the rest", () => {
  const ok = readClientInput({ nombre: "  Jorge   Suárez ", whatsapp: "7001 2345", etapa: "visita", origen: "facebook", presupuesto: "3.200", proximaFecha: "2026-10-30", proximaHora: "11:00", motivo: "precio" });
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.client.name, "Jorge Suárez");
  assert.equal(ok.client.whatsapp, "59170012345");
  assert.equal(ok.client.budgetBob, 3200);
  assert.equal(ok.client.nextStepAt?.toISOString(), "2026-10-30T15:00:00.000Z");
  // A reason only counts for a lost client.
  assert.equal(ok.client.lostReason, null);
  assert.equal(readClientInput({ nombre: "A" }).ok, false);
  assert.equal(readClientInput({ nombre: "Ana", presupuesto: "mucho" }).ok, false);
  assert.equal(readClientInput({ nombre: "Ana", whatsapp: "abc" }).ok, false);
  const defaults = readClientInput({ nombre: "Ana", etapa: "inventada", origen: "tv", proximaFecha: "2026-11-02" });
  assert.equal(defaults.ok && defaults.client.stage, "nuevo");
  assert.equal(defaults.ok && defaults.client.source, "otro");
  assert.equal(defaults.ok && defaults.client.nextStepAt?.toISOString(), "2026-11-02T13:00:00.000Z");
});

test("a new person waits a day, the rest three, and a passed step always counts", () => {
  assert.equal(clientAlert(base, now)?.kind, "sin-respuesta");
  assert.equal(clientAlert({ ...base, createdAt: new Date(now - 3_600_000).toISOString() }, now), null);
  assert.equal(clientAlert({ ...base, stage: "contactado", lastContactAt: new Date(now - 2 * day).toISOString() }, now), null);
  assert.equal(clientAlert({ ...base, stage: "contactado", lastContactAt: new Date(now - 4 * day).toISOString() }, now)?.label, "Sin contacto hace 4 días");
  assert.equal(clientAlert({ ...base, stage: "negocia", lastContactAt: new Date(now).toISOString(), nextStepAt: new Date(now - 60_000).toISOString() }, now)?.kind, "vencido");
  assert.equal(clientAlert({ ...base, stage: "alquilado" }, now), null);
  assert.equal(clientAlert({ ...base, stage: "perdido" }, now), null);
});

test("search finds names without accents, phones and homes", () => {
  const clients = [base, { ...base, id: "2", name: "Pedro Rojas", whatsapp: "59176543210", source: "instagram" as const, agentId: "a1", propertySlug: "torre-urbari" }];
  const filters = { query: "", agentId: "todos", source: "todos" as const, onlyAlerts: false };
  const titles = new Map([["torre-urbari", "Depto Torre Urbari"]]);
  assert.deepEqual(filterClients(clients, { ...filters, query: "mendez" }, now).map((client) => client.name), ["Carla Méndez"]);
  assert.deepEqual(filterClients(clients, { ...filters, query: "765" }, now).map((client) => client.name), ["Pedro Rojas"]);
  assert.deepEqual(filterClients(clients, { ...filters, query: "urbari" }, now, titles).map((client) => client.name), ["Pedro Rojas"]);
  assert.deepEqual(filterClients(clients, { ...filters, agentId: "sin-agente" }, now).map((client) => client.name), ["Carla Méndez"]);
  assert.deepEqual(filterClients(clients, { ...filters, source: "instagram" }, now).map((client) => client.name), ["Pedro Rojas"]);
});

test("totals count what is open, what ended and the win rate", () => {
  const totals = clientTotals(
    [base, { ...base, stage: "negocia", budgetBob: 5000, lastContactAt: new Date(now).toISOString() }, { ...base, stage: "alquilado" }, { ...base, stage: "perdido" }, { ...base, stage: "alquilado" }],
    now,
  );
  assert.deepEqual(totals, { open: 2, alerts: 1, won: 2, lost: 1, winRate: 67, openBudget: 8500 });
  assert.equal(clientTotals([], now).winRate, null);
});

test("agents need a name and get a free color", () => {
  assert.equal(readAgentInput({ nombre: "" }).ok, false);
  const agent = readAgentInput({ nombre: "Ana Mercado", whatsapp: "71234567", color: "#bad" });
  assert.equal(agent.ok && agent.agent.color, "#2563c9");
  assert.equal(nextAgentColor([{ color: "#2563c9" }]), "#0f766e");
});
