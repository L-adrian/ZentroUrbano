import { ArrowUpRight, ChartNoAxesCombined, Check, Mail, Megaphone, MessageCircle, Users } from "lucide-react";
import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";
import { siteConfig, whatsappUrl } from "@/lib/site";

export const metadata: Metadata = buildSeoMetadata({
  title: "Anuncia tu negocio en Zentro Urbano",
  description: "Espacios publicitarios para empresas de mudanzas, limpieza, mantenimiento y equipamiento del hogar, frente a más de 10.000 personas al día que buscan alquiler en Santa Cruz.",
  path: "/publicidad",
});
const plans = [
  { name: "Banner visible", price: 200, description: "Tu marca aparece mientras las personas buscan dónde vivir. Ideal para darte a conocer.", features: ["Imagen y nombre de tu negocio", "Enlace directo a tu WhatsApp o página", "Conteo de impresiones y clics"] },
  { name: "Marca destacada", price: 350, description: "Más visibilidad, en la ubicación que acordemos según tu tipo de negocio.", features: ["Todo lo del Banner visible", "Ubicación acordada para tu campaña", "Reporte de clics al terminar el mes"] },
  { name: "Campaña premium", price: 560, description: "Una campaña armada contigo para una promoción o temporada fuerte.", features: ["Planificamos la campaña juntos", "Te ayudamos con la imagen y el texto", "Reporte semanal de resultados"] },
];
const message = "Hola, quiero información para anunciar mi negocio en Zentro Urbano.";

export default function AdvertisingPage() {
  return <main id="contenido" className="zu-container advertising-page">
    <header className="advertising-heading"><p className="zu-eyebrow"><Megaphone size={15} /> PUBLICIDAD PARA NEGOCIOS</p><h1>Anuncia tu negocio en Zentro Urbano</h1><p>Quien busca alquiler está por mudarse, y pronto va a necesitar una mudanza, limpieza, arreglos o muebles. Si tu negocio ofrece eso, este es el momento para que te conozcan.</p></header>
    <section aria-label="Alcance" className="advertising-reach">
      <Users size={22} />
      <div><strong>Más de 10.000 personas al día</strong><p>Gente en Santa Cruz que busca un lugar para vivir y está a punto de mudarse.</p></div>
    </section>
    <section aria-label="Planes de publicidad" className="advertising-plans">
      {plans.map(plan => <article key={plan.name}>
        <h2>{plan.name}</h2><p className="plan-price">Bs {plan.price}<span>/mes</span></p><p>{plan.description}</p>
        <ul>{plan.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
        <a href={whatsappUrl(`Hola, me interesa el plan ${plan.name} de Zentro Urbano.`)} className="zu-button zu-button-secondary" target="_blank" rel="noreferrer">Consultar este plan <ArrowUpRight size={16} /></a>
      </article>)}
    </section>
    <p className="advertising-note">Zentro Urbano solo muestra tu anuncio: no presta servicios de mudanza, limpieza ni mantenimiento, y no cobra comisión por los trabajos que consigas. La ubicación, duración y materiales se coordinan contigo antes de publicar. No garantizamos una cantidad de contactos o ventas.</p>
    <section className="advertising-contact">
      <div><ChartNoAxesCombined size={23} /><h2>¿Tienes un negocio para el hogar?</h2><p>Mudanzas, limpieza, mantenimiento, pintura, cerrajería, muebles o electrodomésticos. Escríbenos y vemos juntos qué espacio le conviene a tu negocio.</p></div>
      <div><a href={whatsappUrl(message)} target="_blank" rel="noreferrer"><MessageCircle size={17} />{siteConfig.phoneDisplay}</a><a href={`mailto:${siteConfig.email}`}><Mail size={17} />{siteConfig.email}</a></div>
    </section>
  </main>;
}
