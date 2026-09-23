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
  }, [city, operation, propertySlug, zone]);

  return null;
}
