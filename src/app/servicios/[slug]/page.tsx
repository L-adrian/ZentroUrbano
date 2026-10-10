/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { getService, services } from "@/lib/services";
import { ArrowLeft, Check, Gains, Icon, ServiceCard, Steps } from "../components";
import { ServicePriceBox } from "../price-box";

type Props = { params: Promise<{ slug: string }> };

const defaultSteps: [string, string][] = [
  ["Nos escribes", "Por WhatsApp, con la dirección y lo que necesitas."],
  ["Coordinamos", "Te confirmamos el precio final y el día."],
  ["Lo hacemos", "Pagas al terminar y te enviamos el resultado."],
];

const available = services.filter(service => !service.comingSoon);

export function generateStaticParams() {
  return available.map(service => ({ slug: service.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = getService((await params).slug);
  if (!service) return {};
  return buildSeoMetadata({ title: service.title, description: service.summary, path: `/servicios/${service.slug}` });
}

export default async function ServicePage({ params }: Props) {
  const service = getService((await params).slug);
  if (!service || service.comingSoon) notFound();
  const tenant = service.audience === "tenant";
  const pool = available.filter(other => other.audience === service.audience && other.slug !== service.slug);
  const related = [...pool.filter(other => other.category === service.category), ...pool.filter(other => other.category !== service.category)].slice(0, 3);
  return <>
    <nav className="crumb" aria-label="Ruta">
      {tenant ? <Link href="/servicios/inquilinos"><ArrowLeft size={18} />Para inquilinos</Link> : <Link href="/servicios/individuales"><ArrowLeft size={18} />Servicios individuales</Link>}
      <span>/</span><span>{service.title}</span>
    </nav>
    <div className="hero">
      <img src={service.image} alt="" />
      <div className="ht"><div className="ico"><Icon name={service.icon} size={21} /></div><h1>{service.title}</h1><p>{service.summary}</p></div>
    </div>
    <div className="dl">
      <div>
        <section className="sec"><h2>Qué es</h2><p>{service.description}</p></section>
        <Gains gains={service.gains} />
        <section className="sec"><h2>Qué incluye</h2><ul className="checks">{service.includes.map(entry => <li key={entry}><Check size={18} />{entry}</li>)}</ul></section>
        <Steps steps={service.steps ?? defaultSteps} />
        <section className="sec">
          <h2>Preguntas frecuentes</h2>
          {service.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
          {!service.faq.some(([question]) => question.includes("comisión")) && <details><summary>¿Cobran comisión si alquilo?</summary><p>No. Solo pagas el precio fijo de este servicio.</p></details>}
        </section>
      </div>
      <ServicePriceBox title={service.title} unit={service.unit} timing={service.timing} options={service.options}
        backHref={tenant ? "/servicios/inquilinos" : "/servicios/individuales"} backLabel="Ver otros servicios" />
    </div>
    <section className="related sec" style={{ marginBottom: 70 }}>
      <h2>Otros servicios</h2>
      <div className="grid">{related.map(other => <ServiceCard key={other.slug} service={other} />)}</div>
    </section>
  </>;
}
