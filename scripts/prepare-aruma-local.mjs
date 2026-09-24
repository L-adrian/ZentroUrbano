import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { saveLocalOwnerAccess } from "./local-owner-access.mjs";

const root = process.cwd();
const directory = `${root}/output/imports/aruma-urbari`;
const source = JSON.parse(readFileSync(`${directory}/source.json`, "utf8"));
process.loadEnvFile(`${root}/output/imports/espiritu-santo/preview.env`);
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "3310" || url.pathname !== "/zentro_edificio_local") throw new Error("Only the isolated local database is permitted.");
const credentialsFile = `${directory}/credentials.local.json`;
if (!existsSync(credentialsFile)) writeFileSync(credentialsFile, JSON.stringify({ username: source.username, password: `Aruma!${randomBytes(3).toString("hex")}` }, null, 2), { flag: "wx", mode: 0o600 });
const credentials = JSON.parse(readFileSync(credentialsFile, "utf8"));
const images = source.photos.map(name => `/images/properties/aruma-urbari/${name}`);
for (const image of images) if (!existsSync(`${root}/public${image}`)) throw new Error("An original photo is missing.");
const accountId = "acct_aruma_ruben_owner", userId = "user_aruma_ruben_owner";
const description = `${source.description}\n\n${source.locationNote}`;
const details = { title: source.title, type: "Monoambiente", zone: "Urbari", address: source.address, bedrooms: 0, bathrooms: null, garage: 0, area: null,
  pets: false, petsPolicy: "consult", furnished: true, security: false, pool: true, patio: false, grill: true, elevator: false,
  price: source.price, currency: "BOB", exchangeRate: null, commonExpenses: 0, guarantee: "Consultar con el propietario", guaranteeAmount: null,
  description, parkingNote: "Consultar" };
const row = { id: "property_aruma_2800", slug: source.slug, title: source.title, type: "Departamento", operation: "Alquiler", price: source.price, currency: "BOB",
  city: "Santa Cruz de la Sierra", zone: "Urbari", address: source.address, bedrooms: 0, bathrooms: 0, garage: 0, area: 0,
  pets: false, furnished: true, security: false, pool: true, patio: false, grill: true, elevator: false,
  short_description: "Monoambiente amoblado para 2 personas en Urbari. Incluye expensas, agua y wifi. Trato directo.",
  long_description: description, requirements: JSON.stringify(source.requirements), images: JSON.stringify(images), video: null,
  map_url: `https://www.google.com/maps/search/?api=1&query=${source.coordinates.lat},${source.coordinates.lng}`, whatsapp: source.whatsapp, ideal_for: "[]",
  tags: JSON.stringify(["Monoambiente", "Amoblado", "Expensas incluidas", "Agua incluida", "Wifi incluido", "Condominio Arumá"]),
  listing_plan: "standard", featured: false, published: true, is_seeded: false, coordinates: JSON.stringify(source.coordinates),
  neighborhood_highlights: JSON.stringify(["Urbari, zona 2do anillo", "Condominio Arumá; acceso a confirmar"]),
  owner_profile: JSON.stringify({ name: source.name, email: "", phone: source.whatsapp, avatar: "", verified: false }), rental_details: JSON.stringify(details) };
const connection = await mysql.createConnection(url.href);
try {
  await connection.beginTransaction();
  const [existing] = await connection.execute("SELECT id FROM properties WHERE id=? OR slug=?", [row.id, row.slug]);
  if (!existing.length) {
    await connection.execute("INSERT INTO client_accounts (id,kind,display_name,email,phone,avatar_initials,role_label,location) VALUES (?,'owner',?,NULL,?,'RD','Propietario','Santa Cruz de la Sierra')", [accountId, source.name, source.whatsapp]);
    await connection.execute("INSERT INTO morada_users (id,account_id,email,username,password_hash) VALUES (?,?,NULL,?,?)", [userId, accountId, credentials.username, await bcrypt.hash(credentials.password, 12)]);
    const columns = Object.keys(row);
    await connection.execute(`INSERT INTO properties (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`, Object.values(row));
    await connection.execute("INSERT INTO client_account_properties (id,account_id,property_slug,status) VALUES ('cap_aruma_2800',?,?,'active')", [accountId, source.slug]);
  }
  // Modify only the confirmed pet condition; preserve manually edited locations and other data.
  const [building] = await connection.query("SELECT * FROM properties WHERE id IN ('property_espiritu_santo_1','property_espiritu_santo_2','property_espiritu_santo_3') FOR UPDATE");
  if (building.length !== 3) throw new Error("Expected three building options.");
  const backup = `${directory}/building-before-pet-update.json`;
  if (!existsSync(backup)) writeFileSync(backup, JSON.stringify(building, null, 2), { flag: "wx", mode: 0o600 });
  for (const property of building) {
    const current = JSON.parse(property.rental_details);
    const text = property.long_description.replace("Mascotas: consultar con el propietario.", "No se aceptan mascotas.");
    const longDescription = text.includes("No se aceptan mascotas.") ? text : `${text}\n\nNo se aceptan mascotas.`;
    current.pets = false; current.petsPolicy = "not_allowed"; current.description = longDescription;
    await connection.execute("UPDATE properties SET pets=0,rental_details=?,long_description=? WHERE id=?", [JSON.stringify(current), longDescription, property.id]);
  }
  await connection.commit();
  const accessFile = saveLocalOwnerAccess({ accountId, name: source.name, username: credentials.username, password: credentials.password, email: "", phone: source.whatsapp, properties: [source.slug], sourceUrl: source.sourceUrl });
  const buildingAccess = JSON.parse(readFileSync(`${root}/output/imports/espiritu-santo/credentials.local.json`, "utf8"));
  saveLocalOwnerAccess({ accountId: "acct_espiritu_santo_owner", name: "Fabian Freddy", username: buildingAccess.ownerUsername, password: buildingAccess.ownerPassword, email: "", phone: "59170885184",
    properties: building.map(property => property.slug), sourceUrl: "https://www.facebook.com/marketplace/item/2331722890933978/" });
  writeFileSync(`${directory}/staged-property.json`, JSON.stringify({ localOnly: true, readyForProduction: false, source, property: row }, null, 2));
  console.log(JSON.stringify({ localOnly: true, created: existing.length === 0, slug: source.slug, photos: images.length, owner: source.name, username: credentials.username, buildingPetsUpdated: building.length, accessFile }));
} catch (error) {
  await connection.rollback();
  console.error(`Local import failed (${error.code || error.name}); production was not contacted.`);
  process.exitCode = 1;
} finally { await connection.end(); }
