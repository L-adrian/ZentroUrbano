import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  availabilityPrompt,
  formatBoliviaDay,
  movePhoto,
  moveToCover,
  nextShortDescription,
  ownerListingStatus,
  ownerPhotoSrc,
  ownerWhatsappLink,
  recentOwnerRequests,
  sortReportedListings,
} from "../src/lib/listing-moderation";
import { getPublicationStepErrors, parsePublicationDetails, publicationFieldStep, publicationRequirements, validatePublicationDetails } from "../src/lib/publication-input";
import { supportHoursLabel } from "../src/lib/property-reports";
import { rentalFaq } from "../src/lib/support-content";

const day = 86_400_000;
const valid = { title: "Departamento en alquiler", type: "Departamento", zone: "Equipetrol", address: "Calle referencial", bedrooms: "2", bathrooms: "1", area: "", garage: "1", pets: false, furnished: false, security: true, pool: false, patio: false, grill: false, elevator: false, price: "3500", currency: "BOB", exchangeRate: "", commonExpenses: "0", guarantee: "1 mes de alquiler", guaranteeAmount: "", description: "Departamento de 2 dormitorios con cocina equipada y parqueo techado." };
const base = { currency: "BOB" as const, guarantee: "1 mes de alquiler", guaranteeAmount: null, commonExpenses: 0 };

test("entry conditions only list what the owner answered", () => {
  assert.deepEqual(publicationRequirements(base), ["1 mes de garantía", "Sin expensas aparte", "Sin comisión de intermediación"]);
  assert.equal(publicationRequirements({ ...base, expensesMode: "included" })[1], "Expensas incluidas en el alquiler");
  assert.equal(publicationRequirements({ ...base, expensesMode: "none" })[1], "No se cobran expensas");
  assert.equal(publicationRequirements({ ...base, expensesMode: "separate", commonExpenses: 300 })[1], "Expensas: Bs 300 por mes");
  assert.equal(publicationRequirements({ ...base, expensesMode: "separate" })[1], "Expensas: pendiente de consulta");
  assert.equal(publicationRequirements({ ...base, currency: "USD", commonExpenses: 40 })[1], "Expensas: USD 40 por mes");
  assert.equal(publicationRequirements({ ...base, guarantee: "Consultar con el propietario" })[0], "Garantía: pendiente de consulta");
  assert.equal(publicationRequirements({ ...base, guarantee: "Otro monto", guaranteeAmount: 2000 })[0], "Garantía: Bs 2000");
  assert.equal(publicationRequirements({ ...base, guarantee: "Sin garantía" })[0], "Sin garantía");
  for (const guarantee of ["Sin garantía", "1 mes de alquiler", "2 meses de alquiler", "Otro monto", "Consultar con el propietario"]) {
    const text = publicationRequirements({ ...base, guarantee }).join(" ");
    assert.doesNotMatch(text, /adelantado/i);
    // An old 0 never becomes "included": the owner may have meant "not charged".
    assert.doesNotMatch(text, /incluidas/i);
  }
});

test("the expenses question keeps the amount consistent with the answer", () => {
  assert.deepEqual(
    [parsePublicationDetails({ ...valid, expensesMode: "included", commonExpenses: "500" })?.commonExpenses, parsePublicationDetails({ ...valid, expensesMode: "included" })?.expensesMode],
    [0, "included"],
  );
  assert.equal(parsePublicationDetails({ ...valid, expensesMode: "none", commonExpenses: "" })?.commonExpenses, 0);
  assert.equal(parsePublicationDetails({ ...valid, expensesMode: "separate", commonExpenses: "300" })?.commonExpenses, 300);
  assert.match(validatePublicationDetails({ ...valid, expensesMode: "separate", commonExpenses: "" }).fieldErrors.commonExpenses ?? "", /monto de las expensas/);
  assert.match(validatePublicationDetails({ ...valid, expensesMode: "separate", commonExpenses: "0" }).fieldErrors.commonExpenses ?? "", /monto de las expensas/);
  assert.match(validatePublicationDetails({ ...valid, expensesMode: "maybe" }).fieldErrors.commonExpenses ?? "", /incluidas, no se cobran o se pagan aparte/);
  // Requests sent before the question existed still validate as before.
  assert.equal(parsePublicationDetails(valid)?.expensesMode, undefined);
  assert.match(validatePublicationDetails({ ...valid, commonExpenses: "" }).fieldErrors.commonExpenses ?? "", /Escribe 0/);
  assert.equal(publicationFieldStep("expensesMode"), 2);
  assert.ok(getPublicationStepErrors(2, { ...valid, expensesMode: "separate", commonExpenses: "" }, "Ana", "78504969").commonExpenses);
  assert.deepEqual(getPublicationStepErrors(1, { ...valid, expensesMode: "separate", commonExpenses: "" }, "Ana", "78504969"), {});
});

