import { spawn } from "node:child_process";

process.env.ZENTRO_REQUIRE_DATABASE="1";
if (!process.env.DATABASE_URL || !process.env.ZENTRO_URBANO_ADMIN_USER || (process.env.ZENTRO_URBANO_ADMIN_PASSWORD?.length || 0) < 16) {
  console.error("Configura DATABASE_URL, ZENTRO_URBANO_ADMIN_USER y una contraseña privada de al menos 16 caracteres en Hostinger.");
  process.exit(1);
}
const check=spawn(process.execPath,["scripts/database-cli.mjs","check"],{stdio:"inherit",env:process.env,windowsHide:true});
const result=await new Promise(resolve=>check.once("exit",resolve));
if (result !== 0) process.exit(1);
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","0.0.0.0","--port",process.env.PORT || "3000"],{stdio:"inherit",env:process.env,windowsHide:true});
for (const signal of ["SIGTERM","SIGINT"]) process.on(signal,()=>server.kill(signal));
server.once("error",()=>process.exit(1));
server.once("exit",code=>process.exit(code || 0));
