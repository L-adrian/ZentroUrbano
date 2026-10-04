import assert from "node:assert/strict";
import test from "node:test";
import { curatedRentalProperties } from "../src/lib/curated-rentals";
import { directRentalDemoProperties } from "../src/lib/direct-rental-demo";
import {
  distanceKm,
  formatApproxDistance,
  formatApproxKm,
  formatMapArea,
  getNearbyListings,
  getZoneCenters,
  isInsideArea,
  parseMapArea,
  type KnownPlace,
} from "../src/lib/catalog-geo";
import { getMonthlyCost } from "../src/lib/listing-summary";
import { withoutOwnerContact } from "../src/lib/rentals";
import {
  addRecentListing,
  isNewSinceVisit,
  parseRecentListings,
  parseSavedListings,
  parseVisitState,
  recentListingsLimit,
  rollVisit,
  toggleSavedListing,
  visitGapMs,
} from "../src/lib/local-lists";
import type { Property } from "../src/lib/properties";
import {
  buildRentalSearchParams,
  describeRentalFilter,
  emptyRentalSearchFilters,
  findPlaceInQuery,
  getActiveRentalFilters,
  isMonoambiente,
  readRentalSearchParams,
  searchRentals,
  understandRentalQuery,
  withoutRentalFilter,
  type RentalSearchFilters,
} from "../src/lib/property-search";
import { buildSavedListMessage, savedListWhatsappUrl } from "../src/lib/saved-list-message";
import { countRentalNeedListings, getNeedSeoRoutes, getRentalNeedRoute, needPageMinListings } from "../src/lib/seo-routes";
import { compareWithZoneAverage, getZoneAverages, isBelowZoneAverage } from "../src/lib/zone-prices";

const base = directRentalDemoProperties[0];
const now = Date.parse("2026-10-04T12:00:00.000Z");
const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();

function rental(slug: string, overrides: Partial<Property> = {}): Property {
  return {
    ...base,
    id: slug,
    slug,
    title: `Departamento ${slug}`,
    tags: [],
    listingPlan: "standard",
    featured: false,
    isSeeded: false,
    pets: false,
    furnished: false,
    rentalDetails: undefined,
    requirements: ["1 mes de garantia"],
    availabilityConfirmedAt: daysAgo(3),
    availabilityReports: 0,
    ...overrides,
  };
}

const filters = (overrides: Partial<RentalSearchFilters> = {}): RentalSearchFilters => ({ ...emptyRentalSearchFilters, ...overrides });
const slugs = (matches: Array<{ property: Property }>) => matches.map((match) => match.property.slug);

test("the normal order puts featured homes first; any other order the person picks applies to all", () => {
  const homes = [
    rental("barata", { price: 1500, availabilityConfirmedAt: daysAgo(10) }),
    rental("destacada", { price: 4000, listingPlan: "featured", availabilityConfirmedAt: daysAgo(15) }),
    rental("en-dolares", { price: 300, currency: "USD", exchangeRate: 10, availabilityConfirmedAt: daysAgo(1) }),
    rental("sin-confirmar", { price: 2500, availabilityConfirmedAt: undefined }),
  ];
  assert.deepEqual(slugs(searchRentals(homes, filters(), "BOB")), ["destacada", "barata", "en-dolares", "sin-confirmar"]);
  // USD 300 at 10 Bs is Bs 3.000: prices compare in bolivianos.
  assert.deepEqual(slugs(searchRentals(homes, filters({ sort: "menor-precio" }), "BOB")), ["barata", "sin-confirmar", "en-dolares", "destacada"]);
  assert.deepEqual(slugs(searchRentals(homes, filters({ sort: "mayor-precio" }), "USD")), ["destacada", "en-dolares", "sin-confirmar", "barata"]);
  // Fresh confirmations first, newest first; never confirmed last.
  assert.deepEqual(slugs(searchRentals(homes, filters({ sort: "recientes" }), "BOB")), ["en-dolares", "barata", "destacada", "sin-confirmar"]);
});

