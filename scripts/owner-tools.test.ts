import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import {
  beforeVisitFormValues,
  beforeVisitPatch,
  beforeVisitRows,
  formatServiceList,
  parseBeforeVisitInput,
  readBeforeVisit,
  withBeforeVisit,
} from "../src/lib/before-visit";
import { buildListingFunnel, funnelShare } from "../src/lib/listing-funnel";
import { recentOwnerRequests } from "../src/lib/listing-moderation";
import { getEntryCost } from "../src/lib/listing-summary";
import { generatedMapUrl, isGeneratedMapUrl, ownerLocationStatus, parseOwnerCoordinates } from "../src/lib/owner-location";
import { fitWithin, needsShrinking, shrunkFileName, uploadMaxSide } from "../src/lib/photo-resize";
import type { Property } from "../src/lib/properties";
import { getPublicationCosts } from "../src/lib/publication-costs";
import { validatePublicationDetails, type PublicationDetails } from "../src/lib/publication-input";
import { correctionFormValues, localPhone, photoCategoriesFromText, similarUnitFormValues, validPhotoCategory } from "../src/lib/publish-prefill";
import { ownerShareText, shareImagePath, sharedListingPath } from "../src/lib/share-kit";
import { isServerTrackedEvent, serverTrackedEvents } from "../src/lib/tracking-events";
import { shrinkUploadPhoto } from "../src/lib/upload-photos";

const form = { title: "Departamento en alquiler", type: "Departamento", zone: "Equipetrol", address: "Calle referencial", bedrooms: "2", bathrooms: "1", area: "", garage: "1", pets: false, furnished: false, security: true, pool: false, patio: false, grill: false, elevator: false, price: "3500", currency: "BOB", exchangeRate: "", commonExpenses: "0", guarantee: "1 mes de alquiler", guaranteeAmount: "", description: "Departamento de 2 dormitorios con cocina equipada y parqueo techado." };

function details(extra: Record<string, unknown> = {}) {
  const result = validatePublicationDetails({ ...form, ...extra });
  assert.deepEqual(result.fieldErrors, {});
  return result.details!;
}

function listing(rentalDetails: PublicationDetails | null, extra: Partial<Property> = {}) {
  return {
    slug: "depto-equipetrol-abc", type: "Departamento", zone: "Equipetrol", price: 3500, currency: "BOB", exchangeRate: null,
    operation: "Alquiler", rentalDetails, requirements: [], address: "Calle referencial", pets: false, furnished: false,
    security: true, pool: false, patio: false, grill: false, elevator: false, ...extra,
  } as unknown as Property;
}

test("owner location: only points inside Bolivia, rounded, and admin edits never confirm", () => {
  assert.deepEqual(parseOwnerCoordinates({ lat: -17.78331234567, lng: -63.18219876543 }), { lat: -17.783312, lng: -63.182199 });
  for (const bad of [null, {}, { lat: "-17", lng: -63 }, { lat: -30, lng: -63 }, { lat: -17, lng: -50 }, { lat: Number.NaN, lng: -63 }]) {
    assert.equal(parseOwnerCoordinates(bad), null);
  }
  assert.equal(ownerLocationStatus({}).label, "Ubicación aproximada");
  assert.equal(ownerLocationStatus({ locationConfirmedAt: "2026-10-01T12:00:00.000Z" }).label, "Ubicación confirmada");
  assert.equal(isGeneratedMapUrl(generatedMapUrl({ lat: -17.7, lng: -63.1 })), true);
  assert.equal(isGeneratedMapUrl("https://maps.app.goo.gl/abc"), false);
  // Review and approval store what validatePublicationDetails returns: a confirmation sent in the payload is dropped.
  assert.equal("locationConfirmedAt" in details({ locationConfirmedAt: "2026-10-01T12:00:00.000Z" }), false);
});

