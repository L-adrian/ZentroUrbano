import Image from "next/image";

export function RentalMotion({ compact = false, welcome = false }: { compact?: boolean; welcome?: boolean }) {
  return <div className={`rental-motion family-motion ${compact ? "is-compact" : ""} ${welcome ? "is-welcome" : ""}`}>
    <Image
      className="family-scene"
      src="/images/family-rental/family-scene-v2.webp"
      alt="Una familia con sus cajas y una planta frente a su nuevo hogar"
      width={1440}
      height={720}
      unoptimized
      loading="eager"
    />
  </div>;
}
