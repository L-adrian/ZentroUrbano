"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent, trackAnalyticsEventThen } from "@/lib/analytics-events";

export function PropertyViewTracker({
  propertySlug,
  operation,
  city,
  zone,
}: {
  propertySlug: string;
  operation: string;
  city: string;
  zone: string;
}) {
  useEffect(() => {
    const view = { property_slug: propertySlug, operation, city, zone };
    // Links shared from the listing or from Mi cuenta end in ?desde=compartido.
    let shared = false;
    try {
      shared = new URLSearchParams(window.location.search).get("desde") === "compartido";
    } catch {
      // Counting never gets in the way of the page.
    }
    if (!shared) {
      trackAnalyticsEvent("property_view", view);
      return;
    }
    // One after the other, so a first visit is one person and not two.
    void trackAnalyticsEventThen("property_view", view).then(() =>
      trackAnalyticsEvent("property_shared_visit", { property_slug: propertySlug }),
    );
  }, [city, operation, propertySlug, zone]);

  return null;
}
