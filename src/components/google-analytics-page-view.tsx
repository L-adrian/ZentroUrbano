"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";

export function GoogleAnalyticsPageView({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams.toString();
    const pagePath = `${pathname}${queryString ? `?${queryString}` : ""}`;

    trackAnalyticsEvent("page_view", {
      send_to: measurementId,
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      page_referrer: document.referrer || undefined,
    });
  }, [measurementId, pathname, searchParams]);

  return null;
}
