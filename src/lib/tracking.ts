import { headers } from "next/headers";
import { executeQuery, hasDatabaseConfig } from "@/lib/mysql";
import type { TrackingEventType } from "@/lib/tracking-events";

export type { TrackingEventType };

export type TrackingPayload = {
  eventType: TrackingEventType;
  propertySlug?: string;
  adId?: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

export async function trackServerEvent(payload: TrackingPayload) {
  if (!hasDatabaseConfig()) {
    return {
      stored: false,
      reason: "DATABASE_URL is not configured",
    };
  }

  const requestHeaders = await headers();

  try {
    await executeQuery(
      `insert into tracking_events
        (event_type, property_slug, ad_id, path, referrer, user_agent, metadata)
       values
        (:eventType, :propertySlug, :adId, :path, :referrer, :userAgent, :metadata)`,
      {
        eventType: payload.eventType,
        propertySlug: clip(payload.propertySlug, 180),
        adId: clip(payload.adId, 120),
        path: clip(payload.path ?? requestHeaders.get("referer"), 500),
        referrer: clip(requestHeaders.get("referer"), 500),
        userAgent: clip(requestHeaders.get("user-agent"), 500),
        metadata: JSON.stringify(payload.metadata ?? {}),
      },
    );
  } catch (error) {
    // Database errors stay in the server log; clients only learn that the event was not stored.
    console.error("tracking_events insert failed", error);
    return {
      stored: false,
      reason: "No se pudo guardar el evento.",
    };
  }

  return {
    stored: true,
  };
}

// Column widths from tracking_events; longer values would make strict-mode inserts fail.
function clip(value: string | null | undefined, length: number) {
  return typeof value === "string" && value ? value.slice(0, length) : null;
}
