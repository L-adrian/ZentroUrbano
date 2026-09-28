import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { cache } from "react";
import { queryOne, withTransaction } from "@/lib/mysql";
import { validTourRevision, validTourSlug } from "@/lib/property-tour-contract";

export const PRIVATE_SHOWCASE_FILES = ["world.spz", "mobile.spz"] as const;
export type PrivateShowcaseFile = (typeof PRIVATE_SHOWCASE_FILES)[number];

type Vec3 = [number, number, number];
type Bounds = [number, number, number, number];

export type PrivateShowcaseRoom = {
  id: "sala" | "cocina";
  name: string;
  asset: PrivateShowcaseFile;
  position: Vec3;
  yaw: number;
  scale: number;
  eyeHeight: number;
  viewPosition?: Vec3;
  bounds: Bounds;
  portals: { bounds: Bounds; y: number; height: number }[];
  patches: { position: Vec3; size: [number, number]; yaw: number; color: string }[];
};

export type PrivateShowcaseManifest = {
  scope: string;
  model: "marble-1.1";
  disclaimer: string;
  start: { position: Vec3; yaw: number };
  connection: {
    center: Vec3;
    width: number;
    height: number;
    yaw: number;
    negativeRoom: "sala";
    positiveRoom: "cocina";
  };
  rooms: PrivateShowcaseRoom[];
};

export type PrivateTourShowcase = PrivateShowcaseManifest & {
  slug: string;
  title: string;
  revision: string;
  assetBase: string;
};

type ShowcaseRow = {
  slug: string;
  title: string;
  revision: string;
  manifest: string | PrivateShowcaseManifest;
};

const parseJson = (value: string | PrivateShowcaseManifest) =>
  typeof value === "string" ? JSON.parse(value) : value;

export const getPrivateTourShowcase = cache(async (slug: string): Promise<PrivateTourShowcase | null> => {
  if (!slug.startsWith("muestra-privada-") || !validTourSlug(slug)) return null;
  const row = await queryOne<ShowcaseRow>(
    `SELECT p.slug,p.title,t.revision,t.manifest
       FROM properties p
       JOIN property_tours t ON t.property_slug=p.slug
      WHERE p.slug=:slug AND p.published=0 AND t.status='showcase'
      LIMIT 1`,
    { slug },
  );
  if (!row || !validTourRevision(row.revision)) return null;
  const manifest = parsePrivateShowcaseManifest(parseJson(row.manifest));
  return {
    ...manifest,
    slug: row.slug,
    title: row.title,
    revision: row.revision,
    assetBase: `/media/muestras/${row.slug}/${row.revision}/`,
  };
});

export async function getPrivateShowcaseAsset(
  slug: string,
  revision: string,
  filename: string,
) {
  if (!validTourSlug(slug) || !validTourRevision(revision) || !isPrivateShowcaseFile(filename)) {
    return null;
  }
  return queryOne<{ data: Buffer; sha256: string }>(
    `SELECT a.data,a.sha256
       FROM property_tour_assets a
       JOIN property_tours t ON t.property_slug=a.property_slug
       JOIN properties p ON p.slug=t.property_slug
      WHERE a.property_slug=:slug AND a.filename=:filename
        AND t.revision=:revision AND t.status='showcase' AND p.published=0
      LIMIT 1`,
    { slug, revision, filename },
  );
}

export async function importPrivateTourShowcase(
  slug: string,
  rawManifest: unknown,
  assets: Record<PrivateShowcaseFile, Buffer>,
  admin: string,
) {
  if (!validTourSlug(slug) || slug.length < 36) throw new Error("El enlace privado no es válido.");
  const manifest = parsePrivateShowcaseManifest(rawManifest);
  const revision = randomUUID();
  await withTransaction(async connection => {
    await connection.execute(
      `INSERT INTO properties (
        id,slug,title,type,operation,price,currency,city,zone,address,bedrooms,bathrooms,garage,area,
        pets,furnished,security,pool,patio,grill,elevator,short_description,long_description,
        requirements,images,whatsapp,ideal_for,tags,listing_plan,featured,published,is_seeded,
        coordinates,neighborhood_highlights
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE title=VALUES(title),published=0,updated_at=CURRENT_TIMESTAMP`,
      [
        randomUUID(), slug, "Muestra privada: sala y cocina", "Departamento", "Alquiler", 0, "BOB",
        "Santa Cruz de la Sierra", "Ubicación privada", "Ubicación no publicada", 0, 0, 0, 0,
        false, false, false, false, false, false, false,
        "Ficha privada para revisar un recorrido 3D.",
        "Esta muestra no forma parte del catálogo público de Zentro Urbano.",
        "[]", "[]", null, "[]", "[]", "standard", false, false, false,
        JSON.stringify({ lat: -17.7833, lng: -63.1821 }), "[]",
      ],
    );
    await connection.execute(
      `INSERT INTO property_tours(property_slug,revision,status,manifest,owner_approved_at,reviewed_by)
       VALUES (?,?,'showcase',?,UTC_TIMESTAMP(),?)
       ON DUPLICATE KEY UPDATE revision=VALUES(revision),status='showcase',manifest=VALUES(manifest),
         owner_approved_at=UTC_TIMESTAMP(),reviewed_by=VALUES(reviewed_by)`,
      [slug, revision, JSON.stringify(manifest), admin],
    );
    for (const filename of PRIVATE_SHOWCASE_FILES) {
      const bytes = assets[filename];
      await connection.execute(
        `INSERT INTO property_tour_assets(property_slug,filename,sha256,byte_size,data)
         VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE sha256=VALUES(sha256),byte_size=VALUES(byte_size),data=VALUES(data)`,
        [slug, filename, createHash("sha256").update(bytes).digest("hex"), bytes.length, bytes],
      );
    }
    await connection.execute(
      "INSERT INTO property_tour_audit(property_slug,revision,action,admin_user) VALUES (?,?,?,?)",
      [slug, revision, "showcase_upload", admin],
    );
  });
  return revision;
}

