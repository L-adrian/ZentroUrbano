import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import sharp from "sharp";
import { readDatabasePhoto } from "@/lib/database-publications";
import { formatPriceInCurrency } from "@/lib/currency";
import { getEntryCost } from "@/lib/listing-summary";
import { getPropertyBySlugData } from "@/lib/property-data";

export const dynamic = "force-dynamic";

export const alt = "Vivienda en alquiler directo con el dueño en Zentro Urbano";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const photoWidth = 520;

// The preview people see in WhatsApp: cover photo, price, cost to move in and zone.
export default async function PropertyOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getPropertyBySlugData(slug);
  if (!property) {
    notFound();
  }
  const cover = await coverPhotoDataUrl(property.images[0]);
  const entry = getEntryCost(property);
  const facts = [
    property.rentalDetails?.type === "Monoambiente"
      ? "Monoambiente"
      : property.bedrooms > 0
        ? `${property.bedrooms} ${property.bedrooms === 1 ? "dormitorio" : "dormitorios"}`
        : null,
    property.bathrooms > 0 ? `${property.bathrooms} ${property.bathrooms === 1 ? "baño" : "baños"}` : null,
    property.area > 0 ? `${property.area} m²` : null,
    property.garage > 0 ? "Parqueo" : null,
  ].filter((fact): fact is string => Boolean(fact)).slice(0, 3);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f7f5ef", color: "#101713", fontFamily: "sans-serif" }}>
        {cover ? (
          <img src={cover} alt="" width={photoWidth} height={size.height} style={{ width: photoWidth, height: size.height, objectFit: "cover" }} />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "48px 52px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: "#087c65", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900 }}>
              ZU
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>Zentro Urbano</div>
              <div style={{ color: "#285340", fontSize: 20, fontWeight: 700 }}>Alquiler directo con el dueño</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 60, fontWeight: 900, letterSpacing: -1.5 }}>{formatPriceInCurrency(property, property.currency)}</div>
            {entry && entry.total > property.price ? (
              <div style={{ marginTop: 6, color: "#285340", fontSize: 28, fontWeight: 700 }}>
                {`Para entrar: ${formatPriceInCurrency({ ...property, price: entry.total }, property.currency, false)}`}
              </div>
            ) : null}
            <div style={{ marginTop: 22, fontSize: property.title.length > 48 ? 34 : 40, lineHeight: 1.1, fontWeight: 800 }}>
              {property.title}
            </div>
            <div style={{ marginTop: 12, color: "#4a4f4b", fontSize: 26, fontWeight: 700 }}>
              {`${property.zone}, ${property.city}`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {facts.map((fact) => (
              <div key={fact} style={{ display: "flex", borderRadius: 14, background: "#ffffff", fontSize: 22, fontWeight: 800, padding: "12px 16px" }}>
                {fact}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

async function coverPhotoDataUrl(source: string | undefined) {
  if (!source) return null;
  try {
    const bytes = await readPhoto(source);
    if (!bytes) return null;
    const jpeg = await sharp(bytes).rotate().resize(photoWidth, size.height, { fit: "cover" }).jpeg({ quality: 78 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

async function readPhoto(source: string) {
  const media = source.match(/^\/media\/propiedades\/([^/]+)\/([^/]+)$/);
  if (media) return (await readDatabasePhoto(media[1], media[2], true))?.bytes ?? null;
  if (!source.startsWith("/") || source.startsWith("//")) return null;
  const publicDirectory = path.join(process.cwd(), "public");
  const file = path.normalize(path.join(publicDirectory, source));
  return file.startsWith(publicDirectory + path.sep) ? readFile(file) : null;
}

