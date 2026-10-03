// Plain ESM keeps configuration loading independent of the native SWC binary.
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*"],
  devIndicators: false,
  poweredByHeader: false,
  experimental: {
    // The admin importer accepts two SPZ scenes plus a small manifest.
    proxyClientMaxBodySize: 21 * 1024 * 1024,
  },
  async headers() {
    // Baseline headers that do not restrict scripts or embeds; a CSP should start in Report-Only.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/inmobiliarias/:path*",
        destination: "/propiedades",
        permanent: true,
      },
      {
        source: "/venta/:path*",
        destination: "/propiedades",
        permanent: true,
      },
      {
        source: "/compra/:path*",
        destination: "/propiedades",
        permanent: true,
      },
      {
        source: "/anticretico/:path*",
        destination: "/propiedades",
        permanent: true,
      },
      {
        source: "/alquiler-scz",
        destination: "/propiedades?operation=Alquiler",
        permanent: true,
      },
      {
        source: "/alquiler-santa-cruz",
        destination: "/propiedades?operation=Alquiler",
        permanent: true,
      },
      {
        source: "/alquileres-scz",
        destination: "/propiedades?operation=Alquiler",
        permanent: true,
      },
      {
        source: "/alquileres-santa-cruz",
        destination: "/propiedades?operation=Alquiler",
        permanent: true,
      },
      {
        source: "/alquiler-santa-cruz-bolivia",
        destination: "/propiedades?operation=Alquiler",
        permanent: true,
      },
    ];
  },
  images: {
    qualities: [68, 72, 74, 75],
    formats: ["image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh4.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh5.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh6.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
