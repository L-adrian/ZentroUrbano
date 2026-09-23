import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { loadLocalEnv } from "./env";

loadLocalEnv();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurado");
  const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true, connectTimeout: 5000 });
  try {
    await connection.query(await readFile("database/mysql/002_property_exchange_rate.sql", "utf8"));
    console.log("Migracion exchange_rate aplicada, sin modificar precios existentes.");
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error("No se pudo aplicar exchange_rate:", error.code ?? "DATABASE_UNAVAILABLE");
  process.exitCode = 1;
});