test("lowest cost to enter puts homes without that data at the end", () => {
  const homes = [
    rental("dos-meses", { price: 2000, requirements: ["2 meses de garantia"] }),
    rental("sin-dato", { price: 1000, requirements: ["Sin comision"] }),
    rental("sin-garantia", { price: 2500, requirements: ["Sin garantía"] }),
  ];
  // Entry: 2.000 x 3 = 6.000; 2.500 x 1 = 2.500; unknown last.
  assert.deepEqual(slugs(searchRentals(homes, filters({ sort: "menor-entrada" }), "BOB")), ["sin-garantia", "dos-meses", "sin-dato"]);
});

test("D7 filters: furnished, guarantee, cost to enter and expenses, with missing data last as pending", () => {
  const homes = [
    rental("amoblado-sin-garantia", { price: 2000, furnished: true, requirements: ["Sin garantía", "Expensas incluidas"] }),
    rental("un-mes", { price: 2000, requirements: ["1 mes de garantia", "Expensas: Bs 300"] }),
    rental("dos-meses", { price: 1800, requirements: ["2 meses de garantia"] }),
    rental("sin-datos", { price: 1500, requirements: ["Sin comision"] }),
  ];

  assert.deepEqual(slugs(searchRentals(homes, filters({ furnished: true }), "BOB")), ["amoblado-sin-garantia"]);

  const noGuarantee = searchRentals(homes, filters({ guarantee: "sin" }), "BOB");
  assert.deepEqual(slugs(noGuarantee), ["amoblado-sin-garantia", "sin-datos"]);
  assert.deepEqual(noGuarantee.at(-1)?.pending, ["guarantee"]);
  assert.deepEqual(slugs(searchRentals(homes, filters({ guarantee: "hasta-1-mes" }), "BOB")), ["amoblado-sin-garantia", "un-mes", "sin-datos"]);

  // Para entrar, hasta Bs 4.000: 2.000 (no deposit) and 4.000 (one month) fit; 5.400 does not.
  const entry = searchRentals(homes, filters({ maxEntry: "4000", priceCurrency: "BOB" }), "BOB");
  assert.deepEqual(slugs(entry), ["amoblado-sin-garantia", "un-mes", "sin-datos"]);
  assert.deepEqual(entry.map((match) => match.pending), [[], [], ["entry"]]);

  // Budget with expenses: 2.000 + 300 is over 2.200; unknown expenses are asked, not guessed.
  const withExpenses = searchRentals(homes, filters({ maxPrice: "2200", priceCurrency: "BOB", includeExpenses: true }), "BOB");
  assert.deepEqual(slugs(withExpenses), ["amoblado-sin-garantia", "dos-meses", "sin-datos"]);
  assert.deepEqual(withExpenses.map((match) => match.pending), [[], ["expenses"], ["expenses"]]);
  // Rent alone over the budget is out even when expenses are unknown.
  assert.deepEqual(slugs(searchRentals(homes, filters({ maxPrice: "1700", includeExpenses: true }), "BOB")), ["sin-datos"]);
  // Without the toggle the budget is compared with the rent only.
  assert.deepEqual(slugs(searchRentals(homes, filters({ maxPrice: "2200" }), "BOB")), ["amoblado-sin-garantia", "un-mes", "dos-meses", "sin-datos"]);
});

test("monthly cost adds expenses only when the owner gave them", () => {
  assert.equal(getMonthlyCost(rental("a", { price: 2000, requirements: ["Expensas incluidas"] })), 2000);
  assert.equal(getMonthlyCost(rental("b", { price: 2000, requirements: ["Expensas: Bs 350"] })), 2350);
  assert.equal(getMonthlyCost(rental("c", { price: 2000, requirements: ["Sin expensas"] })), 2000);
  assert.equal(getMonthlyCost(rental("d", { price: 2000, requirements: ["1 mes de garantia"] })), null);
});

