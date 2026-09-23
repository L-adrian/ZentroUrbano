"use client";

import { useId, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, ClipboardCheck, Home, Images, MessageCircle, SlidersHorizontal, UserRound } from "lucide-react";

const stages = [
  { label: "Tu cuenta", icon: UserRound, title: "Empieza a tu nombre", description: "Tu cuenta es el punto de partida para enviar tu vivienda y mantener tus datos de contacto.", points: ["Registro con correo o Google", "Nombre y WhatsApp del propietario", "Contrato directo, sin intermediarios"], action: "Crear mi cuenta", href: "/publicar" },
  { label: "Tu anuncio", icon: Images, title: "Los detalles hacen la diferencia", description: "Prepara la información que una persona necesita para decidir si quiere visitar tu vivienda.", points: ["Fotos de los ambientes y revisión técnica", "Zona, características y condiciones", "Alquiler, garantía y tu T/C si cobras en dólares"], action: "Preparar mi anuncio", href: "/publicar" },
  { label: "Revisión", icon: ClipboardCheck, title: "Una última revisión antes de salir", description: "Revisamos manualmente la solicitud. Si falta información, podemos pedirte una aclaración antes de publicarla.", points: ["Envío vinculado a tu cuenta", "Revisión de fotos y datos del anuncio", "Consultas directas al publicarse"], action: "Conocer el proceso", href: "/preguntas-frecuentes" },
];

export function OwnerWelcome() {
  const [active, setActive] = useState(0);
  const id = useId();
  const stage = stages[active];
  const Icon = stage.icon;

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % stages.length : event.key === "ArrowLeft" ? (index + stages.length - 1) % stages.length : event.key === "Home" ? 0 : event.key === "End" ? stages.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return <section className="welcome-owners zu-container" aria-labelledby="welcome-owners-title">
    <div className="welcome-owner-copy">
      <p className="zu-eyebrow"><Home size={15} /> PARA PROPIETARIOS</p>
      <h2 id="welcome-owners-title">Tu vivienda. Tu trato.<br />Tú tienes el control.</h2>
      <p>Menos preguntas repetidas. Más información desde el primer contacto. Presenta tu alquiler con fotos, costos y condiciones claras.</p>
      <ul className="owner-benefits"><li><SlidersHorizontal size={19} /><div><strong>Decide tus condiciones</strong><span>Precio, garantía, mascotas y tipo de cambio.</span></div></li><li><MessageCircle size={19} /><div><strong>Habla sin intermediarios</strong><span>Las consultas llegan directamente a tu WhatsApp.</span></div></li></ul>
      <Link href="/publicar" className="zu-button zu-button-primary">Publicar mi vivienda<ArrowRight size={17} /></Link>
    </div>
    <div className="owner-process">
      <div className="owner-process-heading"><span>De tu cuenta a tu anuncio</span><span>{active + 1} / {stages.length}</span></div>
      <div className="owner-process-tabs" role="tablist" aria-label="Pasos para publicar">{stages.map(({ label, icon: StepIcon }, index) => <button key={label} id={`${id}-tab-${index}`} role="tab" type="button" aria-selected={active === index} aria-controls={`${id}-panel`} tabIndex={active === index ? 0 : -1} onKeyDown={event => navigate(event, index)} onClick={() => setActive(index)}><StepIcon size={18} />{label}</button>)}</div>
      <div className="owner-process-progress" aria-hidden="true"><span style={{ width: `${((active + 1) / stages.length) * 100}%` }} /></div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} tabIndex={0}>
        <div key={active} className="owner-stage-content">
          <Icon className="owner-stage-icon" size={28} aria-hidden="true" /><h3>{stage.title}</h3><p>{stage.description}</p>
          <ul>{stage.points.map(point => <li key={point}><Check size={16} />{point}</li>)}</ul>
          <Link className="welcome-text-link" href={stage.href}>{stage.action}<ArrowRight size={16} /></Link>
        </div>
      </div>
    </div>
  </section>;
}
