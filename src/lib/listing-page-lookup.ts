import "server-only";
import { cache } from "react";
import { getPrivateTourShowcase } from "@/lib/private-tour-showcase";
import { getPropertyBySlugData, getRetiredPropertyBySlugData } from "@/lib/property-data";
import { isDirectRental } from "@/lib/rentals";

// What /propiedades/<slug> shows. Cached per request: the layout, the metadata and the page share
// one lookup. The layout checks it above loading.tsx, so an unknown slug still answers a real 404.
export const findListingPage = cache(async (slug: string) => {
  const showcase = await getPrivateTourShowcase(slug);
  if (showcase) return { kind: "showcase" as const, showcase };
  const property = await getPropertyBySlugData(slug);
  if (property && isDirectRental(property)) return { kind: "listing" as const, property };
  const retired = property ? undefined : await getRetiredPropertyBySlugData(slug);
  return retired ? { kind: "retired" as const, property: retired } : null;
});