test("antes de visitar: optional, validated, and unknown is not the same as none", () => {
  assert.deepEqual(readBeforeVisit(details()), {});
  assert.equal(beforeVisitRows(details()), null);
  const full = details({ availableFrom: "2026-11-01", minContractMonths: "12", advanceMonths: "2", includedServices: ["internet", "agua", "luz"] });
  assert.deepEqual(readBeforeVisit(full), { availableFrom: "2026-11-01", minContractMonths: 12, advanceMonths: 2, includedServices: ["agua", "luz", "internet"] });
  assert.deepEqual(beforeVisitRows(full)?.map((row) => [row.label, row.value]), [
    ["Disponible desde", "1 nov 2026"],
    ["Contrato mínimo", "1 año"],
    ["Adelanto", "2 meses de alquiler"],
    ["Servicios incluidos", "Agua, luz e internet"],
  ]);
  assert.deepEqual(beforeVisitRows({ minContractMonths: 6 })?.map((row) => row.value), [null, "6 meses", null, null]);
  assert.deepEqual(parseBeforeVisitInput({ includedServices: ["ninguno"] }).values, { includedServices: [] });
  assert.deepEqual(parseBeforeVisitInput({ includedServices: [] }).values, {});
  assert.equal(beforeVisitRows({ includedServices: [] })?.[3].value, "Ninguno");
  for (const bad of [{ availableFrom: "2026-02-30" }, { minContractMonths: "0" }, { advanceMonths: "13" }, { includedServices: ["cochera"] }, { includedServices: ["agua", "ninguno"] }]) {
    assert.equal(Object.keys(parseBeforeVisitInput(bad).errors).length, 1, JSON.stringify(bad));
    assert.ok(Object.keys(validatePublicationDetails({ ...form, ...bad }).fieldErrors).length > 0);
  }
  assert.equal(formatServiceList(["agua", "gas"]), "Agua y gas");
  assert.deepEqual(beforeVisitFormValues({ includedServices: [] }).includedServices, ["ninguno"]);
  assert.deepEqual(beforeVisitPatch({ minContractMonths: 6 }), { availableFrom: null, minContractMonths: 6, advanceMonths: null, includedServices: null });
  assert.deepEqual(withBeforeVisit({ price: 1, availableFrom: "2026-01-01", advanceMonths: 3 }, { minContractMonths: 6 }), { price: 1, minContractMonths: 6 });
});

test("adelanto multiplies the rent in the cost to move in; without it nothing changes", () => {
  assert.deepEqual(getPublicationCosts({ price: "3000", commonExpenses: "200", guarantee: "1 mes de alquiler", guaranteeAmount: "", advanceMonths: 3 }), { monthly: 3200, deposit: 3000, entry: 12200 });
  assert.deepEqual(getPublicationCosts({ price: "3000", commonExpenses: "200", guarantee: "1 mes de alquiler", guaranteeAmount: "" }), { monthly: 3200, deposit: 3000, entry: 6200 });
  assert.deepEqual(getEntryCost(listing(details())), { rent: 3500, expenses: 0, deposit: 3500, total: 7000 });
  assert.deepEqual(getEntryCost(listing(details({ advanceMonths: "2" }))), { rent: 3500, expenses: 0, deposit: 3500, total: 10500, advanceMonths: 2 });
});

test("correction and similar unit prefill only what the owner gave", () => {
  const sent = details({ pets: true, petsPolicy: "allowed", expensesMode: "separate", commonExpenses: "250", advanceMonths: "2", includedServices: ["ninguno"] });
  const values = correctionFormValues(sent, { name: "Ana", whatsapp: "59171234567" });
  assert.equal(values.title, "Departamento en alquiler");
  assert.equal(values.phone, "71234567");
  assert.equal(values.price, "3500");
  assert.equal(values.commonExpenses, "250");
  assert.equal(values.advanceMonths, "2");
  assert.deepEqual(values.includedServices, ["ninguno"]);
  const similar = similarUnitFormValues(listing(sent, { pets: true }));
  for (const field of ["title", "price", "description", "bedrooms", "availableFrom"]) assert.equal(field in similar, false, field);
  assert.equal(similar.zone, "Equipetrol");
  assert.equal(similar.address, "Calle referencial");
  assert.equal(similar.guarantee, "1 mes de alquiler");
  assert.equal(similar.expensesMode, "separate");
  assert.equal(similar.petsPolicy, "allowed");
  assert.equal(similar.security, true);
  assert.equal(localPhone("70000000"), "70000000");
  assert.deepEqual(photoCategoriesFromText("Fotos seleccionadas: a.jpg [bedroom], b.jpg [sin clasificar], c.jpg [kitchen]", 4), ["bedroom", "", "kitchen", ""]);
  assert.equal(validPhotoCategory("bathroom"), "bathroom");
  assert.equal(validPhotoCategory("<script>"), "");
});

