import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("production uses the database preflight for GitHub and ZIP", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.scripts.start, "node scripts/start-hostinger.mjs");
  assert.equal(pkg.scripts["start:preview"], "next start");
  assert.equal(pkg.engines.node, "24.x");
  for (const name of ["start", "build", "postinstall", "prestart"]) {
    assert.doesNotMatch(pkg.scripts[name] || "", /db:(seed|migrate)/);
  }
});

test("production fails closed before connecting when credentials are missing", () => {
  for (const config of [
    { DATABASE_URL: "", ZENTRO_URBANO_ADMIN_USER: "", ZENTRO_URBANO_ADMIN_PASSWORD: "" },
    { DATABASE_URL: "unused", ZENTRO_URBANO_ADMIN_USER: "qa-admin", ZENTRO_URBANO_ADMIN_PASSWORD: "short" },
  ]) {
    const result = spawnSync(process.execPath, ["scripts/start-hostinger.mjs"], {
      env: { ...process.env, ...config },
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Configura DATABASE_URL/);
  }
});

test("Git excludes private runtime files while preserving deployment sources", () => {
  const paths = [
    ".env.local", "output/mysql-backup.sql", "output/hostinger/release.zip",
    "storage/client-accounts.json", "test-results/report.json", ".playwright-cli/session.log",
    "documentos/contacts.xlsx", "artifacts/export.json", "backup.sql", "private.key",
  ];
  const result = spawnSync("git", ["check-ignore", "--no-index", "--stdin"], {
    input: paths.join("\n") + "\n",
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0);
  assert.deepEqual(result.stdout.trim().split(/\r?\n/).sort(), [...paths].sort());
  const sources = spawnSync("git", ["check-ignore", "--no-index", "--stdin"], {
    input: "database/mysql/003_publication_review.sql\nCONFIGURACION.env.example\nsrc/app/page.tsx\n",
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(sources.status, 1);
  assert.equal(sources.stdout, "");
});
