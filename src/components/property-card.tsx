import { Bath, BedDouble, Car, Check, ExternalLink, Images, MapPin, MessageCircle, Ruler, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PriceDisplay } from "@/components/currency-preference";
import { getPropertyContactCopy, isExternalContactUrl } from "@/lib/property-contact";
import type { Property } from "@/lib/properties";

export function PropertyCard({ property, compact = false, eagerImage = false }: { property: Property; compact?: boolean; eagerImage?: boolean }) {
  const contact = getPropertyContactCopy(property);
  const facts = [
    ...(property.bedrooms > 0 ? [{ icon: BedDouble, label: `${property.bedrooms} dorm.` }] : []),
    ...(property.bathrooms > 0 ? [{ icon: Bath, label: `${property.bathrooms} ${property.bathrooms === 1 ? "baño" : "baños"}` }] : []),
    ...(property.area > 0 ? [{ icon: Ruler, label: `${property.area} m²` }] : []),
    ...(property.garage > 0 ? [{ icon: Car, label: `${property.garage} parqueo` }] : []),
  ].slice(0, compact ? 3 : 4);
  return <article className="rental-card">
    <Link href={`/propiedades/${property.slug}`} className="rental-card-image">
      {property.images[0] ? <Image src={property.images[0]} alt={property.title} fill loading={eagerImage ? "eager" : "lazy"} quality={72} sizes="(max-width: 540px) calc(100vw - 40px), (max-width: 768px) 45vw, (max-width: 1100px) 30vw, 285px" /> : <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-neutral-500"><Images size={20} />Fotos pendientes</span>}
      <span className="rental-status"><Check />Disponible</span>
      {property.isSeeded && <span className="rental-demo">Ficha de prueba</span>}
      <span className="rental-image-count"><Images size={12} />{property.images.length}</span>
    </Link>
    <div className="rental-card-content">
      <p className="rental-card-location"><MapPin size={13} />{property.zone} · {property.city}</p>
      <h3 className="rental-card-title"><Link href={`/propiedades/${property.slug}`}>{property.title}</Link></h3>
      <div className="rental-card-facts">{facts.map(({ icon: Icon, label }) => <span key={label}><Icon size={14} strokeWidth={1.6} />{label}</span>)}</div>
      <div className="rental-card-bottom">
        <div><PriceDisplay property={property} className="rental-card-price" /><span className="rental-owner-label"><UserRound size={11} />Propietario directo</span></div>
        <a href={`/api/propiedades/${property.slug}/whatsapp`} target="_blank" rel="noreferrer" className="rental-card-contact" aria-label={`${contact.label}: ${property.title}`} title={contact.title}>{isExternalContactUrl(property.whatsapp) ? <ExternalLink size={19} /> : <MessageCircle size={19} />}</a>
      </div>
    </div>
  </article>;
}
