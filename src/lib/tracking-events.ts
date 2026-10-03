// Shared by the browser beacon and /api/track so only stored events leave the browser.
export const serverTrackedEvents = [
  "property_view",
  "property_card_click",
  "property_whatsapp_click",
  "property_share_click",
  "property_map_view",
  "property_gallery_open",
  "property_tour_open",
  "property_tour_ready",
  "property_tour_error",
  "property_tour_whatsapp_click",
  "ad_impression",
  "ad_click",
] as const;

export type TrackingEventType = (typeof serverTrackedEvents)[number];

export function isServerTrackedEvent(value: unknown): value is TrackingEventType {
  return typeof value === "string" && (serverTrackedEvents as readonly string[]).includes(value);
}
