import { ExternalLink, MessageCircle } from "lucide-react";
import { PriceDisplay } from "@/components/currency-preference";
import { PropertyShareButton } from "@/components/property-share-button";
import { getPropertyContactCopy, isExternalContactUrl } from "@/lib/property-contact";
import type { Property } from "@/lib/properties";

type MobileStickyContactProps = {
  property: Property;
};

export function MobileStickyContact({ property }: MobileStickyContactProps) {
  const agent = property.agent;
  const contactCopy = getPropertyContactCopy(property);
  const contactUsesReference = isExternalContactUrl(property.whatsapp);

  return (
    <div className="property-contact-dock fixed inset-x-0 bottom-0 z-[60] border-t border-neutral-300 bg-white px-4 py-3 lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <PriceDisplay
            property={property}
            className="block truncate text-sm font-semibold text-neutral-950"
          />
          <p className="truncate text-xs font-medium text-neutral-500">{agent.name}</p>
        </div>
        <PropertyShareButton
          property={property}
          iconOnly
          label="Compartir ficha"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-neutral-300 bg-white text-neutral-950"
        />
        <a
          href={`/api/propiedades/${property.slug}/whatsapp`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-[#176b4d] px-4 text-sm font-semibold text-white"
        >
          {contactUsesReference ? (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          )}
          {contactCopy.shortLabel}
        </a>
      </div>
    </div>
  );
}
