import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { test } from "node:test";
import type { CalendarEvent } from "../src/lib/calendar-input";
import type { AgencyAgent, AgencyClient } from "../src/lib/crm-input";
import { readAgentLoginInput, suggestedUsername } from "../src/lib/crm-input";
import { homeRows, hoursLabel, panelStats } from "../src/lib/crm-stats";
import { googleEventBody, googleEventId, openToken, sealToken } from "../src/lib/google-calendar-event";
import { buildCsv, buildXlsx } from "../src/lib/xlsx";

// Thursday 29 October 2026, 12:00 in Bolivia.
const now = Date.parse("2026-10-29T16:00:00Z");
const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString();
const client = (patch: Partial<AgencyClient>): AgencyClient => ({
  id: "c",
  name: "Cliente",
  whatsapp: null,
  stage: "nuevo",
  source: "zentro",
  budgetBob: null,
  wants: null,
  propertySlug: null,
  agentId: null,
  nextStep: null,
  nextStepAt: null,
  lastContactAt: null,
  firstContactAt: null,
  lostReason: null,
  note: null,
  stageChangedAt: hoursAgo(1),
  createdAt: hoursAgo(1),
  ...patch,
});
const agents: AgencyAgent[] = [
  { id: "a1", name: "Ana", whatsapp: null, color: "#2563c9", active: true },
  { id: "a2", name: "Luis", whatsapp: null, color: "#0f766e", active: false },
];

test("the panel counts arrivals, closings, response times and agents for the period", () => {
  const clients = [
    client({ id: "1", agentId: "a1", source: "facebook", createdAt: hoursAgo(72), firstContactAt: hoursAgo(70), lastContactAt: hoursAgo(70), stage: "alquilado", stageChangedAt: hoursAgo(5), budgetBob: 3000 }),
    client({ id: "2", agentId: "a1", source: "facebook", createdAt: hoursAgo(100), firstContactAt: hoursAgo(50), lastContactAt: hoursAgo(50), stage: "perdido", lostReason: "precio", stageChangedAt: hoursAgo(10) }),
    client({ id: "3", agentId: null, createdAt: hoursAgo(48), stage: "nuevo", budgetBob: 2500 }),
    client({ id: "4", agentId: "a1", createdAt: hoursAgo(3), stage: "contactado", firstContactAt: hoursAgo(2), lastContactAt: hoursAgo(2) }),
    // Arrived long before the period: counts as open, not as arrived.
    client({ id: "5", agentId: "a2", createdAt: hoursAgo(24 * 200), stage: "visita", stageChangedAt: hoursAgo(24 * 150) }),
  ];
  const stats = panelStats(clients, agents, "30", now);
  assert.equal(stats.arrived, 4);
  assert.equal(stats.won, 1);
  assert.equal(stats.lost, 1);
  assert.equal(stats.winRate, 50);
  assert.equal(stats.open, 3);
  assert.equal(stats.openBudget, 2500);
  assert.equal(stats.wonBudget, 3000);
  // Answered in 2 h, 50 h and 1 h; median 2 h. On time: 1 and 4; late: 2 and 3 (waiting 2 days).
  assert.equal(stats.responseHours, 2);
  assert.equal(stats.onTimeRate, 50);
  assert.deepEqual(stats.lostBy, [{ reason: "precio", count: 1 }]);
  assert.deepEqual(stats.bySource.find((entry) => entry.source === "facebook"), { source: "facebook", count: 2, won: 1, winRate: 50 });
  assert.equal(stats.weeks.length, 8);
  assert.equal(stats.weeks.at(-1)?.start, "2026-10-26");
  assert.equal(stats.weeks.reduce((sum, week) => sum + week.count, 0), 4);
  const ana = stats.agents.find((row) => row.agentId === "a1");
  assert.deepEqual([ana?.arrived, ana?.open, ana?.won, ana?.lost], [3, 1, 1, 1]);
  // The inactive agent stays while they still have an open client; the unassigned one is added.
  assert.ok(stats.agents.some((row) => row.agentId === "a2" && row.open === 1));
  assert.ok(stats.agents.some((row) => row.agentId === null && row.name === "Sin agente"));
  assert.equal(panelStats([], agents, "todo", now).winRate, null);
});

test("each home shows its views, visits and interested clients", () => {
  const rows = homeRows(
    [{ slug: "casa", title: "Casa", views30: 40, contacts30: 5 }, { slug: "depa", title: "Depa", views30: 90, contacts30: 2 }],
    [client({ propertySlug: "casa" }), client({ propertySlug: "casa", stage: "alquilado" })],
    [{ propertySlug: "casa", startsAt: hoursAgo(10), status: "reserved" }, { propertySlug: "casa", startsAt: hoursAgo(10), status: "cancelled" }],
    "30",
    now,
  );
  assert.deepEqual(rows.map((row) => row.slug), ["depa", "casa"]);
  assert.deepEqual(rows[1], { slug: "casa", title: "Casa", views: 40, contacts: 5, visits: 1, clients: 2, open: 1, won: 1 });
});

test("response times read in minutes, hours or days", () => {
  assert.equal(hoursLabel(null), "—");
  assert.equal(hoursLabel(0.25), "15 min");
  assert.equal(hoursLabel(5.4), "5 h");
  assert.equal(hoursLabel(72), "3 días");
});

