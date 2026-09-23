import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectDirectory = fileURLToPath(new URL("../", import.meta.url));

export function loadRuntimeEnvironment({
  directory = projectDirectory,
  mode = process.env.NODE_ENV || "production",
  file = process.env.ZENTRO_ENV_FILE,
} = {}) {
  const names = file ? [file] : [
    `.env.${mode}.local`,
    ...(mode === "test" ? [] : [".env.local"]),
    `.env.${mode}`,
    ".env",
  ];
  const loaded = [];
  // Native dotenv parsing preserves values already supplied by the hosting process.
  for (const name of names) {
    const location = resolve(directory, name);
    try {
      loadEnvFile(location);
      loaded.push(location);
    } catch (error) {
      if (!file && error.code === "ENOENT") continue;
      throw new Error(`No se pudo cargar el archivo privado de configuracion (${error.code || "ENV_READ_ERROR"}). Revisa ZENTRO_ENV_FILE y los permisos.`);
    }
  }
  return loaded;
}

export function databaseUrl(env = process.env) {
  const value = env.DATABASE_URL?.trim();
  if (!value) throw new Error("Falta DATABASE_URL. Completa la conexion MySQL real en el archivo .env privado o en Hostinger.");
  try {
    const url = new URL(value);
    if (url.protocol !== "mysql:" || !url.hostname || !url.pathname.slice(1) || url.search || url.hash) throw new Error();
  } catch {
    throw new Error("DATABASE_URL no tiene un formato MySQL valido con servidor y nombre de base.");
  }
  return value;
}

export function validateProductionEnvironment(env = process.env) {
  if (!env.ZENTRO_URBANO_ADMIN_USER?.trim() || (env.ZENTRO_URBANO_ADMIN_PASSWORD?.length || 0) < 16) {
    throw new Error("Configura DATABASE_URL, ZENTRO_URBANO_ADMIN_USER y una contrasena privada de al menos 16 caracteres en .env o Hostinger.");
  }
  env.DATABASE_URL = databaseUrl(env);
}
