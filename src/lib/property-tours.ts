import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { queryOne, queryRows, withTransaction } from "@/lib/mysql";
import { getPropertyBySlugData } from "@/lib/property-data";
import { isDirectRental } from "@/lib/rentals";
import { parseTourManifest, tourDecision, TOUR_FILES, type AdminTour, type PublicTour, type TourManifest, type TourFile } from "@/lib/property-tour-contract";
import { validateTourAsset } from "@/lib/property-tour-validation";

type TourRow = { property_slug: string; revision: string; status: string; manifest: string | TourManifest; owner_approved_at: unknown };
const parseJson = (value: string | TourManifest) => typeof value === "string" ? JSON.parse(value) : value;
export async function readTour(slug: string, preview = false): Promise<PublicTour | null> {
  const row = await queryOne<TourRow>("SELECT property_slug,revision,status,manifest,owner_approved_at FROM property_tours WHERE property_slug=:slug", { slug });
  if (!row || (!preview && (row.status !== "published" || !row.owner_approved_at))) return null;
  const property = await getPropertyBySlugData(slug);
  if (!property || !property.published || !isDirectRental(property)) return null;
  const manifest = parseTourManifest(parseJson(row.manifest), property.images.length);
  return { ...manifest, slug, revision: row.revision, assetBase: preview ? `/admin/recorridos/${slug}/${row.revision}/` : `/media/recorridos/${slug}/${row.revision}/`, photos: manifest.photoIndices.map(i => ({ src: property.images[i], label: `Foto original ${i + 1}` })) };
}

export async function publishedTour(slug: string) {
  try { return await readTour(slug); }
  catch { return null; } // Tours must never prevent an otherwise valid property from loading.
}

export async function listTours(): Promise<AdminTour[]> {
  const rows = await queryRows<TourRow & { title: string; opens: number; errors: number; contacts: number }>(`SELECT t.property_slug,t.revision,t.status,t.manifest,t.owner_approved_at,p.title,
    COALESCE(e.opens,0) opens,COALESCE(e.errors,0) errors,COALESCE(e.contacts,0) contacts
    FROM property_tours t JOIN properties p ON p.slug=t.property_slug
    LEFT JOIN (SELECT property_slug,
      SUM(event_type='property_tour_open') opens,SUM(event_type='property_tour_error') errors,
      SUM(event_type='property_tour_whatsapp_click') contacts
      FROM tracking_events WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 DAY) GROUP BY property_slug) e ON e.property_slug=t.property_slug
    ORDER BY t.updated_at DESC`);
  return (rows || []).map(r => ({ slug: r.property_slug, title: r.title, revision: r.revision, status: r.status, scope: parseJson(r.manifest).scope, opens: Number(r.opens), errors: Number(r.errors), contacts: Number(r.contacts) }));
}

export async function importTour(slug: string, raw: unknown, assets: Record<TourFile, Buffer>, admin: string, expectedRevision: string) {
  const property = await getPropertyBySlugData(slug);
  if (!property || !property.published || !isDirectRental(property)) throw new Error("La ficha debe ser un alquiler directo publicado.");
  const manifest = parseTourManifest(raw, property.images.length);
  for (const name of TOUR_FILES) validateTourAsset(name, assets[name]);
  const revision = randomUUID();
  await withTransaction(async connection => {
    await connection.query("SELECT id FROM properties WHERE slug=? FOR UPDATE", [slug]);
    const [rows] = await connection.query<RowDataPacket[]>("SELECT revision,status FROM property_tours WHERE property_slug=? FOR UPDATE", [slug]);
    if ((rows[0]?.revision || "") !== expectedRevision) throw new Error("El recorrido cambió. Actualiza antes de reemplazarlo.");
    if (rows[0]?.status === "published") throw new Error("Retira el recorrido público antes de reemplazar sus archivos.");
    await connection.execute(`INSERT INTO property_tours(property_slug,revision,status,manifest) VALUES (?,?,'draft',?)
      ON DUPLICATE KEY UPDATE revision=VALUES(revision),status='draft',manifest=VALUES(manifest),owner_approved_at=NULL,reviewed_by=NULL`, [slug, revision, JSON.stringify(manifest)]);
    for (const name of TOUR_FILES) {
      const bytes = assets[name];
      await connection.execute(`INSERT INTO property_tour_assets(property_slug,filename,sha256,byte_size,data) VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE sha256=VALUES(sha256),byte_size=VALUES(byte_size),data=VALUES(data)`, [slug, name, createHash("sha256").update(bytes).digest("hex"), bytes.length, bytes]);
    }
    await connection.execute("INSERT INTO property_tour_audit(property_slug,revision,action,admin_user) VALUES (?,?,'upload',?)", [slug, revision, admin]);
  });
  return revision;
}

export async function reviewTour(slug: string, input: unknown, admin: string) {
  await withTransaction(async connection => {
    const [rows] = await connection.query<RowDataPacket[]>("SELECT revision FROM property_tours WHERE property_slug=? FOR UPDATE", [slug]);
    if (!rows[0]) throw new Error("Recorrido no encontrado.");
    const action = tourDecision(input, rows[0].revision);
    if (action === "publish") {
      const [assets] = await connection.query<RowDataPacket[]>("SELECT filename FROM property_tour_assets WHERE property_slug=?", [slug]);
      if (!TOUR_FILES.every(name => assets.some(a => a.filename === name))) throw new Error("Faltan archivos del recorrido.");
    }
    await connection.execute("UPDATE property_tours SET status=?,reviewed_by=?,owner_approved_at=IF(?='publish',UTC_TIMESTAMP(),owner_approved_at) WHERE property_slug=?", [action === "publish" ? "published" : "hidden", admin, action, slug]);
    await connection.execute("INSERT INTO property_tour_audit(property_slug,revision,action,admin_user) VALUES (?,?,?,?)", [slug, rows[0].revision, action, admin]);
  });
}

export async function tourAsset(slug: string, revision: string, name: TourFile, preview = false) {
  const tour = await readTour(slug, preview);
  if (!tour || tour.revision !== revision) return null;
  return queryOne<{ data: Buffer; sha256: string }>("SELECT a.data,a.sha256 FROM property_tour_assets a JOIN property_tours t ON t.property_slug=a.property_slug WHERE a.property_slug=:slug AND a.filename=:name AND t.revision=:revision AND (:preview=1 OR (t.status='published' AND t.owner_approved_at IS NOT NULL))", { slug, name, revision, preview: preview ? 1 : 0 });
}
