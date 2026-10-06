import assert from "node:assert/strict";
import test from "node:test";
import { directRentalDemoProperties } from "../src/lib/direct-rental-demo";
import { curatedRentalProperties } from "../src/lib/curated-rentals";
import { publishedProperties, type Property } from "../src/lib/properties";
import {
  buildRentalSearchParams,
  describeRentalSearch,
  emptyRentalSearchFilters,
  getActiveRentalFilters,
  getUnsupportedSearchIntent,
  parsePriceInput,
  readRentalSearchParams,
  searchRentals,
  withoutRentalFilter,
  type RentalSearchFilters,
} from "../src/lib/property-search";
import { canonicalZone } from "../src/lib/santa-cruz-zones";
import { getDirectRentals, isDirectRental, isRentalPropertyType } from "../src/lib/rentals";
import { getOperationSeoRoutes, getDepartmentSeoRoutes } from "../src/lib/seo-routes";
import { getActiveSponsoredAds, getSponsoredAdById } from "../src/lib/sponsored-ads";

const ownerRental = directRentalDemoProperties[0];
const excluded: Property[] = [
  { ...ownerRental, slug: "agency-rental", publisher: { ...ownerRental.publisher, kind: "agency" } },
  { ...ownerRental, slug: "owner-sale", operation: "Compra" },
  { ...ownerRental, slug: "owner-anticretico", operation: "Anticr\u00e9tico" },
  { ...ownerRental, slug: "owner-land", type: "Terreno" },
];

test("only direct-owner residential rentals are eligible", () => {
  assert.equal(isDirectRental(ownerRental), true);
  for (const property of excluded) assert.equal(isDirectRental(property), false, property.slug);
  assert.deepEqual(getDirectRentals([...excluded, ownerRental]), [ownerRental]);
  assert.equal(isRentalPropertyType("Casa"), true);
  assert.equal(isRentalPropertyType("Departamento"), true);
  for (const value of ["Terreno", "Oficina", "", undefined, null]) {
    assert.equal(isRentalPropertyType(value), false);
  }
});

test("SEO routes exclude agencies and non-rental inventory", () => {
  assert.deepEqual(getOperationSeoRoutes(excluded), []);
  assert.deepEqual(getDepartmentSeoRoutes(excluded), []);
  const routes = getOperationSeoRoutes([...excluded, ownerRental]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].operation, "alquiler");
});

test("agency promotion cannot be displayed or opened through its ad id", () => {
  assert.equal(getSponsoredAdById("inmobiliaria-destacada-demo"), undefined);
  assert.ok(getActiveSponsoredAds().every((ad) => ad.id !== "inmobiliaria-destacada-demo"));
});

test("legacy data is preserved while rental examples remain eligible", () => {
  const before = structuredClone(publishedProperties);
  const catalog = getDirectRentals([...publishedProperties, ...directRentalDemoProperties]);
  assert.ok(catalog.length > 0);
  assert.ok(catalog.every(isDirectRental));
  assert.ok(directRentalDemoProperties.every(isDirectRental));
  assert.ok(curatedRentalProperties.every(isDirectRental));
  assert.ok(curatedRentalProperties.every(property => property.isSeeded === false));
  assert.ok(curatedRentalProperties.every(property => property.images.length >= 5));
  assert.ok(publishedProperties.some((property) => !isDirectRental(property)));
  assert.deepEqual(publishedProperties, before);
});

const catalog = curatedRentalProperties;
const filters = (values: Partial<RentalSearchFilters>): RentalSearchFilters => ({ ...emptyRentalSearchFilters, ...values });
const slugs = (properties: Property[], values: Partial<RentalSearchFilters>, currency: "BOB" | "USD" = "BOB") =>
  searchRentals(properties, filters(values), currency).map((match) => match.property.slug);

test("price filters understand thousands written the Bolivian way", () => {
  for (const value of ["3000", "3.000", "3,000", "3 000", "3 mil", "3mil", "3k", "3 K", "Bs 3.000", "3000 bs", "bs.3000", "hasta 3.000", "3.000 por mes"]) {
    assert.deepEqual(parsePriceInput(value, "BOB"), { amount: 3000, currency: "BOB" }, value);
  }
  assert.deepEqual(parsePriceInput("3,5 mil", "BOB"), { amount: 3500, currency: "BOB" });
  assert.deepEqual(parsePriceInput("1.5k", "USD"), { amount: 1500, currency: "USD" });
  assert.deepEqual(parsePriceInput("$us 450", "BOB"), { amount: 450, currency: "USD" });
  assert.deepEqual(parsePriceInput("450 dólares", "BOB"), { amount: 450, currency: "USD" });
  assert.deepEqual(parsePriceInput("450", "USD"), { amount: 450, currency: "USD" });
  for (const value of ["", "  ", "barato", "3.40.0", "-3000", "mil", "1e3", null, undefined]) {
    assert.equal(parsePriceInput(value, "BOB"), null, String(value));
  }
  const withDot = slugs(catalog, readRentalSearchParams(new URLSearchParams("maxPrice=3.000")));
  assert.deepEqual(withDot, slugs(catalog, { maxPrice: "3000" }));
  assert.equal(withDot.length, 2);
  assert.ok(withDot.length < catalog.length);
});

