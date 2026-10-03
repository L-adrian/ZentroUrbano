import assert from "node:assert/strict";
import test from "node:test";
import { curatedRentalProperties as publishedProperties } from "../src/lib/curated-rentals";
import { filterPropertiesByCity, getCitySeoRoutes } from "../src/lib/seo-routes";
import { breadcrumbJsonLd, jsonLdScript, organizationJsonLd, websiteJsonLd } from "../src/lib/structured-data";

test("city routes group direct rentals by their real city slug", () => {
  const routes = getCitySeoRoutes(publishedProperties);
  assert.deepEqual(routes, [{ operation: "alquiler", city: "santa-cruz-de-la-sierra" }]);
  for (const route of routes) {
    assert.equal(route.operation, "alquiler");
    const properties = filterPropertiesByCity({ operationSlugParam: route.operation, citySlugParam: route.city, properties: publishedProperties });
    assert.ok(properties.length > 0);
  }
  assert.deepEqual(filterPropertiesByCity({ operationSlugParam: "venta", citySlugParam: "santa-cruz-de-la-sierra", properties: publishedProperties }), []);
});

test("structured data uses absolute URLs, no personal contact data and escapes HTML", () => {
  const organization = organizationJsonLd();
  assert.match(organization.url, /^https?:\/\//);
  assert.equal("email" in organization, false);
  assert.equal("telephone" in organization, false);
  assert.match(websiteJsonLd().potentialAction.target.urlTemplate, /\/propiedades\?q=\{search_term_string\}$/);
  const breadcrumbs = breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Alquiler", path: "/alquiler/santa-cruz-de-la-sierra" }]);
  assert.deepEqual(breadcrumbs.itemListElement.map(item => item.position), [1, 2]);
  assert.match(breadcrumbs.itemListElement[1].item, /^https?:\/\/[^/]+\/alquiler\/santa-cruz-de-la-sierra$/);
  assert.doesNotMatch(jsonLdScript({ name: "</script><script>" }).__html, /<\/script>/);
});
