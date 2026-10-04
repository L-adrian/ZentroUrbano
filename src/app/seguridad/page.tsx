import { ShieldCheck } from "lucide-react";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { supportHoursLabel } from "@/lib/property-reports";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({ title: "Seguridad y reportes", description: "Señales de estafa en alquileres, cómo comprobar al dueño y qué hacemos con tu reporte en Zentro Urbano.", path: "/seguridad" });

const scamSignals = [
  "Te pide un adelanto, una reserva o un depósito antes de que veas la vivienda.",
  "El precio es mucho más bajo que el de viviendas parecidas en la misma zona.",
  "No puede mostrarte la vivienda y te ofrece enviar la llave o un contrato por mensaje.",
  "Te apura: dice que hay otras personas interesadas y que debes pagar hoy.",
  "Te pide códigos de WhatsApp, contraseñas o datos de tu banco.",
  "Las fotos, el precio o la dirección cambian cuando le escribes.",
];

const ownerChecks = [
  "Visita la vivienda en persona, de día, y si puedes ve acompañado.",
  "Pide ver el Folio Real de Derechos Reales o una factura de luz o agua a nombre de quien te alquila.",
  "Pide un contrato escrito con el monto del alquiler, la garantía, las expensas y la duración.",
  "Paga la garantía solo al firmar y pide un recibo con fecha, monto y firma.",
  "No transfieras dinero a cuentas de terceros que no sean el dueño.",
];

const questions = [
  {
    question: "¿Y si me piden un adelanto antes de visitar?",
    answer: "No lo pagues. Repórtalo desde la ficha con el motivo \"Pidió dinero antes de la visita\". Esos avisos los revisamos primero.",
  },
  {
    question: "¿Y si el dueño no responde?",
    answer: "Si no te responde en 48 horas, avísanos desde la ficha con \"El dueño no responde\". Cuando varias personas avisan que ya se alquiló, la ficha pasa a \"Disponibilidad por confirmar\".",
  },
  {
    question: "¿Zentro Urbano verifica a los dueños?",
    answer: "Por ahora no verificamos la identidad de los dueños. Revisamos fotos, precio y datos antes de publicar, pero eso no reemplaza que tú compruebes a quién le alquilas.",
  },
];

export default function SafetyPage() {
  return <main id="contenido" className="zu-container help-page"><p className="zu-eyebrow"><ShieldCheck size={16} /> SEGURIDAD</p><h1>Antes de dar el siguiente paso.</h1><p>Una ficha publicada no reemplaza la comprobación de la vivienda y de quien te la alquila.</p><div className="safety-sections">
    <section><h2>Señales de estafa</h2><ul className="safety-list">{scamSignals.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section><h2>Cómo comprobar al dueño</h2><ul className="safety-list">{ownerChecks.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section><h2>Qué hacemos con tu reporte</h2><p>En cada ficha está el botón &quot;Reportar este anuncio&quot;. Guardamos el motivo sin tu nombre ni tu número y lo revisamos {supportHoursLabel}. Los avisos de dinero pedido antes de la visita van primero. Podemos corregir la ficha, pedir al dueño que confirme o retirarla.</p></section>
    <section><h2>Protege tu cuenta</h2><p>No compartas tu contraseña ni códigos de acceso. El equipo de ayuda no necesita esos datos. Comprueba que estás en zentrourbano.com antes de ingresar tus credenciales.</p></section>
  </div>
  <div className="safety-questions">{questions.map(item => <section key={item.question}><h2>{item.question}</h2><p>{item.answer}</p></section>)}</div>
  <SupportWhatsAppButton /></main>;
}
