"use client";

import { useEffect, useState } from "react";
import { Check, Download, RotateCcw, Share2 } from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";
import { listaPdfPath, listaSections, listaTotal } from "@/lib/lista";

const storageKey = "zu-lista-marcados";

export function DownloadButton({ from, className = "btn pri" }: { from: string; className?: string }) {
  return <a
    className={className}
    href={listaPdfPath}
    download="Lista para revisar un depa - Zentro Urbano.pdf"
    onClick={() => trackAnalyticsEvent("lista_pdf_download", { from })}
  ><Download size={18} />Descargar la lista gratis</a>;
}

export function ShareButton({ url }: { url: string }) {
  const text = `Mirá esta lista para revisar un depa antes de alquilar, es gratis: ${url}`;
  return <a
    className="btn wa"
    href={`https://wa.me/?text=${encodeURIComponent(text)}`}
    target="_blank"
    rel="noreferrer"
    onClick={() => trackAnalyticsEvent("lista_share", { method: "whatsapp" })}
  ><Share2 size={18} />Mandarla por WhatsApp</a>;
}

// Tickable copy of the PDF, for people who do the visit with the phone in hand.
// Marks live only in this browser so a reload mid-visit keeps them.
export function Checklist() {
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
      // Restoring browser-only state after hydration, so the server HTML stays the same.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setDone(saved.filter(value => typeof value === "string"));
    } catch {
      // Storage can be blocked; the list still works without it.
    }
  }, []);

  function save(next: string[]) {
    setDone(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore: marks just won't survive a reload.
    }
  }

  function toggle(id: string) {
    save(done.includes(id) ? done.filter(value => value !== id) : [...done, id]);
  }

  return <div className="lst-check">
    <div className="lst-progress" aria-live="polite">
      <span><strong>{done.length}</strong> de {listaTotal} revisados</span>
      <span className="bar" aria-hidden="true"><span style={{ width: `${(done.length / listaTotal) * 100}%` }} /></span>
      {done.length > 0 && <button type="button" onClick={() => save([])} aria-label="Empezar de nuevo"><RotateCcw size={15} /><span>Empezar de nuevo</span></button>}
    </div>
    {listaSections.map((section, sectionIndex) => <section key={section.title} className="lst-sec">
      <h3>{section.title}<small>{section.items.length} puntos</small></h3>
      <ul>
        {section.items.map((item, itemIndex) => {
          const id = `${sectionIndex}-${itemIndex}`;
          const checked = done.includes(id);
          return <li key={id}>
            <label className={checked ? "on" : ""}>
              <input type="checkbox" checked={checked} onChange={() => toggle(id)} />
              <span className="box" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
              <span><strong>{item.title}</strong> {item.detail}</span>
            </label>
          </li>;
        })}
      </ul>
    </section>)}
  </div>;
}
