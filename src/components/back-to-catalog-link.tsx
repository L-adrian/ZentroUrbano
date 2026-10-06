"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { catalogFallbackHref, readCatalogSearch, wasListingOpenedFromCatalog } from "@/lib/catalog-return";

// Coming from the catalog, it acts like the back button (same filters, same spot in the list).
// Opened from a shared link, it goes to this tab's last search, or to the whole catalog.
export function BackToCatalogLink({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  function goBack(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (wasListingOpenedFromCatalog(pathname) && window.history.length > 1) {
      event.preventDefault();
      router.back();
      return;
    }
    const lastSearch = readCatalogSearch();
    if (lastSearch && lastSearch !== catalogFallbackHref) {
      event.preventDefault();
      router.push(lastSearch);
    }
  }

  return (
    <Link href={catalogFallbackHref} onClick={goBack} className={className}>
      {children}
    </Link>
  );
}
