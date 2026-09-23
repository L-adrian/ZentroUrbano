import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { persistentStorageRoot } from "@/lib/storage";
import { hasDatabaseConfig, requiresDatabase } from "@/lib/mysql";
import { databaseRequest, databaseRequests } from "@/lib/database-publications";
import type { PublicationDetails } from "@/lib/publication-input";

export type PublicationRequest = {
  id: string; accountId: string; accountEmail: string; createdAt: string;
  status: string; contactName: string; sourceText: string;
  whatsapp: string; details?: PublicationDetails;
  propertySlug?:string|null; reviewReason?:string|null; reviewedBy?:string|null;
  photos: { storedName: string; originalName: string; type: string }[];
};
export const validPublicationId = (value: string) => /^publication_[a-f0-9]{24}$/.test(value);

export async function getPublicationRequest(id: string): Promise<PublicationRequest | null> {
  if (!validPublicationId(id)) return null;
  if (hasDatabaseConfig()) return databaseRequest(id);
  if (requiresDatabase()) throw new Error("DATABASE_UNAVAILABLE");
  try {
    const record = JSON.parse(await readFile(path.join(persistentStorageRoot, "publication-requests", id, "request.json"), "utf8"));
    if (record.id !== id || typeof record.accountId !== "string" || !Array.isArray(record.photos)) return null;
    return record;
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function listPublicationRequests(accountId?: string) {
  if (hasDatabaseConfig()) return databaseRequests(accountId);
  if (requiresDatabase()) throw new Error("DATABASE_UNAVAILABLE");
  let entries;
  try { entries = await readdir(path.join(persistentStorageRoot, "publication-requests"), { withFileTypes: true }); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const records: PublicationRequest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !validPublicationId(entry.name)) continue;
    const record = await getPublicationRequest(entry.name);
    if (record && (!accountId || record.accountId === accountId)) records.push(record);
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