test("zone average uses listings in bolivianos and only zones with 3 or more", () => {
  const homes = [
    rental("n1", { zone: "Norte", price: 2000 }),
    rental("n2", { zone: "Norte", price: 3000 }),
    rental("n3", { zone: "Norte", price: 400, currency: "USD", exchangeRate: 10 }),
    rental("s1", { zone: "Sur", price: 1000 }),
    rental("s2", { zone: "Sur", price: 1200 }),
  ];
  const averages = getZoneAverages(homes);
  assert.deepEqual(averages.get("Norte"), { zone: "Norte", averageBob: 3000, count: 3 });
  assert.equal(averages.has("Sur"), false);
  const comparison = compareWithZoneAverage(homes[0], averages);
  assert.equal(comparison?.differenceBob, 1000);
  assert.equal(isBelowZoneAverage(comparison), true);
  assert.equal(isBelowZoneAverage(compareWithZoneAverage(homes[3], averages)), false);

  const below = searchRentals(homes, filters({ belowZoneAverage: true }), "BOB");
  assert.deepEqual(slugs(below), ["n1"]);
  assert.equal(below[0].zoneAverage?.count, 3);
  // Off by default: nobody is compared.
  assert.ok(searchRentals(homes, filters(), "BOB").every((match) => match.zoneAverage === null));
});

test("new filters survive the link, and page defaults the person cleared stay cleared", () => {
  const chosen = filters({
    query: "patio",
    type: "Casa",
    maxPrice: "3000",
    maxEntry: "7000",
    furnished: true,
    pets: true,
    guarantee: "hasta-1-mes",
    includeExpenses: true,
    belowZoneAverage: true,
    area: { south: -17.8, west: -63.2, north: -17.7, east: -63.1 },
    sort: "menor-entrada",
  });
  const params = buildRentalSearchParams(chosen, "BOB");
  assert.equal(
    params.toString(),
    "q=patio&type=Casa&maxPrice=3000&maxEntrada=7000&currency=BOB&amenity=pets&amenity=furnished&garantia=hasta-1-mes&expensas=incluidas&promedio=bajo&area=-17.8000%2C-63.2000%2C-17.7000%2C-63.1000&orden=menor-entrada",
  );
  assert.deepEqual(readRentalSearchParams(params), { ...chosen, priceCurrency: "BOB" });

  // A zone page whose zone was changed to "Todas las zonas".
  const cleared = buildRentalSearchParams(filters(), "BOB", { zone: "Equipetrol" });
  assert.equal(cleared.toString(), "zone=");
  assert.equal(readRentalSearchParams(cleared, { zone: "Equipetrol" }).zone, "");
  assert.equal(readRentalSearchParams(new URLSearchParams(), { zone: "Equipetrol" }).zone, "Equipetrol");

  // A need page ("con mascotas") whose pets filter was removed.
  assert.equal(buildRentalSearchParams(filters(), "BOB", { pets: true }).toString(), "amenity=");
  assert.equal(readRentalSearchParams(new URLSearchParams("amenity="), { pets: true }).pets, false);

  // Bad values are dropped, not trusted.
  const bad = readRentalSearchParams(new URLSearchParams("orden=gratis&garantia=3-meses&area=1,2,3&cerca=luna"));
  assert.equal(bad.sort, "");
  assert.equal(bad.guarantee, "");
  assert.equal(bad.area, null);
  assert.equal(bad.near, "");
});

test("each active filter has a chip, and removing one keeps the rest", () => {
  const chosen = filters({ zone: "Centro", maxEntry: "5000", priceCurrency: "BOB", guarantee: "sin", furnished: true, includeExpenses: true });
  const active = getActiveRentalFilters(chosen);
  assert.deepEqual(active, ["zone", "includeExpenses", "maxEntry", "furnished", "guarantee"]);
  assert.deepEqual(
    active.map((key) => describeRentalFilter(key, chosen, "BOB")),
    ["Zona: Centro", "Presupuesto con expensas", "Para entrar hasta Bs 5.000", "Amoblado", "Sin garantía"],
  );
  const withoutEntry = withoutRentalFilter(chosen, "maxEntry");
  assert.equal(withoutEntry.maxEntry, "");
  assert.equal(withoutEntry.priceCurrency, null);
  assert.equal(withoutEntry.zone, "Centro");
});

