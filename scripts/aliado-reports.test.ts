import assert from "node:assert/strict";
import { test } from "node:test";
import { boliviaToday, monthRange, readReportInput, shiftDate } from "../src/lib/aliado-report-input";

const today = "2026-10-14";

test("an aliado report is read from the form", () => {
  const report = readReportInput({ date: "2026-10-13", channel: "facebook", place: "  Alquileres   SCZ ", url: "facebook.com/groups/x", people: "4", owners: 2, note: "" }, today);
  assert.deepEqual(report, { date: "2026-10-13", channel: "facebook", place: "Alquileres SCZ", url: "https://facebook.com/groups/x", people: 4, owners: 2, note: null });
});

test("a link in the place field becomes the link, and a link alone names the place", () => {
  const pasted = readReportInput({ date: today, channel: "tiktok", place: "https://www.tiktok.com/@zentro/video/1" }, today);
  assert.ok(typeof pasted !== "string" && pasted.url === "https://www.tiktok.com/@zentro/video/1");
  const linkOnly = readReportInput({ date: today, channel: "otro", place: "", url: "https://www.zentrourbano.com/lista" }, today);
  assert.ok(typeof linkOnly !== "string" && linkOnly.place === "zentrourbano.com/lista");
});

test("future days, unknown places, missing names and bad counts are refused", () => {
  assert.equal(typeof readReportInput({ date: "2026-10-15", channel: "facebook", place: "x" }, today), "string");
  assert.equal(typeof readReportInput({ date: today, channel: "radio", place: "x" }, today), "string");
  assert.equal(typeof readReportInput({ date: today, channel: "calle", place: " " }, today), "string");
  assert.equal(typeof readReportInput({ date: today, channel: "calle", place: "Plan 3000", people: -1 }, today), "string");
  assert.equal(typeof readReportInput({ date: today, channel: "calle", place: "Plan 3000", owners: 2.5 }, today), "string");
  const script = readReportInput({ date: today, channel: "otro", place: "x", url: "javascript:alert(1)" }, today);
  assert.ok(typeof script !== "string" && script.url === null);
});

test("Bolivia dates and month ranges", () => {
  assert.equal(boliviaToday(new Date("2026-10-15T03:30:00Z")), "2026-10-14");
  assert.equal(shiftDate("2026-10-01", -1), "2026-09-30");
  assert.deepEqual(monthRange("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
});
