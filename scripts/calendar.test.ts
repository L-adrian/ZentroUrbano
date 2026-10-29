import assert from "node:assert/strict";
import { test } from "node:test";
import {
  boliviaInstant,
  boliviaParts,
  calendarToIcs,
  monthlyOccurrences,
  normalizeEventWhatsapp,
  readCalendarEventInput,
  readCalendarRange,
  reconfirmDay,
  type CalendarEvent,
} from "../src/lib/calendar-input";

test("Bolivian local time is always UTC-4", () => {
  assert.equal(boliviaInstant("2026-10-29", "09:30").toISOString(), "2026-10-29T13:30:00.000Z");
  assert.deepEqual(boliviaParts("2026-10-30T02:15:00.000Z"), { day: "2026-10-29", time: "22:15" });
});

test("the range is two real days at most two months apart", () => {
  const range = readCalendarRange(new URLSearchParams({ desde: "2026-09-28", hasta: "2026-11-08" }));
  assert.equal(range?.start.toISOString(), "2026-09-28T04:00:00.000Z");
  assert.equal(range?.end.toISOString(), "2026-11-09T04:00:00.000Z");
  assert.equal(readCalendarRange(new URLSearchParams({ desde: "2026-02-30", hasta: "2026-03-05" })), null);
  assert.equal(readCalendarRange(new URLSearchParams({ desde: "2026-11-08", hasta: "2026-10-01" })), null);
  assert.equal(readCalendarRange(new URLSearchParams({ desde: "2026-01-01", hasta: "2026-06-01" })), null);
});

test("the form needs a kind, a day and a time, and fills the title", () => {
  const ok = readCalendarEventInput({ kind: "llamada", fecha: "2026-10-30", hora: "11:00", persona: "  Jorge   Suárez ", whatsapp: "7001 2345", nota: "Pidió rebaja\na Bs 3.200" });
  assert.ok(ok.ok);
  assert.equal(ok.event.title, "Llamada o seguimiento · Jorge Suárez");
  assert.equal(ok.event.startsAt.toISOString(), "2026-10-30T15:00:00.000Z");
  assert.equal(ok.event.personWhatsapp, "59170012345");
  assert.equal(ok.event.note, "Pidió rebaja\na Bs 3.200");
  assert.equal(ok.event.repeatMonthly, false);

  assert.deepEqual(readCalendarEventInput({ kind: "fiesta", fecha: "2026-10-30", hora: "11:00" }).ok, false);
  const noTime = readCalendarEventInput({ kind: "visita", fecha: "2026-10-30", hora: "25:00" });
  assert.equal(noTime.ok ? "" : noTime.field, "hora");
  const badPhone = readCalendarEventInput({ kind: "visita", fecha: "2026-10-30", hora: "10:00", whatsapp: "hola" });
  assert.equal(badPhone.ok ? "" : badPhone.field, "whatsapp");
});

test("only rent collection repeats, and all-day events start at local midnight", () => {
  const cobro = readCalendarEventInput({ kind: "cobro", fecha: "2026-11-05", todoElDia: true, repetir: true, titulo: "Cobro ZU-003" });
  assert.ok(cobro.ok);
  assert.equal(cobro.event.repeatMonthly, true);
  assert.equal(cobro.event.startsAt.toISOString(), "2026-11-05T04:00:00.000Z");
  const visita = readCalendarEventInput({ kind: "visita", fecha: "2026-11-05", hora: "10:00", repetir: true });
  assert.ok(visita.ok);
  assert.equal(visita.event.repeatMonthly, false);
});

test("phone numbers: Bolivian ones are normalized, others need the country code", () => {
  assert.equal(normalizeEventWhatsapp("+591 7850 4969"), "59178504969");
  assert.equal(normalizeEventWhatsapp("+1 809 555 0101"), "18095550101");
  assert.equal(normalizeEventWhatsapp("809 555 0101"), null);
  assert.equal(normalizeEventWhatsapp(""), null);
});

test("a monthly event on the 31st falls on the last day of short months", () => {
  const dates = monthlyOccurrences("2026-01-31T14:00:00.000Z", new Date("2026-01-01T00:00:00Z"), new Date("2026-05-01T00:00:00Z"));
  assert.deepEqual(dates.map((date) => boliviaParts(date).day), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  assert.ok(dates.every((date) => boliviaParts(date).time === "10:00"));
});

test("a live home asks to be confirmed 21 days after the last confirmation", () => {
  assert.equal(reconfirmDay("2026-10-10T20:00:00.000Z"), "2026-10-31");
  assert.equal(reconfirmDay(null), null);
  assert.equal(reconfirmDay("no"), null);
});

test("the .ics file escapes text, folds long lines and skips cancelled visits", () => {
  const base: CalendarEvent = {
    id: "reserva-1",
    kind: "visita",
    source: "reserva",
    title: "Visita · Carla, la de Urbarí; mañana",
    startsAt: "2026-10-29T13:30:00.000Z",
    allDay: false,
    repeatMonthly: false,
    propertySlug: "depto-urbari",
    propertyTitle: "Departamento de 2 dormitorios en Urbarí con vista a la piscina y garaje techado",
    personName: "Carla",
    personWhatsapp: "59170012345",
    note: null,
    cancelled: false,
  };
  const ics = calendarToIcs(
    [base, { ...base, id: "reserva-2", cancelled: true }, { ...base, id: "x@2026-11", kind: "cobro", allDay: true, startsAt: "2026-11-05T04:00:00.000Z", title: "Cobro" }],
    { name: "Zentro Urbano", origin: "https://zentrourbano.com", now: new Date("2026-10-28T00:00:00Z") },
  );
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.ok(ics.includes("SUMMARY:Visita · Carla\\, la de Urbarí\\; mañana"));
  assert.ok(ics.includes("UID:x-2026-11@zentrourbano"));
  assert.match(ics, /DTSTART:20261029T133000Z\r\nDTEND:20261029T140000Z/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261105\r\nDTEND;VALUE=DATE:20261106/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.ok(ics.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75));
  assert.match(ics, /URL:https:\/\/zentrourbano.com\/propiedades\/depto-urbari/);
});
