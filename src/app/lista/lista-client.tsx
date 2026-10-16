"use client";

import { useEffect, useState } from "react";
import { Backpack, BrickWall, Check, Download, Droplets, FilePen, MessageCircle, MoonStar, PartyPopper, RotateCcw, Share2, TriangleAlert, Zap } from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";
import { listaKit, listaPdfPath, listaSections, listaTags, listaTotal } from "@/lib/lista";

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

const problemsKey = "zu-lista-problemas";

// One look per topic, in the same order as listaSections.
const sectionLooks = [
  { icon: Droplets, tone: "agua" },
  { icon: Zap, tone: "luz" },
  { icon: BrickWall, tone: "pared" },
  { icon: MoonStar, tone: "zona" },
  { icon: FilePen, tone: "firma" },
];

function readSaved(key: string) {
  const saved = JSON.parse(window.localStorage.getItem(key) ?? "[]");
  return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : [];
}

function Ring({ value, total }: { value: number; total: number }) {
  const r = 15, c = 2 * Math.PI * r;
  return <svg className="prog" viewBox="0 0 36 36" aria-hidden="true">
    <circle cx="18" cy="18" r={r} />
    <circle cx="18" cy="18" r={r} strokeDasharray={c} strokeDashoffset={c - (value / total) * c} />
  </svg>;
}

// Tickable copy of the PDF, for people who do the visit with the phone in hand.
// Each point is "revisado" or "hay un problema"; problems become the questions for the owner.
// Marks live only in this browser so a reload mid-visit keeps them.
export function Checklist() {
  const [done, setDone] = useState<string[]>([]);
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => {
    try {
      // Restoring browser-only state after hydration, so the server HTML stays the same.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(readSaved(storageKey));
      setProblems(readSaved(problemsKey));
    } catch {
      // Storage can be blocked; the list still works without it.
    }
  }, []);

  function save(nextDone: string[], nextProblems: string[]) {
    setDone(nextDone);
    setProblems(nextProblems);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextDone));
      window.localStorage.setItem(problemsKey, JSON.stringify(nextProblems));
    } catch {
      // Ignore: marks just won't survive a reload.
    }
  }

  function toggle(id: string) {
    if (done.includes(id)) save(done.filter(value => value !== id), problems);
    else save([...done, id], problems.filter(value => value !== id));
  }

  function flag(id: string) {
    if (problems.includes(id)) save(done, problems.filter(value => value !== id));
    else save(done.filter(value => value !== id), [...problems, id]);
  }

  const seen = done.length + problems.length;
  const problemItems = listaSections.flatMap((section, sectionIndex) => section.items
    .map((item, itemIndex) => ({ id: `${sectionIndex}-${itemIndex}`, item }))
    .filter(({ id }) => problems.includes(id)));
  const message = `Hola, vi el depa y quería consultarte estos puntos:\n${problemItems.map(({ item }) => `- ${item.title}`).join("\n")}`;

  return <div className="lst-check">
    <aside className="lst-side">
      <div className="lst-total">
        <div className="lst-total-ring"><Ring value={seen} total={listaTotal} /><strong>{seen}</strong></div>
        <div>
          <b>{seen === listaTotal ? "¡Revisaste todo!" : seen === 0 ? "Empezá por donde quieras" : "Vas bien, seguí"}</b>
          <span>{seen} de {listaTotal} puntos{problems.length > 0 && <> · <em>{problems.length} con problema</em></>}</span>
        </div>
        {seen > 0 && <button type="button" onClick={() => save([], [])} aria-label="Empezar de nuevo"><RotateCcw size={15} /></button>}
      </div>
      <nav className="lst-nav" aria-label="Temas de la lista">
        {listaSections.map((section, sectionIndex) => {
          const look = sectionLooks[sectionIndex];
          const Glyph = look.icon;
          const count = section.items.filter((_, itemIndex) => [...done, ...problems].includes(`${sectionIndex}-${itemIndex}`)).length;
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
        const look = sectionLooks[sectionIndex];
        const Glyph = look.icon;
        const count = section.items.filter((_, itemIndex) => [...done, ...problems].includes(`${sectionIndex}-${itemIndex}`)).length;
        return <section key={section.title} id={`tema-${sectionIndex}`} className={`lst-sec t-${look.tone}`}>
          <header>
            <span className="ico"><Glyph size={22} aria-hidden="true" /></span>
            <div>
              <small>Tema {sectionIndex + 1} de {listaSections.length}</small>
              <h3>{section.title}</h3>
            </div>
            <span className="sec-count"><Ring value={count} total={section.items.length} /><span>{count}/{section.items.length}</span></span>
          </header>
          <ul>
            {section.items.map((item, itemIndex) => {
              const id = `${sectionIndex}-${itemIndex}`;
              const checked = done.includes(id);
              const bad = problems.includes(id);
              const tag = listaTags[item.title] ?? {};
              return <li key={id} className={checked ? "on" : bad ? "bad" : ""}>
                <label>
                  <input type="checkbox" checked={checked} onChange={() => toggle(id)} />
                  <span className="box" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
                  <span className="txt">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    {(tag.kit || tag.ask || tag.serious) && <span className="tags">
                      {tag.kit && <span className="tag kit"><Backpack size={13} aria-hidden="true" />Llevá {tag.kit}</span>}
                      {tag.ask && <span className="tag ask"><MessageCircle size={13} aria-hidden="true" />Preguntale al dueño</span>}
                      {tag.serious && <span className="tag grave"><TriangleAlert size={13} aria-hidden="true" />Si lo ves, es serio</span>}
                    </span>}
                  </span>
                </label>
                <button type="button" className="flag" aria-pressed={bad} aria-label={`${item.title} Marcar que hay un problema`} title="Marcar que hay un problema" onClick={() => flag(id)}>
                  <TriangleAlert size={15} aria-hidden="true" /><span>{bad ? "Hay un problema" : "¿Problema?"}</span>
                </button>
              </li>;
            })}
          </ul>
        </section>;
      })}

      <section className={`lst-result${problemItems.length ? " has" : ""}`}>
        {problemItems.length === 0
          ? <><PartyPopper size={26} aria-hidden="true" /><div><h3>Lo que falle, anotalo acá</h3><p>Tocá <b>⚠ ¿Problema?</b> en cualquier punto y se junta en esta lista para que se lo preguntes al dueño antes de firmar.</p></div></>
          : <><TriangleAlert size={26} aria-hidden="true" /><div>
            <h3>{problemItems.length === 1 ? "1 punto para hablar con el dueño" : `${problemItems.length} puntos para hablar con el dueño`}</h3>
            <ul>{problemItems.map(({ id, item }) => <li key={id}>{item.title}</li>)}</ul>
            <a className="btn wa" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("lista_share", { method: "whatsapp_problemas" })}><MessageCircle size={18} />Mandarle estas preguntas</a>
          </div></>}
      </section>
    </div>
  </div>;
}
