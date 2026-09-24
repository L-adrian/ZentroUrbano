import { randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { applyMigrations } from "./database-migrations.mjs";

// This staging tool never reads production environment files or accepts a remote database.
const { values } = parseArgs({ options: { email: { type: "string" }, username: { type: "string" } } });
const root = process.cwd();
const directory = path.join(root, "output", "imports", "espiritu-santo");
const building = JSON.parse(readFileSync(path.join(directory, "building.json"), "utf8"));
const credentialsPath = path.join(directory, "credentials.local.json");
const database = "zentro_edificio_local";
const port = 3310;
const accountId = "acct_espiritu_santo_owner";
const userId = "user_espiritu_santo_owner";
const privatePath = path.join(directory, "mysql-data");
const temporaryEmail = "espiritu-santo@local.zentrourbano.invalid";
const secret = () => randomBytes(24).toString("base64url");
const existed = existsSync(credentialsPath);
const credentials = existed ? JSON.parse(readFileSync(credentialsPath, "utf8")) : {
  project: "Zentro Urbano - Espiritu Santo LOCAL ONLY", rootPassword: secret(), databasePassword: secret(),
  ownerEmail: values.email || temporaryEmail, ownerPassword: secret(), adminPassword: secret(),
};
if (credentials.project !== "Zentro Urbano - Espiritu Santo LOCAL ONLY") throw new Error("Unexpected private staging file.");
if (values.email) credentials.ownerEmail = values.email.trim().toLowerCase();
if (values.username) {
  const username = values.username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(username)) throw new Error("Invalid owner username.");
  if (!credentials.ownerUsername) credentials.ownerPassword = `EspirituSanto!${randomBytes(3).toString("hex")}`;
  credentials.ownerUsername = username;
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.ownerEmail)) throw new Error("Invalid owner email.");
if (!existed) writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { flag: "wx", mode: 0o600 });

