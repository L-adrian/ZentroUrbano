import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createUploadPhotoFixtures } from "./fixtures/upload-photos";

const enabled = process.env.RUN_AUTH_QA === "1";
const options = { skip: !enabled };
let server: ChildProcess;
let baseUrl: string;
let storage: string;
let cookie: string;
let accountId: string;
let requestId: string;
const adminPassword = randomUUID();
const email = `qa-${randomUUID()}@example.invalid`;
const password = randomUUID();
const payload = { operation: "Alquiler", publisherKind: "owner", ownerConfirmed: true, propertyType: "Casa", contactName: "Propietario QA", whatsapp: "59170000000", sourceText: "Vivienda de prueba aislada para verificar el registro, acceso y envio de publicaciones." };

before(async () => {
  if (!enabled) return;
  await mkdir("output/auth-qa", { recursive: true });
  storage = await mkdtemp(path.resolve("output/auth-qa/run-"));
  const listener = createServer();
  await new Promise<void>(resolve => listener.listen(0, "127.0.0.1", resolve));
  const address = listener.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>(resolve => listener.close(() => resolve()));
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["--import", pathToFileURL(path.resolve("scripts/oauth-qa-provider.mjs")).href, "node_modules/next/dist/bin/next", "start", "-p", String(port), "--hostname", "127.0.0.1"], {
    cwd: process.cwd(), windowsHide: true, stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "", ZENTRO_STORAGE_DIR: storage, NODE_ENV: "production", GOOGLE_CLIENT_ID: "qa-client.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "qa-not-a-real-secret", GOOGLE_QA_EMAIL: email, ZENTRO_URBANO_ADMIN_USER: "qa-admin", ZENTRO_URBANO_ADMIN_PASSWORD: adminPassword },
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Isolated auth QA exited with code ${server.exitCode}`);
    try { if ((await fetch(`${baseUrl}/api/session`)).ok) return; } catch { /* Wait for the isolated server. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("Isolated auth QA server did not start");
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise<void>(resolve => server.once("exit", () => resolve()));
  server.kill();
  await exited;
});

function request(route: string, body?: unknown, session?: string) {
  return fetch(`${baseUrl}${route}`, {
    method: body === undefined ? "GET" : "POST", redirect: "manual",
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(session ? { cookie: session } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("registration creates an owner session and unlocks the wizard", options, async () => {
  const response = await request("/api/auth/register", { email, password, displayName: "Propietario QA", accountKind: "agency" });
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie")!.split(";")[0];
  accountId = (await response.json()).accountId;
  const page = await request("/publicar", undefined, cookie);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Publicando como/);
  const database = JSON.parse(await readFile(path.join(storage, "auth/accounts.json"), "utf8"));
  assert.equal(database.accounts.find((account: { id: string }) => account.id === accountId).kind, "owner");
});

test("authenticated publication still enforces direct rentals and photo requirements", options, async () => {
  for (const change of [{ operation: "Compra" }, { operation: "Anticrético" }, { publisherKind: "agency" }, { ownerConfirmed: false }, { propertyType: "Terreno" }]) {
    const response = await request("/api/publication-requests", { ...payload, ...change }, cookie);
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /Solo aceptamos viviendas en alquiler directo/);
  }
  const response = await request("/api/publication-requests", payload, cookie);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Agrega al menos 5 fotos/);
});

test("submission stores photos and belongs to the authenticated account, not a forged id", options, async () => {
  const photo = await readFile("public/images/properties/torre-urbari/01.jpg");
  const form = new FormData();
  form.set("payload", JSON.stringify({ ...payload, price: 400, currency: "USD", exchangeRate: 8.25, accountId: "someone-else", accountEmail: "someone-else@example.invalid" }));
  for (const file of await createUploadPhotoFixtures()) form.append("photos", file);
  const response = await fetch(`${baseUrl}/api/publication-requests`, { method: "POST", headers: { cookie }, body: form });
  assert.equal(response.status, 201);
  const result = await response.json();
  requestId = result.requestId;
  const record = JSON.parse(await readFile(path.join(storage, "publication-requests", result.requestId, "request.json"), "utf8"));
  assert.equal(record.accountId, accountId);
  assert.equal(record.accountEmail, email);
  assert.equal(record.status, "pending_review");
  assert.equal(record.photos.length, 5);
  assert.equal(record.price, 400);
  assert.equal(record.currency, "USD");
  assert.equal(record.exchangeRate, 8.25);
  assert.deepEqual(await readFile(path.join(storage, "publication-requests", result.requestId, "01.jpg")), photo);
});

test("publication rejects an invalid USD exchange rate instead of losing it", options, async () => {
  for (const exchangeRate of [undefined, null, 0, -1, "oops", true, 1001]) {
    const response = await request("/api/publication-requests", { ...payload, currency: "USD", exchangeRate }, cookie);
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /tipo de cambio/);
  }
});

test("Google starts without MySQL and stores the avatar on the existing owner account", options, async () => {
  const start = await request("/api/auth/google/start?next=/publicar");
  assert.equal(start.status, 307);
  const google = new URL(start.headers.get("location")!);
  assert.equal(google.origin, "https://accounts.google.com");
  assert.equal(google.searchParams.get("redirect_uri"), `${baseUrl}/api/auth/google/callback`);
  assert.equal(google.searchParams.get("code_challenge_method"), "S256");
  const stateCookie = start.headers.get("set-cookie")!.split(";")[0];
  const callback = await request(`/api/auth/google/callback?code=qa-success&state=${google.searchParams.get("state")}`, undefined, stateCookie);
  assert.equal(callback.headers.get("location"), `${baseUrl}/publicar`);
  assert.ok(callback.headers.getSetCookie().some(value => value.startsWith("morada_session=")));
  const database = JSON.parse(await readFile(path.join(storage, "auth/accounts.json"), "utf8"));
  const account = database.accounts.find((item: { email: string }) => item.email === email);
  assert.equal(account.id, accountId);
  assert.equal(account.avatarUrl, "https://lh3.googleusercontent.com/qa-avatar");
  assert.equal(database.accounts.filter((item: { email: string }) => item.email === email).length, 1);
});

test("Google rejects invalid state and handles cancellation and provider errors", options, async () => {
  for (const [code, expected] of [["qa-token", "token"], ["qa-unverified", "profile"], ["qa-network", "network"], ["cancelled", "cancelled"], ["bad-state", "state"]]) {
    const start = await request("/api/auth/google/start?next=/publicar");
    const google = new URL(start.headers.get("location")!);
    const stateCookie = start.headers.get("set-cookie")!.split(";")[0];
    const query = new URLSearchParams({ state: code === "bad-state" ? "wrong" : google.searchParams.get("state")!, ...(code === "cancelled" ? { error: "access_denied" } : { code }) });
    const callback = await request(`/api/auth/google/callback?${query}`, undefined, stateCookie);
    assert.equal(new URL(callback.headers.get("location")!).searchParams.get("google_error"), expected);
    assert.ok(callback.headers.getSetCookie().some(value => value.includes("morada_google_state=") && value.includes("Max-Age=0")));
    assert.ok(!callback.headers.getSetCookie().some(value => value.startsWith("morada_session=")));
  }
});

test("publication rejects malformed images and excess photos via the real API", options, async () => {
  for (const count of [1, 4, 5, 16]) {
    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    for (let i = 0; i < count; i++) form.append("photos", new Blob(["not a JPEG"], { type: "image/jpeg" }), `fake-${i}.jpg`);
    const response = await fetch(`${baseUrl}/api/publication-requests`, { method: "POST", headers: { cookie }, body: form });
    assert.equal(response.status, count === 5 ? 415 : 400);
    assert.equal((await response.json()).ok, false);
  }
});

test("owner sees their receipt; another account and anonymous visitors cannot access it", options, async () => {
  const ownerPage = await request("/cliente/solicitudes", undefined, cookie);
  assert.match(await ownerPage.text(), new RegExp(requestId));
  assert.equal((await request("/cliente/solicitudes")).status, 307);
  const second = await request("/api/auth/register", { email: `other-${email}`, password, displayName: "Otra cuenta QA" });
  const otherCookie = second.headers.get("set-cookie")!.split(";")[0];
  assert.doesNotMatch(await (await request("/cliente/solicitudes", undefined, otherCookie)).text(), new RegExp(requestId));
});

test("review photos remain private and can be opened by the administrator", options, async () => {
  const photoPath = `/admin/solicitudes/${requestId}/fotos/01.jpg`;
  assert.equal((await request(photoPath)).status, 401);
  assert.equal((await request(photoPath, undefined, cookie)).status, 401);
  const headers = { authorization: `Basic ${Buffer.from(`qa-admin:${adminPassword}`).toString("base64")}` };
  const overview = await fetch(`${baseUrl}/admin/solicitudes`, { headers });
  assert.match(await overview.text(), new RegExp(requestId));
  const photo = await fetch(`${baseUrl}${photoPath}`, { headers });
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), await readFile("public/images/properties/torre-urbari/01.jpg"));
  assert.equal((await fetch(`${baseUrl}/admin/solicitudes/invalid/fotos/01.jpg`, { headers })).status, 404);
});

test("logout blocks old tokens, while login returns to the authenticated flow", options, async () => {
  assert.equal((await request("/api/auth/signout", {}, cookie)).status, 200);
  assert.equal((await request("/api/publication-requests", payload, cookie)).status, 401);
  assert.equal((await request("/publicar", undefined, cookie)).status, 307);
  assert.equal((await request("/api/auth/login", { email, password: "incorrect" })).status, 401);
  const response = await request("/api/auth/login", { email, password });
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await request("/publicar", undefined, cookie)).status, 200);
});
