import "server-only";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { queryRows } from "@/lib/mysql";

export async function getRetiredDemoSlugs() {
  const rows = await queryRows<{ demo_slug: string }>("SELECT demo_slug FROM demo_listing_replacements WHERE property_slug IS NOT NULL");
  return new Set((rows ?? []).map(row => row.demo_slug));
}

// The caller's publication transaction also owns this replacement.
export async function replaceDemoForPublication(connection: PoolConnection, propertySlug: string) {
  const [existing] = await connection.execute<RowDataPacket[]>("SELECT demo_slug FROM demo_listing_replacements WHERE property_slug=?", [propertySlug]);
  if (existing.length) return String(existing[0].demo_slug);
  const [available] = await connection.query<RowDataPacket[]>("SELECT demo_slug FROM demo_listing_replacements WHERE property_slug IS NULL ORDER BY sort_order LIMIT 1 FOR UPDATE");
  if (!available.length) return null;
  const demoSlug = String(available[0].demo_slug);
  await connection.execute("UPDATE demo_listing_replacements SET property_slug=?,replaced_at=CURRENT_TIMESTAMP WHERE demo_slug=?", [propertySlug, demoSlug]);
  return demoSlug;
}
