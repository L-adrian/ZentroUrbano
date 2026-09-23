import assert from "node:assert/strict";
import test from "node:test";
import { directRentalDemoProperties } from "../src/lib/direct-rental-demo";
import { publishedProperties, type Property } from "../src/lib/properties";
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
  assert.ok(publishedProperties.some((property) => !isDirectRental(property)));
  assert.deepEqual(publishedProperties, before);
});
