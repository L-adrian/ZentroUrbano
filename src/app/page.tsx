import { ArrowRight, Building2, Car, Home, KeyRound, MapPin, PawPrint, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HomeRentalSearch } from "@/components/home-rental-search";
import { PropertyCard } from "@/components/property-card";
import { RentalMotion } from "@/components/rental-motion";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getDirectRentals, getRentalZones } from "@/lib/rentals";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Alquileres directos en Santa Cruz",
  description: "Casas, departamentos y monoambientes en alquiler. Contacta directamente al propietario, sin intermediarios ni comisiones.",
  path: "/", keywords: ["alquiler SCZ", "alquiler directo Santa Cruz", "departamentos en alquiler Santa Cruz", "casas en alquiler Santa Cruz"],
});
const categories = [
  { label: "Todos", href: "/propiedades", icon: SlidersHorizontal },
  { label: "Casas", href: "/propiedades?type=Casa", icon: Home },
  { label: "Departamentos", href: "/propiedades?type=Departamento", icon: Building2 },
  { label: "Monoambientes", href: "/propiedades?type=Departamento&bedrooms=Monoambiente", icon: KeyRound },
  { label: "Aceptan mascotas", href: "/propiedades?amenity=pets", icon: PawPrint },
  { label: "Con parqueo", href: "/propiedades?amenity=garage", icon: Car },
];

export default async function HomePage() {
  const rentals = getDirectRentals(await getPublishedPropertiesData());
  return <main id="contenido" className="home-page">
    <section className="rental-heading">
      <div className="zu-container">
        <div className="rental-heading-row">
          <div><p className="zu-eyebrow"><MapPin size={14} /> SANTA CRUZ, BOLIVIA</p><h1>Un nuevo lugar.<br /><span>Sin intermediarios.</span></h1><p className="heading-subtitle">Alquileres de viviendas. De propietario a inquilino.</p></div>
          <div className="rental-heading-art"><RentalMotion /><span><KeyRound size={15} /> Tu próximo hogar empieza aquí</span></div>
        </div>
        <HomeRentalSearch zones={getRentalZones(rentals)} />
        <Link href="/bienvenida#sin-comisiones" className="home-welcome-link">Conoce Zentro Urbano: alquiler directo, sin comisiones<ArrowRight size={16} /></Link>
      </div>
    </section>
    <section className="zu-container rental-catalog">
      <nav className="rental-categories" aria-label="Tipos de alquiler">{categories.map(({label,href,icon: Icon},index) => <Link href={href} key={label} className={index === 0 ? "is-active" : ""}><Icon size={22} strokeWidth={1.6} /><span>{label}</span></Link>)}</nav>
      <div className="catalog-heading"><div><h2>Tu próximo alquiler</h2><p>{rentals.length} viviendas · Contacto directo con el propietario</p></div><Link href="/mapa" className="zu-button zu-button-secondary"><MapPin size={17} /><span>Ver mapa</span></Link></div>
      {rentals.length ? <div className="rental-grid">{rentals.slice(0, 8).map((property, index) => <PropertyCard key={property.slug} property={property} compact eagerImage={index < 2} />)}</div> : <div className="zu-empty"><Home size={32} /><h2>Pronto, nuevos alquileres</h2><p>Las nuevas viviendas aparecerán aquí.</p><Link href="/publicar" className="zu-button zu-button-primary">Publicar mi vivienda</Link></div>}
      {rentals.length > 0 && <div className="catalog-more"><Link href="/propiedades" className="zu-button zu-button-secondary">Explorar todos los alquileres <ArrowRight size={17} /></Link></div>}
    </section>
    <section className="owner-band"><div className="zu-container"><span className="owner-band-icon"><KeyRound size={28} /></span><div><h2>Tu vivienda, tu trato.</h2><p>Publica tu alquiler y recibe consultas directamente.</p></div><Link href="/publicar" className="zu-button zu-button-primary">Publicar alquiler <ArrowRight size={17} /></Link></div></section>
    <SupportWhatsAppButton floating />
  </main>;
}