test("an agent's user and password are checked", () => {
  assert.deepEqual(readAgentLoginInput({ usuario: " Ana.Mercado ", contrasena: "sol-luna-42" }), { ok: true, username: "ana.mercado", password: "sol-luna-42" });
  assert.equal(readAgentLoginInput({ usuario: "a", contrasena: "sol-luna-42" }).ok, false);
  assert.equal(readAgentLoginInput({ usuario: "ana", contrasena: "corta" }).ok, false);
  assert.equal(suggestedUsername("José Ñuflo Pérez"), "jose.nuflo");
});

test("the CSV opens right in Excel and does not run formulas", () => {
  const csv = buildCsv(
    [{ header: "Nombre" }, { header: "Monto", format: "money" }, { header: "Fecha", format: "date" }],
    [["=HYPERLINK(\"x\")", 1500, new Date("2026-10-29T03:00:00Z")], ["Ana; Luis", null, null], ["+591 70011122", null, null]],
  );
  assert.ok(csv.startsWith("﻿Nombre;Monto;Fecha\r\n"));
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"x\"\")\";1500;2026-10-28\r\n"));
  assert.ok(csv.includes("\"Ana; Luis\";;\r\n"));
  assert.ok(csv.includes("\r\n+591 70011122;;\r\n"));
});

// Reads the files of a zip written by buildXlsx (stored or deflated entries).
function unzip(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  const files = new Map<string, string>();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const start = offset + 30 + nameLength + extraLength;
    const data = buffer.subarray(start, start + size);
    files.set(name, (method === 8 ? inflateRawSync(data) : data).toString("utf8"));
    offset = start + size;
  }
  return files;
}

test("the Excel file is a workbook with one sheet per table", () => {
  const files = unzip(
    buildXlsx([
      { name: "Clientes", columns: [{ header: "Nombre" }, { header: "Presupuesto", format: "money" }], rows: [["Ana & <Luis>", 2500]] },
      { name: "Agentes", columns: [{ header: "Agente" }], rows: [] },
    ]),
  );
  for (const name of ["[Content_Types].xml", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]) assert.ok(files.has(name), name);
  assert.match(files.get("xl/workbook.xml") ?? "", /name="Clientes"[\s\S]*name="Agentes"/);
  const sheet = files.get("xl/worksheets/sheet1.xml") ?? "";
  assert.ok(sheet.includes("Ana &amp; &lt;Luis&gt;"));
  assert.ok(sheet.includes("<v>2500</v>"));
});

test("a Google refresh token is stored sealed and opens only with the same key", () => {
  const before = { secret: process.env.GOOGLE_CLIENT_SECRET, key: process.env.CALENDAR_TOKEN_KEY };
  try {
    delete process.env.CALENDAR_TOKEN_KEY;
    process.env.GOOGLE_CLIENT_SECRET = "secreto-de-prueba";
    const sealed = sealToken("1//refresh-token");
    assert.ok(!sealed.includes("refresh-token"));
    assert.equal(openToken(sealed), "1//refresh-token");
    process.env.CALENDAR_TOKEN_KEY = "otra-clave";
    assert.equal(openToken(sealed), null);
    assert.equal(openToken("v1.basura"), null);
  } finally {
    if (before.secret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = before.secret;
    if (before.key === undefined) delete process.env.CALENDAR_TOKEN_KEY;
    else process.env.CALENDAR_TOKEN_KEY = before.key;
  }
});

test("a Zentro event becomes the same Google event every time", () => {
  const id = googleEventId("cuenta-1", "visita:abc");
  assert.match(id, /^zu[0-9a-f]{40}$/);
  assert.equal(id, googleEventId("cuenta-1", "visita:abc"));
  assert.notEqual(id, googleEventId("cuenta-2", "visita:abc"));

  const event: CalendarEvent = {
    id: "visita:abc",
    kind: "visita",
    source: "reserva",
    title: "Visita de Ana",
    startsAt: "2026-10-30T14:00:00.000Z",
    allDay: false,
    repeatMonthly: false,
    propertySlug: "casa",
    propertyTitle: "Casa en Equipetrol",
    personName: "Ana",
    personWhatsapp: "59170000000",
    note: null,
    cancelled: false,
  };
  const body = googleEventBody(event, "https://zentrourbano.com");
  assert.deepEqual(body.start, { dateTime: "2026-10-30T14:00:00.000Z", timeZone: "America/La_Paz" });
  assert.deepEqual(body.end, { dateTime: "2026-10-30T14:30:00.000Z", timeZone: "America/La_Paz" });
  assert.ok(body.description.includes("https://wa.me/59170000000"));
  assert.ok(body.description.includes("https://zentrourbano.com/cliente#calendario"));
  // A day-long reminder at 20:30 in Bolivia is still that day, not the next one in UTC.
  const allDay = googleEventBody({ ...event, allDay: true, startsAt: "2026-10-31T00:30:00.000Z" }, "https://zentrourbano.com");
  assert.deepEqual([allDay.start, allDay.end], [{ date: "2026-10-30" }, { date: "2026-10-31" }]);
});
