"use client";

import { ArrowRight, Check, ChevronDown, House, MapPin } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RegionFlag } from "@/components/region-flag";
import { bolivia, defaultDepartment, departmentCookieName, findDepartment } from "@/lib/regions";

// Pages whose listings follow the chosen department; a first visit to one of them asks for it.
const askOn = new Set(["/", "/propiedades", "/mapa"]);

function readChoice() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${departmentCookieName}=([^;]*)`));
  return findDepartment(match?.[1]);
}

const choiceEvent = "zu-departamento";
function subscribe(onChange: () => void) {
  window.addEventListener(choiceEvent, onChange);
  return () => window.removeEventListener(choiceEvent, onChange);
}

function saveChoice(slug: string) {
  // No expiry: a session cookie, gone when the browser closes, so the next visit asks again.
  document.cookie = `${departmentCookieName}=${slug}; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  document.documentElement.dataset.departamento = slug;
  window.dispatchEvent(new Event(choiceEvent));
}

function DepartmentList({ selected, onPick, name }: { selected: string; onPick: (slug: string) => void; name: string }) {
  return <div className="region-options" role="radiogroup" aria-label="Departamento">
    {bolivia.departments.map((department) => <label key={department.slug} className={department.slug === selected ? "is-selected" : undefined}>
      <input type="radio" name={name} value={department.slug} checked={department.slug === selected} onChange={() => onPick(department.slug)} />
      <RegionFlag code={department.slug} />
      <span><strong>{department.name}</strong><small>{department.capital}</small></span>
      {department.slug === selected && <Check size={16} className="region-check" aria-hidden="true" />}
    </label>)}
  </div>;
}

export function RegionPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const current = useSyncExternalStore(subscribe, () => readChoice()?.slug ?? defaultDepartment.slug, () => defaultDepartment.slug);
  const [open, setOpen] = useState(false);
  const [welcomePick, setWelcomePick] = useState(defaultDepartment.slug);
  const menu = useRef<HTMLDivElement>(null);
  const welcome = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (readChoice() || !askOn.has(pathname)) return;
    // Wait for the first-visit splash to leave before asking.
    const html = document.documentElement;
    const show = () => { if (!html.classList.contains("zu-splash-on") && !welcome.current?.open) welcome.current?.showModal(); };
    if (!html.classList.contains("zu-splash-on")) { show(); return; }
    const observer = new MutationObserver(() => { if (!html.classList.contains("zu-splash-on")) { observer.disconnect(); show(); } });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: Event) => { if (menu.current && !menu.current.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); window.removeEventListener("keydown", escape); };
  }, [open]);

  function choose(slug: string) {
    const changed = slug !== readChoice()?.slug;
    saveChoice(slug);
    setOpen(false);
    if (welcome.current?.open) welcome.current.close();
    if (changed) router.refresh();
  }

  const department = findDepartment(current) ?? defaultDepartment;
  const picked = findDepartment(welcomePick) ?? defaultDepartment;

  return <>
    <div ref={menu} className="region-menu">
      <button type="button" className="region-chip" aria-expanded={open} aria-haspopup="true" aria-label={`${department.name}, ${bolivia.name}. Cambiar de ciudad`} onClick={() => setOpen((value) => !value)} title="Cambiar de ciudad">
        <MapPin size={16} aria-hidden="true" />
        <span>{department.name}</span>
        <RegionFlag code={bolivia.code} />
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && <div className="region-dropdown">
        <p className="region-country"><RegionFlag code={bolivia.code} className="region-flag is-country" />{bolivia.name}</p>
        <p className="region-label">Departamento</p>
        <DepartmentList selected={current} onPick={choose} name="region-menu" />
      </div>}
    </div>
    {/* Closing it without choosing (Esc) keeps Santa Cruz, so it does not ask again this session. */}
    <dialog ref={welcome} className="region-welcome" aria-labelledby="region-welcome-title" onCancel={() => choose(defaultDepartment.slug)}>
      <form method="dialog" onSubmit={(event) => { event.preventDefault(); choose(welcomePick); }}>
        <p className="zu-logo" aria-hidden="true"><span className="logo-mark"><House size={20} strokeWidth={1.8} /></span><span>Zentro<span className="logo-accent">Urbano</span></span></p>
        <h2 id="region-welcome-title">¿Dónde estás buscando alquiler?</h2>
        <p>Te mostramos las casas y departamentos de esa ciudad, directo con el dueño.</p>
        <DepartmentList selected={welcomePick} onPick={setWelcomePick} name="region-welcome" />
        <button type="submit" className="zu-button zu-button-primary" autoFocus>Ver alquileres en {picked.name}<ArrowRight size={17} /></button>
        <small>Puedes cambiar de ciudad cuando quieras desde el menú de arriba.</small>
      </form>
    </dialog>
  </>;
}
