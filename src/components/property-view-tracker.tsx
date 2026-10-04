"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";

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
    trackAnalyticsEvent("property_view", {
      property_slug: propertySlug,
      operation,
      city,
      zone,
    });
    // Links shared from the listing or from Mi cuenta end in ?desde=compartido.
    try {
      if (new URLSearchParams(window.location.search).get("desde") === "compartido") {
        trackAnalyticsEvent("property_shared_visit", { property_slug: propertySlug });
      }
    } catch {
      // Counting never gets in the way of the page.
    }
  }, [city, operation, propertySlug, zone]);

  return null;
}
