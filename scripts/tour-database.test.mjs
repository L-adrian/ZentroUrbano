import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const url = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname.endsWith('_qa'));
const db = await mysql.createConnection({ uri: url.toString(), multipleStatements: true });
const slug = `tour-qa-${randomUUID()}`;
const revision = randomUUID();
try {
  await db.query('CREATE TABLE IF NOT EXISTS properties (slug VARCHAR(180) PRIMARY KEY) ENGINE=InnoDB');
  await db.query(await readFile('database/mysql/006_property_tours.sql', 'utf8'));
  await db.execute('INSERT INTO properties(slug) VALUES (?)', [slug]);
  await db.execute('INSERT INTO property_tours(property_slug,revision,manifest) VALUES (?,?,?)', [slug, revision, '{}']);
  for (const name of ['world.spz', 'mobile.spz']) {
    await db.execute('INSERT INTO property_tour_assets VALUES (?,?,?,?,?)', [slug, name, '0'.repeat(64), 1, Buffer.from([0])]);
  }
  const authorization = 'Basic ' + Buffer.from(`${process.env.ZENTRO_URBANO_ADMIN_USER}:${process.env.ZENTRO_URBANO_ADMIN_PASSWORD}`).toString('base64');
  const decide = body => fetch(`http://127.0.0.1:3000/admin/recorridos/${slug}/decision`, {
    method: 'POST', headers: { authorization, origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' },
    body: JSON.stringify({ revision, ...body }),
  });
  for (const action of ['publish', 'hide', 'publish']) {
    const response = await decide({ action, reviewed: true, ownerApproved: true });
    assert.equal(response.status, 200, await response.text());
    const [[row]] = await db.execute('SELECT status,owner_approved_at FROM property_tours WHERE property_slug=?', [slug]);
    assert.equal(row.status, action === 'publish' ? 'published' : 'hidden');
    assert.ok(row.owner_approved_at);
  }
  assert.equal((await decide({ action: 'publish', reviewed: false, ownerApproved: true })).status, 400);
  assert.equal((await decide({ action: 'publish', revision: randomUUID(), reviewed: true, ownerApproved: true })).status, 400);
  const [[audit]] = await db.execute('SELECT COUNT(*) AS n FROM property_tour_audit WHERE property_slug=?', [slug]);
  assert.equal(Number(audit.n), 3);
  console.log('PASS: production tour approval, withdrawal, republication, consent and revision checks on MariaDB.');
} finally { await db.end(); }
