"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import type { Property } from "@/lib/properties";

type PropertyShareButtonProps = {
  property: Pick<Property, "slug" | "title" | "city" | "zone">;
  className?: string;
  label?: string;
  iconOnly?: boolean;
};

export function PropertyShareButton({
  property,
  className,
  label = "Compartir ficha",
  iconOnly = false,
}: PropertyShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function shareProperty() {
    const url = getPropertyUrl(property.slug);
    const text = `${property.title} en ${property.zone}, ${property.city}`;

    trackShare(property.slug);

    try {
      if (navigator.share) {
        await navigator.share({
          title: property.title,
          text,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        setCopied(false);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={shareProperty}
      className={
        className ??
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
      }
      aria-label={iconOnly ? label : undefined}
      title={label}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      {iconOnly ? null : <span>{copied ? "Link copiado" : label}</span>}
    </button>
  );
}

function getPropertyUrl(slug: string) {
  if (typeof window === "undefined") {
    return `/propiedades/${slug}`;
  }

  return `${window.location.origin}/propiedades/${slug}`;
}

function trackShare(propertySlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  void fetch("/api/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventName: "property_share_click",
      path: window.location.pathname,
      params: {
        property_slug: propertySlug,
      },
    }),
  }).catch(() => undefined);
}