let connection;
try {
  if (!existsSync(path.join(privatePath, "my.ini"))) {
    mkdirSync(privatePath, { recursive: true });
    execFileSync("C:/xampp/mysql/bin/mysql_install_db.exe", [
      `--datadir=${privatePath}`, `--password=${credentials.rootPassword}`, `--port=${port}`, "--silent",
    ], { windowsHide: true, stdio: "pipe" });
  }
  const connect = () => mysql.createConnection({ host: "127.0.0.1", port, user: "root", password: credentials.rootPassword, multipleStatements: true, timezone: "Z", connectTimeout: 2000 });
  try { connection = await connect(); }
  catch (error) {
    if (error.code !== "ECONNREFUSED") throw error;
    const log = openSync(path.join(directory, "mysql.log"), "a");
    const child = spawn("C:/xampp/mysql/bin/mysqld.exe", [
      `--defaults-file=${path.join(privatePath, "my.ini")}`, "--bind-address=127.0.0.1", `--port=${port}`, "--max-allowed-packet=67108864", "--console",
    ], { detached: true, windowsHide: true, stdio: ["ignore", log, log] });
    child.unref(); closeSync(log);
    for (let attempt = 0; attempt < 60; attempt++) {
      try { connection = await connect(); break; } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!connection) throw new Error("Local database did not start; inspect private mysql.log.");
  }
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE ${database}`);
  await applyMigrations(connection);
  await connection.query("CREATE USER IF NOT EXISTS 'zentro_edificio'@'localhost' IDENTIFIED BY ?", [credentials.databasePassword]);
  await connection.query(`GRANT ALL PRIVILEGES ON ${database}.* TO 'zentro_edificio'@'localhost'`);
  const images = building.photos.map(name => `/images/properties/espiritu-santo/${name}`);
  for (const asset of [...images, building.video]) if (!existsSync(path.join(root, "public", asset))) throw new Error("A building media asset is missing.");
  const hash = await bcrypt.hash(credentials.ownerPassword, 12);
  const contactEmail = credentials.ownerEmail.endsWith(".invalid") ? null : credentials.ownerEmail;
  const profile = { name: building.ownerName, email: contactEmail || "", phone: building.whatsapp, avatar: "", verified: false };
  const rows = building.options.map(option => {
    const description = [option.description, building.commonDescription, building.mediaNote, building.locationNote].join("\n\n");
    const details = { title: option.title, type: "Monoambiente", zone: building.zone, address: building.address,
      bedrooms: 0, bathrooms: 1, garage: 0, area: option.area, pets: false, furnished: false, security: false, pool: false, patio: option.number !== 1, grill: true, elevator: false,
      price: option.price, currency: "BOB", exchangeRate: null, commonExpenses: 0, guarantee: "1 mes de alquiler", guaranteeAmount: null, description,
      parkingNote: "1 moto incluida", mediaNote: building.mediaNote, petsPolicy: "not_allowed" };
    return { id: `property_espiritu_santo_${option.number}`, slug: option.slug, title: option.title, type: "Departamento", operation: "Alquiler", price: option.price, currency: "BOB",
      city: building.city, zone: building.zone, address: building.address, bedrooms: 0, bathrooms: 1, garage: 0, area: option.area,
      pets: false, furnished: false, security: false, pool: false, patio: option.number !== 1, grill: true, elevator: false,
      short_description: `Opcion ${option.number} en ${building.name}. Expensas y parqueo para una moto incluidos. Trato directo.`,
      long_description: description, requirements: JSON.stringify(building.requirements), images: JSON.stringify(images), video: building.video,
      map_url: building.mapReference, whatsapp: building.whatsapp, ideal_for: "[]", tags: JSON.stringify([building.name, "Monoambiente", "Expensas incluidas", "Parqueo para moto", option.number === 1 ? "Balcon" : "Patio interno"]),
      listing_plan: "standard", featured: false, published: true, is_seeded: false, coordinates: JSON.stringify(building.coordinates),
      neighborhood_highlights: JSON.stringify(["Av. 2 de Agosto, zona 8vo anillo", "Micros 36 y 89", "Ubicacion referencial; confirmar el punto exacto"]),
      owner_profile: JSON.stringify(profile), rental_details: JSON.stringify(details) };
  });
  await connection.beginTransaction();
  try {
    await connection.execute("INSERT INTO client_accounts (id,kind,display_name,email,phone,avatar_initials,role_label,location) VALUES (?,'owner',?,?,?,'FF','Propietario','Santa Cruz de la Sierra') ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),email=VALUES(email),phone=VALUES(phone)", [accountId, building.ownerName, contactEmail, building.whatsapp]);
    await connection.execute("INSERT INTO morada_users (id,account_id,email,username,password_hash) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE email=VALUES(email),username=VALUES(username),password_hash=VALUES(password_hash)", [userId, accountId, contactEmail ?? (credentials.ownerUsername ? null : credentials.ownerEmail), credentials.ownerUsername || null, hash]);
    for (const row of rows) {
      const columns = Object.keys(row);
      await connection.execute(`INSERT INTO properties (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")}) ON DUPLICATE KEY UPDATE ${columns.filter(key => key !== "id" && key !== "slug").map(key => `${key}=VALUES(${key})`).join(",")}`, Object.values(row));
      await connection.execute("INSERT INTO client_account_properties (id,account_id,property_slug,status) VALUES (?,?,?,'active') ON DUPLICATE KEY UPDATE status='active'", [`cap_espiritu_santo_${row.id.at(-1)}`, accountId, row.slug]);
    }
    const [[linked]] = await connection.execute("SELECT COUNT(*) AS count FROM client_account_properties WHERE account_id=?", [accountId]);
    if (Number(linked.count) !== 3) throw new Error("Unexpected ownership count; rolling back.");
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
  const databaseUrl = `mysql://zentro_edificio:${credentials.databasePassword}@127.0.0.1:${port}/${database}`;
  writeFileSync(path.join(directory, "preview.env"), [
    `DATABASE_URL=${databaseUrl}`, "ZENTRO_REQUIRE_DATABASE=1", "MYSQL_CONNECTION_LIMIT=5", "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3011",
    "ZENTRO_URBANO_ADMIN_USER=admin-local", `ZENTRO_URBANO_ADMIN_PASSWORD=${credentials.adminPassword}`,
    `ZENTRO_STORAGE_DIR=${path.join(directory, "storage").replaceAll("\\", "/")}`,
  ].join("\n") + "\n", { mode: 0o600 });
  writeFileSync(path.join(directory, "acceso-local.txt"), `SOLO LOCAL - NO ES UNA CUENTA DE PRODUCCION\n\nAcceso: http://127.0.0.1:3011/login\nUsuario: ${credentials.ownerUsername || credentials.ownerEmail}\nContrasena: ${credentials.ownerPassword}\nCorreo de contacto: ${contactEmail || "pendiente"}\n\nContrasena provisional: cambiar antes de compartir el acceso en produccion.\nLas tres opciones pertenecen a esta cuenta.\nEditar ubicacion: Mi cuenta > Editar ficha > Ubicacion y contacto.\n`, { mode: 0o600 });
  writeFileSync(path.join(directory, "staged-properties.json"), JSON.stringify({ localOnly: true, readyForProduction: false, sourceUrl: building.sourceUrl, accountId, properties: rows }, null, 2));
  console.log(JSON.stringify({ localOnly: true, database, accountId, provisionalEmail: credentials.ownerEmail.endsWith(".invalid"), properties: rows.map(row => ({ slug: row.slug, price: row.price, photos: images.length, video: true })), credentialsFile: path.join(directory, "acceso-local.txt") }, null, 2));
} catch (error) {
  console.error(`Local staging failed (${error.code || error.name}); production was not contacted.`);
  process.exitCode = 1;
} finally { if (connection) await connection.end(); }
