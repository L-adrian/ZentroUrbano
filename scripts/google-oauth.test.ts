import assert from "node:assert/strict";
import { test } from "node:test";
import { createGoogleAttempt, googleOAuthConfig, readGoogleAttempt } from "../src/lib/google-oauth";
import { safeAuthNext } from "../src/lib/auth-navigation";

const env = { NEXT_PUBLIC_SITE_URL: "https://zentrourbano.com", GOOGLE_REDIRECT_URI: "https://zentrourbano.com/api/auth/google/callback", GOOGLE_CLIENT_SECRET: "qa-placeholder" };
test("local Google callback stays on the same localhost origin and port", () => {
  for (const host of ["localhost:3000", "localhost:3001", "127.0.0.1:3003"]) {
    const config = googleOAuthConfig({ url: `http://${host}/api/auth/google/start`, headers: new Headers({ host }) }, env);
    assert.equal(config.redirectUri, `http://${host}/api/auth/google/callback`);
    assert.equal(config.secure, false);
    assert.equal(config.validCallback, true);
  }
});
test("production behind a proxy uses the configured HTTPS callback", () => {
  const config = googleOAuthConfig({ url: "http://localhost:3000/api/auth/google/start", headers: new Headers({ "x-forwarded-host": "zentrourbano.com", "x-forwarded-proto": "https" }) }, env);
  assert.equal(config.redirectUri, env.GOOGLE_REDIRECT_URI);
  assert.equal(config.secure, true);
  assert.equal(config.local, false);
  assert.equal(googleOAuthConfig({ url: "https://zentrourbano.com/", headers: new Headers() }, { ...env, GOOGLE_REDIRECT_URI: "https://another.invalid/api/auth/google/callback" }).validCallback, false);
});
test("Next internal localhost normalization does not change the browser's loopback hostname", () => {
  const config = googleOAuthConfig({ url: "http://localhost:3003/api/auth/google/start", headers: new Headers({ host: "127.0.0.1:3003" }) }, env);
  assert.equal(config.origin, "http://127.0.0.1:3003");
});
test("Google return targets never redirect to another origin", () => {
  for (const next of ["//evil.invalid", "/\\evil.invalid", "https://evil.invalid", "/\nevil.invalid", "", null]) assert.equal(safeAuthNext(next), "/cliente");
  assert.equal(safeAuthNext("/publicar"), "/publicar");
});
test("OAuth state binds the callback, age, return path and PKCE verifier", () => {
  const callback = env.GOOGLE_REDIRECT_URI;
  const attempt = createGoogleAttempt("/publicar", callback);
  assert.equal(readGoogleAttempt(attempt.cookie, attempt.state, callback)?.next, "/publicar");
  assert.match(attempt.challenge, /^[\w-]{43}$/);
  assert.equal(readGoogleAttempt(attempt.cookie, "wrong", callback), null);
  assert.equal(readGoogleAttempt(attempt.cookie, attempt.state, "http://localhost:3000/api/auth/google/callback"), null);
  assert.equal(readGoogleAttempt("bad", attempt.state, callback), null);
  const expired = Buffer.from(JSON.stringify({ ...attempt, createdAt: Date.now() - 601_000 })).toString("base64url");
  assert.equal(readGoogleAttempt(expired, attempt.state, callback), null);
});