test("the search text shows what it understood, and words no listing has are set apart", () => {
  const homes = [...directRentalDemoProperties, ...curatedRentalProperties];
  const understood = understandRentalQuery("monoambiente con mascotas en Equipetrol hasta 3000 zxqv", homes, "BOB");
  assert.deepEqual(
    understood.chips.map((chip) => chip.label),
    ["Monoambiente", "Acepta mascotas", "Hasta Bs 3.000", "“Equipetrol”"],
  );
  assert.deepEqual(understood.unused, ["zxqv"]);
  // The X on a chip removes only those words (and a leftover "con" at the start).
  assert.equal(understood.chips[0].query, "mascotas en Equipetrol hasta 3000 zxqv");
  assert.equal(understood.chips[3].query, "monoambiente con mascotas en hasta 3000 zxqv");
  // A word nobody has does not empty the results.
  assert.ok(searchRentals(homes, filters({ query: "departamento zxqv" }), "BOB").length > 0);
});

test("writing monoambiente finds the same homes as the Monoambiente type", () => {
  const homes = [
    ...directRentalDemoProperties.map((property) => ({ ...property, isSeeded: false })),
    ...curatedRentalProperties,
    rental("dos-dormitorios-con-estudio", { bedrooms: 2, title: "Departamento con estudio", tags: ["Estudio"] }),
  ];
  const byType = slugs(searchRentals(homes, filters({ type: "Monoambiente" }), "BOB")).sort();
  assert.ok(byType.length > 0);
  for (const query of ["monoambiente", "mono ambiente", "studio"]) {
    assert.deepEqual(slugs(searchRentals(homes, filters({ query }), "BOB")).sort(), byType, query);
  }
  assert.ok(homes.filter(isMonoambiente).every((property) => byType.includes(property.slug)));
});

test("distances are straight-line and approximate", () => {
  assert.ok(Math.abs(distanceKm({ lat: -17, lng: -63 }, { lat: -18, lng: -63 }) - 111.2) < 0.2);
  assert.equal(formatApproxKm(1.234), "~1,2 km");
  assert.equal(formatApproxKm(0.82), "~800 m");
  assert.equal(formatApproxKm(0.02), "~100 m");
  assert.equal(formatApproxKm(12.4), "~12 km");
  assert.equal(formatApproxKm(Number.NaN), null);
  assert.equal(formatApproxDistance(1.234), "a ~1,2 km en línea recta");
  assert.equal(formatApproxDistance(0.5, "UAGRM"), "a ~500 m de UAGRM en línea recta");
});

test("map areas round-trip through the link and reject nonsense", () => {
  const area = parseMapArea("-17.8,-63.2,-17.7,-63.1");
  assert.deepEqual(area, { south: -17.8, west: -63.2, north: -17.7, east: -63.1 });
  assert.equal(formatMapArea(area!), "-17.8000,-63.2000,-17.7000,-63.1000");
  for (const value of ["", "1,2,3", "-17.7,-63.2,-17.8,-63.1", "a,b,c,d", "-95,-63,-17,-62"]) {
    assert.equal(parseMapArea(value), null, value);
  }
  assert.equal(isInsideArea({ lat: -17.75, lng: -63.15 }, area!), true);
  assert.equal(isInsideArea({ lat: -17.65, lng: -63.15 }, area!), false);
  const homes = [rental("dentro", { coordinates: { lat: -17.75, lng: -63.15 } }), rental("fuera", { coordinates: { lat: -17.6, lng: -63.15 } })];
  assert.deepEqual(slugs(searchRentals(homes, filters({ area }), "BOB")), ["dentro"]);
});

