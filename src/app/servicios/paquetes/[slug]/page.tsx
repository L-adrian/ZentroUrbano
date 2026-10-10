/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle, ShieldCheck, Tag } from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";
import { formatBob, formatUsd, getPackage, getService, packageValue, servicePackages, servicesUsdRate } from "@/lib/services";
import { whatsappUrl } from "@/lib/site";
import { ArrowLeft, Check, Gains, Icon, PackageGrid, Steps, serviceHref } from "../../components";

type Props = { params: Promise<{ slug: string }> };

const steps: [string, string][] = [
  ["Nos escribes", "Por WhatsApp, con la dirección y el paquete que te interesa."],
  ["Coordinamos", "Te confirmamos por escrito qué incluye y cuándo empezamos."],
  ["Empezamos", "Publicamos tu anuncio y te vamos contando cómo avanza."],
];
const tenantSteps: [string, string][] = [
  ["Nos escribes", "Por WhatsApp, con lo que buscas y el paquete que te interesa."],
  ["Coordinamos", "Te confirmamos por escrito qué incluye y las fechas."],
  ["Empezamos", "Te acompañamos en cada paso hasta que entras a vivir."],
];

export function generateStaticParams() {
  return servicePackages.map(pkg => ({ slug: pkg.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pkg = getPackage((await params).slug);
  if (!pkg) return {};
  return buildSeoMetadata({ title: `Paquete ${pkg.title}`, description: pkg.summary, path: `/servicios/paquetes/${pkg.slug}` });
}

export default async function PackagePage({ params }: Props) {
  const pkg = getPackage((await params).slug);
  if (!pkg) notFound();
  const tenant = pkg.audience === "tenant";
  const value = packageValue(pkg);
  const related = servicePackages.filter(other => other.slug !== pkg.slug && other.audience === pkg.audience).slice(0, 3);
  const order = whatsappUrl(`Hola, me interesa el paquete ${pkg.title} (${pkg.upfront ? `${formatBob(pkg.upfront)} + ${formatBob(pkg.onSuccess ?? 0)}` : formatBob(pkg.price)}) de Zentro Urbano.`);
  const backHref = tenant ? "/servicios/inquilinos" : "/servicios";
  return <>
    <nav className="crumb" aria-label="Ruta">
      <Link href={backHref}><ArrowLeft size={18} />{tenant ? "Para inquilinos" : "Paquetes"}</Link><span>/</span><span>{pkg.title}</span>
    </nav>
    <div className="hero">
      <img src={pkg.image} alt="" />
      <div className="ht"><span className="pc-g" style={{ background: pkg.accent }}>{pkg.goal}</span><h1 style={{ marginTop: 12 }}>{pkg.title}</h1><p>{pkg.summary}</p></div>
    </div>
    <div className="dl">
      <div>
        <Gains gains={pkg.gains} saving={pkg.upfront ? 0 : value - pkg.price} />
        <section className="sec">
          <h2>Qué incluye</h2>
          <div className="incl">
            {pkg.items.map(entry => {
              const service = getService(entry.service);
              return <Link key={entry.label} className="inc-row" href={serviceHref(entry.service)}>
                <span className="ico-s">{service && <Icon name={service.icon} />}</span>
                <span className="inc-t">{entry.label}</span>
                <span className="inc-v">{entry.value ? formatBob(entry.value) : "Incluido"}</span>
              </Link>;
            })}
            <div className="inc-tot"><span>Por separado</span><s>{formatBob(value)}</s></div>
            <div className="inc-tot big"><span>Con el paquete</span><strong>{pkg.upfront ? `${formatBob(pkg.upfront)} + ${formatBob(pkg.onSuccess ?? 0)}` : formatBob(pkg.price)}</strong></div>
          </div>
        </section>
        <section className="sec">
          <h2>Condiciones</h2>
          <ul className="checks one">
            {pkg.conditions.map(condition => <li key={condition}><Check size={18} />{condition}</li>)}
            <li><Check size={18} />{tenant ? "Buscar y contactar dueños sigue siendo gratis." : "Sin comisión ni porcentaje de tu alquiler."}</li>
          </ul>
        </section>
        <Steps steps={tenant ? tenantSteps : steps} />
      </div>
      <aside className="buy">
        <div className="lab">Precio del paquete</div>
        {pkg.upfront ? <>
          <div className="paysteps">
            <div><span>1</span><div><small>Al empezar</small><strong>{formatBob(pkg.upfront)}</strong></div></div>
            <div><span>2</span><div><small>Cuando firmas con tu inquilino</small><strong>{formatBob(pkg.onSuccess ?? 0)}</strong></div></div>
          </div>
          <div className="usd">Si no se alquila, no pagas nada más.</div>
        </> : <div className="amt"><strong>{formatBob(pkg.price)}</strong><span>pago único</span></div>}
        <div className="usd">≈ {formatUsd(pkg.price)} · TC {servicesUsdRate}</div>
        {pkg.upfront
          ? <div className="save-box"><ShieldCheck size={18} />Sin riesgo: el saldo se paga solo si se alquila</div>
          : <div className="save-box"><Tag size={18} />Ahorras {formatBob(value - pkg.price)} frente a contratar cada servicio por separado</div>}
        <ul className="facts">
          <li><MapPin size={18} />Santa Cruz de la Sierra</li>
          <li><ShieldCheck size={18} />{tenant ? "Buscar siempre es gratis" : "Sin comisión sobre tu alquiler"}</li>
        </ul>
        <a className="btn wa" href={order} target="_blank" rel="noreferrer"><MessageCircle size={18} />Pedir este paquete</a>
        <Link className="btn" href={backHref}>Ver otros paquetes</Link>
        <p className="fine">Te confirmamos el precio final antes de empezar. Atendemos de 08:00 a 00:00.</p>
      </aside>
    </div>
    <section className="related sec" style={{ marginBottom: 70 }}>
      <h2>Otros paquetes</h2>
      <PackageGrid className={related.length < 3 ? "pcgrid two" : "pcgrid"} packages={related} />
    </section>
    <div className="mbar">
      <div className="p">{pkg.upfront ? "Para empezar" : "Paquete"}<strong>{formatBob(pkg.upfront ?? pkg.price)}</strong></div>
      <a className="btn wa" href={order} target="_blank" rel="noreferrer"><MessageCircle size={18} />Pedir</a>
    </div>
  </>;
}
