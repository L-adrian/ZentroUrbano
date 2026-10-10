import type { Metadata } from "next";
import {
  BadgeCheck, Ban, Camera, CircleCheck, ClipboardCheck, Crown, Gift, Handshake, Home, IdCard, MessageCircle,
  QrCode, Repeat, Search, ShieldCheck, Star, Trophy, UserPlus, Users, Wallet,
} from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";
import { whatsappUrl } from "@/lib/site";
import { getService } from "@/lib/services";
import {
  ambassador, doableServices, estimateMonth, examples, featuredMonths, featuredPrice, fieldTasks, formatBs,
  goalBonuses, listingPay, ownerPackages, rates, sellableServices,
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
  { icon: IdCard, text: "Credencial con tu nombre y tu código QR personal." },
  { icon: QrCode, text: "50 tarjetas con tu código para dejar a los dueños." },
  { icon: Home, text: "2 carteles imantados de muestra para enseñar cómo se ve." },
  { icon: MessageCircle, text: "Mensajes listos para WhatsApp y una charla de 1 hora para empezar." },
  { icon: Users, text: "Un grupo con el equipo para dudas, avisos y el ranking del mes." },
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
          <div><strong>{formatBs(listingPay.firstMonthAmount)}</strong><span>por cada uno de tus {listingPay.firstMonthFirst} primeros anuncios</span></div>
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
              <div className="hi"><b>{formatBs(listingPay.firstMonthAmount)}</b><span>Tus {listingPay.firstMonthFirst} primeros anuncios del primer mes</span></div>
              <div><b>{formatBs(listingPay.regular)}</b><span>Cada anuncio aprobado después</span></div>
              <div><b>+{formatBs(listingPay.photoBonus)}</b><span>Si sale con {listingPay.photoBonusMin} fotos buenas o más desde el primer día</span></div>
            </div>
            <p className="eqp-note">Se paga cuando el anuncio pasa la revisión y queda publicado, no cuando el dueño se registra.</p>
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
            <p className="eqp-note">Cobras el bono del tramo más alto al que llegues en el mes. Se suma a lo que ganas por cada anuncio.</p>
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
            <li><UserPlus size={20} aria-hidden="true" /><span><strong>{formatBs(ambassador.referralBonus)} por cada aliado nuevo que traigas</strong>, cuando llegue a {ambassador.referralListings} anuncios aprobados. Se paga una sola vez: no ganas de lo que venden otros, porque esto no es una pirámide.</span></li>
          </ul>
        </div>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Lo que recibes al empezar</p>
        <h2>Tu kit de aliado, sin costo.</h2>
        <ul className="eqp-kit">{kit.map(({ icon: Glyph, text }) => <li key={text}><Glyph size={22} aria-hidden="true" /><span>{text}</span></li>)}</ul>
      </section>

      <section className="eqp-block">
        <p className="eqp-kicker">Las reglas</p>
        <h2>Lo que nunca puede pasar.</h2>
        <p className="eqp-sub">Cuando hablas con un dueño, hablas en nombre de Zentro Urbano. Estas reglas cuidan la confianza que hace que todo esto funcione, y van firmadas en tu acuerdo.</p>
        <ol className="eqp-rules">{rules.map((rule, index) => <li key={rule.title}><span>{index === rules.length - 1 ? <Ban size={18} aria-hidden="true" /> : index + 1}</span><div><h3>{rule.title}</h3><p>{rule.text}</p></div></li>)}</ol>
      </section>

      <section className="eqp-block eqp-pay">
        <div>
          <p className="eqp-kicker">Cómo se cuenta y cómo se paga</p>
          <h2>Tu código va en todo lo que traes.</h2>
        </div>
        <ul>
          <li><b>Tu código</b><span>Tienes un código personal, por ejemplo ZR-JUAN. Cada dueño que traes se anota con ese código.</span></li>
          <li><b>Primero en avisar</b><span>Si dos aliados traen al mismo dueño, cuenta el que lo avisó primero con su código.</span></li>
          <li><b>Cuándo cobras</b><span>El primer mes, cada semana. Después, cada 15 días, por QR, con el detalle de cada pago.</span></li>
          <li><b>Devoluciones</b><span>Si un cliente pide que le devolvamos su dinero, esa comisión se descuenta del siguiente pago.</span></li>
          <li><b>Programa piloto</b><span>Empezamos con un grupo chico. Los montos pueden mejorar con el tiempo, y cualquier cambio se avisa antes de que empiece el mes.</span></li>
        </ul>
      </section>

      <section className="eqp-cta">
        <h2>¿Te sumas?</h2>
        <p>Escríbenos por WhatsApp. Te mandamos tu código, el acuerdo y coordinamos la charla para empezar.</p>
        <a className="eqp-btn" href={contact} target="_blank" rel="noreferrer"><MessageCircle size={20} aria-hidden="true" />Quiero ser aliado</a>
      </section>
    </div>
  </main>;
}
