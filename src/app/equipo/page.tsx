import type { Metadata } from "next";
import {
  BadgeCheck, Ban, Camera, CircleCheck, ClipboardCheck, Crown, Gift, Handshake, IdCard, MessageCircle,
  Repeat, Search, ShieldCheck, Star, Trophy, UserPlus, Users, Wallet,
} from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";
import { whatsappUrl } from "@/lib/site";
import { getService } from "@/lib/services";
import {
  ambassador, doableServices, estimateMonth, examples, featuredMonths, featuredPrice, fieldTasks, formatBs,
  goalBonus, goalBonuses, listingAmount, listingPay, ownerPackages, rates, sellableServices,
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

const steps = [
  { icon: Search, title: "Encuentras a un dueño", text: "Alguien que tiene una casa, un departamento o un cuarto para alquilar en Santa Cruz." },
  { icon: Handshake, title: "Le ayudas a publicar", text: "Le explicas Zentro Urbano y le ayudas a subir su anuncio. Nos pasas tu código para saber que vino contigo." },
  { icon: ClipboardCheck, title: "Revisamos el anuncio", text: "Nuestro equipo revisa las fotos y los datos. Cuando queda aprobado y publicado, ya ganaste." },
  { icon: Wallet, title: "Cobras", text: "Te pagamos por QR. El primer mes, cada semana. Después, cada 15 días." },
];

const rules = [
  { title: "Nunca cobras nada por tu cuenta", text: "Ni al dueño ni al inquilino. Todo pago va directo a Zentro Urbano y nosotros te pagamos tu parte." },
  { title: "No te presentas como inmobiliaria", text: "Dices: \"trabajo con Zentro Urbano\". Nuestra promesa es que aquí no hay intermediarios cobrando comisión." },
  { title: "No inventas datos", text: "Lo que no sabes de la vivienda queda como \"pendiente de consulta\". Nunca prometas algo que el dueño no confirmó." },
  { title: "Solo con permiso del dueño", text: "No publicas viviendas sin su autorización, ni usas fotos de otros anuncios o de internet." },
  { title: "No prometes plazos", text: "Nadie puede asegurar que una vivienda se alquila en una semana. Promete lo que sí hacemos: mostrarla bien y a mucha gente." },
  { title: "Juego limpio", text: "Un anuncio falso o un cobro por fuera significa salir del programa y perder lo que esté pendiente de pago." },
];

const kit = [
  { icon: IdCard, text: "Tu código personal de aliado, por ejemplo ZR-JUAN. Con él sabemos qué dueños llegaron contigo." },
  { icon: MessageCircle, text: "Mensajes listos para WhatsApp, para explicarle Zentro Urbano a un dueño en dos minutos." },
  { icon: Users, text: "Una charla corta por videollamada para empezar, y respuesta a tus dudas por WhatsApp." },
];

// Each line answers a question a new aliado asks before the first payment.
const details = [
  {
    title: "Qué anuncio cuenta",
    items: [
      "El dueño es nuevo en Zentro Urbano: nunca publicó antes con nosotros.",
      "La vivienda es real, está en Santa Cruz, está disponible para alquilar y el dueño te dio permiso.",
      "Nos avisas por WhatsApp con tu código antes de que el dueño publique, o el dueño escribe tu código al registrarse.",
      "Nuestro equipo revisa el anuncio, lo aprueba y queda publicado. Recién ahí cuenta.",
    ],
  },
  {
    title: "Cómo se cuentan",
    items: [
      "Una vivienda es un anuncio. Si un dueño publica 3 departamentos distintos, son 3 anuncios.",
      "Si dos aliados traen al mismo dueño, cuenta el que avisó primero con su código.",
      "Los anuncios del mes se cuentan por la fecha en que los aprobamos, del 1 al último día del mes.",
      `Si un anuncio se da de baja por datos falsos en los primeros ${listingPay.clawbackDays} días, ese pago se descuenta.`,
    ],
  },
  {
    title: "Ventas de paquetes y servicios",
    items: [
      "Cuentan las ventas a dueños que llegaron con tu código, o a los que tú les ofreciste el servicio y nos avisaste antes de que paguen.",
      "Se pagan cuando el dueño ya pagó a Zentro Urbano. Nunca antes.",
      "Si un paquete se paga en dos partes, cobras tu parte de cada pago cuando el dueño lo hace.",
      "Si el dueño pide que le devolvamos su dinero, esa comisión se descuenta de tu siguiente pago.",
    ],
  },
  {
    title: "Cuándo y cómo cobras",
    items: [
      "Tu primer mes te pagamos cada viernes. Después, los días 1 y 15 de cada mes.",
      "Te pagamos por QR a tu cuenta, con el detalle de cada anuncio y cada venta por WhatsApp.",
      "Si un día de pago cae en feriado, pagamos el siguiente día hábil.",
      "Es un programa piloto con un grupo chico. Si cambia algún monto, te avisamos antes de que empiece el mes, y nunca cambia lo que ya lograste.",
    ],
  },
];

const firstMonthExample = [
  { n: 1, amount: listingPay.firstMonthAmount }, { n: 2, amount: listingPay.firstMonthAmount }, { n: 3, amount: listingPay.firstMonthAmount },
  { n: 4, amount: listingPay.firstMonthAmount }, { n: 5, amount: listingPay.firstMonthAmount }, { n: 6, amount: listingPay.regular }, { n: 7, amount: listingPay.regular },
];

export default function EquipoPage() {
  const topGoal = goalBonuses.at(-1)!;
  const contact = whatsappUrl("Hola Adrian, quiero ser aliado de Zentro Urbano. ¿Cómo empiezo?");
  return <main id="contenido" className="eqp">
    <section className="eqp-hero">
      <div className="zu-container eqp-hero-in">
        <p className="eqp-tag"><ShieldCheck size={16} aria-hidden="true" />Invitación privada · Programa de aliados</p>
        <h1>Gana dinero ayudando a que la gente alquile <em>sin intermediarios.</em></h1>
        <p className="eqp-lead">Si estás leyendo esto, alguien del equipo de Zentro Urbano pensó en ti. Te contamos cómo funciona, cuánto puedes ganar y qué esperamos de ti, con números claros desde el primer día.</p>
        <div className="eqp-stats">
          <div><strong>{formatBs(listingPay.firstMonthAmount)}</strong><span>por cada uno de tus primeros {listingPay.firstMonthFirst} anuncios aprobados, en tu primer mes</span></div>
          <div><strong>{formatBs(listingPay.regular)}</strong><span>por cada anuncio aprobado después</span></div>
          <div><strong>{pct(rates.package)}</strong><span>de cada paquete que vendas</span></div>
          <div><strong>{formatBs(topGoal.bonus)}</strong><span>de bono máximo al mes, por llegar a tu meta</span></div>
        </div>
      </div>
    </section>

    <div className="zu-container">
      <section className="eqp-block eqp-about">
        <div>
          <p className="eqp-kicker">Qué es Zentro Urbano</p>
          <h2>Una plataforma de alquileres donde el dueño y el inquilino hablan directo.</h2>
        </div>
        <ul>
          <li><CircleCheck size={20} aria-hidden="true" /><span><strong>Publicar es gratis</strong> para el dueño. Sin comisión por alquilar.</span></li>
          <li><CircleCheck size={20} aria-hidden="true" /><span><strong>Cada anuncio se revisa</strong> antes de publicarse, para que la gente confíe.</span></li>
          <li><CircleCheck size={20} aria-hidden="true" /><span><strong>Ganamos con servicios opcionales</strong>: fotos, paquetes y anuncios destacados. Ahí también ganas tú.</span></li>
        </ul>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Cómo funciona</p>
        <h2>Cuatro pasos, de la conversación al pago.</h2>
        <ol className="eqp-flow">
          {steps.map(({ icon: Glyph, title, text }, index) => <li key={title}>
            <span className="eqp-flow-n">{index + 1}</span>
            <Glyph size={26} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </li>)}
        </ol>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Cómo ganas</p>
        <h2>Cinco formas de ganar, y todas se pagan por resultados.</h2>
        <p className="eqp-sub">Nunca te pedimos plata para entrar y nunca cobras por un esfuerzo que no llegó a nada. Cobras cuando un anuncio queda aprobado o cuando el cliente ya pagó.</p>

        <div className="eqp-earn">
          <article className="eqp-card">
            <header><span className="eqp-ico"><BadgeCheck size={22} aria-hidden="true" /></span><div><small>1 · Por cada anuncio</small><h3>Ganas apenas lo aprobamos</h3></div></header>
            <div className="eqp-ladder">
              <div className="hi"><b>{formatBs(listingPay.firstMonthAmount)}</b><span>Bono de bienvenida: cada uno de tus primeros {listingPay.firstMonthFirst} anuncios aprobados, si los logras en tus primeros {listingPay.firstMonthDays} días</span></div>
              <div><b>{formatBs(listingPay.regular)}</b><span>Cada anuncio aprobado desde el sexto, o después de tus primeros {listingPay.firstMonthDays} días</span></div>
              <div><b>+{formatBs(listingPay.photoBonus)}</b><span>Extra por anuncio, si se publica con {listingPay.photoBonusMin} fotos o más que pasan nuestra revisión</span></div>
            </div>
            <div className="eqp-example">
              <p><strong>Ejemplo:</strong> en tus primeros {listingPay.firstMonthDays} días logras 7 anuncios aprobados.</p>
              <ol aria-label="Pago por cada anuncio del ejemplo">{firstMonthExample.map(item => <li key={item.n} className={item.amount === listingPay.firstMonthAmount ? "hi" : ""}><small>#{item.n}</small><b>{formatBs(item.amount)}</b></li>)}</ol>
              <p>5 × {formatBs(listingPay.firstMonthAmount)} + 2 × {formatBs(listingPay.regular)} = <strong>{formatBs(listingAmount(7, true))}</strong>. Si no llegas a 5 en esos {listingPay.firstMonthDays} días, los que hiciste igual se pagan a {formatBs(listingPay.firstMonthAmount)}.</p>
            </div>
            <p className="eqp-note">Se paga cuando el anuncio queda aprobado y publicado, no cuando el dueño solo se registra. Los {listingPay.firstMonthDays} días empiezan a contar el día que te damos tu código.</p>
          </article>

          <article className="eqp-card">
            <header><span className="eqp-ico"><Trophy size={22} aria-hidden="true" /></span><div><small>2 · Bono por meta del mes</small><h3>Mientras más anuncios, más bono</h3></div></header>
            <div className="eqp-goals" role="img" aria-label="Bonos por meta mensual">
              {goalBonuses.map(goal => <div key={goal.listings} style={{ ["--h" as string]: `${(goal.bonus / topGoal.bonus) * 100}%` }}>
                <b>{formatBs(goal.bonus)}</b>
                <i />
                <span>{goal.listings} anuncios</span>
              </div>)}
            </div>
            <p className="eqp-note">Los bonos no se suman entre sí: cobras el del tramo más alto al que llegues en el mes. Ejemplo: con 27 anuncios cobras {formatBs(goalBonus(27))} de bono, además de lo que ganas por cada anuncio. Cada mes empieza de cero.</p>
          </article>

          <article className="eqp-card wide">
            <header><span className="eqp-ico"><Gift size={22} aria-hidden="true" /></span><div><small>3 · Paquetes</small><h3>{pct(rates.package)} de cada paquete que vendas</h3></div></header>
            <div className="eqp-table" role="table" aria-label="Comisión por paquete">
              <div role="row" className="th"><span role="columnheader">Paquete</span><span role="columnheader">Precio</span><span role="columnheader">Ganas</span></div>
              {ownerPackages.map(pkg => <div role="row" key={pkg.slug}>
                <span role="cell">{pkg.title}{pkg.onSuccess ? <small>{formatBs(pkg.upfront ?? 0)} al empezar y {formatBs(pkg.onSuccess)} al alquilar</small> : null}</span>
                <span role="cell">{formatBs(pkg.price)}</span>
                <span role="cell" className="gain">{formatBs(pkg.price * rates.package)}</span>
              </div>)}
            </div>
            <div className="eqp-field">
              <h4>Y si el trabajo de campo lo haces tú, se te paga aparte:</h4>
              <ul>{fieldTasks.map(task => <li key={task.slug}><Camera size={16} aria-hidden="true" /><span>{task.title}</span><b>{formatBs(task.amount)}</b></li>)}</ul>
            </div>
            <p className="eqp-note">En los paquetes que se pagan en partes, ganas tu parte de cada pago cuando el dueño lo hace.</p>
          </article>

          <article className="eqp-card wide">
            <header><span className="eqp-ico"><Camera size={22} aria-hidden="true" /></span><div><small>4 · Servicios individuales</small><h3>{pct(rates.service)} si lo vendes, {pct(rates.serviceDone)} si lo haces tú</h3></div></header>
            <div className="eqp-table four" role="table" aria-label="Comisión por servicio">
              <div role="row" className="th"><span role="columnheader">Servicio</span><span role="columnheader">Precio</span><span role="columnheader">Si lo vendes</span><span role="columnheader">Si lo haces</span></div>
              {sellableServices.map(slug => getService(slug)).filter(service => service !== undefined).map(service => <div role="row" key={service.slug}>
                <span role="cell">{service.title}</span>
                <span role="cell">{service.fromPrice ? "desde " : ""}{formatBs(service.price)}</span>
                <span role="cell" className="gain">{formatBs(service.price * rates.service)}</span>
                <span role="cell" className={doableServices.includes(service.slug) ? "gain strong" : "na"}>{doableServices.includes(service.slug) ? formatBs(service.price * rates.serviceDone) : "Lo hace el equipo"}</span>
              </div>)}
            </div>
            <p className="eqp-note">Para hacer un servicio tú mismo, primero hacemos una prueba juntos. Se paga cuando el trabajo pasa nuestra revisión de calidad.</p>
          </article>

          <article className="eqp-card wide">
            <header><span className="eqp-ico"><Repeat size={22} aria-hidden="true" /></span><div><small>5 · Ingreso que se repite</small><h3>{pct(rates.featured)} del anuncio destacado, cada mes</h3></div></header>
            <p className="eqp-p">Si el dueño paga para destacar su anuncio ({formatBs(featuredPrice)} al mes), ganas {formatBs(featuredPrice * rates.featured)} cada mes que lo renueve, hasta {featuredMonths} meses. Es plata que sigue entrando sin que tengas que salir.</p>
            <div className="eqp-months" aria-hidden="true">
              {Array.from({ length: featuredMonths }, (_, index) => <div key={index}><Star size={14} /><b>{formatBs(featuredPrice * rates.featured)}</b><span>Mes {index + 1}</span></div>)}
            </div>
            <p className="eqp-note">Con 10 destacados activos son {formatBs(10 * featuredPrice * rates.featured)} al mes.</p>
          </article>
        </div>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Los detalles, claros</p>
        <h2>Todo lo que tienes que saber antes de empezar.</h2>
        <p className="eqp-sub">Sin letra chica. Si algo no está acá, pregúntanos antes de ir a hablar con un dueño.</p>
        <div className="eqp-details">{details.map(group => <article key={group.title}>
          <h3>{group.title}</h3>
          <ul>{group.items.map(item => <li key={item}><CircleCheck size={18} aria-hidden="true" /><span>{item}</span></li>)}</ul>
        </article>)}</div>
      </section>

      <section className="eqp-block" id="calculadora">
        <p className="eqp-kicker">Calculadora</p>
        <h2>Calcula cuánto puedes ganar en un mes.</h2>
        <p className="eqp-sub">Mueve los valores y mira cómo cambia. Es una estimación: lo que cobras depende de lo que logres de verdad.</p>
        <Calculator />
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Ejemplos reales de un mes</p>
        <h2>Lo que ganan tres formas distintas de trabajar.</h2>
        <div className="eqp-examples">
          {examples.map(example => {
            const { lines, total } = estimateMonth(example.input);
            return <article key={example.title}>
              <small>{example.who}</small>
              <h3>{example.title}</h3>
              <strong className="eqp-big">{formatBs(total)}</strong>
              <div className="eqp-stack" aria-hidden="true">{lines.filter(line => line.amount > 0).map(line => <i key={line.key} className={`k-${line.key}`} style={{ width: `${(line.amount / total) * 100}%` }} />)}</div>
              <ul>{lines.filter(line => line.amount > 0).map(line => <li key={line.key}><i className={`k-${line.key}`} />{line.label}<b>{formatBs(line.amount)}</b></li>)}</ul>
              <p>{example.detail}</p>
            </article>;
          })}
        </div>
      </section>

      <section className="eqp-block eqp-amb">
        <div className="eqp-amb-badge"><Crown size={34} aria-hidden="true" /><span>Embajador</span></div>
        <div>
          <p className="eqp-kicker">Nivel Embajador</p>
          <h2>Cuando llegas a {ambassador.listings} anuncios aprobados y {ambassador.sales} ventas, subes de nivel.</h2>
          <ul>
            <li><CircleCheck size={20} aria-hidden="true" /><span><strong>5 puntos más en todas tus comisiones de venta:</strong> paquetes al {pct(rates.package + rates.ambassadorExtra)}, servicios al {pct(rates.service + rates.ambassadorExtra)} y destacados al {pct(rates.featured + rates.ambassadorExtra)}.</span></li>
            <li><UserPlus size={20} aria-hidden="true" /><span><strong>{formatBs(ambassador.referralBonus)} por cada aliado nuevo que traigas</strong>, cuando ese aliado llegue a sus primeros {ambassador.referralListings} anuncios aprobados. Se paga una sola vez por persona: no ganas de lo que venden los demás, porque esto no es una pirámide.</span></li>
          </ul>
        </div>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Lo que te damos para empezar</p>
        <h2>Tu código, los mensajes y alguien que te responde.</h2>
        <p className="eqp-sub">Empezar no te cuesta nada. No necesitas comprar material ni tener experiencia en alquileres.</p>
        <ul className="eqp-kit three">{kit.map(({ icon: Glyph, text }) => <li key={text}><Glyph size={22} aria-hidden="true" /><span>{text}</span></li>)}</ul>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Las reglas</p>
        <h2>Lo que nunca puede pasar.</h2>
        <p className="eqp-sub">Cuando hablas con un dueño, hablas en nombre de Zentro Urbano. Estas reglas cuidan la confianza que hace que todo esto funcione, y van firmadas en tu acuerdo.</p>
        <ol className="eqp-rules">{rules.map((rule, index) => <li key={rule.title}><span>{index === rules.length - 1 ? <Ban size={18} aria-hidden="true" /> : index + 1}</span><div><h3>{rule.title}</h3><p>{rule.text}</p></div></li>)}</ol>
      </section>

      <section className="eqp-cta">
        <h2>¿Te sumas?</h2>
        <p>Escríbenos por WhatsApp. Te mandamos tu código, el acuerdo y coordinamos la charla para empezar.</p>
        <a className="eqp-btn" href={contact} target="_blank" rel="noreferrer"><MessageCircle size={20} aria-hidden="true" />Quiero ser aliado</a>
      </section>
    </div>
  </main>;
}
