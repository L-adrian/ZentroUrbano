// Shared by the browser beacon and /api/track so only stored events leave the browser.
export const serverTrackedEvents = [
  "property_view",
  "property_card_click",
  "property_whatsapp_click",
  "property_share_click",
  "property_map_view",
  "property_gallery_open",
  // A visit that came from a shared link (?desde=compartido).
  "property_shared_visit",
  "property_tour_open",
  "property_tour_ready",
  "property_tour_error",
  "property_tour_whatsapp_click",
  "ad_impression",
  "ad_click",
  // Catalog: card clicks, searches left without results, shared searches.
  "catalog_card_click",
  "search_empty",
  "search_share",
] as const;

// Stored only by server routes that validate them; the beacon cannot send these.
export const serverOnlyEvents = ["property_report", "property_availability_confirmed", "property_marked_rented"] as const;

export type TrackingEventType = (typeof serverTrackedEvents)[number] | (typeof serverOnlyEvents)[number];

export function isServerTrackedEvent(value: unknown): value is (typeof serverTrackedEvents)[number] {
  return typeof value === "string" && (serverTrackedEvents as readonly string[]).includes(value);
}
