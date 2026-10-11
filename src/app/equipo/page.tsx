import type { Metadata } from "next";
import {
  Ban, Building2, Camera, ChevronDown, Crown, Gift, Handshake, MessageCircle, Search, ShieldCheck, Star, Users, Wallet,
} from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";
import { whatsappUrl } from "@/lib/site";
import { getPackage, getService } from "@/lib/services";
import {
  ambassador, doableServices, featuredMonths, featuredPrice, fieldTasks, formatBs, goalBonus, goalBonuses,
  listingAmount, listingPay, ownerPackages, rates, sellableServices,
} from "@/lib/equipo";
import { Calculator } from "./calculator";
import "./equipo.css";

// Private page: shared by Adrian with new aliados. No links point here and search engines are told to skip it.
export const metadata: Metadata = buildSeoMetadata({
  title: "Programa de aliados",
  description: "Cómo ganar dinero acercando dueños de viviendas a Zentro Urbano.",
  path: "/equipo",
  noIndex: true,
});

const pct = (rate: number) => `${Math.round(rate * 100)}%`;
// "10, 25 o 50"
const joinWords = (items: string[], last: string) => items.length > 1 ? `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}` : items.join("");

const steps = [
  { icon: Search, title: "Encuentra dueños", text: "Gente que tiene una casa, un departamento o un cuarto vacío en Santa Cruz y quiere alquilarlo." },
  { icon: Handshake, title: "Ayúdalos a publicar", text: "Para el dueño es gratis y no paga comisión, así que es fácil decir que sí. Antes de que publique, nos mandas tu código por WhatsApp." },
  { icon: Wallet, title: "Cobra por cada uno", text: "Cuando revisamos el anuncio y queda publicado, ya ganaste. Te pagamos por QR, sin tope: mientras más traigas, más cobras." },
];

// What a normal month (not the first) pays for a few listing counts, bonus included.
const ladder = [5, 10, 25, 50].map(count => ({ count, pay: listingAmount(count, false), bonus: goalBonus(count) }));

const rules = [
  "Cobrarle algo al dueño o al inquilino por tu cuenta. Todo pago va directo a Zentro Urbano.",
  "Decir que eres de una inmobiliaria. Dices: \"trabajo con Zentro Urbano\".",
  "Publicar una vivienda sin permiso del dueño, inventar datos o usar fotos de otros anuncios.",
  "Prometer que se alquila en un plazo. Nadie puede asegurar eso.",
  "Traer viviendas de inmobiliarias o corredores como si fueran de dueños.",
];

// What owners usually ask an aliado, answered the way Zentro wants it said.
const objections = [
  { q: "\"¿Cuánto me cobran?\"", a: "Nada. Publicar es gratis y no hay comisión por alquilar. Si quiere ayuda extra, como fotos o un anuncio destacado, es opcional y tiene precio fijo." },
  { q: "\"¿Y entonces de qué viven?\"", a: "De servicios opcionales para los dueños que los quieren: fotos, recorridos 3D, anuncios destacados y paquetes." },
  { q: "\"¿Quién va a ver mi número?\"", a: "Las personas interesadas en su vivienda, que le escriben directo por WhatsApp. Antes de publicar revisamos cada anuncio." },
];

