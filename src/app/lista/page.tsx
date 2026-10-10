/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck, Coins, Eye, FileText, KeyRound, MessageCircle, Printer, Search } from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";
import { listaSections, listaTotal } from "@/lib/lista";
import { absoluteUrl } from "@/lib/site";
import { Checklist, DownloadButton, ShareButton } from "./lista-client";
import "./lista.css";

export const metadata: Metadata = buildSeoMetadata({
  title: "Lista gratis para revisar un depa antes de alquilar",
  description: `${listaTotal} puntos para revisar en la visita: humedad, fugas, luz, ventanas, la zona y lo que tenés que dejar por escrito. Descargá el PDF gratis, sin registrarte.`,
  path: "/lista",
  image: "/lista/og-lista.jpg",
  imageAlt: "Lista para revisar un depa antes de alquilar, PDF gratis de Zentro Urbano",
  type: "article",
  keywords: ["revisar departamento antes de alquilar", "checklist alquiler", "qué revisar al alquilar Santa Cruz", "lista visita departamento"],
});

const steps = [
  { icon: Printer, title: "Descargala o imprimila", text: "Son 2 páginas. Guardala en el celular o imprimila para marcar con lapicero." },
  { icon: ClipboardCheck, title: "Llevala a la visita", text: "Revisá cada punto en el depa. Llevá una canica, unas gotas de café, una hoja de papel y tu cargador." },
  { icon: MessageCircle, title: "Preguntá antes de firmar", text: "Si algo falla, preguntale al dueño o pedí que lo arregle. Lo que te prometa, que quede por escrito." },
];

const tricks = [
  { name: "La hoja de papel", text: "en la ventana te dice si está bien sellada." },
  { name: "El café en el inodoro", text: "te muestra si hay una fuga que vas a pagar vos." },
  { name: "La canica", text: "te dice si el piso está desnivelado y hacia dónde escurre." },
  { name: "La videollamada", text: "en cada cuarto te muestra dónde llega la señal." },
];

export default function ListaPage() {
  const shareUrl = absoluteUrl("/lista");
  return <main id="contenido" className="zu-container lst">
    <section className="lst-hero">
      <div>
        <p className="eyebrow"><FileText size={17} />Gratis · PDF de 2 páginas</p>
        <h1>La lista para revisar un depa antes de alquilar</h1>
        <p className="lead">Son {listaTotal} cosas que casi nadie revisa en la visita y que después cuestan plata: humedad, fugas, la luz, las ventanas, la zona y lo que tiene que quedar por escrito. Cada punto se revisa en un minuto, sin herramientas ni conocimientos.</p>
        <div className="lst-actions">
          <DownloadButton from="arriba" />
          <a className="btn" href="#lista"><Eye size={18} />Verla acá</a>
        </div>
        <p className="lst-fine">Sin registro y sin dar tu correo. Es la misma lista que mandamos a quienes comentan LISTA en nuestros videos.</p>
      </div>
      <div className="lst-pages" aria-hidden="true">
        <img src="/lista/pagina-2.jpg" alt="" width={640} height={905} />
        <img src="/lista/pagina-1.jpg" alt="" width={640} height={905} />
      </div>
    </section>

    <section className="lst-block">
      <h2>Cómo se usa</h2>
      <ol className="lst-steps">
        {steps.map(({ icon: Glyph, title, text }, index) => <li key={title}>
          <span className="num">{index + 1}</span>
          <Glyph size={22} aria-hidden="true" />
          <h3>{title}</h3>
          <p>{text}</p>
        </li>)}
      </ol>
    </section>

    <section className="lst-block">
      <h2>Qué vas a revisar</h2>
      <p className="lst-sub">La lista está ordenada por temas, para que la sigas mientras recorrés el depa.</p>
      <div className="lst-topics">
        {listaSections.map(section => <a key={section.title} href="#lista"><strong>{section.items.length}</strong>{section.title}</a>)}
      </div>
      <div className="lst-tricks">
        <h3>Algunos trucos que vas a encontrar</h3>
        <ul>{tricks.map(trick => <li key={trick.name}><BadgeCheck size={18} aria-hidden="true" /><span><strong>{trick.name}</strong> {trick.text}</span></li>)}</ul>
      </div>
    </section>

    <section className="lst-block" id="lista">
      <div className="lst-list-head">
        <div>
          <h2>La lista completa</h2>
          <p className="lst-sub">Podés marcar cada punto acá mismo con el celular durante la visita. Las marcas se quedan guardadas solo en tu teléfono.</p>
        </div>
        <DownloadButton from="lista" className="btn" />
      </div>
      <Checklist />
    </section>

    <section className="lst-zu">
      <div>
        <p className="eyebrow"><KeyRound size={17} />Quiénes somos</p>
        <h2>Alquilá tratando directo con el dueño</h2>
        <p>Zentro Urbano es una página de alquileres en Santa Cruz de la Sierra. Cada anuncio muestra el precio, las expensas y la garantía antes de que llames, y hablás directo con el dueño por WhatsApp, sin pagar comisión.</p>
        <ul>
          <li><Coins size={18} aria-hidden="true" />Sin comisión para quien alquila</li>
          <li><Search size={18} aria-hidden="true" />Precio, expensas y garantía a la vista</li>
          <li><MessageCircle size={18} aria-hidden="true" />Contacto directo con el dueño</li>
        </ul>
      </div>
      <div className="lst-zu-cta">
        <Link className="btn pri" href="/propiedades">Ver alquileres en Santa Cruz <ArrowRight size={18} /></Link>
        <Link className="btn" href="/publicar">¿Sos dueño? Publicá gratis <ArrowRight size={18} /></Link>
      </div>
    </section>

    <section className="lst-end">
      <h2>¿Conocés a alguien que esté buscando depa?</h2>
      <p>Mandale la lista. Le puede ahorrar un mal contrato.</p>
      <div className="lst-actions">
        <ShareButton url={shareUrl} />
        <DownloadButton from="abajo" className="btn" />
      </div>
    </section>
  </main>;
}
