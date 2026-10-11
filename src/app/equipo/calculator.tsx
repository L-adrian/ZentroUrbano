"use client";

import { useState } from "react";
import { formatBs, goalBonus, goalBonuses, listingAmount } from "@/lib/equipo";

// One question only: how many listings a month. Extras are explained on the page, not here.
export function Calculator() {
  const [approved, setApproved] = useState(10);
  const [firstMonth, setFirstMonth] = useState(false);
  const max = 60;
  const pay = listingAmount(approved, firstMonth);
  const bonus = goalBonus(approved);
  const nextGoal = goalBonuses.find(goal => goal.listings > approved);

  return <div className="eqp-calc">
    <div className="eqp-calc-in">
      <div className="eqp-slider">
        <label htmlFor="c-anuncios"><span>¿Cuántos anuncios crees que logras en un mes?</span><output htmlFor="c-anuncios">{approved}</output></label>
        <input id="c-anuncios" type="range" min={0} max={max} value={approved} onChange={event => setApproved(Number(event.target.value))} style={{ ["--p" as string]: `${(approved / max) * 100}%` }} />
        <small>{nextGoal ? `Con ${nextGoal.listings} anuncios te llevas ${formatBs(nextGoal.bonus)} de bono.` : "Llegaste al bono más alto."}</small>
      </div>
      <div className="eqp-toggles">
        <label><input type="checkbox" checked={firstMonth} onChange={event => setFirstMonth(event.target.checked)} /><span>Es mi primer mes</span></label>
      </div>
    </div>
    <div className="eqp-calc-out" aria-live="polite">
      <small>Cobrarías en el mes</small>
      <strong>{formatBs(pay + bonus)}</strong>
      <ul>
        <li>Por {approved} anuncios<b>{formatBs(pay)}</b></li>
        <li className={bonus ? "" : "zero"}>Bono del mes<b>{formatBs(bonus)}</b></li>
      </ul>
      <p>Sin contar los extras por ventas.</p>
    </div>
  </div>;
}
