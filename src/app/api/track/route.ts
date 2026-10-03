import { NextResponse, type NextRequest } from "next/server";
import { trackServerEvent } from "@/lib/tracking";
import { isServerTrackedEvent } from "@/lib/tracking-events";

// Beacons are a few hundred bytes; anything larger is not from our pages.
const maxBodyBytes = 4096;
const maxMetadataKeys = 20;
const maxMetadataText = 200;

export async function POST(request: NextRequest) {
  let body: {
    eventName?: string;
    params?: Record<string, unknown>;
    path?: string;
  };

  try {
    const raw = await request.text();
    if (raw.length > maxBodyBytes) {
      return NextResponse.json({ ok: false, message: "Payload too large" }, { status: 413 });
    }
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body?.eventName;

  if (!isServerTrackedEvent(eventType)) {
    return NextResponse.json({ ok: false, message: "Unsupported event" }, { status: 400 });
  }

  const params = sanitizeMetadata(body.params);
  const result = await trackServerEvent({
    eventType,
    propertySlug: typeof params.property_slug === "string" ? params.property_slug : undefined,
    adId: typeof params.ad_id === "string" ? params.ad_id : undefined,
    path: typeof body.path === "string" ? body.path : undefined,
    metadata: params,
  });

  return NextResponse.json({ ok: true, stored: result.stored });
}

function sanitizeMetadata(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries: [string, string | number | boolean][] = [];
  for (const [key, item] of Object.entries(value)) {
    if (entries.length >= maxMetadataKeys || key.length > 60) continue;
    if (typeof item === "string") entries.push([key, item.slice(0, maxMetadataText)]);
    else if ((typeof item === "number" && Number.isFinite(item)) || typeof item === "boolean") entries.push([key, item]);
  }
  return Object.fromEntries(entries);
}
