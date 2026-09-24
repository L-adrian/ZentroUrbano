import mysql from "mysql2/promise";
import { applyMigrations } from "./database-migrations.mjs";
import { databaseUrl, loadRuntimeEnvironment } from "./runtime-environment.mjs";

let connection;
try {
  loadRuntimeEnvironment();
  const uri = databaseUrl();
  const database=decodeURIComponent(new URL(uri).pathname.slice(1));
  if (!database) throw new Error("DATABASE_URL debe incluir el nombre de la base existente.");
  connection=await mysql.createConnection({uri,multipleStatements:true,connectTimeout:8000,timezone:"Z"});
  if (process.argv[2] === "migrate") {
    if (process.env.ZENTRO_CONFIRM_DATABASE !== database) throw new Error("Respalda la base y define ZENTRO_CONFIRM_DATABASE con su nombre exacto antes de migrar.");
    await applyMigrations(connection);
  }
  const [tables]=await connection.query("SELECT table_name AS name,engine FROM information_schema.tables WHERE table_schema=DATABASE()");
  const required=["client_accounts","morada_users","morada_sessions","properties","client_account_properties","publication_requests","publication_photos","publication_review_audit","demo_listing_replacements"];
  const missing=required.filter(name=>!tables.some(table=>table.name === name && table.engine === "InnoDB"));
  if (missing.length) throw new Error(`Tablas pendientes o sin transacciones InnoDB: ${missing.join(", ")}. Ejecuta db:migrate.`);
  const [usernameColumns]=await connection.query("SHOW COLUMNS FROM morada_users LIKE 'username'");
  if (!usernameColumns.length) throw new Error("Falta la migracion de usuarios de propietarios. Ejecuta db:migrate.");
  const [[settings]]=await connection.query("SELECT @@max_allowed_packet AS maxPacket,VERSION() AS version");
  if (Number(settings.maxPacket) < 12*1024*1024) throw new Error("max_allowed_packet debe ser al menos 12 MB para fotos originales de 10 MB. Solicita el ajuste antes de habilitar cargas.");
  console.log(JSON.stringify({ok:true,database,version:settings.version,transactionalTables:required.length,maxPacketMB:Number(settings.maxPacket)/1024/1024}));
} catch(error) {
  console.error(error.code ? `Base de datos no disponible: ${error.code}. Revisa conexión y permisos; no se activó almacenamiento alternativo.` : error.message);
  process.exitCode=1;
} finally { if (connection) await connection.end(); }
