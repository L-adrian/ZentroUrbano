"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";

// Cards are server-rendered on several pages, so one listener counts clicks on any of them.
export function CatalogCardClicks() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.type === "auxclick" && event.button !== 1) return;
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(".rental-card a[href^='/propiedades/']");
      const slug = link?.getAttribute("href")?.split(/[/?#]/)[2];
      if (slug) trackAnalyticsEvent("catalog_card_click", { property_slug: decodeURIComponent(slug) });
    }
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, []);
  return null;
}
