// Imports owners found on Facebook Marketplace as Zentro accounts with a pending publication request each.
// Nothing is published: every listing waits in /admin/solicitudes for review and its map point, like any owner's.
//
//   npx tsx scripts/import-marketplace-owners.ts --carpeta "C:\Users\Usuario\Documents\Claude\zentro-marketplace"
//   npx tsx scripts/import-marketplace-owners.ts --carpeta <...> --sql <carpeta-salida>   (one .sql per owner for phpMyAdmin)
//
// The folder holds cuentas-propietarios.csv (name, username, password, phone, folder) and one folder per listing
// with ficha.json and its photos. Passwords never leave that folder; only bcrypt hashes reach the database.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { normalizePublicationPhone, validatePublicationDetails } from "@/lib/publication-input";
import { shrinkUploadPhoto, validateUploadPhotos } from "@/lib/upload-photos";
import { databaseUrl, loadRuntimeEnvironment } from "./runtime-environment.mjs";

type Ficha = {
  nombre: string; telefono: string; enlace: string; titulo: string; tipo: string; zona: string; direccion: string | null;
  precio: number; moneda: string; tipoCambio: number | null; dormitorios: number | null; banos: number | null; garaje: number | boolean | null; superficie: number | null;
  mascotas: string; amoblado: boolean; seguridad: boolean; piscina: boolean; patio: boolean; parrillero: boolean; ascensor: boolean;
  expensas: string; montoExpensas: number | null; garantia: string | null; montoGarantia: number | null; descripcion: string; fotos: string[];
};
export type Owner = { name: string; username: string; password: string; phone: string; folder: string };

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index].replace(/^--/, ""), process.argv[index + 1] ?? "");

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const delimiter = (text.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) > (text.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") { field += "\""; index++; }
      else if (char === "\"") quoted = false;
      else field += char;
    } else if (char === "\"") quoted = true;
    else if (char === delimiter) { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(field); field = "";
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

// Headers are matched loosely ("Contraseña", "contrasena", "Password"...), since the CSV is written by hand or by Word users.
export function readOwners(text: string): Owner[] {
  const [header, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
  const find = (...names: string[]) => header.findIndex(cell => names.some(name => normalize(cell).includes(name)));
  const columns = { name: find("nombre", "propietario"), username: find("usuario", "username", "user"), password: find("contrasena", "password", "clave"),
    phone: find("telefono", "celular", "whatsapp", "numero"), folder: find("carpeta", "folder") };
  const missing = Object.entries(columns).filter(([, index]) => index < 0).map(([key]) => key);
  if (missing.length) throw new Error(`El CSV no tiene las columnas: ${missing.join(", ")}.`);
  return rows.map(row => Object.fromEntries(Object.entries(columns).map(([key, index]) => [key, (row[index] ?? "").trim()])) as Owner);
}

export function fichaDetails(ficha: Ficha) {
  const pets = normalize(ficha.mascotas || "");
  const expenses = normalize(ficha.expensas || "");
  const guarantee = ficha.montoGarantia ? "Otro monto" : "Consultar con el propietario";
  return validatePublicationDetails({
    title: ficha.titulo, type: ficha.tipo, zone: ficha.zona, address: ficha.direccion || `${ficha.zona} (dirección aproximada)`,
    description: ficha.descripcion, price: ficha.precio, currency: ficha.moneda, exchangeRate: ficha.tipoCambio,
    bedrooms: ficha.dormitorios, bathrooms: ficha.banos, area: ficha.superficie, garage: typeof ficha.garaje === "boolean" ? Number(ficha.garaje) : ficha.garaje ?? 0,
    petsPolicy: pets === "si" ? "allowed" : pets === "no" ? "not_allowed" : "consult",
    ...(expenses === "incluidas" ? { expensesMode: "included" } : expenses === "ninguna" ? { expensesMode: "none" } : expenses === "aparte" && ficha.montoExpensas ? { expensesMode: "separate" } : { expensesMode: "consult" }),
    commonExpenses: expenses === "aparte" ? ficha.montoExpensas ?? 0 : 0,
    guarantee, guaranteeAmount: ficha.montoGarantia,
    pets: pets === "si", furnished: ficha.amoblado === true, security: ficha.seguridad === true, pool: ficha.piscina === true,
    patio: ficha.patio === true, grill: ficha.parrillero === true, elevator: ficha.ascensor === true,
  });
}

async function prepare(root: string, owner: Owner) {
  const folder = path.resolve(root, owner.folder);
  const ficha = JSON.parse(readFileSync(path.join(folder, "ficha.json"), "utf8")) as Ficha;
  const whatsapp = normalizePublicationPhone(owner.phone || ficha.telefono);
  if (!whatsapp) throw new Error("teléfono inválido");
  if (!/^[a-z0-9._-]{3,80}$/.test(owner.username)) throw new Error("usuario inválido (solo minúsculas, números, punto, guion)");
  if (owner.password.length < 8 || Buffer.byteLength(owner.password) > 72) throw new Error("contraseña de largo inválido");
  const { details, fieldErrors } = fichaDetails(ficha);
  if (!details) throw new Error(Object.values(fieldErrors).join(" "));
  const files = (ficha.fotos ?? []).map(name => {
    const bytes = readFileSync(path.join(folder, name));
    const type = /\.png$/i.test(name) ? "image/png" : /\.webp$/i.test(name) ? "image/webp" : "image/jpeg";
    return new File([bytes], name, { type });
  });
  const check = await validateUploadPhotos(files);
  if (!check.ok) throw new Error(check.message);
  const photos = [];
  for (const [index, file] of files.entries()) {
    const shrunk = await shrinkUploadPhoto(file);
    photos.push({ ...shrunk, originalName: file.name, storedName: `${String(index + 1).padStart(2, "0")}.${shrunk.extension}` });
  }
  const accountId = `acct_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const requestId = `publication_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const name = owner.name || ficha.nombre;
  const record = { id: requestId, accountId, accountEmail: "", contactName: name, whatsapp,
    sourceText: `Anuncio original en Facebook Marketplace: ${ficha.enlace}\nImportado por Zentro Urbano; trato directo con el propietario.\n\n${ficha.descripcion}`,
    details, price: details.price, currency: details.currency, exchangeRate: details.exchangeRate,
    photos: photos.map(photo => ({ originalName: photo.originalName, storedName: photo.storedName, size: photo.size, type: photo.type })) };
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  const statements: Array<[string, unknown[]]> = [
    ["INSERT INTO client_accounts (id,kind,display_name,email,phone,avatar_initials,role_label,location) VALUES (?,'owner',?,NULL,?,?,'Propietario','Santa Cruz de la Sierra')", [accountId, name, whatsapp, initials]],
    ["INSERT INTO morada_users (id,account_id,email,username,password_hash) VALUES (?,?,NULL,?,?)", [`user_${randomUUID().replaceAll("-", "").slice(0, 24)}`, accountId, owner.username, await bcrypt.hash(owner.password, 12)]],
    ["INSERT INTO publication_requests (id,account_id,idempotency_key,payload) VALUES (?,?,?,?)", [requestId, accountId, `marketplace_${requestId.slice(12)}`, JSON.stringify(record)]],
    ...photos.map(photo => ["INSERT INTO publication_photos (request_id,filename,original_name,content_type,byte_size,original_data) VALUES (?,?,?,?,?,?)",
      [requestId, photo.storedName, photo.originalName, photo.type, photo.size, photo.bytes]] as [string, unknown[]]),
  ];
  return { ficha, statements, photos: photos.length, title: details.title };
}

function literal(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (Buffer.isBuffer(value)) return `0x${value.toString("hex")}`;
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

async function main() {
  const root = args.get("carpeta");
  if (!root || !existsSync(path.join(root, "cuentas-propietarios.csv"))) throw new Error("Usa --carpeta con la carpeta que tiene cuentas-propietarios.csv.");
  const owners = readOwners(readFileSync(path.join(root, "cuentas-propietarios.csv"), "utf8"));
  const sqlDirectory = args.get("sql");
  const connection = sqlDirectory ? null : await (async () => {
    loadRuntimeEnvironment();
    const url = databaseUrl();
    if (!url) throw new Error("Falta DATABASE_URL. Usa --sql para generar archivos de phpMyAdmin.");
    console.log(`Base de datos: ${new URL(url).hostname}${new URL(url).pathname}`);
    return mysql.createConnection(url);
  })();
  if (sqlDirectory) mkdirSync(sqlDirectory, { recursive: true });
  const report = [];
  try {
    for (const owner of owners) {
      try {
        if (connection) {
          const [existing] = await connection.execute<mysql.RowDataPacket[]>("SELECT id FROM morada_users WHERE username=?", [owner.username]);
          if (existing.length) { report.push({ usuario: owner.username, estado: "ya existía, no se tocó" }); continue; }
        }
        const prepared = await prepare(root, owner);
        if (connection) {
          await connection.beginTransaction();
          try {
            for (const [sql, values] of prepared.statements) await connection.execute(sql, values as never[]);
            await connection.commit();
          } catch (error) { await connection.rollback(); throw error; }
        } else {
          // The username guard makes a second import of the same file fail before anything is written.
          const body = prepared.statements.map(([sql, values]) => { let index = 0; return `${sql.replace(/\?/g, () => literal(values[index++]))};`; });
          writeFileSync(path.join(sqlDirectory!, `${owner.username}.sql`), ["START TRANSACTION;", ...body, "COMMIT;", ""].join("\n"));
        }
        report.push({ usuario: owner.username, estado: connection ? "creada, solicitud pendiente de revisión" : "SQL generado", fotos: prepared.photos, ficha: prepared.title });
      } catch (error) {
        report.push({ usuario: owner.username, estado: `NO importada: ${(error as Error).message}` });
      }
    }
  } finally { await connection?.end(); }
  console.table(report);
  if (report.some(row => row.estado.startsWith("NO"))) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("import-marketplace-owners.ts")) main().catch(error => { console.error((error as Error).message); process.exitCode = 1; });
