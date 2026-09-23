import Link from "next/link";
import { ArrowUpRight, CircleHelp, HousePlus, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({ title: "Centro de ayuda", description: "Ayuda para tu cuenta, publicación de alquileres, visitas y reportes de anuncios en Zentro Urbano.", path: "/ayuda" });
const topics = [
  { icon: UserRound, title: "Mi cuenta", text: "Registro, inicio de sesión y acceso para propietarios.", href: "/login" },
  { icon: HousePlus, title: "Publicar una vivienda", text: "Inicia sesión y envía fotos, precio y condiciones para revisión.", href: "/publicar" },
  { icon: MapPin, title: "Buscar y coordinar una visita", text: "Encuentra un alquiler y contacta directamente con su propietario.", href: "/propiedades" },
  { icon: ShieldCheck, title: "Seguridad y reportes", text: "Precauciones para las visitas y cómo reportar una ficha.", href: "/seguridad" },
  { icon: CircleHelp, title: "Preguntas frecuentes", text: "Respuestas sobre el funcionamiento de Zentro Urbano.", href: "/preguntas-frecuentes" },
];
export default function HelpPage() {
  return <main id="contenido" className="zu-container help-page"><p className="zu-eyebrow">CENTRO DE AYUDA</p><h1>¿En qué podemos ayudarte?</h1><div className="support-links">{topics.map(({ icon: Icon, ...topic }) => <Link href={topic.href} key={topic.href}><Icon size={23} /><div><h2>{topic.title}</h2><p>{topic.text}</p></div><ArrowUpRight size={18} /></Link>)}</div><section className="help-contact-row"><div><h2>Habla con nuestro equipo</h2><p>Para problemas de acceso o publicación, ten a mano el enlace y una captura del error.</p></div><SupportWhatsAppButton /></section></main>;
}
