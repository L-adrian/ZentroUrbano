/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Box, Camera, Check, ClipboardList, Clock, Coins, FileText, KeyRound, MapPin, Megaphone,
  MessageCircle, PenLine, ShieldCheck, Star, Tag, UserRound, type LucideIcon,
} from "lucide-react";
import {
  formatBob, getService, packageValue, type Gain, type Service, type ServiceIcon, type ServicePackage,
} from "@/lib/services";

const icons: Record<ServiceIcon, LucideIcon> = {
  camera: Camera, pen: PenLine, cube: Box, megaphone: Megaphone, star: Star, key: KeyRound, user: UserRound, file: FileText,
  clipboard: ClipboardList, shield: ShieldCheck, pin: MapPin, tag: Tag, coins: Coins, clock: Clock, whatsapp: MessageCircle,
};

export function Icon({ name, size = 18 }: { name: ServiceIcon; size?: number }) {
  const Glyph = icons[name];
  return <Glyph size={size} aria-hidden="true" />;
}

export { ArrowLeft, ArrowRight, Check };

export const serviceHref = (slug: string) => `/servicios/${slug}`;
export const packageHref = (slug: string) => `/servicios/paquetes/${slug}`;

export function AudienceSwitch({ active }: { active: "owner" | "tenant" }) {
  return <div className="aud">
    <Link className={active === "owner" ? "on" : ""} href="/servicios" aria-current={active === "owner" ? "page" : undefined}><KeyRound size={18} />Soy propietario</Link>
    <Link className={active === "tenant" ? "on" : ""} href="/servicios/inquilinos" aria-current={active === "tenant" ? "page" : undefined}><UserRound size={18} />Busco alquiler</Link>
  </div>;
}

export function OwnerHeading({ view }: { view: "packages" | "services" }) {
  return <>
    <AudienceSwitch active="owner" />
    <p className="eyebrow" style={{ marginTop: 26 }}><Star size={18} />Servicios para propietarios</p>
    <h1>Lo que hace una inmobiliaria, sin comisión</h1>
    <p className="lead">Publicar en Zentro Urbano sigue siendo gratis. Si quieres ayuda, elige un paquete o solo el servicio que necesitas, con precio fijo. Nunca cobramos un porcentaje de tu alquiler.</p>
    <nav className="seg" aria-label="Tipo de servicio">
      <Link className={view === "packages" ? "on" : ""} href="/servicios"><Tag size={18} />Paquetes</Link>
      <Link className={view === "services" ? "on" : ""} href="/servicios/individuales"><Check size={18} />Servicios individuales</Link>
    </nav>
  </>;
}

export function FilterTabs({ options, active, param, path }: { options: string[]; active: string; param: string; path: string }) {
  return <nav className="tabs" aria-label="Filtrar">
    {["Todos", ...options].map(option => {
      const href = option === "Todos" ? path : `${path}?${param}=${encodeURIComponent(option)}`;
      return <Link key={option} href={href} scroll={false} className={`tab${option === active ? " on" : ""}`} aria-current={option === active ? "true" : undefined}>{option}</Link>;
    })}
  </nav>;
}

export function ServiceCard({ service }: { service: Service }) {
  const photo = <div className="ph">
    <img src={service.image} alt="" loading="lazy" />
    <div className="ico"><Icon name={service.icon} size={21} /></div>
    {service.comingSoon ? <span className="tag-or">Próximamente</span>
      : service.featured ? <span className="tag-or">★ Destacado</span>
        : <span className="cat">{service.category}</span>}
    {!service.comingSoon && <div className="price">{service.fromPrice ? "desde" : ""}<strong>{formatBob(service.price)}</strong><small>{service.fromPrice ? "" : service.unit}</small></div>}
  </div>;
  if (service.comingSoon) return <div className="card soon">
    {photo}
    <div className="cb"><h3>{service.title}</h3><p>{service.summary}</p><span className="more" style={{ color: "var(--s-muted)" }}>Muy pronto</span></div>
  </div>;
  return <Link className="card" href={serviceHref(service.slug)}>
    {photo}
    <div className="cb"><h3>{service.title}</h3><p>{service.summary}</p><span className="more">Ver detalle <ArrowRight size={18} /></span></div>
  </Link>;
}

function PackageIcons({ pkg }: { pkg: ServicePackage }) {
  const unique = [...new Set(pkg.items.map(entry => entry.service))];
  return <div className="pc-icons">
    {unique.map(slug => {
      const service = getService(slug);
      return service && <span key={slug} className="ic-chip" title={service.title}><Icon name={service.icon} size={16} /></span>;
    })}
    <span className="pc-n">{pkg.items.length} servicios</span>
  </div>;
}

export function SplitPrice({ pkg }: { pkg: ServicePackage }) {
  return <span className="split"><b>{formatBob(pkg.upfront ?? 0)}</b> al empezar <i>+</i> <b>{formatBob(pkg.onSuccess ?? 0)}</b> al alquilar</span>;
}

