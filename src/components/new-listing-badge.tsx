"use client";

import { usePreviousVisit } from "@/components/use-local-lists";
import { isNewSinceVisit } from "@/lib/local-lists";

// "Nuevo": published after this visitor's previous visit (kept on this phone only).
export function NewListingBadge({ publishedAt }: { publishedAt?: string }) {
  const previousVisit = usePreviousVisit();
  if (!isNewSinceVisit(publishedAt, previousVisit)) return null;
  return <span className="rental-badge is-new">Nuevo</span>;
}
