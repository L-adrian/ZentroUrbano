import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import type { Property } from "@/lib/properties";

type PublisherBadgeProps = {
  property: Property;
  compact?: boolean;
  className?: string;
};

export function PublisherBadge({
  property,
  compact = false,
  className = "",
}: PublisherBadgeProps) {
  const publisher = property.publisher;
  const label =
    publisher.kind === "agency"
      ? publisher.name
      : publisher.verified
        ? "Propietario verificado"
        : "Propietario directo";

  return (
    <span
      style={{
        backgroundColor: `${publisher.brandColor}14`,
        borderColor: `${publisher.brandColor}33`,
      }}
      className={`inline-flex min-w-0 items-center gap-2 rounded-sm border px-2 py-1 text-xs font-semibold text-neutral-700 ${className}`}
    >
      <span
        style={{
          backgroundColor: publisher.brandColor,
          color: publisher.brandTextColor,
        }}
        className={`flex h-5 shrink-0 items-center justify-center rounded-sm px-1 text-[10px] font-black leading-none ${
          publisher.logo ? "w-8" : "min-w-5"
        }`}
      >
        {publisher.logo ? (
          <Image
            src={publisher.logo}
            alt={publisher.name}
            width={28}
            height={18}
            className="h-3.5 w-auto object-contain"
          />
        ) : (
          publisher.shortName
        )}
      </span>
      <span className={compact ? "sr-only" : "truncate"}>{label}</span>
      {publisher.verified ? (
        <BadgeCheck
          style={{ color: publisher.brandColor }}
          className="h-3.5 w-3.5 shrink-0"
          aria-label="Verificada"
        />
      ) : null}
    </span>
  );
}
