import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Home, KeyRound, MapPin, Search } from "lucide-react";
import { OwnerWelcome } from "@/components/owner-welcome";
import { CommissionExamples } from "@/components/commission-examples";
import { RentalFaqItem } from "@/components/rental-faq-item";
import { RentalMotion } from "@/components/rental-motion";
import { PropertyCard } from "@/components/property-card";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getDirectRentals } from "@/lib/rentals";
import { buildSeoMetadata } from "@/lib/seo";
import { rentalFaq } from "@/lib/support-content";
import "./welcome.css";

export const metadata: Metadata = buildSeoMetadata({
  title: "Bienvenido | Alquiler directo con el propietario",
  description: "Encuentra tu próximo hogar en Santa Cruz. Casas, departamentos y monoambientes en alquiler directo con su propietario. Sin inmobiliarias ni comisión de intermediación.",
  path: "/bienvenida",
});

const steps = [
  { icon: Search, title: "Encuentra tu lugar", text: "Elige zona, presupuesto y lo que necesitas. Revisa las fotos y los costos antes de contactar." },
  { icon: WhatsAppIcon, title: "Habla con el propietario", text: "Consulta disponibilidad y condiciones por WhatsApp. Sin alguien más en medio." },
  { icon: KeyRound, title: "Visita y decide", text: "Coordina una visita, confirma la dirección y acuerda el alquiler directamente con su propietario." },
];

export default async function WelcomePage() {
  const rentals = getDirectRentals(await getPublishedPropertiesData()).slice(0, 3);
  const questions = [rentalFaq[1], rentalFaq[4], rentalFaq[2], rentalFaq[3]];
  return <main id="contenido" className="welcome-page">
    <section className="welcome-intro" aria-labelledby="welcome-title">
      <div className="zu-container">
        <p className="zu-eyebrow"><MapPin size={14} /> ALQUILERES EN SANTA CRUZ, BOLIVIA</p>
        <h1 id="welcome-title">Zentro <span>Urbano</span></h1>
        <p className="welcome-promise">Tu próximo hogar.<br />Directo con su propietario.</p>
        <ul className="welcome-principles" aria-label="Alquiler directo">
          <li><Check size={15} />Sin inmobiliarias</li><li><Check size={15} />Sin comisiones de intermediación</li>
        </ul>
        <div className="welcome-actions">
          <Link className="zu-button zu-button-primary" href="/propiedades"><Search size={18} />Buscar alquiler<ArrowRight size={17} /></Link>
          <Link className="zu-button zu-button-secondary" href="/publicar"><Home size={18} />Publicar mi vivienda</Link>
        </div>
        <p className="welcome-login">¿Ya tienes una cuenta? <Link href="/login">Iniciar sesión <ArrowRight size={13} /></Link></p>
        <RentalMotion welcome />
      </div>
    </section>

    <CommissionExamples />

    <section className="welcome-steps zu-container" aria-labelledby="welcome-steps-title">
      <div className="welcome-section-heading"><div><p className="zu-eyebrow">ASÍ DE DIRECTO</p><h2 id="welcome-steps-title">De buscar a encontrar tu hogar.</h2></div><Link href="/mapa" className="welcome-text-link"><MapPin size={17} />Explorar en el mapa<ArrowRight size={16} /></Link></div>
      <ol>{steps.map(({ icon: Icon, title, text }, index) => <li key={title}><div className="welcome-step-icon"><Icon width={23} height={23} /><span>0{index + 1}</span></div><h3>{title}</h3><p>{text}</p></li>)}</ol>
    </section>

    {rentals.length > 0 && <section className="welcome-rentals" aria-labelledby="welcome-rentals-title"><div className="zu-container">
      <div className="welcome-section-heading"><div><p className="zu-eyebrow">EMPIEZA POR AQUÍ</p><h2 id="welcome-rentals-title">Un lugar para tu próxima etapa.</h2></div><Link className="welcome-text-link" href="/propiedades">Ver todos los alquileres<ArrowRight size={16} /></Link></div>
      <div className="rental-grid">{rentals.map(property => <PropertyCard key={property.slug} property={property} compact />)}</div>
    </div></section>}

    <OwnerWelcome />

    <section className="welcome-faq zu-container" aria-labelledby="welcome-faq-title">
      <div className="welcome-section-heading"><h2 id="welcome-faq-title">Antes de empezar.</h2><Link href="/preguntas-frecuentes" className="welcome-text-link">Todas las preguntas<ArrowRight size={16} /></Link></div>
      {questions.map(item => <RentalFaqItem key={item.question} {...item} />)}
    </section>
    <SupportWhatsAppButton floating />
  </main>;
}
