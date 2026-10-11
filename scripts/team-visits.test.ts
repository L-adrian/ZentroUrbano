import assert from "node:assert/strict";
import { test } from "node:test";
import { checkFormTicket, filledHoneypot, issueFormTicket, requestClientKey, spendFormTicket, takeRateLimit } from "../src/lib/form-guard";
import { buildVisitWhatsappMessage } from "../src/lib/property-contact";
import { checkSignup, isDisposableEmail, normalizeSignupName } from "../src/lib/signup-rules";
import { teamMemberSlug, teamPhotoUrl } from "../src/lib/team-roles";
import {
  buildVisitDays,
  defaultVisitSettings,
  unsetVisitSettings,
  isBookableStart,
  normalizeVisitSettings,
  visitSettingsSummary,
  visitShortLabel,
  visitWhenLabel,
} from "../src/lib/visit-slots";

// Saturday 2026-10-10, 08:00 in Santa Cruz (UTC-4).
const saturdayMorning = new Date("2026-10-10T12:00:00.000Z");

test("visit days follow the owner's days and hours, in Bolivian time, with two hours of notice", () => {
  const days = buildVisitDays(defaultVisitSettings, [], saturdayMorning);
  // Monday to Saturday over two weeks: 12 days, Sundays left out.
  assert.equal(days.length, 12);
  assert.equal(days[0].weekday, "Hoy");
  assert.equal(days[0].date, "10 oct");
  // Today starts at 10:00 (08:00 + 2 h notice), the last visit starts at 17:00.
  assert.deepEqual(days[0].slots.map((slot) => slot.label), ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]);
  assert.equal(days[1].weekday, "Lunes");
  assert.equal(days[1].slots[0].start, "2026-10-12T13:00:00.000Z");
  assert.equal(days[1].slots.length, 9);
  assert.ok(days.every((day) => day.weekday !== "Domingo"));
});

test("booked times show as taken and cannot be booked by hand", () => {
  const taken = "2026-10-12T14:00:00.000Z";
  const days = buildVisitDays(defaultVisitSettings, [taken], saturdayMorning);
  const monday = days.find((day) => day.weekday === "Lunes");
  assert.equal(monday?.slots.find((slot) => slot.start === taken)?.taken, true);
  assert.equal(monday?.slots.filter((slot) => slot.taken).length, 1);
  assert.equal(isBookableStart("2026-10-12T14:00:00.000Z", defaultVisitSettings, saturdayMorning), true);
  for (const start of [
    "2026-10-12T14:30:00.000Z", // not on the hour grid
    "2026-10-12T12:00:00.000Z", // 08:00, before the visiting hours
    "2026-10-12T22:00:00.000Z", // 18:00, the visit would end at 19:00
    "2026-10-11T14:00:00.000Z", // Sunday
    "2026-10-10T13:00:00.000Z", // 09:00 today, less than two hours ahead
    "2026-10-31T14:00:00.000Z", // more than two weeks ahead
    "2026-10-12T10:00:00-04:00", // not the exact ISO form the page sends
    "mañana", 42, null,
  ]) {
    assert.equal(isBookableStart(start, defaultVisitSettings, saturdayMorning), false, String(start));
  }
  assert.equal(isBookableStart("2026-10-12T14:00:00.000Z", { ...defaultVisitSettings, enabled: false }, saturdayMorning), false);
});

test("visit labels are written in Bolivian time", () => {
  assert.equal(visitWhenLabel("2026-10-17T14:00:00.000Z"), "sábado 17 de octubre a las 10:00");
  assert.equal(visitShortLabel("2026-10-17T14:00:00.000Z"), "Sáb 17 oct · 10:00");
  assert.equal(visitSettingsSummary(defaultVisitSettings), "Lunes a sábado, de 09:00 a 18:00");
  // Homes whose host never chose hours do not take bookings.
  assert.equal(isBookableStart("2026-10-12T14:00:00.000Z", unsetVisitSettings, saturdayMorning), false);
});

test("visit settings accept only whole half hours between 06:00 and 22:00 with at least one hour", () => {
  assert.deepEqual(normalizeVisitSettings({ enabled: true, weekdays: [6, 1, 1, 9], startMinute: 600, endMinute: 720 }), { enabled: true, weekdays: [1, 6], startMinute: 600, endMinute: 720 });
  assert.equal(normalizeVisitSettings({ enabled: true, weekdays: [], startMinute: 600, endMinute: 720 }), null);
  assert.equal(normalizeVisitSettings({ enabled: true, weekdays: [1], startMinute: 600, endMinute: 630 }), null);
  assert.equal(normalizeVisitSettings({ enabled: true, weekdays: [1], startMinute: 615, endMinute: 720 }), null);
  assert.equal(normalizeVisitSettings({ enabled: true, weekdays: [1], startMinute: 300, endMinute: 720 }), null);
  assert.equal(normalizeVisitSettings({ enabled: "yes", weekdays: [1], startMinute: 600, endMinute: 720 }), null);
  // Turning bookings off keeps the days as they were.
  assert.deepEqual(normalizeVisitSettings({ enabled: false, weekdays: [], startMinute: 600, endMinute: 720 })?.enabled, false);
});

