import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";

// Local browser QA uses its own persistent files and never connects to MySQL.
const port = process.argv[2] || "3003";
await mkdir("output/auth-qa", { recursive: true });
process.env.ZENTRO_STORAGE_DIR = await mkdtemp(path.resolve("output/auth-qa/browser-"));
process.env.DATABASE_URL = "";
process.env.NODE_ENV = "production";
process.argv = [process.execPath, "next", "start", "--hostname", "127.0.0.1", "-p", port];
await import("next/dist/bin/next");
