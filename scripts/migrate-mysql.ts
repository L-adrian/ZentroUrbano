import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import { loadLocalEnv } from "./env";

loadLocalEnv();

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta configurado.");
  }

  const parsedUrl = new URL(databaseUrl);
  const databaseName = parsedUrl.pathname.replace(/^\//, "");

  if (!databaseName) {
    throw new Error("DATABASE_URL debe incluir el nombre de la base de datos.");
  }

  const serverUrl = new URL(databaseUrl);
  serverUrl.pathname = "";

  const server = await mysql.createConnection({
    uri: serverUrl.toString(),
    multipleStatements: true,
  });

  await server.query(
    `create database if not exists \`${databaseName}\` character set utf8mb4 collate utf8mb4_unicode_ci`,
  );
  await server.end();

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: true,
  });
  const migration = readFileSync(
    resolve(process.cwd(), "database/mysql/001_zentro_urbano_core.sql"),
    "utf8",
  );

  await connection.query(migration);
  await connection.query(readFileSync(resolve(process.cwd(), "database/mysql/002_property_exchange_rate.sql"), "utf8"));
  await connection.end();

  console.log(`MySQL listo: ${databaseName}`);
}
