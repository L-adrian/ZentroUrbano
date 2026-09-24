import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const ownerAccessDirectory = "C:/Users/Usuario/Documents/Zentro Urbano/Accesos";

// Durable, private, and outside the Git repository and build/temporary folders.
export function saveLocalOwnerAccess(entry) {
  if (!entry.accountId || !entry.username || !entry.password) throw new Error("Incomplete owner access record.");
  mkdirSync(ownerAccessDirectory, { recursive: true });
  const jsonPath = path.join(ownerAccessDirectory, "cuentas-locales.json");
  const textPath = path.join(ownerAccessDirectory, "cuentas-locales.txt");
  const registry = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, "utf8")) : { version: 1, environment: "local", accounts: [] };
  if (registry.version !== 1 || !Array.isArray(registry.accounts) || registry.environment !== "local") throw new Error("Unexpected access registry; existing file left untouched.");
  const index = registry.accounts.findIndex(account => account.accountId === entry.accountId);
  const record = { ...entry, updatedAt: new Date().toISOString() };
  if (index < 0) registry.accounts.push(record);
  else registry.accounts[index] = { ...registry.accounts[index], ...record };
  for (const [file, content] of [
    [jsonPath, JSON.stringify(registry, null, 2) + "\n"],
    [textPath, ["ZENTRO URBANO - ACCESOS PRIVADOS", "No compartir este archivo completo. No subirlo a GitHub.", "Cada propietario solo debe recibir sus propios datos de acceso.", ...registry.accounts.map(account => [
      `\nPropietario: ${account.name}\nCorreo: ${account.email || "pendiente"}\nTelefono: ${account.phone || "pendiente"}`,
      account.production ? `PRODUCCION\nAcceso: https://zentrourbano.com/login\nUsuario: ${account.production.username}\nContrasena: ${account.production.password}\nPropiedades:\n${account.properties.map(slug => `https://zentrourbano.com/propiedades/${slug}`).join("\n")}` : "Todavia no publicado en produccion.",
      `COPIA LOCAL\nAcceso: http://127.0.0.1:3011/login\nUsuario: ${account.username}\nContrasena: ${account.password}\nPropiedades:\n${account.properties.map(slug => `http://127.0.0.1:3011/propiedades/${slug}`).join("\n")}\nReferencia: ${account.sourceUrl}`,
    ].join("\n\n"))].join("\n") + "\n"],
  ]) {
    if (existsSync(file)) {
      const backups = path.join(ownerAccessDirectory, "respaldos");
      mkdirSync(backups, { recursive: true });
      copyFileSync(file, path.join(backups, `${Date.now()}-${randomUUID()}-${path.basename(file)}`));
    }
    const temporary = `${file}.${randomUUID()}.tmp`;
    writeFileSync(temporary, content, { flag: "wx", mode: 0o600 });
    renameSync(temporary, file);
  }
  return textPath;
}