test("Cerca de {zona} shows 3 to 6 homes from other zones, closest first", () => {
  const point = (lat: number, lng: number) => ({ lat, lng });
  const homes = [
    rental("z1", { zone: "Centro", coordinates: point(-17.78, -63.18) }),
    rental("z2", { zone: "Centro", coordinates: point(-17.79, -63.18) }),
    ...[1, 2, 3, 4, 5, 6, 7].map((step) => rental(`vecina-${step}`, { zone: `Zona ${step}`, coordinates: point(-17.785 - step * 0.01, -63.18) })),
    rental("lejos", { zone: "Lejos", coordinates: point(-18.5, -63.18) }),
  ];
  const center = getZoneCenters(homes).get("Centro");
  assert.deepEqual(center, point(-17.785, -63.18));
  const nearby = getNearbyListings(homes, "Centro", center);
  assert.deepEqual(nearby.map((item) => item.property.slug), ["vecina-1", "vecina-2", "vecina-3", "vecina-4", "vecina-5", "vecina-6"]);
  assert.ok(nearby[0].distanceKm < nearby[1].distanceKm);
  // Fewer than 3 close homes: no block at all.
  assert.deepEqual(getNearbyListings(homes.slice(0, 4), "Centro", center), []);
});

test("a known place (with checked coordinates) orders by distance and is recognized in the text", () => {
  const place: KnownPlace = { id: "plaza-prueba", name: "Plaza de prueba", aliases: ["plaza de prueba"], coordinates: { lat: -17.78, lng: -63.18 }, source: "fixture" };
  const homes = [
    rental("lejos", { coordinates: { lat: -17.75, lng: -63.18 } }),
    rental("cerca", { coordinates: { lat: -17.781, lng: -63.18 } }),
  ];
  const near = searchRentals(homes, filters({ near: place.id, sort: "cercania" }), "BOB", { places: [place] });
  assert.deepEqual(slugs(near), ["cerca", "lejos"]);
  assert.ok((near[0].distanceKm ?? 99) < 0.2);
  assert.equal(findPlaceInQuery("depa cerca de la plaza de prueba", [place])?.id, place.id);
  const understood = understandRentalQuery("depa cerca de la plaza de prueba", homes, "BOB", [place]);
  assert.ok(understood.chips.some((chip) => chip.label === "Cerca de Plaza de prueba"));
  assert.equal(readRentalSearchParams(new URLSearchParams("cerca=plaza-prueba"), {}, [place]).near, place.id);
  // Removing "Cerca de" also drops the order that needed it.
  assert.equal(withoutRentalFilter(filters({ near: place.id, sort: "cercania" }), "near").sort, "");
});

test("saved and recently viewed lists stay small, unique and safe to read", () => {
  let saved = toggleSavedListing([], { slug: "casa-norte", title: "Casa norte" }, 1);
  saved = toggleSavedListing(saved, { slug: "depa-sur", title: "Depa sur" }, 2);
  assert.deepEqual(saved.map((item) => item.slug), ["depa-sur", "casa-norte"]);
  saved = toggleSavedListing(saved, { slug: "casa-norte", title: "Casa norte" }, 3);
  assert.deepEqual(saved.map((item) => item.slug), ["depa-sur"]);
  assert.deepEqual(parseSavedListings(JSON.stringify([...saved, { slug: "depa-sur" }, { slug: "<script>" }, 5])), saved);
  assert.deepEqual(parseSavedListings("{roto"), []);

  let recent = parseRecentListings(null);
  for (let index = 0; index < recentListingsLimit + 3; index += 1) recent = addRecentListing(recent, `casa-${index}`, index);
  recent = addRecentListing(recent, "casa-5", 99);
  assert.equal(recent.length, recentListingsLimit);
  assert.equal(recent[0].slug, "casa-5");
  assert.equal(recent.filter((item) => item.slug === "casa-5").length, 1);
});

