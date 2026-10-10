"use client";

import { useState } from "react";
import { estimateMonth, formatBs, goalBonuses, ownerPackages } from "@/lib/equipo";

type SliderProps = { id: string; label: string; hint: string; value: number; max: number; onChange: (value: number) => void };

function Slider({ id, label, hint, value, max, onChange }: SliderProps) {
  return <div className="eqp-slider">
    <label htmlFor={id}><span>{label}</span><output htmlFor={id}>{value}</output></label>
    <input id={id} type="range" min={0} max={max} value={value} onChange={event => onChange(Number(event.target.value))} style={{ ["--p" as string]: `${(value / max) * 100}%` }} />
    <small>{hint}</small>
  </div>;
}

export function Calculator() {
  const [approved, setApproved] = useState(15);
  const [firstMonth, setFirstMonth] = useState(false);
  const [packageSlug, setPackageSlug] = useState("hasta-que-se-alquile");
  const [packages, setPackages] = useState(1);
  const [photos, setPhotos] = useState(2);
  const [featured, setFeatured] = useState(2);
  const [ambassador, setAmbassador] = useState(false);

  const { lines, total } = estimateMonth({
    approved,
    firstMonth,
    packages: [{ slug: packageSlug, count: packages }],
    servicesDone: Array.from({ length: photos }, () => "fotos-profesionales"),
    featured,
    ambassador,
  });
  const nextGoal = goalBonuses.find(goal => goal.listings > approved);

  return <div className="eqp-calc">
    <div className="eqp-calc-in">
      <Slider id="c-anuncios" label="Anuncios aprobados en el mes" hint={nextGoal ? `Con ${nextGoal.listings} llegas al bono de ${formatBs(nextGoal.bonus)}.` : "Llegaste al bono más alto."} value={approved} max={60} onChange={setApproved} />
      <div className="eqp-slider">
        <label htmlFor="c-paquete"><span>Paquete que vendes</span></label>
        <select id="c-paquete" value={packageSlug} onChange={event => setPackageSlug(event.target.value)}>
          {ownerPackages.map(pkg => <option key={pkg.slug} value={pkg.slug}>{pkg.title} · {formatBs(pkg.price)}</option>)}
        </select>
      </div>
      <Slider id="c-paquetes" label="Paquetes vendidos" hint="Cuántos de ese paquete vendes en el mes." value={packages} max={10} onChange={setPackages} />
      <Slider id="c-fotos" label="Sesiones de fotos hechas por ti" hint="Servicio de fotos que tú mismo tomas." value={photos} max={15} onChange={setPhotos} />
      <Slider id="c-destacados" label="Destacados activos" hint="Dueños que renuevan su anuncio destacado." value={featured} max={20} onChange={setFeatured} />
      <div className="eqp-toggles">
        <label><input type="checkbox" checked={firstMonth} onChange={event => setFirstMonth(event.target.checked)} /><span>Es mi primer mes</span></label>
        <label><input type="checkbox" checked={ambassador} onChange={event => setAmbassador(event.target.checked)} /><span>Ya soy Embajador</span></label>
      </div>
    </div>
    <div className="eqp-calc-out" aria-live="polite">
      <small>Ganarías en el mes</small>
      <strong>{formatBs(total)}</strong>
      <div className="eqp-stack">{lines.filter(line => line.amount > 0).map(line => <i key={line.key} className={`k-${line.key}`} style={{ width: `${(line.amount / total) * 100}%` }} />)}</div>
      <ul>{lines.map(line => <li key={line.key} className={line.amount > 0 ? "" : "zero"}><i className={`k-${line.key}`} />{line.label}<b>{formatBs(line.amount)}</b></li>)}</ul>
    </div>
  </div>;
}
