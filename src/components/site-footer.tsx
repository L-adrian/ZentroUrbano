import Link from "next/link";
import { House, MapPin, Mail } from "lucide-react";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { siteConfig } from "@/lib/site";

const groups = [
  { title: "Encuentra tu lugar", links: [["Explorar alquileres", "/propiedades"], ["Casas", "/propiedades?type=Casa"], ["Departamentos", "/propiedades?type=Departamento"], ["Buscar en el mapa", "/mapa"]] },
  { title: "Para propietarios", links: [["Publicar mi vivienda", "/publicar"], ["Mi cuenta", "/cliente"]] },
  { title: "Ayuda", links: [["Conoce Zentro Urbano", "/bienvenida"], ["Centro de ayuda", "/ayuda"], ["Preguntas frecuentes", "/preguntas-frecuentes"], ["Contáctanos", "/contacto"], ["Seguridad y reportes", "/seguridad"]] },
  { title: "Información legal", links: [["Términos y condiciones", "/terminos"], ["Política de privacidad", "/privacidad"]] },
];
export function SiteFooter() {
  return <footer className="zu-footer professional-footer">
    <div className="zu-container footer-directory">
      <div className="footer-brand"><Link href="/" className="zu-logo"><House size={23} /><span>Zentro<span className="logo-accent">Urbano</span></span></Link><p>Tu próximo lugar.<br />Directo con su propietario.</p><span className="footer-location"><MapPin size={14} /> Santa Cruz, Bolivia</span></div>
      {groups.map(group => <nav key={group.title} aria-label={group.title}><h2>{group.title}</h2>{group.links.map(([title, href]) => <Link href={href} key={href}>{title}</Link>)}</nav>)}
    </div>
    <div className="zu-container footer-assistance"><div><h2>¿Necesitas una mano?</h2><p>Ayuda con tu cuenta, tu publicación o un reporte.</p></div><SupportWhatsAppButton showPhone /><a className="footer-email" href={`mailto:${siteConfig.email}`}><Mail size={17} />{siteConfig.email}</a></div>
    <div className="zu-container footer-bottom"><span>© {new Date().getFullYear()} Zentro Urbano</span><span>Alquileres directos. Sin intermediarios.</span><Link href="/seguridad">Alquila con información, decide con tranquilidad.</Link></div>
  </footer>;
}
