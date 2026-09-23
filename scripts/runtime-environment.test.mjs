import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import test from "node:test";
import { databaseUrl, validateProductionEnvironment } from "./runtime-environment.mjs";

const runtime = pathToFileURL(resolve("scripts/runtime-environment.mjs")).href;
const key = "ZENTRO_ENV_TEST_VALUE";
const privateKeys = ["DATABASE_URL", "ZENTRO_ENV_FILE", "ZENTRO_URBANO_ADMIN_USER", "ZENTRO_URBANO_ADMIN_PASSWORD", key];
function environment(extra = {}) {
  const env = { ...process.env };
  for (const name of privateKeys) delete env[name];
  return { ...env, ...extra };
}
function temporary(t) {
  const directory = mkdtempSync(join(tmpdir(), "zentro-env-test-"));
  t.after(() => {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + "/zentro-env-test-") || resolve(directory).startsWith(resolve(tmpdir()) + "\\zentro-env-test-"));
    rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}
function run(args, env = {}) {
  return spawnSync(process.execPath, args, { env: environment(env), encoding: "utf8", timeout: 10000, windowsHide: true });
}
function readEnvironment(directory, options = {}, env = {}) {
  return run(["--input-type=module", "-e", `import {loadRuntimeEnvironment} from ${JSON.stringify(runtime)}; loadRuntimeEnvironment(${JSON.stringify({directory,...options})}); console.log(process.env.${key} ?? 'absent');`], env);
}

test("dotenv loading honors production and hosting precedence and parses quoted values", t => {
  const directory = temporary(t);
  writeFileSync(join(directory, ".env"), `${key}=base\n`);
  writeFileSync(join(directory, ".env.production"), `${key}=production\n`);
  writeFileSync(join(directory, ".env.local"), `${key}=local\n`);
  writeFileSync(join(directory, ".env.production.local"), `${key}="highest # literal"\n`);
  let result = readEnvironment(directory, { mode: "production" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "highest # literal");
  result = readEnvironment(directory, { mode: "production" }, { [key]: "hosting" });
  assert.equal(result.stdout.trim(), "hosting");
  result = readEnvironment(directory, { mode: "test" });
  assert.equal(result.stdout.trim(), "base");
});

test("external private env is exclusive; explicit missing file fails instead of using local credentials", t => {
  const directory = temporary(t);
  writeFileSync(join(directory, ".env.local"), `${key}=wrong\n`);
  writeFileSync(join(directory, "private.env"), `${key}=external\n`);
  const result = readEnvironment(directory, { file: "private.env" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "external");
  const missing = readEnvironment(directory, { file: "missing.env" });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /ZENTRO_ENV_FILE/);
});

test("database URL accepts encoded reserved password characters and errors never echo credentials", () => {
  const password = "example?@:#/%";
  const url = new URL("mysql://localhost/example");
  url.username = "example_user";
  url.password = encodeURIComponent(password);
  assert.equal(decodeURIComponent(new URL(databaseUrl({ DATABASE_URL: url.href })).password), password);
  for (const value of ["", "hidden-secret", "postgres://localhost/example", "mysql://localhost", "mysql://localhost/example?password=hidden-secret"]) {
    assert.throws(() => databaseUrl({ DATABASE_URL: value }), error => !error.message.includes("hidden-secret"));
  }
  assert.throws(() => validateProductionEnvironment({ DATABASE_URL: url.href, ZENTRO_URBANO_ADMIN_USER: "qa", ZENTRO_URBANO_ADMIN_PASSWORD: "short" }));
});

test("production startup reads a private env before validating credentials", t => {
  const directory = temporary(t);
  const file = join(directory, "private.env");
  writeFileSync(file, "ZENTRO_URBANO_ADMIN_USER=qa\nZENTRO_URBANO_ADMIN_PASSWORD=long-qa-password-for-test\nDATABASE_URL=invalid-connection\n");
  const result = run(["scripts/start-hostinger.mjs"], { ZENTRO_ENV_FILE: file });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL no tiene un formato/);
  assert.doesNotMatch(result.stderr, /long-qa-password|invalid-connection/);
});

test("private config generator supplies a strong admin password without overwriting or printing secrets", t => {
  const file = join(temporary(t), "private.env");
  const url = new URL("mysql://localhost/example");
  url.username = "qa";
  url.password = "qa-secret%3F";
  const result = run(["scripts/create-hostinger-env.mjs", file], { DATABASE_URL: url.href });
  assert.equal(result.status, 0, result.stderr);
  const content = readFileSync(file, "utf8");
  const parsed = parseEnv(content);
  assert.equal(parsed.DATABASE_URL, url.href);
  assert.ok(parsed.ZENTRO_URBANO_ADMIN_PASSWORD.length >= 32);
  assert.equal(parsed.ZENTRO_REQUIRE_DATABASE, "1");
  assert.doesNotMatch(result.stdout + result.stderr, /qa-secret/);
  const retry = run(["scripts/create-hostinger-env.mjs", file]);
  assert.equal(retry.status, 1);
  assert.equal(readFileSync(file, "utf8"), content);
});

test("SQL export contains the exact ordered migrations and checksums without demo accounts", t => {
  const file = join(temporary(t), "initial.sql");
  const result = run(["scripts/export-database-schema.mjs", file]);
  assert.equal(result.status, 0, result.stderr);
  const content = readFileSync(file, "utf8");
  let position = -1;
  for (const name of readdirSync("database/mysql").filter(name => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(join("database/mysql", name), "utf8").replace(/\r\n/g, "\n");
    const next = content.indexOf(`-- ${name}`);
    assert.ok(next > position);
    position = next;
    assert.ok(content.includes(sql));
    assert.ok(content.includes(createHash("sha256").update(sql).digest("hex")));
  }
  assert.match(content, /SET SESSION default_storage_engine = InnoDB/);
  assert.doesNotMatch(content, /INSERT INTO (morada_users|properties|client_accounts)/i);
});
