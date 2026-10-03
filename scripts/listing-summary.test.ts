import assert from "node:assert/strict";
import { test } from "node:test";
import { getAvailabilityShortLabel, getEntryCost, getGuaranteeLabel, getListingHighlights } from "../src/lib/listing-summary";
import type { Property } from "../src/lib/properties";

const day = 86_400_000;

test("availability labels count whole days since confirmation", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  assert.equal(getAvailabilityShortLabel({ availabilityConfirmedAt: "2026-10-03T08:00:00Z" }, now), "hoy");
  assert.equal(getAvailabilityShortLabel({ availabilityConfirmedAt: new Date(now - day).toISOString() }, now), "hace 1 día");
  assert.equal(getAvailabilityShortLabel({ availabilityConfirmedAt: new Date(now - 5 * day).toISOString() }, now), "hace 5 días");
  assert.equal(getAvailabilityShortLabel({ availabilityConfirmedAt: undefined }, now), null);
  assert.equal(getAvailabilityShortLabel({ availabilityConfirmedAt: new Date(now - 45 * day).toISOString() }, now), null);
});

test("entry cost adds first month and guarantee from listing requirements", () => {
  assert.deepEqual(getEntryCost({ price: 3500, requirements: ["Garantía de 1 mes."] }), { rent: 3500, expenses: 0, deposit: 3500, total: 7000 });
  assert.deepEqual(getEntryCost({ price: 1200, requirements: ["Sin garantía"] }), { rent: 1200, expenses: 0, deposit: 0, total: 1200 });
  assert.equal(getEntryCost({ price: 1200, requirements: ["Consultar condiciones"] }), null);
  assert.equal(getGuaranteeLabel({ requirements: ["Garantía: 2 meses"] }), "2 meses");
});

test("entry cost uses declared guarantee and expenses for owner publications", () => {
  const rentalDetails = { commonExpenses: 200, guarantee: "1 mes de alquiler", guaranteeAmount: null } as unknown as Property["rentalDetails"];
  assert.deepEqual(getEntryCost({ price: 2000, requirements: [], rentalDetails }), { rent: 2000, expenses: 200, deposit: 2000, total: 4200 });
});

test("highlights only list confirmed amenities", () => {
  const base = { pets: false, garage: 0, furnished: false, pool: false, patio: false, security: false, grill: false } as Property;
  assert.deepEqual(getListingHighlights(base), []);
  assert.deepEqual(getListingHighlights({ ...base, pets: true, garage: 1, pool: true, patio: true }), ["Acepta mascotas", "Parqueo", "Piscina"]);
});
