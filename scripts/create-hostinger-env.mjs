import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseEnv } from "node:util";
import { databaseUrl, projectDirectory } from "./runtime-environment.mjs";

const destination = resolve(process.argv[2] || resolve(projectDirectory, "output/hostinger-private/zentro-urbano.env"));
try {
  const template = parseEnv(await readFile(resolve(projectDirectory, "CONFIGURACION.env.example"), "utf8"));
  const values = {
    NEXT_PUBLIC_SITE_URL: template.NEXT_PUBLIC_SITE_URL,
    ZENTRO_REQUIRE_DATABASE: "1",
    MYSQL_CONNECTION_LIMIT: "5",
    ZENTRO_URBANO_ADMIN_USER: process.env.ZENTRO_URBANO_ADMIN_USER || "purplemangoadrian@gmail.com",
    ZENTRO_URBANO_ADMIN_PASSWORD: process.env.ZENTRO_URBANO_ADMIN_PASSWORD || randomBytes(32).toString("base64url"),
    DATABASE_URL: process.env.DATABASE_URL ? databaseUrl() : "",
  };
  if (values.ZENTRO_URBANO_ADMIN_PASSWORD.length < 16) throw new Error("ADMIN_PASSWORD_TOO_SHORT");
  for (const value of Object.values(values)) {
    if (/[\r\n"'`#$\\]/.test(value)) throw new Error("UNSAFE_ENV_VALUE");
  }
  const lines = [
    "# PRIVADO: no subir a GitHub ni compartir en capturas.",
    values.DATABASE_URL ? "# Conexion preparada para el servidor de Hostinger, no para localhost en tu PC." : "# Completar DATABASE_URL con la base de Hostinger antes de Import .env.",
    "# No se copia .env.local: su base pertenece a esta computadora.",
    ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    "",
  ];
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, lines.join("\n"), { encoding: "utf8", flag: "wx", mode: 0o600 });
  console.log(`Archivo privado creado: ${destination}`);
  console.log(values.DATABASE_URL ? "Conexion incluida. Importa el archivo privado en Hostinger." : "Falta completar DATABASE_URL de Hostinger. La clave administrativa nueva esta solo en el archivo.");
} catch (error) {
  console.error(error.code === "EEXIST" ? "El archivo ya existe. No se sobrescribieron las credenciales." : `No se pudo crear el archivo privado (${error.code || "CONFIG_ERROR"}).`);
  process.exitCode = 1;
}
