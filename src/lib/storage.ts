import "server-only";
import path from "node:path";

export const persistentStorageRoot = process.env.ZENTRO_STORAGE_DIR || path.join(process.cwd(), "storage");
