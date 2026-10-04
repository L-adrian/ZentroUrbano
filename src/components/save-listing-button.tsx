"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  recordRecentListing,
  toggleSavedListingInStorage,
  useSavedListings,
} from "@/components/use-local-lists";

type ListingRef = { slug: string; title: string };

// Heart on a listing card: saves the home on this phone (no account needed).
export function SaveHeartButton({ slug, title }: ListingRef) {
  const saved = useSavedListings().some((item) => item.slug === slug);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const nowSaved = toggleSavedListingInStorage({ slug, title });
    setFailed(!saved && !nowSaved);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Quitar de guardados: ${title}` : `Guardar: ${title}`}
      title={failed ? "Este navegador no permite guardar" : saved ? "Quitar de guardados" : "Guardar"}
      className={`rental-save-button${saved ? " is-saved" : ""}`}
    >
      <Heart aria-hidden="true" />
    </button>
  );
}

// For the listing page: a "Guardar" button, and this home is remembered as recently viewed.
export function ListingSaveButton({ slug, title }: ListingRef) {
  const saved = useSavedListings().some((item) => item.slug === slug);
  const [status, setStatus] = useState<"" | "saved" | "removed" | "failed">("");

  useEffect(() => {
    recordRecentListing(slug);
  }, [slug]);

  function toggle() {
    const nowSaved = toggleSavedListingInStorage({ slug, title });
    setStatus(nowSaved ? "saved" : saved ? "removed" : "failed");
  }

  return (
    <span className="listing-save">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className={`listing-save-button${saved ? " is-saved" : ""}`}
      >
        <Heart aria-hidden="true" />
        {saved ? "Guardada" : "Guardar"}
      </button>
      {saved ? <Link href="/guardados" className="listing-save-link">Ver guardados</Link> : null}
      {status === "failed" ? <span className="listing-save-error">Este navegador no permite guardar.</span> : null}
      <span className="sr-only" aria-live="polite">
        {status === "saved" ? "Guardada en este teléfono" : status === "removed" ? "Quitada de guardados" : status === "failed" ? "Este navegador no permite guardar" : ""}
      </span>
    </span>
  );
}
