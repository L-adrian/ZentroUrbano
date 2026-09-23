import { NextResponse, type NextRequest } from "next/server";
import { trackServerEvent, type TrackingEventType } from "@/lib/tracking";

const allowedEvents = new Set<TrackingEventType>([
  "property_view",
  "property_card_click",
  "property_whatsapp_click",
  "property_share_click",
  "property_map_view",
  "property_gallery_open",
  "ad_impression",
  "ad_click",
]);

export async function POST(request: NextRequest) {
  let body: {
    eventName?: string;
    params?: Record<string, unknown>;
    path?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.eventName as TrackingEventType | undefined;

  if (!eventType || !allowedEvents.has(eventType)) {
    return NextResponse.json({ ok: false, message: "Unsupported event" }, { status: 400 });
  }

  const params = body.params ?? {};
  const result = await trackServerEvent({
    eventType,
    propertySlug: typeof params.property_slug === "string" ? params.property_slug : undefined,
    adId: typeof params.ad_id === "string" ? params.ad_id : undefined,
    path: body.path,
    metadata: params,
  });

  return NextResponse.json({ ok: true, ...result });
}
