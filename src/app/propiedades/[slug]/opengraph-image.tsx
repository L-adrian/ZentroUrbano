import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getPropertyBySlugData } from "@/lib/property-data";
import type { Property } from "@/lib/properties";

export const alt = "Vivienda en alquiler directo en Zentro Urbano";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

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
  const title = property?.title ?? "Propiedad curada en Bolivia";
  const location = property ? `${property.zone}, ${property.city}` : "Santa Cruz, Bolivia";
  const price = property ? formatPrice(property) : "Mapa real y contacto directo";
  const badge = property
    ? `${formatOperation(property.operation)} · ${property.type}`
    : "Zentro Urbano";
  const facts = property
    ? [
        `${property.bedrooms > 0 ? property.bedrooms : "N/A"} dorm.`,
        property.bathrooms > 0 ? `${property.bathrooms} baños` : getOpenGraphBathroomReplacement(property),
        `${property.area} m²`,
      ]
    : ["Fichas claras", "Mapa real", "WhatsApp"];
  const tags = property?.tags.slice(0, 3) ?? ["Curado", "Confiable", "Bolivia"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f5ef",
          color: "#101713",
          fontFamily: "sans-serif",
          padding: 58,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(135deg, #f7f5ef 0%, #ffffff 48%, #e9efe6 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -160,
            width: 520,
            height: 520,
            borderRadius: 260,
            background: "#21352b",
            opacity: 0.16,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 80,
            bottom: -160,
            width: 420,
            height: 420,
            borderRadius: 210,
            background: "#8b4b31",
            opacity: 0.12,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 18,
                  background: "#101713",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 27,
                  fontWeight: 900,
                }}
              >
                ZU
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>Zentro Urbano</div>
                <div style={{ color: "#58745f", fontSize: 21, fontWeight: 700 }}>
                  Propiedades curadas en Bolivia
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                borderRadius: 999,
                background: "#ffffff",
                color: "#21352b",
                fontSize: 24,
                fontWeight: 800,
                padding: "14px 24px",
                boxShadow: "0 14px 40px rgba(16, 23, 19, 0.10)",
              }}
            >
              {badge}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div style={{ color: "#58745f", fontSize: 28, fontWeight: 800 }}>{price}</div>
            <div
              style={{
                marginTop: 16,
                fontSize: title.length > 42 ? 56 : 66,
                lineHeight: 0.95,
                fontWeight: 900,
                letterSpacing: -2,
              }}
            >
              {title}
            </div>
            <div style={{ marginTop: 22, color: "#4a4f4b", fontSize: 29, fontWeight: 700 }}>
              {location}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 12 }}>
              {facts.map((fact) => (
                <div
                  key={fact}
                  style={{
                    display: "flex",
                    borderRadius: 18,
                    background: "#ffffff",
                    color: "#101713",
                    fontSize: 24,
                    fontWeight: 800,
                    padding: "14px 18px",
                    boxShadow: "0 10px 30px rgba(16, 23, 19, 0.08)",
                  }}
                >
                  {fact}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {tags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    borderRadius: 999,
                    background: "#eaf3eb",
                    color: "#285340",
                    fontSize: 20,
                    fontWeight: 800,
                    padding: "12px 16px",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function getOpenGraphBathroomReplacement(property: Property) {
  if (property.security) {
    return "Seguridad";
  }

  if (property.pool) {
    return "Piscina";
  }

  if (property.patio) {
    return "Patio";
  }

  if (property.grill) {
    return "Churrasquera";
  }

  return "Baños a consultar";
}

function formatPrice(property: Property) {
  const currency = property.currency === "USD" ? "$us" : "Bs";
  const suffix = property.operation === "Alquiler" ? "/mes" : "";

  return `${currency} ${property.price.toLocaleString("es-BO")}${suffix}`;
}

function formatOperation(operation: Property["operation"]) {
  return operation === "Compra" ? "Venta" : operation;
}
