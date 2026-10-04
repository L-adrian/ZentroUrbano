import assert from "node:assert/strict";
import { test } from "node:test";
import { getAvailabilityState, getEntryCost, getGuaranteeLabel, getListingHighlights } from "../src/lib/listing-summary";
import type { Property } from "../src/lib/properties";
import { buildOwnerWhatsappMessage, ownerFirstName } from "../src/lib/property-contact";
import { countReportsSince } from "../src/lib/property-reports";
import { isSameSiteRequest, visibleOrigin } from "../src/lib/request-origin";
import { questionLines, questionsQuery, readQuestionChoices, suggestedQuestions } from "../src/lib/whatsapp-questions";

const day = 86_400_000;

test("availability labels count whole days since confirmation", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  const label = (availabilityConfirmedAt?: string) => getAvailabilityState({ availabilityConfirmedAt }, now).shortLabel;
  assert.equal(label("2026-10-03T08:00:00Z"), "Disponible · hoy");
  assert.equal(label(new Date(now - day).toISOString()), "Disponible · hace 1 día");
  assert.equal(label(new Date(now - 5 * day).toISOString()), "Disponible · hace 5 días");
  assert.equal(label(undefined), "Por confirmar");
});

test("a confirmation stops counting as available after 21 days or 5 reports", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  const confirmed = (days: number, availabilityReports = 0) =>
    getAvailabilityState({ availabilityConfirmedAt: new Date(now - days * day).toISOString(), availabilityReports }, now);
  assert.equal(confirmed(21).fresh, true);
  assert.equal(confirmed(22).fresh, false);
  assert.equal(confirmed(22).reason, "old");
  assert.match(confirmed(22).detail, /hace 22 días/);
  assert.equal(confirmed(2, 4).fresh, true);
  assert.equal(confirmed(2, 5).fresh, false);
  assert.equal(confirmed(2, 5).reason, "reported");
  assert.equal(getAvailabilityState({ availabilityConfirmedAt: undefined }, now).reason, "missing");
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

test("reports only count after the latest availability confirmation", () => {
  const confirmedAt = "2026-10-01T12:00:00Z";
  const before = Date.parse("2026-09-30T12:00:00Z");
  const after = Date.parse("2026-10-02T12:00:00Z");
  assert.equal(countReportsSince([before, after, after + 1], confirmedAt), 2);
  assert.equal(countReportsSince([before, after], undefined), 2);
  assert.equal(countReportsSince(undefined, confirmedAt), 0);
});

test("first WhatsApp message names the home, price and link, and greets real names only", () => {
  const property = { agent: { name: "Luis Mario Castro" }, type: "Departamento", zone: "Equipetrol", rentalDetails: undefined } as unknown as Property;
  const message = buildOwnerWhatsappMessage(property, "Bs 3.500/mes", "https://zentrourbano.com/propiedades/x");
  assert.equal(message, "Hola Luis, vi en Zentro Urbano tu departamento en Equipetrol a Bs 3.500/mes: https://zentrourbano.com/propiedades/x\n¿Sigue disponible? Me gustaría coordinar una visita.");
  assert.equal(ownerFirstName("Equipo Zentro Urbano"), null);
  assert.equal(ownerFirstName("Familia Rivero"), null);
  assert.equal(ownerFirstName("Propietario de la vivienda"), null);
  assert.equal(ownerFirstName("María José"), "María");
  assert.match(buildOwnerWhatsappMessage({ ...property, agent: { ...property.agent, name: "Familia Rivero" } }, "Bs 1", "u"), /^Hola, vi/);
});

test("same-site check uses the address people see, not the server's own address", () => {
  const behindProxy = (headers: Record<string, string>) =>
    new Request("http://0.0.0.0:3000/api/propiedades/x/reportar", { method: "POST", headers: { host: "0.0.0.0:3000", "x-forwarded-host": "zentrourbano.com", "x-forwarded-proto": "https", ...headers } });
  assert.equal(isSameSiteRequest(behindProxy({ origin: "https://zentrourbano.com" })), true);
  assert.equal(isSameSiteRequest(behindProxy({ origin: "https://otro-sitio.com" })), false);
  assert.equal(isSameSiteRequest(behindProxy({ origin: "https://zentrourbano.com", "sec-fetch-site": "cross-site" })), false);
  assert.equal(isSameSiteRequest(behindProxy({})), true);
  assert.equal(visibleOrigin(behindProxy({})), "https://zentrourbano.com");
  const direct = new Request("http://localhost:3112/api/x", { method: "POST", headers: { host: "127.0.0.1:3112", origin: "http://127.0.0.1:3112" } });
  assert.equal(isSameSiteRequest(direct), true);
});

test("optional WhatsApp questions travel as codes and become plain lines", () => {
  const query = questionsQuery({ questions: ["garantia", "desde"], people: 3, pet: true, moveIn: "proximo-mes" });
  assert.equal(query, "preguntas=garantia%2Cdesde&personas=3&mascota=1&mudanza=proximo-mes");
  const choices = readQuestionChoices(new URLSearchParams(query));
  assert.deepEqual(questionLines(choices), [
    "Seríamos 3 personas.",
    "Tengo una mascota, ¿la aceptan?",
    "Me mudaría el próximo mes.",
    "¿Cuánto es la garantía?",
    "¿Desde qué fecha se puede entrar?",
  ]);
  // Unknown codes, repeated codes and odd values are dropped, never echoed into the message.
  const tampered = readQuestionChoices(new URLSearchParams("preguntas=garantia,garantia,hola&personas=40&mascota=si&mudanza=ayer"));
  assert.deepEqual(tampered, { questions: ["garantia"], people: null, pet: false, moveIn: null });
  // "6 o más" never tells the owner an exact 6.
  assert.deepEqual(questionLines({ ...readQuestionChoices(new URLSearchParams("personas=6")) }), ["Seríamos 6 o más personas."]);
  assert.equal(readQuestionChoices(new URLSearchParams("personas=8")).people, null);
  const base = { requirements: ["Garantía: consultar"], rentalDetails: undefined, bathrooms: 0 };
  assert.deepEqual(suggestedQuestions(base), ["garantia", "expensas", "banos", "servicios", "desde", "contrato"]);
  assert.deepEqual(suggestedQuestions({ ...base, requirements: ["Garantía de 1 mes"], bathrooms: 2 }), ["expensas", "servicios", "desde", "contrato"]);
  const message = buildOwnerWhatsappMessage(
    { agent: { name: "Luis" }, type: "Departamento", zone: "Equipetrol" } as Property,
    "Bs 3.500/mes",
    "u",
    ["Seríamos 2 personas."],
  );
  assert.equal(message, "Hola Luis, vi en Zentro Urbano tu departamento en Equipetrol a Bs 3.500/mes: u\n¿Sigue disponible? Me gustaría coordinar una visita.\nSeríamos 2 personas.");
});
