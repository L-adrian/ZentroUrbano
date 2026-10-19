import { ArrowRight, Hourglass, KeyRound, MessageCircle, PaintRoller, Sofa, SprayCan, Truck, Wifi } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buildSeoMetadata } from "@/lib/seo";
import { whatsappUrl } from "@/lib/site";

export const metadata: Metadata = buildSeoMetadata({
  title: "Mudanza y hogar",
  description: "Negocios de mudanzas, muebles, limpieza y arreglos para tu nuevo hogar en Bolivia. Hablas directo con cada negocio por WhatsApp, sin comisión.",
  path: "/mudanza-y-hogar",
});

const categories = [
  { name: "Mudanzas y fletes", description: "Camiones, cargadores y embalaje para llevar tus cosas.", icon: Truck },
  { name: "Muebles y electrodomésticos", description: "Para equipar tu nuevo lugar desde el primer día.", icon: Sofa },
  { name: "Limpieza", description: "Limpieza antes de entrar o al dejar la vivienda.", icon: SprayCan },
  { name: "Pintura y arreglos", description: "Pintores, plomeros y electricistas para dejarlo a punto.", icon: PaintRoller },
  { name: "Cerrajería", description: "Cambio de chapas y copias de llaves al mudarte.", icon: KeyRound },
  { name: "Internet y cable", description: "Instalación de internet y TV en tu nueva dirección.", icon: Wifi },
];

export default function HomeServicesPage() {
  return <main id="contenido" className="zu-container home-services-page">
    <header className="home-services-heading">
      <p className="zu-eyebrow"><Truck size={15} /> MUDANZA Y HOGAR</p>
      <h1>Todo para tu mudanza y tu nuevo hogar</h1>
      <p>Negocios de mudanzas, muebles, limpieza y arreglos. Hablas directo con cada negocio por WhatsApp: Zentro Urbano no cobra comisión ni intermedia en el trabajo.</p>
    </header>
    <section aria-label="Categorías" className="home-services-grid">
      {categories.map(({ name, description, icon: Icon }) => <article key={name}>
        <span className="home-services-icon"><Icon size={24} strokeWidth={1.8} /></span>
        <h2>{name}</h2>
        <p>{description}</p>
        <span className="home-services-soon"><Hourglass size={13} /> Pronto</span>
      </article>)}
    </section>
    <p className="home-services-note">Estamos sumando los primeros negocios. Cada negocio que aparezca aquí es un anuncio: Zentro Urbano no presta estos servicios y no cobra comisión por los trabajos que contrates.</p>
    <section className="home-services-cta">
      <div><h2>¿Tienes un negocio para el hogar?</h2><p>Aparece aquí frente a personas que se están mudando, con un espacio mensual fijo y sin comisión por trabajo.</p></div>
      <div>
        <Link href="/publicidad" className="zu-button zu-button-primary">Ver planes <ArrowRight size={16} /></Link>
        <a href={whatsappUrl("Hola, quiero aparecer en Mudanza y hogar de Zentro Urbano.")} className="zu-button zu-button-secondary" target="_blank" rel="noreferrer"><MessageCircle size={16} /> Escribirnos</a>
      </div>
    </section>
  </main>;
}
