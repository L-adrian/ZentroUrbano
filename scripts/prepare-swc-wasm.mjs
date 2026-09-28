import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const nextDirectory = dirname(require.resolve("next/package.json"));
const source = dirname(require.resolve("@next/swc-wasm-nodejs/package.json"));
const next = JSON.parse(await readFile(join(nextDirectory, "package.json"), "utf8"));
const wasm = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
if (wasm.version !== next.version) {
  throw new Error("SWC WebAssembly must match the installed Next.js version.");
}

// Next 16.3.6 loads fallback WASM by file URL from this download cache.
// Populate it from npm's integrity-checked lockfile, without a second download.
const target = join(nextDirectory, "wasm", "@next", "swc-wasm-nodejs");
await mkdir(target, { recursive: true });
for (const name of ["package.json", "wasm.js", "wasm_bg.wasm"]) {
  await copyFile(join(source, name), join(target, name));
}
console.log(`[ZENTRO_BUILD] SWC WebAssembly ${wasm.version} ready for Webpack fallback.`);
