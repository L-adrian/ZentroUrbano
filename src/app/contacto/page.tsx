import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle, Plus, Search } from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";
import { siteConfig, whatsappUrl } from "@/lib/site";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";

export const metadata: Metadata = buildSeoMetadata({ title: "Contacto y ayuda", description: "Ayuda para buscar o publicar alquileres directos en Zentro Urbano.", path: "/contacto" });
export default function ContactPage() {
  return <main id="contenido" className="zu-container support-page">
    <p className="zu-eyebrow">ESTAMOS PARA AYUDARTE</p><h1>Hablemos de tu próximo paso.</h1><p>Consultas sobre tu cuenta, publicaciones y servicios de Zentro Urbano.</p>
    <div className="mt-6"><SupportWhatsAppButton showPhone /></div>
    <div className="support-links">
      <a href={whatsappUrl("Hola, necesito ayuda con Zentro Urbano.")} target="_blank" rel="noreferrer"><MessageCircle size={23} /><div><h2>Escríbenos por WhatsApp</h2><p>{siteConfig.phoneDisplay}</p></div><ArrowUpRight size={19} /></a>
      <a href={`mailto:${siteConfig.email}`}><Mail size={23} /><div><h2>Envíanos un correo</h2><p>{siteConfig.email}</p></div><ArrowUpRight size={19} /></a>
      <Link href="/publicar"><Plus size={23} /><div><h2>Quiero publicar mi vivienda</h2><p>Fotos, información y contacto del propietario.</p></div><ArrowUpRight size={19} /></Link>
      <Link href="/propiedades"><Search size={23} /><div><h2>Estoy buscando alquiler</h2><p>Compara viviendas y habla directamente con su propietario.</p></div><ArrowUpRight size={19} /></Link>
    </div>
  </main>;
}
