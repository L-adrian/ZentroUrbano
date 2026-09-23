import { NextResponse, type NextRequest } from "next/server";
import { getSponsoredAdById } from "@/lib/sponsored-ads";
import { absoluteUrl } from "@/lib/site";
import { trackServerEvent } from "@/lib/tracking";

export async function GET(request: NextRequest, context: RouteContext<"/api/ads/[id]/click">) {
  const { id } = await context.params;
  const ad = getSponsoredAdById(id);

  if (!ad) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await trackServerEvent({
    eventType: "ad_click",
    adId: ad.id,
    path: request.nextUrl.pathname,
    metadata: {
      advertiser: ad.advertiser,
      label: ad.label,
      target_url: ad.targetUrl,
    },
  });

  const targetUrl = ad.targetUrl.startsWith("/") ? absoluteUrl(ad.targetUrl) : ad.targetUrl;

  return NextResponse.redirect(targetUrl);
}
