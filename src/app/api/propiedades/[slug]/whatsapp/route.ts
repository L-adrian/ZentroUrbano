import { NextResponse, type NextRequest } from "next/server";
import { isExternalContactUrl } from "@/lib/property-contact";
import { absoluteUrl } from "@/lib/site";
import { getPropertyBySlugData } from "@/lib/property-data";
import { trackServerEvent } from "@/lib/tracking";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/propiedades/[slug]/whatsapp">,
) {
  const { slug } = await context.params;
  const property = await getPropertyBySlugData(slug);

  if (!property) {
    return NextResponse.redirect(new URL("/propiedades", request.url));
  }

  await trackServerEvent({
    eventType: "property_whatsapp_click",
    propertySlug: property.slug,
    path: `/propiedades/${property.slug}`,
    metadata: {
      operation: property.operation,
      city: property.city,
      zone: property.zone,
      listing_plan: property.listingPlan,
    },
  });

  if (isExternalContactUrl(property.whatsapp)) {
    return NextResponse.redirect(property.whatsapp);
  }

  const agent = property.agent;
  const message = encodeURIComponent(
    `Hola ${agent.name}, quiero recibir más información sobre ${property.title} en Zentro Urbano: ${absoluteUrl(`/propiedades/${property.slug}`)}`,
  );

  return NextResponse.redirect(`https://wa.me/${agent.whatsapp}?text=${message}`);
}
