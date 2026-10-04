import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { getGuide, guides } from "@/lib/guides";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  return guide ? buildSeoMetadata({ title: guide.title, description: guide.description, path: `/guias/${guide.slug}` }) : {};
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const others = guides.filter((item) => item.slug !== guide.slug);
  return <main id="contenido" className="zu-container help-page guide-page">
    <Link href="/guias" className="guide-back"><ArrowLeft size={15} aria-hidden="true" /> Todas las guías</Link>
    <p className="zu-eyebrow"><BookOpen size={16} /> GUÍA</p>
    <h1>{guide.title}</h1>
    <p>{guide.intro}</p>
    {guide.sections.map((section) => <section key={section.title}>
      <h2>{section.title}</h2>
      {section.items ? <ul className="safety-list">{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      {section.text ? <p>{section.text}</p> : null}
    </section>)}
    <p className="guide-note">Esta guía es un consejo general y no reemplaza la asesoría de un abogado. Antes de pagar, revisa también <Link href="/seguridad">las señales de estafa</Link>.</p>
    <nav className="guide-more" aria-label="Otras guías">{others.map((item) => <Link key={item.slug} href={`/guias/${item.slug}`}>{item.title}</Link>)}</nav>
    <SupportWhatsAppButton />
  </main>;
}
