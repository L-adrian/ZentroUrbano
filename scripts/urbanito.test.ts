import assert from "node:assert/strict";
import { test } from "node:test";
import { curatedRentalProperties } from "../src/lib/curated-rentals";
import {
  hashLinkCode,
  matchesUrbanitoFilters,
  newLinkCode,
  normalizeLinkCode,
  readTelegramId,
  readUrbanitoFilters,
  toUrbanitoListing,
  readUrbanitoSnapshot,
  urbanitoKeyMatches,
} from "../src/lib/urbanito-input";

test("only the bot with the shared key gets in", () => {
  assert.equal(urbanitoKeyMatches("Bearer clave-larga", "clave-larga"), true);
  assert.equal(urbanitoKeyMatches("Bearer otra", "clave-larga"), false);
  assert.equal(urbanitoKeyMatches("Basic clave-larga", "clave-larga"), false);
  assert.equal(urbanitoKeyMatches(null, "clave-larga"), false);
  assert.equal(urbanitoKeyMatches("Bearer ", undefined), false);
});

test("link codes are 6 easy characters, typed in any case, stored as a hash", () => {
  const code = newLinkCode();
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(normalizeLinkCode(` ${code.toLowerCase()} `), code);
  assert.equal(normalizeLinkCode("AB-C 123"), "ABC123");
  assert.equal(normalizeLinkCode("ABC12"), null);
  assert.equal(normalizeLinkCode(123456), null);
  assert.match(hashLinkCode(code), /^[0-9a-f]{64}$/);
});

test("telegram ids must be positive whole numbers", () => {
  assert.equal(readTelegramId(7774705609), 7774705609);
  assert.equal(readTelegramId("7774705609"), 7774705609);
  assert.equal(readTelegramId(-5), null);
  assert.equal(readTelegramId("1 or 1=1"), null);
  assert.equal(readTelegramId(1.5), null);
});

test("search filters read from the query and match listings", () => {
  const filters = readUrbanitoFilters(new URLSearchParams("zona=equipetról&mascotas=true&precio_max_bs=abc&tipo="));
  assert.deepEqual(filters, { texto: undefined, ciudad: undefined, zona: "equipetról", tipo: undefined, precioMaxBs: undefined, dormitoriosMin: undefined, mascotas: true, amoblado: undefined });
  const home = { ...curatedRentalProperties[0], zone: "Equipetrol", pets: true, bedrooms: 2, currency: "USD" as const, price: 400, exchangeRate: null };
  assert.equal(matchesUrbanitoFilters(home, filters), true);
  assert.equal(matchesUrbanitoFilters(home, { precioMaxBs: 4000 }), false); // 400 x 12
  assert.equal(matchesUrbanitoFilters(home, { precioMaxBs: 5000, dormitoriosMin: 2 }), true);
  assert.equal(matchesUrbanitoFilters(home, { dormitoriosMin: 3 }), false);
  assert.equal(matchesUrbanitoFilters({ ...home, pets: false }, filters), false);
});

test("the bot gets the page link and never the owner's phone", () => {
  const listing = toUrbanitoListing(curatedRentalProperties[0], "https://zentrourbano.com");
  assert.equal(listing.link, `https://zentrourbano.com/propiedades/${curatedRentalProperties[0].slug}`);
  assert.doesNotMatch(JSON.stringify(listing), /whatsapp|@|wa\.me/i);
});

test("the Urbanito summary is capped, cleaned and drops the chat when the owner hid it", () => {
  const body = {
    telegram_id: 7,
    recordatorios: [{ cuando: "2026-10-29T00:00:00Z", texto: "Visita de Carla" }, { cuando: "no es fecha", texto: "x" }],
    fichas: Array.from({ length: 20 }, (_, index) => ({ titulo: `Ficha ${index}`, creado: "2026-10-27T12:00:00Z", paginas: 2 })),
    chat: [
      { rol: "user", texto: "uno" },
      { rol: "assistant", texto: "dos" },
      { rol: "system", texto: "no" },
      { rol: "user", texto: "tres" },
      { rol: "assistant", texto: "cuatro" },
      { rol: "user", texto: "x".repeat(900) },
    ],
    plan: { nombre: "Gratis", usados: 4, limite: 10 },
    totales: { recordatorios: 4, fichas: -1, preguntas: "11" },
  };
  const shown = readUrbanitoSnapshot(body, true);
  assert.equal(shown.recordatorios.length, 1);
  assert.equal(shown.fichas.length, 12);
  assert.deepEqual(shown.chat.map((message) => message.texto.length), [3, 4, 6, 500]);
  assert.deepEqual(shown.plan, { nombre: "Gratis", usados: 4, limite: 10 });
  assert.deepEqual(shown.totales, { recordatorios: 4, fichas: 0, preguntas: 0 });
  assert.deepEqual(readUrbanitoSnapshot(body, false).chat, []);
  assert.deepEqual(readUrbanitoSnapshot(null, true).recordatorios, []);
});