export default function EquipoPage() {
  const contact = whatsappUrl("Hola Adrian, quiero ser aliado de Zentro Urbano. ¿Cómo empiezo?");
  const topGoal = goalBonuses.at(-1)!;
  const pkg = getPackage("hasta-que-se-alquile");
  const photos = getService("fotos-profesionales");
  const photoSold = (photos?.price ?? 0) * rates.service;
  const photoDone = (photos?.price ?? 0) * rates.serviceDone;
  const packageGain = (pkg?.price ?? 0) * rates.package;
  const featuredGain = featuredPrice * rates.featured;
  const month = (approved: number, extra = 0) => listingAmount(approved, false) + goalBonus(approved) + extra;
  const scenarios = [
    { title: "Peor caso", worst: true, total: 0, text: "No consigues ningún anuncio. No ganas, pero solo pusiste tu tiempo: entrar no cuesta nada y no compras material." },
    { title: "Unas horas por semana", total: month(5), text: "5 anuncios de tus conocidos." },
    { title: "Constante", total: month(15, photoSold), text: `15 anuncios y vendes 1 sesión de fotos. Ya cobras el bono de ${formatBs(goalBonus(15))}.` },
    { title: "Activo", total: month(30, 2 * packageGain + 3 * featuredGain), text: `30 anuncios, 2 paquetes "${pkg?.title ?? ""}" y 3 destacados.` },
    { title: "A lo grande", best: true, total: month(50, 3 * packageGain + 4 * photoDone + 10 * featuredGain), text: "50 anuncios, 3 paquetes, 4 sesiones de fotos hechas por ti y 10 destacados." },
  ];
  const bestTotal = Math.max(...scenarios.map(item => item.total));
  const firstMonthExtra = listingPay.firstMonthFirst * (listingPay.firstMonthAmount - listingPay.regular);

  const faq: { q: string; a: string[] }[] = [
    {
      q: "¿Cuándo cuenta un anuncio?",
      a: [
        "Cuando nuestro equipo lo revisa, lo aprueba y queda publicado. Que el dueño solo se registre no cuenta.",
        "Tiene que ser el dueño directo de la vivienda, no una inmobiliaria ni un corredor. Lo llamamos para confirmarlo antes de aprobar.",
        "El dueño tiene que ser nuevo en Zentro Urbano, y la vivienda tiene que ser real, estar en Santa Cruz y estar disponible.",
        "Antes de que el dueño publique, nos mandas por WhatsApp tu código con su nombre y su número. Así sabemos que vino contigo.",
      ],
    },
    {
      q: `¿Cómo funcionan los ${formatBs(listingPay.firstMonthAmount)} del principio?`,
      a: [
        `Es un bono de bienvenida. Tus primeros ${listingPay.firstMonthFirst} anuncios aprobados se pagan a ${formatBs(listingPay.firstMonthAmount)} en vez de ${formatBs(listingPay.regular)}, si los logras en tus primeros ${listingPay.firstMonthDays} días.`,
        `Ejemplo: en tus primeros ${listingPay.firstMonthDays} días logras 7 anuncios. Los 5 primeros son a ${formatBs(listingPay.firstMonthAmount)} y los otros 2 a ${formatBs(listingPay.regular)}: ${formatBs(listingAmount(7, true))} en total.`,
        `Los ${listingPay.firstMonthDays} días empiezan el día que te damos tu código.`,
      ],
    },
    {
      q: "¿Cómo funciona el bono del mes?",
      a: [
        `Si en un mes llegas a ${joinWords(goalBonuses.map(goal => String(goal.listings)), "o")} anuncios aprobados, te damos ${joinWords(goalBonuses.map(goal => formatBs(goal.bonus)), "o")} extra.`,
        `No se suman: cobras solo el más alto al que llegues. Con 27 anuncios cobras ${formatBs(goalBonus(27))} de bono. Cada mes empieza de cero.`,
      ],
    },
    {
      q: "¿Cuándo y cómo me pagan?",
      a: [
        "Por QR a tu cuenta, con el detalle de lo que cobras por WhatsApp.",
        "Tu primer mes te pagamos cada viernes. Después, los días 1 y 15 de cada mes. Si cae feriado, el siguiente día hábil.",
        "Las comisiones por ventas se pagan cuando el dueño ya le pagó a Zentro Urbano.",
      ],
    },
    {
      q: "Si un dueño publica 3 viviendas, ¿cuántos anuncios son?",
      a: ["Son 3 anuncios. Cada vivienda distinta cuenta por separado."],
    },
    {
      q: "¿Y si dos aliados traen al mismo dueño?",
      a: ["Cuenta el que nos mandó su código primero."],
    },
    {
      q: "¿Qué pasa si un anuncio era falso o el dueño pide su dinero de vuelta?",
      a: [`Si un anuncio se da de baja por datos falsos en sus primeros ${listingPay.clawbackDays} días, o un dueño pide que le devolvamos lo que pagó, ese pago se descuenta de tu siguiente cobro.`],
    },
    {
      q: "¿Tengo que pagar algo o tener experiencia?",
      a: ["No. Empezar no cuesta nada y no necesitas comprar material. Te damos tu código personal (por ejemplo ZR-JUAN), mensajes listos para WhatsApp y una charla corta por videollamada para empezar."],
    },
    {
      q: "¿Qué es ser Embajador?",
      a: [
        `Cuando llegas a ${ambassador.listings} anuncios aprobados y ${ambassador.sales} ventas, subes a Embajador.`,
        `Tus comisiones por ventas suben 5 puntos (paquetes al ${pct(rates.package + rates.ambassadorExtra)}, servicios al ${pct(rates.service + rates.ambassadorExtra)}, destacados al ${pct(rates.featured + rates.ambassadorExtra)}) y ganas ${formatBs(ambassador.referralBonus)} por cada aliado nuevo que traigas, una sola vez, cuando ese aliado llegue a ${ambassador.referralListings} anuncios aprobados.`,
      ],
    },
    {
      q: "¿Los montos pueden cambiar?",
      a: ["Es un programa piloto. Si cambia algún monto te avisamos antes de que empiece el mes, y nunca cambia lo que ya lograste."],
    },
  ];

  return <main id="contenido" className="eqp">
    <section className="eqp-hero">
      <div className="zu-container eqp-hero-in">
        <p className="eqp-tag"><ShieldCheck size={16} aria-hidden="true" />Invitación privada · Programa de aliados</p>
        <h1>¿Conoces gente que alquila casas o departamentos? <em>Te pagamos por cada uno.</em></h1>
        <p className="eqp-lead">Zentro Urbano es la página de alquileres de Santa Cruz donde el dueño publica gratis y alquila sin pagar comisión. Buscamos personas que consigan muchas viviendas. Tú traes al dueño, nosotros revisamos y publicamos, y tú cobras por cada anuncio. No hay límite.</p>
        <div className="eqp-stats three">
          <div><strong>{formatBs(listingPay.regular)}</strong><span>por cada anuncio aprobado</span></div>
          <div><strong>{formatBs(listingPay.firstMonthAmount)}</strong><span>por cada uno de tus primeros {listingPay.firstMonthFirst}, para que arranques</span></div>
          <div><strong>+{formatBs(topGoal.bonus)}</strong><span>de bono si llegas a {topGoal.listings} anuncios en un mes</span></div>
        </div>
      </div>
    </section>

    <div className="zu-container">
      <section className="eqp-block">
        <p className="eqp-kicker">Cómo funciona</p>
        <h2>Tres pasos.</h2>
        <ol className="eqp-flow three">
          {steps.map(({ icon: Glyph, title, text }, index) => <li key={title}>
            <span className="eqp-flow-n">{index + 1}</span>
            <Glyph size={26} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </li>)}
        </ol>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Cuánto ganas</p>
        <h2>Mientras más anuncios traes, más ganas.</h2>
        <p className="eqp-sub">Cada anuncio aprobado te da {formatBs(listingPay.regular)}. Al llegar a {joinWords(goalBonuses.map(goal => String(goal.listings)), "y")} anuncios en el mes se suma un bono. Esto es lo que cobras en un mes normal:</p>
        <ul className="eqp-steps">
          {ladder.map(row => <li key={row.count} className={row.bonus ? "bonus" : ""}>
            <span className="eqp-steps-n">{row.count} anuncios</span>
            <strong>{formatBs(row.pay + row.bonus)}</strong>
            <small>{row.count} × {formatBs(listingPay.regular)}{row.bonus ? <> + <b>{formatBs(row.bonus)} de bono</b></> : null}</small>
          </li>)}
        </ul>
        <p className="eqp-note">Tu primer mes ganas {formatBs(firstMonthExtra)} más, porque tus primeros {listingPay.firstMonthFirst} anuncios se pagan a {formatBs(listingPay.firstMonthAmount)}.</p>
        <Calculator />
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Del peor al mejor caso</p>
        <h2>Cuánto puedes ganar, siendo honestos.</h2>
        <p className="eqp-sub">No te prometemos un sueldo: ganas por lo que logras. Esto es lo que pasa en un mes según cuánto te muevas.</p>
        <ol className="eqp-scen">{scenarios.map(item => <li key={item.title} className={item.best ? "best" : item.worst ? "worst" : ""} style={{ ["--h" as string]: `${Math.max(4, (item.total / bestTotal) * 100)}%` }}>
          <i aria-hidden="true" />
          <small>{item.title}</small>
          <strong>{formatBs(item.total)}</strong>
          <p>{item.text}</p>
        </li>)}</ol>
        <p className="eqp-note">Cálculo con los montos de esta página, en un mes normal. Las ventas se pagan cuando el dueño ya pagó.</p>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Cómo crecer</p>
        <h2>Empiezas con tus conocidos. Creces cuando sales a buscar.</h2>
        <p className="eqp-sub">Lo que ganas depende de cuántos dueños alcanzas. Así pasan los aliados de unos pocos anuncios a decenas por mes.</p>
        <ol className="eqp-grow">
          <li><span className="eqp-ico"><Users size={22} aria-hidden="true" /></span><small>Nivel 1 · Tu círculo</small><h3>Familia, vecinos y conocidos</h3><p>Todos conocen a alguien con un cuarto, una casa o un depa vacío. Es la forma más rápida de lograr tus primeros {listingPay.firstMonthFirst} anuncios a {formatBs(listingPay.firstMonthAmount)}.</p><b>De 5 a 10 por mes</b></li>
          <li><span className="eqp-ico"><Building2 size={22} aria-hidden="true" /></span><small>Nivel 2 · Sales a buscar</small><h3>Donde hay muchas viviendas juntas</h3><p>Llama a los carteles &quot;Se alquila&quot; de tu barrio y pregunta si hablas con el dueño. Habla con porteros y administradores de edificios y condominios, que conocen a todos los dueños. Escríbeles a los dueños directos que publican en Facebook y Marketplace y todavía no están en Zentro Urbano.</p><b>De 25 a 50 o más por mes</b></li>
          <li><span className="eqp-ico"><Crown size={22} aria-hidden="true" /></span><small>Nivel 3 · Embajador</small><h3>Vendes servicios y armas tu equipo</h3><p>Con {ambassador.listings} anuncios y {ambassador.sales} ventas subes a Embajador: tus comisiones suben 5 puntos y ganas {formatBs(ambassador.referralBonus)} por cada aliado nuevo que traigas.</p><b>Anuncios + ventas + equipo</b></li>
        </ol>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Qué le dices al dueño</p>
        <h2>Explícalo en 30 segundos.</h2>
        <blockquote className="eqp-pitch">&quot;Hola, trabajo con Zentro Urbano, una página de alquileres de Santa Cruz. Publicar tu vivienda es gratis y no pagas comisión cuando la alquilas. Los interesados te escriben directo a tu WhatsApp. Si quieres, te ayudo a subirla ahora.&quot;</blockquote>
        <div className="eqp-objections">{objections.map(item => <article key={item.q}><h3>{item.q}</h3><p>{item.a}</p></article>)}</div>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Si quieres ganar más</p>
        <h2>Tres extras opcionales.</h2>
        <p className="eqp-sub">No son obligatorios. Si el dueño quiere ayuda con su anuncio, tú se la ofreces y ganas una parte.</p>
        <div className="eqp-extras">
          <article>
            <span className="eqp-ico"><Gift size={22} aria-hidden="true" /></span>
            <h3>Vende un paquete</h3>
            <p>Ganas el <b>{pct(rates.package)}</b> de lo que paga el dueño.</p>
            {pkg ? <p className="eqp-ex">Ejemplo: &quot;{pkg.title}&quot; cuesta {formatBs(pkg.price)}. Tú ganas <b>{formatBs(pkg.price * rates.package)}</b>.</p> : null}
          </article>
          <article>
            <span className="eqp-ico"><Camera size={22} aria-hidden="true" /></span>
            <h3>Vende o haz un servicio</h3>
            <p>Ganas el <b>{pct(rates.service)}</b> si lo vendes, o el <b>{pct(rates.serviceDone)}</b> si el trabajo lo haces tú.</p>
            {photos ? <p className="eqp-ex">Ejemplo: fotos profesionales cuestan {formatBs(photos.price)}. Si las vendes ganas <b>{formatBs(photos.price * rates.service)}</b>; si tú tomas las fotos, <b>{formatBs(photos.price * rates.serviceDone)}</b>.</p> : null}
          </article>
          <article>
            <span className="eqp-ico"><Star size={22} aria-hidden="true" /></span>
            <h3>Consigue un destacado</h3>
            <p>Ganas el <b>{pct(rates.featured)}</b> cada mes que el dueño lo pague, hasta {featuredMonths} meses.</p>
            <p className="eqp-ex">Ejemplo: el destacado cuesta {formatBs(featuredPrice)} al mes. Tú ganas <b>{formatBs(featuredPrice * rates.featured)} cada mes</b>.</p>
          </article>
        </div>
        <p className="eqp-note">Y si el anuncio se publica con {listingPay.photoBonusMin} fotos o más que pasan nuestra revisión, te damos {formatBs(listingPay.photoBonus)} extra por ese anuncio.</p>

        <details className="eqp-more">
          <summary>Ver todos los precios y lo que ganas en cada uno<ChevronDown size={18} aria-hidden="true" /></summary>
          <h4>Paquetes ({pct(rates.package)})</h4>
          <div className="eqp-table" role="table" aria-label="Comisión por paquete">
            <div role="row" className="th"><span role="columnheader">Paquete</span><span role="columnheader">Precio</span><span role="columnheader">Ganas</span></div>
            {ownerPackages.map(item => <div role="row" key={item.slug}>
              <span role="cell">{item.title}{item.onSuccess ? <small>{formatBs(item.upfront ?? 0)} al empezar y {formatBs(item.onSuccess)} al alquilar. Cobras tu parte de cada pago.</small> : null}</span>
              <span role="cell">{formatBs(item.price)}</span>
              <span role="cell" className="gain">{formatBs(item.price * rates.package)}</span>
            </div>)}
          </div>
          <h4>Servicios sueltos</h4>
          <div className="eqp-table four" role="table" aria-label="Comisión por servicio">
            <div role="row" className="th"><span role="columnheader">Servicio</span><span role="columnheader">Precio</span><span role="columnheader">Si lo vendes</span><span role="columnheader">Si lo haces</span></div>
            {sellableServices.map(slug => getService(slug)).filter(service => service !== undefined).map(service => <div role="row" key={service.slug}>
              <span role="cell">{service.title}</span>
              <span role="cell">{service.fromPrice ? "desde " : ""}{formatBs(service.price)}</span>
              <span role="cell" className="gain">{formatBs(service.price * rates.service)}</span>
              <span role="cell" className={doableServices.includes(service.slug) ? "gain strong" : "na"}>{doableServices.includes(service.slug) ? formatBs(service.price * rates.serviceDone) : "Lo hace el equipo"}</span>
            </div>)}
          </div>
          <h4>Trabajo de campo dentro de un paquete</h4>
          <ul className="eqp-field-list">{fieldTasks.map(task => <li key={task.slug}><span>{task.title}</span><b>{formatBs(task.amount)}</b></li>)}</ul>
          <p className="eqp-note">Para hacer un trabajo tú mismo, primero hacemos una prueba juntos. Se paga cuando pasa nuestra revisión de calidad.</p>
        </details>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Preguntas frecuentes</p>
        <h2>Lo que todos preguntan.</h2>
        <div className="eqp-faq">{faq.map((item, index) => <details key={item.q} open={index === 0}>
          <summary>{item.q}<ChevronDown size={18} aria-hidden="true" /></summary>
          <div>{item.a.map(text => <p key={text}>{text}</p>)}</div>
        </details>)}</div>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Las reglas</p>
        <h2>Lo que nunca puedes hacer.</h2>
        <ul className="eqp-never">{rules.map(rule => <li key={rule}><Ban size={18} aria-hidden="true" /><span>{rule}</span></li>)}</ul>
        <p className="eqp-note">Si alguien rompe una regla, sale del programa y pierde lo que tenga pendiente de cobro.</p>
      </section>

      <section className="eqp-cta">
        <h2>¿Te sumas?</h2>
        <p>Escríbenos por WhatsApp. Te mandamos tu código y coordinamos una charla corta para empezar.</p>
        <a className="eqp-btn" href={contact} target="_blank" rel="noreferrer"><MessageCircle size={20} aria-hidden="true" />Quiero ser aliado</a>
      </section>
    </div>
  </main>;
}