test("the pets answer decides the pets flag", () => {
  assert.equal(parsePublicationDetails({ ...valid, petsPolicy: "allowed", pets: false })?.pets, true);
  assert.equal(parsePublicationDetails({ ...valid, petsPolicy: "not_allowed", pets: true })?.pets, false);
  const consult = parsePublicationDetails({ ...valid, petsPolicy: "consult", pets: true });
  assert.deepEqual([consult?.pets, consult?.petsPolicy], [false, "consult"]);
  assert.equal(parsePublicationDetails({ ...valid, pets: true })?.pets, true);
  assert.equal(parsePublicationDetails({ ...valid, petsPolicy: "sometimes" }), null);
});

test("listing status for the owner panel", () => {
  assert.equal(ownerListingStatus("active", true), "live");
  assert.equal(ownerListingStatus("rented", false), "rented");
  assert.equal(ownerListingStatus("paused", false), "paused");
  assert.equal(ownerListingStatus("active", false), "paused");
  assert.equal(ownerListingStatus("review", false), "review");
  assert.equal(ownerListingStatus("review", true), "review");
});

test("owners are asked to confirm from day 18 and urgently once the listing is stale", () => {
  const now = Date.parse("2026-10-04T15:00:00Z");
  const at = (days: number) => new Date(now - days * day).toISOString();
  assert.equal(availabilityPrompt({ availabilityConfirmedAt: at(0) }, now).ask, false);
  assert.equal(availabilityPrompt({ availabilityConfirmedAt: at(17) }, now).ask, false);
  const reminder = availabilityPrompt({ availabilityConfirmedAt: at(18) }, now);
  assert.deepEqual([reminder.ask, reminder.urgent, reminder.message], [true, false, "En 3 días vence tu confirmación. ¿Sigue disponible?"]);
  assert.equal(availabilityPrompt({ availabilityConfirmedAt: at(20) }, now).message, "En 1 día vence tu confirmación. ¿Sigue disponible?");
  assert.equal(availabilityPrompt({ availabilityConfirmedAt: at(21) }, now).message, "Hoy vence tu confirmación. ¿Sigue disponible?");
  const stale = availabilityPrompt({ availabilityConfirmedAt: at(22) }, now);
  assert.deepEqual([stale.ask, stale.urgent, stale.state.fresh], [true, true, false]);
  assert.equal(availabilityPrompt({ availabilityConfirmedAt: undefined }, now).urgent, true);
  const reported = availabilityPrompt({ availabilityConfirmedAt: at(2), availabilityReports: 5 }, now);
  assert.equal(reported.urgent, true);
  assert.match(reported.message, /Varias personas avisaron/);
  assert.equal(availabilityPrompt({ availabilityConfirmedAt: at(2), availabilityReports: 4 }, now).ask, false);
});

test("Mi cuenta keeps pending requests and the ones decided in the last 45 days", () => {
  const now = Date.parse("2026-10-04T15:00:00Z");
  const at = (days: number) => new Date(now - days * day).toISOString();
  const requests = [
    { id: "pending-old", status: "pending_review", createdAt: at(90), reviewedAt: null },
    { id: "rejected-recent", status: "rejected", createdAt: at(60), reviewedAt: at(10) },
    { id: "approved-old", status: "approved", createdAt: at(80), reviewedAt: at(46) },
    { id: "approved-no-review-date", status: "approved", createdAt: at(3) },
  ];
  assert.deepEqual(recentOwnerRequests(requests, now).map((request) => request.id), ["pending-old", "rejected-recent", "approved-no-review-date"]);
});

test("hidden listings show their photos through the owner route", () => {
  const photo = "/media/propiedades/publication_0123456789abcdef01234567/01.webp";
  assert.equal(ownerPhotoSrc(photo, true), photo);
  assert.equal(ownerPhotoSrc(photo, false), "/api/cliente/fotos/publication_0123456789abcdef01234567/01.webp");
  assert.equal(ownerPhotoSrc("/images/propiedades/demo.jpg", false), "/images/propiedades/demo.jpg");
  assert.equal(ownerPhotoSrc("/media/propiedades/../secret/01.webp", false), "/media/propiedades/../secret/01.webp");
});

