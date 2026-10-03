import Image from "next/image";

// Animated pixel-art scene: a Santa Cruz street from day to night as new tenants move in.
// The animation lives inside the SVG (CSS keyframes) and stays still with prefers-reduced-motion.
export function PixelNeighborhood({ hero = false }: { hero?: boolean }) {
  return <div className={`pixel-neighborhood ${hero ? "is-hero" : ""}`}>
    <Image
      src="/images/pixel/barrio-zentro.svg"
      alt="Un barrio de Santa Cruz del día a la noche: llegan una familia, una pareja con su perrito y una mudanza, y el propietario les entrega la llave"
      width={124}
      height={60}
      unoptimized
      loading="eager"
    />
  </div>;
}