export function parsePrivateShowcaseManifest(value: unknown): PrivateShowcaseManifest {
  if (!value || typeof value !== "object") throw new Error("Manifiesto privado inválido.");
  const data = value as Record<string, unknown>;
  const scope = safeText(data.scope, 100);
  const disclaimer = safeText(data.disclaimer, 220);
  if (data.model !== "marble-1.1") throw new Error("Modelo no compatible.");
  const start = object(data.start);
  const connection = object(data.connection);
  const roomsValue = data.rooms;
  const roomInputs = Array.isArray(roomsValue)
    ? (["sala", "cocina"] as const).map(id => object(roomsValue.find((room: unknown) => object(room).id === id)))
    : (() => {
        const rawRooms = object(data.rooms);
        return [object(rawRooms.sala), object(rawRooms.cocina)];
      })();
  const rooms = roomInputs.map((room, index) => parseRoom(room, index === 0 ? "sala" : "cocina"));
  return {
    scope,
    model: data.model,
    disclaimer,
    start: { position: vec3(start.position), yaw: finite(start.yaw, -360, 360) },
    connection: {
      center: vec3(connection.center),
      width: finite(connection.width, 0.2, 12),
      height: finite(connection.height, 0.5, 8),
      yaw: finite(connection.yaw, -360, 360),
      negativeRoom: "sala",
      positiveRoom: "cocina",
    },
    rooms,
  };
}

function parseRoom(room: Record<string, unknown>, id: "sala" | "cocina"): PrivateShowcaseRoom {
  const portals = Array.isArray(room.portals) ? room.portals.slice(0, 4).map(value => {
    const portal = object(value);
    return { bounds: bounds(portal.bounds), y: finite(portal.y, -20, 20), height: finite(portal.height, 0.2, 20) };
  }) : [];
  const patches = Array.isArray(room.patches) ? room.patches.slice(0, 4).map(value => {
    const patch = object(value);
    const size = pair(patch.size, 0.05, 20);
    const color = typeof patch.color === "string" && /^#[0-9a-f]{6}$/i.test(patch.color) ? patch.color : "#dfdcd3";
    return { position: vec3(patch.position), size, yaw: finite(patch.yaw ?? 0, -360, 360), color };
  }) : [];
  return {
    id,
    name: safeText(room.name, 60),
    asset: id === "sala" ? "world.spz" : "mobile.spz",
    position: vec3(room.position),
    yaw: finite(room.yaw, -360, 360),
    scale: finite(room.scale, 0.05, 20),
    eyeHeight: finite(room.eyeHeight, -20, 20),
    ...(room.viewPosition === undefined ? {} : { viewPosition: vec3(room.viewPosition) }),
    bounds: bounds(room.bounds),
    portals,
    patches,
  };
}

function isPrivateShowcaseFile(value: string): value is PrivateShowcaseFile {
  return PRIVATE_SHOWCASE_FILES.some(filename => filename === value);
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Manifiesto privado incompleto.");
  return value as Record<string, unknown>;
}

function finite(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("Valor numérico inválido.");
  return value;
}

function vec3(value: unknown): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) throw new Error("Vector inválido.");
  return value.map(item => finite(item, -100, 100)) as Vec3;
}

function bounds(value: unknown): Bounds {
  if (!Array.isArray(value) || value.length !== 4) throw new Error("Límites inválidos.");
  const parsed = value.map(item => finite(item, -100, 100)) as Bounds;
  if (parsed[0] >= parsed[1] || parsed[2] >= parsed[3]) throw new Error("Límites invertidos.");
  return parsed;
}

function pair(value: unknown, min: number, max: number): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) throw new Error("Tamaño inválido.");
  return [finite(value[0], min, max), finite(value[1], min, max)];
}

function safeText(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\x00-\x1f<>]/.test(value)) throw new Error("Texto inválido.");
  return value.trim();
}