test("photo order editing keeps every photo and the cover is the first one", () => {
  const images = ["a", "b", "c", "d"];
  assert.deepEqual(moveToCover(images, 2), ["c", "a", "b", "d"]);
  assert.deepEqual(moveToCover(images, 0), images);
  assert.deepEqual(moveToCover(images, 9), images);
  assert.deepEqual(movePhoto(images, 1, -1), ["b", "a", "c", "d"]);
  assert.deepEqual(movePhoto(images, 3, 1), images);
  assert.deepEqual(movePhoto(images, 0, -1), images);
  assert.deepEqual(images, ["a", "b", "c", "d"]);
});

test("the short description follows the long one only when it was derived from it", () => {
  const long = "Departamento amplio con dos dormitorios y balcón.";
  assert.equal(nextShortDescription({ shortDescription: long, longDescription: long }, "Texto nuevo para el anuncio."), "Texto nuevo para el anuncio.");
  assert.equal(nextShortDescription({ shortDescription: "Resumen propio", longDescription: long }, "Texto nuevo."), "Resumen propio");
  const longer = "x".repeat(300);
  assert.equal(nextShortDescription({ shortDescription: longer.slice(0, 240), longDescription: longer }, "y".repeat(300)), "y".repeat(240));
});

test("admin sees possible scams first, then the most reported and newest", () => {
  const items = [
    { slug: "a", reasons: { ya_alquilada: 6 }, total: 6, lastAt: "2026-10-03T10:00:00Z" },
    { slug: "b", reasons: { pidio_dinero: 1 }, total: 1, lastAt: "2026-09-20T10:00:00Z" },
    { slug: "c", reasons: { ya_alquilada: 6 }, total: 6, lastAt: "2026-10-04T10:00:00Z" },
    { slug: "d", reasons: { datos_distintos: 1, otro: 2 }, total: 3, lastAt: "2026-10-01T10:00:00Z" },
    { slug: "e", reasons: { otro: 9 }, total: 9, lastAt: "2026-10-04T11:00:00Z" },
  ];
  assert.deepEqual(sortReportedListings(items).map((item) => item.slug), ["b", "d", "c", "a", "e"]);
});

test("WhatsApp links to owners are only built for real numbers", () => {
  assert.equal(ownerWhatsappLink("59178504969", "Hola"), "https://wa.me/59178504969?text=Hola");
  assert.equal(ownerWhatsappLink("https://wa.me/59178504969?text=viejo", "¿Sigue libre?"), `https://wa.me/59178504969?text=${encodeURIComponent("¿Sigue libre?")}`);
  assert.equal(ownerWhatsappLink("+591 785-04969", "x"), "https://wa.me/59178504969?text=x");
  assert.equal(ownerWhatsappLink("123", "x"), null);
  assert.equal(ownerWhatsappLink(null, "x"), null);
});

test("dates are shown in Bolivia time on server and browser alike", () => {
  assert.equal(formatBoliviaDay("2026-10-04T02:00:00Z"), "3 oct 2026");
  assert.equal(formatBoliviaDay("2026-10-04T05:00:00Z"), "4 oct 2026");
  assert.equal(formatBoliviaDay("no es fecha"), "fecha desconocida");
  assert.equal(formatBoliviaDay(null), "fecha desconocida");
});

test("owner copy says publishing is free and stays honest about the review", () => {
  const faq = rentalFaq.find((item) => item.question === "¿Cuesta publicar mi vivienda?");
  assert.match(faq?.answer ?? "", /Publicar es gratis/);
  assert.ok(rentalFaq.some((item) => item.answer.includes(supportHoursLabel)));
  assert.ok(rentalFaq.some((item) => item.question === "¿Qué hago cuando ya alquilé mi vivienda?"));
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const dashboard = read("src/components/client-dashboard.tsx");
  for (const removed of ["Ver planes", "Conversión", "Reportes semanales", "Plan Básico"]) assert.ok(!dashboard.includes(removed), removed);
  assert.ok(dashboard.includes("una vez por teléfono o computadora"));
  const wizard = read("src/components/publish-wizard.tsx");
  assert.ok(!wizard.includes("verificará identidad"));
  assert.ok(!wizard.includes("Confirmaremos identidad"));
  for (const page of ["src/app/bienvenida/page.tsx", "src/app/requisitos/page.tsx", "src/app/publicar/page.tsx"]) assert.ok(read(page).includes("OwnerServicesNote"), page);
  assert.ok(read("src/components/owner-services-note.tsx").includes("Consúltanos por WhatsApp"));
});