export function PackageCard({ pkg, wide = false, half = false }: { pkg: ServicePackage; wide?: boolean; half?: boolean }) {
  const value = packageValue(pkg);
  return <Link className={`pc${wide ? " wide" : half ? " half" : ""}`} href={packageHref(pkg.slug)} style={{ "--ac": pkg.accent } as CSSProperties}>
    <div className="pc-ph">
      <img src={pkg.image} alt="" loading="lazy" />
      <span className="pc-save">Ahorras {formatBob(value - pkg.price)}</span>
      {pkg.gift && <span className="pc-gift"><Star size={13} />{pkg.gift}</span>}
      <div className="pc-tt"><span className="pc-g">{pkg.goal}</span><h3>{pkg.title}</h3></div>
    </div>
    <div className="pc-b">
      <p>{pkg.summary}</p>
      {wide && <ul className="pc-list">{pkg.items.map(entry => <li key={entry.label}><Check size={16} />{entry.label}</li>)}</ul>}
      <PackageIcons pkg={pkg} />
      <div className="pc-ft">
        <div>{pkg.upfront ? <SplitPrice pkg={pkg} /> : <><s>{formatBob(value)}</s><strong>{formatBob(pkg.price)}</strong></>}</div>
        <span className="more">Ver paquete <ArrowRight size={18} /></span>
      </div>
    </div>
  </Link>;
}

// Packs in a 3-column grid: a lone last card spans the full row, and a last pair splits it in halves.
export function PackageGrid({ packages, className = "pcgrid" }: { packages: ServicePackage[]; className?: string }) {
  return <div className={className}>
    {packages.map((pkg, index) => {
      const rest = className === "pcgrid" ? packages.length % 3 : 0;
      const inLastRow = index >= packages.length - rest;
      return <PackageCard key={pkg.slug} pkg={pkg} wide={rest === 1 && inLastRow} half={rest === 2 && inLastRow} />;
    })}
  </div>;
}

export function HeroPackage({ pkg }: { pkg: ServicePackage }) {
  return <Link className="ph-hero" href={packageHref(pkg.slug)}>
    <div className="phh-im"><img src={pkg.image} alt="" /><span className="pk-badge">Sin riesgo</span></div>
    <div className="phh-tx">
      <p className="eyebrow"><ShieldCheck size={18} />Si no se alquila, no pagas más</p>
      <h2>{pkg.title}</h2>
      <p>{pkg.summary}</p>
      <ul>{pkg.items.slice(0, 6).map(entry => {
        const service = getService(entry.service);
        return <li key={entry.label}>{service && <Icon name={service.icon} size={17} />}{entry.label}</li>;
      })}</ul>
      <div className="phh-ft">
        <div className="phh-pr two">
          <div><small>Hoy</small><strong>{formatBob(pkg.upfront ?? 0)}</strong></div>
          <span className="plus">+</span>
          <div><small>Cuando se alquila</small><strong>{formatBob(pkg.onSuccess ?? 0)}</strong></div>
        </div>
        <span className="btn wa">Ver paquete <ArrowRight size={18} /></span>
      </div>
    </div>
  </Link>;
}

export function Gains({ gains, saving = 0 }: { gains: Gain[]; saving?: number }) {
  if (!gains.length && !saving) return null;
  return <section className="sec gains">
    <h2>Lo que ganas</h2>
    <div className="gl">
      {saving > 0 && <div className="gi hi"><span><Tag size={18} /></span><b>Ahorras {formatBob(saving)}</b><p>Frente a contratar cada servicio por separado.</p></div>}
      {gains.map(gain => <div key={gain.title} className="gi"><span><Icon name={gain.icon} /></span><b>{gain.title}</b><p>{gain.text}</p></div>)}
    </div>
  </section>;
}

export function Steps({ steps }: { steps: [string, string][] }) {
  return <section className="sec">
    <h2>Cómo funciona</h2>
    <div className="steps">{steps.map(([title, text], index) => <div key={title} className="step"><b>{index + 1}</b><h3 className="step-title">{title}</h3><p>{text}</p></div>)}</div>
  </section>;
}

export function CompareAgency() {
  return <>
    <section className="compare">
      <div><h2 className="compare-title"><Coins size={18} />Con una inmobiliaria</h2><p>Suele cobrarse un mes de alquiler como comisión. En un alquiler de Bs 3.500:</p><div className="big">Bs 3.500</div></div>
      <div className="good"><h2 className="compare-title"><Check size={18} />Con Zentro Urbano</h2><p>Pagas solo si se alquila, con precio fijo:</p><div className="big">Bs 490</div></div>
    </section>
    <p className="note">Precios en bolivianos. Te confirmamos el precio final por WhatsApp antes de empezar. Zentro Urbano no cobra comisión ni porcentaje del alquiler, y no garantiza que la vivienda se alquile en un plazo determinado.</p>
  </>;
}
