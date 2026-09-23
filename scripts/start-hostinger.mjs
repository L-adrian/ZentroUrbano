import { spawn } from "node:child_process";
import { join } from "node:path";
import { loadRuntimeEnvironment, projectDirectory, validateProductionEnvironment } from "./runtime-environment.mjs";

try {
  loadRuntimeEnvironment();
  validateProductionEnvironment();
} catch (error) {
  console.error(`[ZENTRO_CONFIG] ${error.message}`);
  process.exit(1);
}
process.env.ZENTRO_REQUIRE_DATABASE = "1";
process.env.NODE_ENV = "production";
const options = { cwd: projectDirectory, stdio: "inherit", env: process.env, windowsHide: true };
let child = spawn(process.execPath, [join(projectDirectory, "scripts/database-cli.mjs"), "check"], options);
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
const result = await new Promise(resolve => {
  child.once("error", () => resolve(1));
  child.once("exit", code => resolve(code ?? 1));
});
if (result !== 0) {
  console.error("[ZENTRO_DATABASE] No se inicio la web: revisa la conexion o importa las tablas. No se guardaran datos en archivos alternativos.");
  process.exit(1);
}
child = spawn(process.execPath, [
  join(projectDirectory, "node_modules/next/dist/bin/next"), "start",
  "--hostname", "0.0.0.0", "--port", process.env.PORT || "3000",
], options);
child.once("error", () => process.exit(1));
child.once("exit", code => process.exit(code ?? 1));
