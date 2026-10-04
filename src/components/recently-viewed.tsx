"use client";

import { Heart, History } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PriceDisplay } from "@/components/currency-preference";
import { useRecentListings, useSavedListings } from "@/components/use-local-lists";
import type { RentalSummary } from "@/lib/rentals";

type RecentListingSummary = RentalSummary;

// "Vistos recientemente": the last listings opened on this phone (localStorage only).
export function RecentlyViewed({ properties, limit = 6 }: { properties: RecentListingSummary[]; limit?: number }) {
  const recent = useRecentListings();
  const items = recent
    .map((item) => properties.find((property) => property.slug === item.slug))
    .filter((property): property is RecentListingSummary => Boolean(property))
    .slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className="recently-viewed" aria-labelledby="recently-viewed-title">
      <div className="recently-viewed-heading">
        <h2 id="recently-viewed-title"><History size={18} aria-hidden="true" />Vistos recientemente</h2>
        <SavedListingsLink />
      </div>
      <ul className="recently-viewed-list">
        {items.map((property) => (
          <li key={property.slug}>
            <Link href={`/propiedades/${property.slug}`} className="recent-tile">
              <span className="recent-tile-image">
                {property.images[0] ? <Image src={property.images[0]} alt="" fill sizes="88px" quality={60} /> : null}
              </span>
              <span className="recent-tile-text">
                <span className="recent-tile-title">{property.title}</span>
                <span className="recent-tile-zone">{property.zone}</span>
                <PriceDisplay property={property} className="recent-tile-price" showExchangeRate={false} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// "Guardados (3)": only shown once something is saved on this phone.
export function SavedListingsLink({ className = "saved-listings-link" }: { className?: string }) {
  const count = useSavedListings().length;
  if (count === 0) return null;
  return (
    <Link href="/guardados" className={className}>
      <Heart size={16} aria-hidden="true" />
      Guardados ({count})
    </Link>
  );
}
