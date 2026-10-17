"use client";

import { Backpack, Check, MessageCircle, PartyPopper, TriangleAlert } from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";
import { listaItems, type ListaItem } from "@/lib/lista";

// Marks shared by both ways of walking the list: points done, points with a problem, rooms already walked.
export type ListaMarks = { done: string[]; problems: string[]; rooms: string[] };

export function Ring({ value, total }: { value: number; total: number }) {
  const r = 15, c = 2 * Math.PI * r;
  return <svg className="prog" viewBox="0 0 36 36" aria-hidden="true">
    <circle cx="18" cy="18" r={r} />
    <circle cx="18" cy="18" r={r} strokeDasharray={c} strokeDashoffset={c - (value / total) * c} />
  </svg>;
}

export function ItemRow({ item, marks, onToggle, onFlag }: { item: ListaItem; marks: ListaMarks; onToggle: (id: string) => void; onFlag: (id: string) => void }) {
  const checked = marks.done.includes(item.id);
  const bad = marks.problems.includes(item.id);
  return <li className={checked ? "on" : bad ? "bad" : ""}>
    <label>
      <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
      <span className="box" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
      <span className="txt">
        <strong>{item.title}</strong>
        <span>{item.detail}</span>
        {(item.kit || item.ask || item.serious) && <span className="tags">
          {item.kit && <span className="tag kit"><Backpack size={13} aria-hidden="true" />Llevá {item.kit}</span>}
          {item.ask && <span className="tag ask"><MessageCircle size={13} aria-hidden="true" />Preguntale al dueño</span>}
          {item.serious && <span className="tag grave"><TriangleAlert size={13} aria-hidden="true" />Esto es serio</span>}
        </span>}
      </span>
    </label>
    <button type="button" className="flag" aria-pressed={bad} aria-label={`${item.title} Marcar que hay un problema`} title="Marcar que hay un problema" onClick={() => onFlag(item.id)}>
      <TriangleAlert size={15} aria-hidden="true" /><span>{bad ? "Hay un problema" : "¿Problema?"}</span>
    </button>
  </li>;
}

export function ProblemsCard({ marks }: { marks: ListaMarks }) {
  const problemItems = listaItems.filter(item => marks.problems.includes(item.id));
  const message = `Hola, vi el depa y quería consultarte estos puntos:\n${problemItems.map(item => `- ${item.title}`).join("\n")}`;
  return <section className={`lst-result${problemItems.length ? " has" : ""}`}>
    {problemItems.length === 0
      ? <><PartyPopper size={26} aria-hidden="true" /><div><h3>Lo que falle, anotalo acá</h3><p>Tocá <b>⚠ ¿Problema?</b> en cualquier punto y se junta en esta lista para que se lo preguntes al dueño antes de firmar.</p></div></>
      : <><TriangleAlert size={26} aria-hidden="true" /><div>
        <h3>{problemItems.length === 1 ? "1 punto para hablar con el dueño" : `${problemItems.length} puntos para hablar con el dueño`}</h3>
        <ul>{problemItems.map(item => <li key={item.id}>{item.title}</li>)}</ul>
        <a className="btn wa" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("lista_share", { method: "whatsapp_problemas" })}><MessageCircle size={18} />Mandarle estas preguntas</a>
      </div></>}
  </section>;
}

