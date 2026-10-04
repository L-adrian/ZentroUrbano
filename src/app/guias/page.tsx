import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { guides } from "@/lib/guides";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({ title: "Guías para alquilar", description: "Guías cortas para alquilar en Santa Cruz: qué revisar en la visita, qué confirmar antes de firmar y el recibo de la garantía.", path: "/guias" });

export default function GuidesPage() {
  return <main id="contenido" className="zu-container help-page">
    <p className="zu-eyebrow"><BookOpen size={16} /> GUÍAS</p>
    <h1>Alquilar sin sorpresas.</h1>
    <p>Listas cortas para la visita, el contrato y la garantía. Son consejos generales, no asesoría legal.</p>
    <ul className="guide-list">
      {guides.map((guide) => <li key={guide.slug}><Link href={`/guias/${guide.slug}`}><h2>{guide.title}</h2><p>{guide.description}</p><span>Leer la guía <ArrowRight size={15} aria-hidden="true" /></span></Link></li>)}
    </ul>
  </main>;
}
