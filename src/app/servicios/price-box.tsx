"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { formatBob, formatUsd, servicesUsdRate } from "@/lib/services";
import { whatsappUrl } from "@/lib/site";

type Props = {
  title: string;
  unit: string;
  timing: string;
  options: [string, number][];
  backHref: string;
  backLabel: string;
};

// Price box of a service: picking an option updates the price, the dollar reference and the WhatsApp message.
export function ServicePriceBox({ title, unit, timing, options, backHref, backLabel }: Props) {
  const [selected, setSelected] = useState(0);
  const [label, amount] = options[selected];
  const message = options.length > 1
    ? `Hola, me interesa el servicio ${title} (${label}, ${formatBob(amount)}) de Zentro Urbano.`
    : `Hola, me interesa el servicio ${title} (${formatBob(amount)}) de Zentro Urbano.`;
  return <>
    <aside className="buy">
      <div className="lab">Precio</div>
      <div className="amt"><strong>{formatBob(amount)}</strong><span>{unit === "desde" ? "pago único" : unit}</span></div>
      <div className="usd">≈ {formatUsd(amount)} · TC {servicesUsdRate}</div>
      {options.length > 1 && <div className="opts" role="radiogroup" aria-label="Opciones">
        {options.map(([optionLabel, optionAmount], index) =>
          <button key={optionLabel} type="button" role="radio" aria-checked={index === selected} className={`opt${index === selected ? " on" : ""}`} onClick={() => setSelected(index)}>
            <span>{optionLabel}</span><strong>{formatBob(optionAmount)}</strong>
          </button>)}
      </div>}
      <ul className="facts">
        <li><Clock size={18} />{timing}</li>
        <li><MapPin size={18} />Santa Cruz de la Sierra</li>
        <li><ShieldCheck size={18} />Sin comisión sobre tu alquiler</li>
      </ul>
      <a className="btn wa" href={whatsappUrl(message)} target="_blank" rel="noreferrer"><MessageCircle size={18} />Pedir por WhatsApp</a>
      <Link className="btn" href={backHref}>{backLabel}</Link>
      <p className="fine">Te confirmamos el precio final antes de empezar. Atendemos de 08:00 a 00:00.</p>
    </aside>
    <div className="mbar">
      <div className="p">{options.length > 1 ? label : "Precio"}<strong>{formatBob(amount)}</strong></div>
      <a className="btn wa" href={whatsappUrl(message)} target="_blank" rel="noreferrer"><MessageCircle size={18} />Pedir</a>
    </div>
  </>;
}