test("Nuevo marks only homes published after the previous visit", () => {
  const first = rollVisit(null, 1_000);
  assert.deepEqual(first, { previous: null, lastSeen: 1_000 });
  assert.equal(isNewSinceVisit(new Date(2_000).toISOString(), first.previous), false);
  const sameVisit = rollVisit(first, 1_000 + visitGapMs - 1);
  assert.equal(sameVisit.previous, null);
  const nextVisit = rollVisit(sameVisit, sameVisit.lastSeen + visitGapMs + 1);
  assert.equal(nextVisit.previous, sameVisit.lastSeen);
  assert.equal(isNewSinceVisit(new Date(nextVisit.previous! + 1).toISOString(), nextVisit.previous), true);
  assert.equal(isNewSinceVisit(new Date(nextVisit.previous! - 1).toISOString(), nextVisit.previous), false);
  assert.equal(isNewSinceVisit(undefined, nextVisit.previous), false);
  assert.deepEqual(parseVisitState(JSON.stringify(nextVisit)), nextVisit);
  assert.equal(parseVisitState("[]"), null);
});

test("the saved list goes to WhatsApp as text, with no phone number", () => {
  const homes = [
    rental("casa-norte", { title: "Casa norte", zone: "Norte", price: 2000, requirements: ["1 mes de garantia"], availabilityConfirmedAt: new Date(now - 2 * 86_400_000).toISOString() }),
    rental("depa-sur", { title: "Depa sur", zone: "Sur", price: 1500, requirements: [], availabilityConfirmedAt: undefined }),
  ];
  const message = buildSavedListMessage(homes, "BOB", now);
  assert.match(message, /^Mis alquileres guardados en Zentro Urbano:/);
  assert.match(message, /1\. Casa norte \(Norte\)\nBs 2\.000\/mes · Para entrar: Bs 4\.000\nDisponible · Confirmado hace 2 días\n.*\/propiedades\/casa-norte/);
  assert.match(message, /2\. Depa sur \(Sur\)\nBs 1\.500\/mes · Para entrar: a consultar\nPregunta si sigue disponible antes de ir\./);
  const url = savedListWhatsappUrl(homes, "BOB", now);
  assert.ok(url.startsWith("https://wa.me/?text="));
  assert.equal(decodeURIComponent(url.slice("https://wa.me/?text=".length)), message);
});

test("need pages are offered to Google only with 3 or more real listings that fully match", () => {
  const mono = (slug: string, overrides: Partial<Property> = {}) =>
    rental(slug, { title: "Monoambiente amoblado", tags: ["Monoambiente"], bedrooms: 1, city: "Santa Cruz de la Sierra", ...overrides });
  const route = getRentalNeedRoute("monoambientes")!;
  const two = [mono("m1"), mono("m2"), mono("m3", { isSeeded: true })];
  assert.equal(countRentalNeedListings(route, two), 2);
  assert.ok(!getNeedSeoRoutes(two).some((item) => item.need === "monoambientes"));
  const three = [...two, mono("m4")];
  assert.equal(countRentalNeedListings(route, three), needPageMinListings);
  assert.ok(getNeedSeoRoutes(three).some((item) => item.need === "monoambientes"));

  // "Con mascotas": homes where pets are "a consultar" do not count.
  const pets = getRentalNeedRoute("con-mascotas")!;
  assert.equal(countRentalNeedListings(pets, [rental("p1", { pets: true }), rental("p2"), rental("p3", { pets: true })]), 2);
  const cheap = getRentalNeedRoute("hasta-2000-bs")!;
  assert.equal(countRentalNeedListings(cheap, [rental("c1", { price: 2000 }), rental("c2", { price: 2100 }), rental("c3", { price: 150, currency: "USD", exchangeRate: 6.96 })]), 2);
});

test("catalog payloads leave out owner phones and emails but keep links to original ads", () => {
  const [owner] = directRentalDemoProperties;
  const external = { ...owner, slug: "referencia", whatsapp: "https://example.com/aviso" };
  const [stripped, reference] = withoutOwnerContact([owner, external]);
  assert.equal(stripped.whatsapp, "");
  assert.equal(stripped.agent.phone, "");
  assert.equal(stripped.agent.whatsapp, "");
  assert.equal(stripped.agent.email, "");
  assert.equal(stripped.agent.name, owner.agent.name);
  assert.equal(reference.whatsapp, "https://example.com/aviso");
  assert.ok(owner.agent.phone, "the original object is not changed");
});
