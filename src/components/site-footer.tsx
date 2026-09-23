import Link from "next/link";
import { ChevronDown, House, MapPin } from "lucide-react";

const groups = [
  { title: "Encuentra tu lugar", links: [["Explorar alquileres", "/propiedades"], ["Casas", "/propiedades?type=Casa"], ["Departamentos", "/propiedades?type=Departamento"], ["Buscar en el mapa", "/mapa"]] },
  { title: "Para propietarios", links: [["Publicar mi vivienda", "/publicar"], ["Mi cuenta", "/cliente"]] },
  { title: "Ayuda", links: [["Conoce Zentro Urbano", "/bienvenida"], ["Centro de ayuda", "/ayuda"], ["Preguntas frecuentes", "/preguntas-frecuentes"], ["Contáctanos", "/contacto"], ["Seguridad y reportes", "/seguridad"]] },
];
export function SiteFooter() {
  return <footer className="zu-footer professional-footer">
    <div className="zu-container footer-directory">
      <div className="footer-brand"><Link href="/" className="zu-logo"><House size={23} /><span>Zentro<span className="logo-accent">Urbano</span></span></Link><p>Tu próximo lugar.<br />Directo con su propietario.</p><span className="footer-location"><MapPin size={14} /> Santa Cruz, Bolivia</span></div>
      {groups.map(group => <nav className="footer-desktop-group" key={group.title} aria-label={group.title}><h2>{group.title}</h2>{group.links.map(([title, href]) => <Link href={href} key={href}>{title}</Link>)}</nav>)}
      <div className="footer-mobile-groups">
        {groups.map(group => <details className="footer-mobile-group" key={group.title}>
          <summary>{group.title}<ChevronDown size={17} aria-hidden="true" /></summary>
          <nav aria-label={group.title}>{group.links.map(([title, href]) => <Link href={href} key={href}>{title}</Link>)}</nav>
        </details>)}
      </div>
    </div>
    <div className="zu-container footer-bottom"><span>© {new Date().getFullYear()} Zentro Urbano</span><nav aria-label="Información legal"><Link href="/terminos">Términos y condiciones</Link><Link href="/privacidad">Política de privacidad</Link></nav></div>
  </footer>;
}
