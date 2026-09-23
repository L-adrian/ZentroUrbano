import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export async function applyMigrations(connection) {
  const [[{db}]]=await connection.query("SELECT DATABASE() AS db");
  if (!db) throw new Error("Selecciona una base de datos primero.");
  const lock=`zentro-migrations-${db}`.slice(0,64);
  const [[{acquired}]]=await connection.query("SELECT GET_LOCK(?,30) AS acquired",[lock]);
  if (Number(acquired) !== 1) throw new Error("Otra migracion esta en curso.");
  try {
    await connection.query("CREATE TABLE IF NOT EXISTS zentro_schema_migrations (name VARCHAR(180) PRIMARY KEY,sha256 CHAR(64) NOT NULL,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB");
    const directory=fileURLToPath(new URL("../database/mysql/",import.meta.url));
    for (const name of (await readdir(directory)).filter(name=>/^\d{3}_.+\.sql$/.test(name)).sort()) {
      const sql=await readFile(`${directory}/${name}`,"utf8");
      const hash=createHash("sha256").update(sql.replace(/\r\n/g,"\n")).digest("hex");
      const [applied]=await connection.query("SELECT sha256 FROM zentro_schema_migrations WHERE name=?",[name]);
      if (applied[0]) {
        if (applied[0].sha256 !== hash) throw new Error(`Migracion aplicada modificada: ${name}. Restaura el archivo original; no omitas el control.`);
        continue;
      }
      // MySQL DDL auto-commits. Each migration is re-runnable after interruption.
      await connection.query(sql);
      await connection.execute("INSERT INTO zentro_schema_migrations (name,sha256) VALUES (?,?)",[name,hash]);
      console.log(`Aplicada: ${name}`);
    }
  } finally { await connection.query("SELECT RELEASE_LOCK(?)",[lock]); }
}
