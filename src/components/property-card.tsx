import { Bath, BedDouble, Car, Check, Clock3, ExternalLink, Eye, Images, MapPin, Ruler, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { PriceDisplay } from "@/components/currency-preference";
import { ListingPhoto } from "@/components/listing-photo";
import { NewListingBadge } from "@/components/new-listing-badge";
import { SaveHeartButton } from "@/components/save-listing-button";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { getPropertyContactCopy, isExternalContactUrl, whatsappContactPath, type WhatsappContactSource } from "@/lib/property-contact";
import type { Property } from "@/lib/properties";
import { getAvailabilityState, getEntryCost, getListingHighlights } from "@/lib/listing-summary";

type PropertyCardProps = {
  property: Property;
  compact?: boolean;
  eagerImage?: boolean;
  // Data the owner did not give for an active filter ("Mascotas: a consultar").
  pending?: string[];
  // Extra lines asked for by the search ("a ~1,2 km de …", "Bs 400 bajo el promedio de …").
  notes?: string[];
  contactSource?: WhatsappContactSource;
  // The first featured listing of the catalog list gets the whole row on wide screens.
  wide?: boolean;
};

export function PropertyCard({ property, compact = false, eagerImage = false, pending = [], notes = [], contactSource = "tarjeta", wide = false }: PropertyCardProps) {
  const contact = getPropertyContactCopy(property);
  const external = isExternalContactUrl(property.whatsapp);
  const facts = [
    ...(property.bedrooms > 0 ? [{ icon: BedDouble, label: `${property.bedrooms} dorm.` }] : []),
    ...(property.bathrooms > 0 ? [{ icon: Bath, label: `${property.bathrooms} ${property.bathrooms === 1 ? "baño" : "baños"}` }] : []),
    ...(property.area > 0 ? [{ icon: Ruler, label: `${property.area} m²` }] : []),
    ...(property.garage > 0 ? [{ icon: Car, label: `${property.garage} parqueo` }] : []),
  ].slice(0, compact ? 3 : 4);
  const availability = getAvailabilityState(property);
  const highlights = getListingHighlights(property, compact ? 2 : 3);
  const entry = getEntryCost(property);
  const featured = property.listingPlan === "featured";
  // Featured cards show three more photos under the cover; the last one says how many remain.
  const thumbs = featured && !compact ? property.images.slice(1, 4) : [];
  const moreImages = property.images.length - 1 - thumbs.length;
  // Only what the price needs reaches the browser: the card is also drawn on server pages.
  const price = { price: property.price, currency: property.currency, operation: property.operation, exchangeRate: property.exchangeRate };
  return <article className={`rental-card${featured ? " is-featured zu-feature-anim" : ""}${featured && wide ? " is-wide" : ""}`}>
    {featured ? <p className="rental-feature-ribbon"><span className="rental-feature-shine zu-feature-anim" aria-hidden="true" /><span><Star className="zu-feature-anim" size={15} fill="currentColor" aria-hidden="true" />Destacado</span><small>Anuncio promocionado</small></p> : null}
    <div className="rental-card-media">
      <Link href={`/propiedades/${property.slug}`} className="rental-card-image">
        {property.images[0] ? <ListingPhoto src={property.images[0]} alt={property.title} fill loading={eagerImage ? "eager" : "lazy"} quality={72} sizes="(max-width: 540px) calc(100vw - 40px), (max-width: 768px) 45vw, (max-width: 1100px) 30vw, 285px" /> : <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-neutral-500"><Images size={20} />Fotos pendientes</span>}
        <span className={`rental-status${availability.fresh ? "" : " is-unconfirmed"}`} suppressHydrationWarning>{availability.fresh ? <Check /> : <Clock3 />}{availability.shortLabel}</span>
        <span className="rental-card-badges"><NewListingBadge publishedAt={property.publishedAt} /></span>
        <span className="rental-image-count"><Images size={13} />{property.images.length}</span>
      </Link>
      <SaveHeartButton slug={property.slug} title={property.title} />
      {thumbs.length > 0 ? <Link href={`/propiedades/${property.slug}`} className="rental-feature-thumbs" tabIndex={-1} aria-hidden="true">{thumbs.map((src, index) => <span key={src} className="zu-feature-anim" data-more={index === thumbs.length - 1 && moreImages > 0 ? `+${moreImages} fotos` : undefined}><ListingPhoto src={src} alt="" fill loading="lazy" quality={60} sizes="(max-width: 540px) 30vw, 180px" /></span>)}</Link> : null}
    </div>
    <div className="rental-card-content">
      <p className="rental-card-location"><MapPin size={14} />{property.zone} · {property.city}</p>
      <h3 className="rental-card-title"><Link href={`/propiedades/${property.slug}`}>{property.title}</Link></h3>
      {notes.length > 0 ? <ul className="rental-card-notes">{notes.map(note => <li key={note}>{note}</li>)}</ul> : null}
      <div className="rental-card-facts">{facts.map(({ icon: Icon, label }) => <span key={label}><Icon size={15} strokeWidth={1.6} />{label}</span>)}</div>
      {highlights.length > 0 || pending.length > 0 ? <ul className="rental-card-tags" aria-label="Destacados">{highlights.map(tag => <li key={tag}>{tag}</li>)}{pending.map(label => <li key={label} className="is-unknown">{label}</li>)}</ul> : null}
      <div className="rental-card-bottom">
        <div className="rental-card-pricing"><PriceDisplay property={price} className="rental-card-price" /><span className={`rental-entry-label${entry ? "" : " is-pending"}`}>Para entrar: {entry ? <PriceDisplay property={{ ...price, price: entry.total }} showPeriod={false} showExchangeRate={false} /> : <span>a consultar</span>}</span></div>
        <a href={whatsappContactPath(property.slug, contactSource)} target="_blank" rel="noreferrer" className={`rental-card-contact${external ? " is-external" : ""}`} aria-label={`${contact.label}: ${property.title}`} title={contact.title}>{external ? <ExternalLink size={17} aria-hidden="true" /> : <WhatsAppIcon width={18} height={18} />}<span>{contact.shortLabel}</span></a>
      </div>
      <p className="rental-owner-label"><UserRound size={13} />Propietario directo{property.publicViews ? <span className="rental-views" title="Personas que abrieron este anuncio"><Eye size={13} />{property.publicViews} {property.publicViews === 1 ? "persona la vio" : "personas la vieron"}</span> : null}</p>
    </div>
  </article>;
}
