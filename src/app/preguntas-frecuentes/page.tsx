import { CircleHelp } from "lucide-react";
import { RentalFaqItem } from "@/components/rental-faq-item";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { buildSeoMetadata } from "@/lib/seo";
import { rentalFaq } from "@/lib/support-content";

export const metadata = buildSeoMetadata({ title: "Preguntas frecuentes", description: "Respuestas sobre cuentas, alquileres directos, publicación, fotos y revisión de viviendas en Zentro Urbano.", path: "/preguntas-frecuentes" });
export default function FaqPage() {
  return <main id="contenido" className="zu-container help-page"><p className="zu-eyebrow"><CircleHelp size={16} /> PREGUNTAS FRECUENTES</p><h1>Respuestas, sin vueltas.</h1><p>Lo que necesitas saber antes de buscar o publicar.</p><div className="faq-list">{rentalFaq.map(item => <RentalFaqItem key={item.question} {...item} />)}</div><section className="help-contact-row"><div><h2>¿Te quedó una duda?</h2><p>Contacta al equipo de Zentro Urbano.</p></div><SupportWhatsAppButton /></section></main>;
}
