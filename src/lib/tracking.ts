import { headers } from "next/headers";
import { executeQuery, hasDatabaseConfig } from "@/lib/mysql";

export type TrackingEventType =
  | "property_view"
  | "property_card_click"
  | "property_whatsapp_click"
  | "property_share_click"
  | "property_map_view"
  | "property_gallery_open"
  | "ad_impression"
  | "ad_click";

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
        propertySlug: payload.propertySlug ?? null,
        adId: payload.adId ?? null,
        path: payload.path ?? requestHeaders.get("referer") ?? null,
        referrer: requestHeaders.get("referer"),
        userAgent: requestHeaders.get("user-agent"),
        metadata: JSON.stringify(payload.metadata ?? {}),
      },
    );
  } catch (error) {
    return {
      stored: false,
      reason: error instanceof Error ? error.message : "No se pudo guardar el evento.",
    };
  }

  return {
    stored: true,
  };
}