test("text search reads amounts like \"hasta 3 mil bs\" and \"hasta 3.000\"", () => {
  const expected = slugs(catalog, { maxPrice: "3000" });
  assert.deepEqual(slugs(catalog, { query: "hasta 3 mil bs" }), expected);
  assert.deepEqual(slugs(catalog, { query: "departamento hasta 3.000" }), expected);
  assert.deepEqual(slugs(catalog, { query: "hasta 450 dolares" }), slugs(catalog, { maxPrice: "450", priceCurrency: "USD" }));
});

test("search filters round-trip through the URL, with pets and parking together", () => {
  const original = filters({ query: "cerca de la radial", zone: "Zona Norte", type: "Monoambiente", minPrice: "1.000", maxPrice: "3 mil", bedrooms: "1", bathrooms: "1", pets: true, garage: true });
  const params = buildRentalSearchParams(original, "BOB");
  assert.equal(params.toString(), "q=cerca+de+la+radial&zone=Zona+Norte&type=Monoambiente&minPrice=1000&maxPrice=3000&currency=BOB&bedrooms=1&bathrooms=1&amenity=pets&amenity=garage");
  assert.deepEqual(readRentalSearchParams(params), { ...original, minPrice: "1000", maxPrice: "3000", priceCurrency: "BOB" });
  assert.equal(buildRentalSearchParams(emptyRentalSearchFilters, "USD").toString(), "");
  const legacy = readRentalSearchParams(new URLSearchParams("type=Departamento&bedrooms=Monoambiente&amenity=pets,garage"));
  assert.equal(legacy.type, "Monoambiente");
  assert.equal(legacy.bedrooms, "");
  assert.equal(legacy.pets && legacy.garage, true);
  const invalid = readRentalSearchParams(new URLSearchParams("type=Terreno&bedrooms=9&bathrooms=x&currency=EUR&maxPrice=2000"));
  assert.deepEqual([invalid.type, invalid.bedrooms, invalid.bathrooms, invalid.priceCurrency], ["", "", "", null]);
  const zonePage = readRentalSearchParams(new URLSearchParams("maxPrice=2000"), { zone: "Equipetrol", type: "Departamento" });
  assert.deepEqual([zonePage.zone, zonePage.type, zonePage.maxPrice], ["Equipetrol", "Departamento", "2000"]);
  assert.equal(readRentalSearchParams(new URLSearchParams("zone="), { zone: "Equipetrol" }).zone, "");
});

test("a price shared in dollars keeps meaning dollars for someone who sees bolivianos", () => {
  const shared = readRentalSearchParams(buildRentalSearchParams(filters({ maxPrice: "250" }), "USD"));
  assert.equal(shared.priceCurrency, "USD");
  assert.deepEqual(slugs(catalog, shared, "BOB"), slugs(catalog, { maxPrice: "1750" }, "BOB"));
});

test("pets filter shows confirmed homes first, then \"a consultar\", never \"no\"", () => {
  const [allowed, consult, refused] = catalog;
  const properties = [
    { ...refused, slug: "refused", pets: false, rentalDetails: { ...refused.rentalDetails!, petsPolicy: "not_allowed" as const } },
    { ...consult, slug: "consult" },
    { ...allowed, slug: "allowed", pets: true },
    { ...consult, slug: "unknown", rentalDetails: undefined },
  ];
  const matches = searchRentals(properties, filters({ pets: true }), "BOB");
  assert.deepEqual(matches.map((match) => [match.property.slug, match.petsPolicy]), [["allowed", "allowed"], ["consult", "consult"], ["unknown", "consult"]]);
  assert.equal(searchRentals(properties, emptyRentalSearchFilters, "BOB").length, 4);
});

test("featured listings come first; with a text search, relevance comes first", () => {
  const featured = { ...catalog[0], slug: "featured-house", listingPlan: "featured" as const };
  const properties = [...catalog.slice(1), featured];
  assert.equal(slugs(properties, {})[0], "featured-house");
  const departments = slugs(properties, { query: "departamento radial" });
  assert.equal(departments[0], "departamento-1-dormitorio-radial-26-4000");
  assert.ok(!departments.includes("featured-house"));
});

