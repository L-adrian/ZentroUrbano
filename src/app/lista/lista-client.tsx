"use client";

import { useEffect, useState } from "react";
import { Backpack, BrickWall, Check, Download, Droplets, FilePen, Flame, House, ListChecks, MoonStar, RotateCcw, Share2, ShieldAlert, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";
import { listaItems, listaKit, listaLegacyIds, listaPdfPath, listaSections, listaTotal } from "@/lib/lista";
import { CasitaWalk } from "./lista-casita";
import { ItemRow, ProblemsCard, Ring, type ListaMarks } from "./lista-items";

const storageKey = "zu-lista-v2";
const legacyKey = "zu-lista-marcados";
const modeKey = "zu-lista-modo";

const emptyMarks: ListaMarks = { done: [], problems: [], rooms: [] };
const knownIds = new Set(listaItems.map(item => item.id));

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

// Marks saved by the first 27-point page were positions ("2-4"); they map to ids through listaLegacyIds.
function readMarks(): ListaMarks {
  const saved = window.localStorage.getItem(storageKey);
  if (saved) {
    const parsed = JSON.parse(saved) as Partial<ListaMarks>;
    return { done: strings(parsed.done).filter(id => knownIds.has(id)), problems: strings(parsed.problems).filter(id => knownIds.has(id)), rooms: strings(parsed.rooms) };
  }
  const legacy = strings(JSON.parse(window.localStorage.getItem(legacyKey) ?? "[]"));
  const done = legacy.map(key => {
    const [section, item] = key.split("-").map(Number);
    return listaLegacyIds[section]?.[item];
  }).filter((id): id is string => Boolean(id));
  return { ...emptyMarks, done };
}

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

// One look per topic; a topic without one falls back to the brand color.
const sectionLooks: Record<string, { icon: LucideIcon; tone: string }> = {
  "Agua y lluvia": { icon: Droplets, tone: "agua" },
  "Luz y servicios": { icon: Zap, tone: "luz" },
  "Cocina, gas y lavado": { icon: Flame, tone: "gas" },
  "Paredes, techo y estructura": { icon: BrickWall, tone: "pared" },
  "Seguridad y edificio": { icon: ShieldCheck, tone: "segu" },
  "La zona y el clima": { icon: MoonStar, tone: "zona" },
  "Que no te estafen": { icon: ShieldAlert, tone: "estafa" },
  "Antes de firmar": { icon: FilePen, tone: "firma" },
};
const defaultLook = { icon: FilePen, tone: "firma" };


// Tickable copy of the PDF, for people who do the visit with the phone in hand. Two ways to walk it:
// by topic, or room by room on the pixel house ("Recorrer el depa"). Both share the same marks.
// Each point is "revisado" or "hay un problema"; problems become the questions for the owner.
// Marks live only in this browser so a reload mid-visit keeps them.
export function Checklist() {
  const [marks, setMarks] = useState<ListaMarks>(emptyMarks);
  const [mode, setMode] = useState<"casa" | "tema">("casa");

  useEffect(() => {
    try {
      // Restoring browser-only state after hydration, so the server HTML stays the same.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMarks(readMarks());
      if (window.localStorage.getItem(modeKey) === "tema") setMode("tema");
    } catch {
      // Storage can be blocked; the list still works without it.
    }
  }, []);

  function save(next: ListaMarks) {
    setMarks(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore: marks just won't survive a reload.
    }
  }

  function toggle(id: string) {
    if (marks.done.includes(id)) save({ ...marks, done: marks.done.filter(value => value !== id) });
    else save({ ...marks, done: [...marks.done, id], problems: marks.problems.filter(value => value !== id) });
  }

  function flag(id: string) {
    if (marks.problems.includes(id)) save({ ...marks, problems: marks.problems.filter(value => value !== id) });
    else save({ ...marks, done: marks.done.filter(value => value !== id), problems: [...marks.problems, id] });
  }

  function pickMode(next: "casa" | "tema") {
    setMode(next);
    trackAnalyticsEvent("lista_modo", { modo: next });
    try { window.localStorage.setItem(modeKey, next); } catch { /* only a preference */ }
  }

  return <div className="lst-modes">
    <div className="lst-tabs" role="tablist" aria-label="Cómo querés recorrer la lista">
      <button type="button" role="tab" aria-selected={mode === "casa"} onClick={() => pickMode("casa")}><House size={17} aria-hidden="true" />Recorrer el depa <span>Nuevo</span></button>
      <button type="button" role="tab" aria-selected={mode === "tema"} onClick={() => pickMode("tema")}><ListChecks size={17} aria-hidden="true" />Por tema</button>
    </div>
    {mode === "casa"
      ? <CasitaWalk marks={marks} save={save} onToggle={toggle} onFlag={flag} onReset={() => save(emptyMarks)} />
      : <TopicView marks={marks} onToggle={toggle} onFlag={flag} onReset={() => save(emptyMarks)} />}
  </div>;
}

function TopicView({ marks, onToggle, onFlag, onReset }: { marks: ListaMarks; onToggle: (id: string) => void; onFlag: (id: string) => void; onReset: () => void }) {
  const marked = new Set([...marks.done, ...marks.problems]);
  const seen = marked.size;
  return <div className="lst-check">
    <aside className="lst-side">
      <div className="lst-total">
        <div className="lst-total-ring"><Ring value={seen} total={listaTotal} /><strong>{seen}</strong></div>
        <div>
          <b>{seen === listaTotal ? "¡Revisaste todo!" : seen === 0 ? "Empezá por donde quieras" : "Vas bien, seguí"}</b>
          <span>{seen} de {listaTotal} puntos{marks.problems.length > 0 && <> · <em>{marks.problems.length} con problema</em></>}</span>
        </div>
        {seen > 0 && <button type="button" onClick={onReset} aria-label="Empezar de nuevo"><RotateCcw size={15} /></button>}
      </div>
      <nav className="lst-nav" aria-label="Temas de la lista">
        {listaSections.map((section, sectionIndex) => {
          const look = sectionLooks[section.title] ?? defaultLook;
          const Glyph = look.icon;
          const count = section.items.filter(item => marked.has(item.id)).length;
          const complete = count === section.items.length;
          return <a key={section.title} href={`#tema-${sectionIndex}`} className={`t-${look.tone}${complete ? " full" : ""}`}>
            <span className="ico">{complete ? <Check size={16} strokeWidth={3} /> : <Glyph size={16} />}</span>
            <span className="name">{section.title}</span>
            <span className="cnt">{count}/{section.items.length}</span>
          </a>;
        })}
      </nav>
      <div className="lst-kit">
        <b><Backpack size={16} aria-hidden="true" />Llevá a la visita</b>
        <ul>{listaKit.map(thing => <li key={thing}>{thing}</li>)}</ul>
      </div>
    </aside>

    <div className="lst-main">
      {listaSections.map((section, sectionIndex) => {
        const look = sectionLooks[section.title] ?? defaultLook;
        const Glyph = look.icon;
        const count = section.items.filter(item => marked.has(item.id)).length;
        return <section key={section.title} id={`tema-${sectionIndex}`} className={`lst-sec t-${look.tone}`}>
          <header>
            <span className="ico"><Glyph size={22} aria-hidden="true" /></span>
            <div>
              <small>Tema {sectionIndex + 1} de {listaSections.length}</small>
              <h3>{section.title}</h3>
            </div>
            <span className="sec-count"><Ring value={count} total={section.items.length} /><span>{count}/{section.items.length}</span></span>
          </header>
          <ul>{section.items.map(item => <ItemRow key={item.id} item={item} marks={marks} onToggle={onToggle} onFlag={onFlag} />)}</ul>
        </section>;
      })}
      <ProblemsCard marks={marks} />
    </div>
  </div>;
}
