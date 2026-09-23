import { ArrowRight, Building2, Check, House, KeyRound } from "lucide-react";
import Link from "next/link";

const examples = [
  { label: "Un departamento", amount: "3.000", icon: Building2 },
  { label: "Una casa", amount: "4.000", icon: House },
  { label: "Tu próximo hogar", amount: "3.000", icon: KeyRound },
];

export function CommissionExamples() {
  return <section className="commission-section" id="sin-comisiones" aria-labelledby="commission-title">
    <div className="zu-container">
      <div className="welcome-section-heading"><div><p className="zu-eyebrow">ALQUILER DIRECTO</p><h2 id="commission-title">Tu dinero, para tu nuevo hogar.</h2></div><Link href="/propiedades" className="welcome-text-link">Buscar sin intermediarios<ArrowRight size={17} /></Link></div>
      <ul className="commission-examples" aria-label="Ejemplos de comisiones de intermediación que no se cobran en alquiler directo">
        {examples.map(({ label, amount, icon: Icon }) => <li key={label}>
          <p className="commission-example-title"><Icon size={20} />{label}</p>
          <span className="commission-label">Ejemplo de comisión</span>
          <s className="commission-crossed" aria-label={`${amount} bolivianos de comisión, eliminados`}><span>Bs</span> {amount}</s>
          <p className="commission-direct"><Check size={17} /><strong>Bs 0</strong><span>de intermediación</span></p>
        </li>)}
      </ul>
      <p className="commission-disclaimer">Montos ilustrativos, no precios de viviendas ni tarifas de una inmobiliaria. El alquiler, la garantía y las expensas acordadas con el propietario se pagan por separado.</p>
    </div>
  </section>;
}