test("the visit message names the time and links the booked times page", () => {
  const property = { type: "Departamento" as const, zone: "Equipetrol", rentalDetails: undefined };
  const toOwner = buildVisitWhatsappMessage({ hostKind: "owner", hostName: "Mario Castro", visitorName: "Carla Méndez", property, when: "sábado 17 de octubre a las 10:00", listingUrl: "https://zentrourbano.com/propiedades/x", visitsUrl: "https://zentrourbano.com/propiedades/x/visitas" });
  assert.match(toOwner, /^Hola Mario, soy Carla Méndez\. Reservé por Zentro Urbano una visita para ver tu departamento en Equipetrol el sábado 17 de octubre a las 10:00\./);
  assert.match(toOwner, /Horarios reservados: https:\/\/zentrourbano\.com\/propiedades\/x\/visitas/);
  const toAmbassador = buildVisitWhatsappMessage({ hostKind: "embajador", hostName: "Ana Rojas", visitorName: "Carla Méndez", property, when: "lunes 12 de octubre a las 09:00", listingUrl: "u", visitsUrl: "v" });
  assert.match(toAmbassador, /^Hola Ana, .* ver la vivienda en Equipetrol/);
});

test("sign-up refuses links as names, throwaway inboxes and easy passwords", () => {
  assert.deepEqual(checkSignup({ displayName: "  María  José Peña ", email: "Maria@Gmail.com", password: "casa-verde-2026" }), { ok: true, name: "María José Peña", email: "maria@gmail.com" });
  for (const name of ["http://spam.com", "Gana dinero www.x.ru", "Juan123", "x", "aaaaaaa", "qwrtzpsdfg", "a@b.com", ""]) {
    assert.equal(normalizeSignupName(name), null, name);
  }
  assert.equal(normalizeSignupName("O'Brien Quispe-Mamani"), "O'Brien Quispe-Mamani");
  assert.equal(isDisposableEmail("bot@mailinator.com"), true);
  assert.equal(isDisposableEmail("bot@x.yopmail.com"), true);
  assert.equal(isDisposableEmail("ana@gmail.com"), false);
  assert.equal(checkSignup({ displayName: "Ana Rojas", email: "ana@guerrillamail.com", password: "casa-verde-2026" }).ok, false);
  assert.equal(checkSignup({ displayName: "Ana Rojas", email: "ana@gmail.com", password: "12345678" }).ok, false);
  assert.equal(checkSignup({ displayName: "Ana Rojas", email: "ana@gmail.com", password: "ana@gmail.com" }).ok, false);
  assert.equal(checkSignup({ displayName: "Ana Rojas", email: "ana@gmail", password: "casa-verde-2026" }).ok, false);
});

test("form tickets must be signed, a few seconds old, for the same form and used once", () => {
  const issuedAt = Date.UTC(2026, 9, 11, 12);
  const ticket = issueFormTicket("signup", issuedAt);
  assert.equal(checkFormTicket(ticket, "signup", issuedAt + 500), "too-fast");
  assert.equal(checkFormTicket(ticket, "signup", issuedAt + 5_000), "ok");
  assert.equal(checkFormTicket(ticket, "visit", issuedAt + 5_000), "invalid");
  assert.equal(checkFormTicket(ticket, "signup", issuedAt + 3 * 60 * 60_000), "expired");
  assert.equal(checkFormTicket(`${ticket.slice(0, -2)}xx`, "signup", issuedAt + 5_000), "invalid");
  assert.equal(checkFormTicket(ticket.replace(String(issuedAt), String(issuedAt - 60_000)), "signup", issuedAt + 5_000), "invalid");
  assert.equal(checkFormTicket(undefined, "signup", issuedAt + 5_000), "invalid");
  spendFormTicket(ticket, issuedAt + 5_000);
  assert.equal(checkFormTicket(ticket, "signup", issuedAt + 6_000), "used");
  assert.equal(filledHoneypot({ sitioWeb: "" }), false);
  assert.equal(filledHoneypot({ sitioWeb: "https://spam.example" }), true);
  assert.equal(filledHoneypot({}), false);
});

test("attempt limits count per connection, using the address set by the server's proxy", () => {
  const limits = [{ max: 2, windowMs: 60_000 }];
  const now = Date.UTC(2026, 9, 11, 12);
  assert.equal(takeRateLimit("test-key", limits, now), true);
  assert.equal(takeRateLimit("test-key", limits, now + 1), true);
  assert.equal(takeRateLimit("test-key", limits, now + 2), false);
  assert.equal(takeRateLimit("test-key", limits, now + 61_000), true);
  // An address made up in the browser's X-Forwarded-For does not change the key.
  const proxied = new Headers({ "x-forwarded-for": "1.2.3.4, 200.87.1.1" });
  const spoofed = new Headers({ "x-forwarded-for": "9.9.9.9, 200.87.1.1" });
  assert.equal(requestClientKey(proxied), requestClientKey(spoofed));
  assert.notEqual(requestClientKey(proxied), requestClientKey(new Headers({ "x-forwarded-for": "200.87.1.2" })));
});

test("team slugs and photo addresses", () => {
  assert.equal(teamMemberSlug("José Ñandú Pérez"), "jose-nandu-perez");
  assert.equal(teamPhotoUrl("abc", 0), null);
  assert.equal(teamPhotoUrl("abc", 3), "/media/equipo/abc/3.webp");
});
