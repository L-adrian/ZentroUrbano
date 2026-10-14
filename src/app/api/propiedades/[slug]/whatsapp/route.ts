import { NextResponse, type NextRequest } from "next/server";
import { formatPriceInCurrency } from "@/lib/currency";
import { buildOwnerWhatsappMessage, isExternalContactUrl, whatsappContactSources } from "@/lib/property-contact";
import { normalizePublicationPhone } from "@/lib/publication-input";
import { absoluteUrl } from "@/lib/site";
import { getPropertyBySlugData } from "@/lib/property-data";
import { visibleOrigin } from "@/lib/request-origin";
import { trackServerEvent } from "@/lib/tracking";
import { getOrCreateVisitorId } from "@/lib/visitor-id";
import { questionLines, readQuestionChoices } from "@/lib/whatsapp-questions";

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
  // Optional questions chosen before opening WhatsApp ("Agregar preguntas al mensaje").
  const extraLines = questionLines(readQuestionChoices(request.nextUrl.searchParams));
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
      questions: extraLines.length,
    },
  });

  if (isExternalContactUrl(property.whatsapp)) {
    return NextResponse.redirect(property.whatsapp);
  }

  const message = buildOwnerWhatsappMessage(
    property,
    formatPriceInCurrency(property, property.currency),
    absoluteUrl(`/propiedades/${property.slug}`),
    extraLines,
  );

  // wa.me needs digits with the country code; numbers saved as "7123 4567" still reach Bolivia.
  const number = normalizePublicationPhone(property.agent.whatsapp) ?? property.agent.whatsapp.replace(/\D/g, "");
  return NextResponse.redirect(`https://wa.me/${number}?text=${encodeURIComponent(message)}`);
}
