import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadRuntimeEnvironment } from "./runtime-environment.mjs";

loadRuntimeEnvironment();

const values = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index]?.replace(/^--/, "");
  const value = process.argv[index + 1];
  if (key && value) values.set(key, value);
}

const slug = values.get("slug");
const layoutPath = values.get("layout");
const salaPath = values.get("sala");
const cocinaPath = values.get("cocina");
const site = (values.get("site") || process.env.NEXT_PUBLIC_SITE_URL || "https://zentrourbano.com").replace(/\/$/, "");
const user = process.env.ZENTRO_URBANO_ADMIN_USER;
const password = process.env.ZENTRO_URBANO_ADMIN_PASSWORD;
if (!slug || !layoutPath || !salaPath || !cocinaPath) throw new Error("Usa --slug, --layout, --sala y --cocina.");
if (!user || !password) throw new Error("Faltan las credenciales administrativas locales.");

const layout = JSON.parse(await readFile(resolve(layoutPath), "utf8"));
const manifest = {
  scope: "Sala, comedor y cocina",
  model: "marble-1.1",
  disclaimer: layout.disclaimer,
  start: layout.start,
  connection: layout.connection,
  rooms: layout.rooms,
};
const form = new FormData();
form.set("slug", slug);
form.set("manifest", new Blob([JSON.stringify(manifest)], { type: "application/json" }), "manifest.json");
form.set("world.spz", new Blob([await readFile(resolve(salaPath))], { type: "application/octet-stream" }), "world.spz");
form.set("mobile.spz", new Blob([await readFile(resolve(cocinaPath))], { type: "application/octet-stream" }), "mobile.spz");

const response = await fetch(`${site}/admin/muestras`, {
  method: "POST",
  headers: {
    Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
    Origin: site,
  },
  body: form,
});
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(result.message || `La carga falló con HTTP ${response.status}.`);
console.log(JSON.stringify({ ok: true, url: new URL(result.url, site).href, revision: result.revision }));