test("photo shrinking: browser and server agree on 1920 px and small photos stay as they are", async () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1920, height: 1440, scaled: true });
  assert.deepEqual(fitWithin(1200, 900), { width: 1200, height: 900, scaled: false });
  assert.equal(needsShrinking({ type: "image/jpeg", size: 400_000 }, 1600, 1200), false);
  assert.equal(needsShrinking({ type: "image/png", size: 400_000 }, 1600, 1200), true);
  assert.equal(shrunkFileName("IMG_1234.HEIC.png"), "IMG_1234.HEIC.jpg");
  const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#7a8f6a" } }).png().toBuffer();
  const stored = await shrinkUploadPhoto(new File([new Uint8Array(big)], "sala.png", { type: "image/png" }));
  assert.equal(stored.resized, true);
  assert.equal(stored.type, "image/jpeg");
  assert.equal(stored.extension, "jpg");
  const metadata = await sharp(stored.bytes).metadata();
  assert.equal(Math.max(metadata.width ?? 0, metadata.height ?? 0), uploadMaxSide);
  const small = readFileSync("public/images/properties/torre-urbari/01.jpg");
  const kept = await shrinkUploadPhoto(new File([new Uint8Array(small)], "01.jpg", { type: "image/jpeg" }));
  assert.equal(kept.resized, false);
  assert.ok(kept.bytes.equals(small));
});

test("requests waiting for a correction stay in Mi cuenta until corrected", () => {
  const old = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const requests = [
    { id: "a", status: "changes_requested", createdAt: old, reviewedAt: old },
    { id: "b", status: "changes_requested", createdAt: old, reviewedAt: old, corrected: true },
    { id: "c", status: "rejected", createdAt: old, reviewedAt: old },
  ];
  assert.deepEqual(recentOwnerRequests(requests).map((request) => request.id), ["a"]);
});

test("admin funnel counts people per listing and groups WhatsApp by source", () => {
  const rows = buildListingFunnel(
    [
      { slug: "uno", viewed: 40, gallery: 12, shared: 3, whatsapp: 5 },
      { slug: "dos", viewed: 80, gallery: 30, shared: 0, whatsapp: 9 },
      { slug: "nada", viewed: 0, gallery: 0, shared: 0, whatsapp: 0 },
    ],
    [
      { slug: "uno", source: "ficha", people: 3 },
      { slug: "uno", source: "barra", people: 2 },
      { slug: "uno", source: "desconocido", people: 1 },
    ],
    new Map([["uno", "Casa en Urbari"]]),
  );
  assert.deepEqual(rows.map((row) => row.slug), ["dos", "uno"]);
  assert.equal(rows[1].title, "Casa en Urbari");
  assert.equal(rows[0].title, "dos");
  assert.deepEqual(rows[1].whatsappBySource.map((item) => `${item.label} ${item.people}`), ["Ficha 3", "Barra inferior 2", "Otro 1"]);
  assert.equal(funnelShare(12, 40), "30%");
  assert.equal(funnelShare(1, 0), "");
});

test("share kit text has type, zone, price, cost to move in and the shared link", () => {
  const text = ownerShareText(listing(details({ advanceMonths: "2" })), "https://zentrourbano.com/propiedades/depto-equipetrol-abc?desde=compartido");
  assert.equal(text, [
    "Alquilo departamento en Equipetrol.",
    "Alquiler: Bs 3.500/mes.",
    "Para entrar: Bs 10.500 (2 meses de adelanto y garantía).",
    "Trato directo conmigo, sin comisión.",
    "Fotos y datos: https://zentrourbano.com/propiedades/depto-equipetrol-abc?desde=compartido",
  ].join("\n"));
  // Unknown guarantee: no cost to move in is claimed.
  const unknown = ownerShareText(listing(details({ guarantee: "Consultar con el propietario" })), "https://x.test/");
  assert.equal(unknown.includes("Para entrar"), false);
  assert.equal(sharedListingPath("abc"), "/propiedades/abc?desde=compartido");
  assert.equal(shareImagePath("abc"), "/propiedades/abc/opengraph-image");
});

test("new events are accepted by /api/track", () => {
  for (const event of ["property_gallery_open", "property_shared_visit", "catalog_card_click", "search_empty", "search_share"]) {
    assert.ok(isServerTrackedEvent(event), event);
  }
  assert.equal(isServerTrackedEvent("property_report"), false);
  assert.equal(new Set(serverTrackedEvents).size, serverTrackedEvents.length);
});
