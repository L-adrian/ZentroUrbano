import { ImageResponse } from "next/og";

export const alt = "Zentro Urbano, alquiler directo en Bolivia";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#ffffff",
          color: "#111111",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 64,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div
            style={{
              color: "#176b4d",
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              padding: "0",
            }}
          >
            Zentro Urbano
          </div>
          <h1 style={{ fontSize: 82, letterSpacing: -2, lineHeight: 0.94, marginTop: 34 }}>
            Alquiler directo con el propietario.
          </h1>
          <p style={{ color: "#555555", fontSize: 30, lineHeight: 1.3 }}>
            Sin inmobiliarias. Sin comisiones. Santa Cruz, Bolivia.
          </p>
        </div>
      </div>
    ),
    size,
  );
}
