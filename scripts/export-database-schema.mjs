import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { projectDirectory } from "./runtime-environment.mjs";

const destination = resolve(process.argv[2] || resolve(projectDirectory, "output/hostinger-private/zentro-urbano-inicial.sql"));
try {
  const directory = resolve(projectDirectory, "database/mysql");
  const names = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  if (!names.length) throw new Error("NO_MIGRATIONS");
  const statements = [
    "-- INSTALACION INICIAL: importar solo en la base nueva y vacia de Zentro Urbano.",
    "-- Selecciona la base en phpMyAdmin antes de importar. No incluye cuentas ni fichas demo.",
    "-- Para bases existentes utiliza db:migrate con respaldo, no este archivo.",
    "SET NAMES utf8mb4;",
    "SET SESSION default_storage_engine = InnoDB;",
    "SET time_zone = '+00:00';",
    "CREATE TABLE IF NOT EXISTS zentro_schema_migrations (name VARCHAR(180) PRIMARY KEY,sha256 CHAR(64) NOT NULL,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;",
  ];
  for (const name of names) {
    const sql = (await readFile(resolve(directory, name), "utf8")).replace(/\r\n/g, "\n");
    const hash = createHash("sha256").update(sql).digest("hex");
    statements.push(`\n-- ${name}\n${sql}`, `INSERT INTO zentro_schema_migrations (name,sha256) VALUES ('${name}','${hash}');`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, statements.join("\n") + "\n", { flag: "wx", mode: 0o600 });
  console.log(`Esquema inicial creado: ${destination} (${names.length} migraciones, sin datos privados).`);
} catch (error) {
  console.error(error.code === "EEXIST" ? "El archivo SQL ya existe; no se sobrescribio." : `No se pudo exportar el esquema (${error.code || "EXPORT_ERROR"}).`);
  process.exitCode = 1;
}
