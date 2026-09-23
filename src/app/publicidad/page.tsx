import { ArrowUpRight, ChartNoAxesCombined, Check, Mail, Megaphone, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";
import { siteConfig, whatsappUrl } from "@/lib/site";

export const metadata: Metadata = buildSeoMetadata({
  title: "Publicidad de servicios para el hogar",
  description: "Precios y contacto para anunciar servicios de mudanza, limpieza y mantenimiento en Zentro Urbano.",
  path: "/publicidad",
});
const plans = [
  { name: "Banner visible", price: 200, description: "Presencia para servicios de mudanza, limpieza, internet o mantenimiento.", features: ["Imagen y nombre de tu marca", "Enlace a tu servicio", "Medición de impresiones y clics"] },
  { name: "Marca destacada", price: 350, description: "Una presencia más reconocible para tu servicio dentro de la plataforma.", features: ["Todo lo del banner", "Ubicación acordada por campaña", "Reporte básico de clics"] },
  { name: "Campaña premium", price: 560, description: "Una campaña coordinada para promociones o temporadas importantes.", features: ["Planificación de la campaña", "Preparación de imagen y texto", "Reporte semanal"] },
];
const message = "Hola, quiero información para anunciar mi servicio en Zentro Urbano.";

export default function AdvertisingPage() {
  return <main id="contenido" className="zu-container advertising-page">
    <header className="advertising-heading"><p className="zu-eyebrow"><Megaphone size={15} /> SERVICIOS PARA EL HOGAR</p><h1>Publicidad en Zentro Urbano</h1><p>Conecta tu servicio con personas que buscan una vivienda. Consulta los espacios disponibles y elige tu plan.</p></header>
    <section aria-label="Planes de publicidad" className="advertising-plans">
      {plans.map(plan => <article key={plan.name}>
        <h2>{plan.name}</h2><p className="plan-price">Bs {plan.price}<span>/mes</span></p><p>{plan.description}</p>
        <ul>{plan.features.map(feature => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
        <a href={whatsappUrl(`Hola, me interesa el plan ${plan.name} de Zentro Urbano.`)} className="zu-button zu-button-secondary" target="_blank" rel="noreferrer">Consultar disponibilidad <ArrowUpRight size={16} /></a>
      </article>)}
    </section>
    <p className="advertising-note">La ubicación, duración y materiales se coordinan antes de activar una campaña. No se garantizan contactos ni resultados comerciales.</p>
    <section className="advertising-contact">
      <div><ChartNoAxesCombined size={23} /><h2>Hablemos de tu servicio</h2><p>Publicidad para mudanzas, limpieza, mantenimiento y equipamiento del hogar.</p></div>
      <div><a href={whatsappUrl(message)} target="_blank" rel="noreferrer"><MessageCircle size={17} />{siteConfig.phoneDisplay}</a><a href={`mailto:${siteConfig.email}`}><Mail size={17} />{siteConfig.email}</a></div>
    </section>
  </main>;
}