test("an empty search can tell how many homes each removed filter would bring back", () => {
  const search = filters({ type: "Casa", maxPrice: "4000", garage: true });
  assert.deepEqual(slugs(catalog, search), []);
  assert.deepEqual(getActiveRentalFilters(search), ["type", "maxPrice", "garage"]);
  const counts = Object.fromEntries(getActiveRentalFilters(search).map((key) => [key, searchRentals(catalog, withoutRentalFilter(search, key), "BOB").length]));
  assert.deepEqual(counts, { type: 1, maxPrice: 0, garage: 1 });
  assert.equal(withoutRentalFilter(filters({ maxPrice: "300", priceCurrency: "USD" }), "maxPrice").priceCurrency, null);
  assert.equal(describeRentalSearch(search, "BOB").join(", "), "casa, hasta Bs 4.000 por mes, con parqueo");
  assert.equal(describeRentalSearch(filters({ zone: "Equipetrol", pets: true, bedrooms: "2" }), "BOB").join(", "), "vivienda en Equipetrol, 2 dormitorios, que acepte mascotas");
  assert.equal(describeRentalSearch(filters({ zone: "Equipetrol|Sirari", bedrooms: "4" }), "BOB").join(", "), "vivienda en Equipetrol o Sirari, 4 o más dormitorios");
});

test("searches for anticrético, sales or shared rooms are recognized as outside the catalog", () => {
  assert.equal(getUnsupportedSearchIntent("anticretico equipetrol"), "anticretico");
  assert.equal(getUnsupportedSearchIntent("Anticrético"), "anticretico");
  assert.equal(getUnsupportedSearchIntent("casa en venta"), "venta");
  assert.equal(getUnsupportedSearchIntent("comprar departamento"), "venta");
  assert.equal(getUnsupportedSearchIntent("cuarto compartido"), "habitacion");
  assert.equal(getUnsupportedSearchIntent("habitación amoblada cerca de la UAGRM"), "habitacion");
  for (const query of ["casa 3 habitaciones", "departamento con una habitación", "monoambiente", "casa con cuarto de servicio", "Equipetrol", ""]) {
    assert.equal(getUnsupportedSearchIntent(query), null, query);
  }
});

test("bedroom and bathroom filters are exact, and only the last option means 'or more'", () => {
  const home = (slug: string, bedrooms: number, bathrooms: number) => ({ ...catalog[0], slug, bedrooms, bathrooms });
  const homes = [home("uno", 1, 1), home("dos", 2, 1), home("tres", 3, 2), home("cuatro", 4, 3), home("cinco", 5, 4)];
  assert.deepEqual(slugs(homes, { bedrooms: "1" }), ["uno"]);
  assert.deepEqual(slugs(homes, { bedrooms: "2" }), ["dos"]);
  assert.deepEqual(slugs(homes, { bedrooms: "4" }).sort(), ["cinco", "cuatro"]);
  assert.deepEqual(slugs(homes, { bathrooms: "1" }).sort(), ["dos", "uno"]);
  assert.deepEqual(slugs(homes, { bathrooms: "3" }).sort(), ["cinco", "cuatro"]);
  assert.deepEqual(slugs(homes, { query: "1 dormitorio" }), ["uno"]);
});

test("zones fold owners' spellings and several can be chosen at once", () => {
  assert.equal(canonicalZone("Norte"), "Zona Norte");
  assert.equal(canonicalZone(" urbari "), "Urbarí");
  assert.equal(canonicalZone("Barrio Inventado"), "Barrio Inventado");
  const homes = [
    { ...catalog[0], slug: "a", zone: "Norte" },
    { ...catalog[0], slug: "b", zone: "Urbari" },
    { ...catalog[0], slug: "c", zone: "Equipetrol" },
  ];
  // Equipetrol is inside Zona Norte, so picking the zone brings it too; a place alone does not.
  assert.deepEqual(slugs(homes, { zone: "Zona Norte|Urbarí" }).sort(), ["a", "b", "c"]);
  assert.deepEqual(slugs(homes, { zone: "Equipetrol" }), ["c"]);
  assert.deepEqual(slugs(homes, { zone: "Zona Oeste" }), ["b"]);
  const params = buildRentalSearchParams(filters({ zone: "Zona Norte|Urbarí" }), "BOB");
  assert.deepEqual(params.getAll("zone"), ["Zona Norte", "Urbarí"]);
  assert.equal(readRentalSearchParams(params).zone, "Zona Norte|Urbarí");
});
