import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.RENTALS_TEST_URL;
const options = { skip: !baseUrl };

function request(route: string, init?: RequestInit) {
  return fetch(new URL(route, baseUrl), { redirect: "manual", ...init });
}

test("old agency and non-rental entry points redirect to rentals", options, async () => {
  for (const route of ["/inmobiliarias", "/inmobiliarias/tu-balcon", "/compra", "/venta/santa-cruz/urbari", "/anticretico"]) {
    const response = await request(route);
    assert.equal(response.status, 308, route);
    assert.equal(new URL(response.headers.get("location")!, baseUrl).pathname, "/propiedades", route);
    await response.body?.cancel();
  }
});

test("hidden listing details and social images are not public", options, async () => {
  for (const slug of ["casa-en-venta-zona-sur-santos-dumont", "casa-amoblada-condominio-brisas-del-norte-1"]) {
    for (const suffix of ["", "/opengraph-image"]) {
      const response = await request(`/propiedades/${slug}${suffix}`);
      assert.equal(response.status, 404, `${slug}${suffix}`);
      await response.body?.cancel();
    }
    const contact = await request(`/api/propiedades/${slug}/whatsapp`);
    assert.equal(new URL(contact.headers.get("location")!, baseUrl).pathname, "/propiedades");
    await contact.body?.cancel();
  }
});

test("sitemap contains rentals, not agency or sale listings", options, async () => {
  const response = await request("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /\/alquiler\//);
  assert.doesNotMatch(xml, /\/inmobiliarias|\/venta\/|\/compra\/|\/anticretico\/|casa-en-venta-zona-sur-santos-dumont/);
});

test("publication requires a real session before accepting any payload", options, async () => {
  const page = await request("/publicar");
  assert.equal(page.status, 307);
  const location = new URL(page.headers.get("location")!, baseUrl);
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("next"), "/publicar");
  assert.equal(location.searchParams.get("mode"), "signup");
  const response = await request("/api/publication-requests", {
    method: "POST", headers: { "content-type": "application/json", cookie: "morada_session=invalid-token" },
    body: JSON.stringify({ operation: "Alquiler", publisherKind: "owner", ownerConfirmed: true, accountId: "spoofed" }),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "AUTH_REQUIRED");
});

test("welcome has real entry points, metadata and no pixel art", options, async () => {
  const response = await request("/bienvenida");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /id="welcome-title"/);
  assert.match(html, /href="\/propiedades"/);
  assert.match(html, /href="\/publicar"/);
  assert.match(html, /property="og:url" content="[^"]*\/bienvenida"/);
  assert.match(html, /family-scene/);
  assert.doesNotMatch(html, /family-key|family-replay/);
  assert.match(html, /support-whatsapp-floating/);
  assert.match(html, /rental-faq-item/);
  assert.match(html, /owner-process-tabs/);
  assert.match(html, /commission-crossed/);
  assert.match(html, /Montos ilustrativos/);
  assert.doesNotMatch(html, /pixel-tile|rental-pixel-motion|href="\/inmobiliarias/);
  const sitemap = await (await request("/sitemap.xml")).text();
  assert.match(sitemap, /\/bienvenida<\/loc>/);
});

test("home links to the welcome explanation and serves the branded house icon", options, async () => {
  const html = await (await request("/")).text();
  assert.match(html, /href="\/bienvenida#sin-comisiones"/);
  assert.match(html, /href="\/icon.svg\?/);
  const icon = await request("/icon.svg");
  assert.equal(icon.status, 200);
  assert.match(await icon.text(), /lucide-house/);
  const favicon = await request("/favicon.ico");
  assert.equal(favicon.status, 200);
  const bytes = Buffer.from(await favicon.arrayBuffer());
  assert.equal(bytes.readUInt16LE(2), 1);
  assert.equal(bytes.readUInt16LE(4), 3);
});

test("directions exist in server HTML without waiting for Leaflet", options, async () => {
  const response = await request("/propiedades/demo-monoambiente-equipetrol-norte");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /class="location-map-toolbar"/);
  const link = html.match(/<a[^>]*href="(https:\/\/www\.google\.com\/maps\/dir\/[^\"]*)"[^>]*aria-label="Cómo llegar a esta vivienda con Google Maps"/);
  assert.ok(link, "Directions must be an anchor in the initial HTML");
  const url = new URL(link[1].replaceAll("&amp;", "&"));
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("destination"), "-17.7587,-63.1968");
});
