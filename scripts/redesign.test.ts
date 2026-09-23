import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { getPublicationCosts } from "../src/lib/publication-costs";
import { getGoogleMapsDirectionsUrl, MAP_MAX_NATIVE_ZOOM, MAP_MAX_ZOOM, MAP_TILE_PROVIDERS } from "../src/lib/map-config";
import robots from "../src/app/robots";
import { formatPriceInCurrency, getPropertyPriceInCurrency, getPropertyExchangeRate, parsePropertyExchangeRate } from "../src/lib/currency";

test("family illustration is static, transparent and sharp at 3x its largest display size", async () => {
  const image = await readFile(new URL("../public/images/family-rental/family-scene-v2.webp", import.meta.url));
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width >= 480 * 3);
  assert.equal(metadata.width / metadata.height, 2);
  assert.equal(metadata.hasAlpha, true);
  assert.equal(metadata.pages ?? 1, 1);
  assert.ok(image.length < 350_000);
});

test("one-off entry costs do not display a monthly suffix", () => {
  const property = { operation: "Alquiler" as const, currency: "BOB" as const, price: 5250 };
  assert.ok(formatPriceInCurrency(property, "BOB").endsWith("/mes"));
  assert.equal(formatPriceInCurrency(property, "BOB", false).includes("/mes"), false);
});

test("USD listings use their own exchange rate in display and budget calculations", () => {
  const property = { price: 400, currency: "USD" as const, operation: "Alquiler" as const, exchangeRate: 8.25 };
  assert.equal(getPropertyPriceInCurrency(property, "BOB"), 3300);
  assert.equal(getPropertyPriceInCurrency({ ...property, exchangeRate: 10 }, "BOB"), 4000);
  assert.equal(getPropertyPriceInCurrency(property, "USD"), 400);
  assert.match(formatPriceInCurrency(property, "BOB"), /3[.,]300\/mes/);
  assert.equal(getPropertyPriceInCurrency({ ...property, exchangeRate: null }, "BOB"), 2800);
  assert.equal(getPropertyExchangeRate({ currency: "BOB", exchangeRate: 10 }), 7);
});

test("exchange rate accepts decimals but never non-finite, negative or zero values", () => {
  for (const value of [null, undefined, "", " ", "abc", true, {}, [], 0, -1, Infinity, NaN, "1e2", 1001, 0.00001, "8.12345"]) {
    assert.equal(parsePropertyExchangeRate(value), null, String(value));
  }
  assert.equal(parsePropertyExchangeRate("8,25"), 8.25);
  assert.equal(parsePropertyExchangeRate("7.1234"), 7.1234);
  assert.equal(parsePropertyExchangeRate(7), 7);
});

test("directions preserves the exact coordinates without assuming the visitor's origin", () => {
  const url = new URL(getGoogleMapsDirectionsUrl({ coordinates: { lat: -17.7130777, lng: -63.1788698 }, mapUrl: "https://maps.google.com/" }));
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
  assert.equal(url.searchParams.get("destination"), "-17.7130777,-63.1788698");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.has("origin"), false);
});

test("monthly and entry costs include expenses, not intermediary commissions", () => {
  assert.deepEqual(getPublicationCosts({ price: "2500", commonExpenses: "250", guarantee: "1 mes de alquiler", guaranteeAmount: "" }), { monthly: 2750, deposit: 2500, entry: 5250 });
  assert.deepEqual(getPublicationCosts({ price: "2500", commonExpenses: "0", guarantee: "Sin garantía", guaranteeAmount: "" }), { monthly: 2500, deposit: 0, entry: 2500 });
  assert.equal(getPublicationCosts({ price: "300", commonExpenses: "25", guarantee: "2 meses de alquiler", guaranteeAmount: "" }).entry, 925);
});

test("custom deposits are explicit and an unknown deposit stays unknown", () => {
  assert.equal(getPublicationCosts({ price: "2500", commonExpenses: "250", guarantee: "Otro monto", guaranteeAmount: "500" }).entry, 3250);
  assert.equal(getPublicationCosts({ price: "2500", commonExpenses: "250", guarantee: "Otro monto", guaranteeAmount: "" }).entry, null);
  assert.equal(getPublicationCosts({ price: "2500", commonExpenses: "250", guarantee: "", guaranteeAmount: "" }).entry, null);
});

test("map uses the canonical HTTPS fallback and a supported zoom", () => {
  assert.equal(MAP_TILE_PROVIDERS.at(-1)?.url, "https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  assert.ok(MAP_MAX_ZOOM <= MAP_MAX_NATIVE_ZOOM);
  assert.ok(MAP_TILE_PROVIDERS.every(provider => provider.attribution.includes("OpenStreetMap")));
});

test("robots allows public pages and excludes private flows without blocking static assets", () => {
  const config = robots();
  assert.ok(config.sitemap?.includes("/sitemap.xml"));
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
  const rule = rules.find(item => item.userAgent === "*")!;
  assert.equal(rule.allow, "/");
  assert.ok(rule.disallow?.includes("/api/"));
  assert.ok(rule.disallow?.includes("/cliente"));
  assert.equal(rule.disallow?.includes("/_next/"), false);
});
