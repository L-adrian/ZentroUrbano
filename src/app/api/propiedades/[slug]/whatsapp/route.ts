import { NextResponse, type NextRequest } from "next/server";
import { formatPriceInCurrency } from "@/lib/currency";
import { buildOwnerWhatsappMessage, isExternalContactUrl, whatsappContactSources } from "@/lib/property-contact";
import { absoluteUrl } from "@/lib/site";
import { getPropertyBySlugData } from "@/lib/property-data";
import { visibleOrigin } from "@/lib/request-origin";
import { trackServerEvent } from "@/lib/tracking";
import { getOrCreateVisitorId } from "@/lib/visitor-id";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/propiedades/[slug]/whatsapp">,
) {
  const { slug } = await context.params;
  const property = await getPropertyBySlugData(slug);

  if (!property) {
    return NextResponse.redirect(new URL("/propiedades", visibleOrigin(request)));
  }

  const source = request.nextUrl.searchParams.get("desde");
  await trackServerEvent({
    eventType: "property_whatsapp_click",
    propertySlug: property.slug,
    path: `/propiedades/${property.slug}`,
    metadata: {
      operation: property.operation,
      city: property.city,
      zone: property.zone,
      listing_plan: property.listingPlan,
      source: whatsappContactSources.find((item) => item === source) ?? "otro",
      visitor_id: await getOrCreateVisitorId(),
    },
  });

  if (isExternalContactUrl(property.whatsapp)) {
    return NextResponse.redirect(property.whatsapp);
  }

  const message = buildOwnerWhatsappMessage(
    property,
    formatPriceInCurrency(property, property.currency),
    absoluteUrl(`/propiedades/${property.slug}`),
  );

  return NextResponse.redirect(`https://wa.me/${property.agent.whatsapp}?text=${encodeURIComponent(message)}`);
}
