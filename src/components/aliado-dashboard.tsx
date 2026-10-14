"use client";

import { CalendarCheck, ExternalLink, Home, LogOut, MessageCircle, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AliadoBoard, normalizeLayout, type BoardCard, type BoardLayout } from "@/components/aliado-board";
import { MonthCard, ReportCard, TodoCard, savePanel, type Todo } from "@/components/aliado-log";
import { boliviaToday, type AliadoReport } from "@/lib/aliado-report-input";
import { PasswordSection } from "@/components/owner-profile-panel";
import { TeamAvatar } from "@/components/team-avatar";
import "./visits-team.css";

const sessionEventName = "morada-session";

export type AliadoVisit = {
  id: string;
  when: string;
  title: string;
  slug: string;
  visitorName: string;
  visitorWhatsapp: string;
  note: string | null;
  cancelled: boolean;
};

export type AliadoPanelData = {
  name: string;
  roleLabel: string;
  hasPassword: boolean;
  member: { name: string; slug: string; photoUrl: string | null; department: string; levelLabel: string; bio: string | null } | null;
  homes: { slug: string; title: string; zone: string; roleLabel: string; handlesVisits: boolean }[];
  // null while the visit tables are missing.
  visits: AliadoVisit[] | null;
  // The daily log of the last weeks; null while 012_aliado_reports is missing.
  reports: AliadoReport[] | null;
  panel: { layout: BoardLayout | null; todos: Todo[] } | null;
};

// Where each card starts; the aliado can drag them anywhere and the order is saved.
const defaultLayout: BoardLayout = {
  main: ["registro", "visitas", "viviendas", "contrasena"],
  side: ["mes", "pendientes", "reglas", "ayuda", "frase"],
};

// The panel is split in tabs so the aliado does not see everything at once; inside each tab the
// cards can still be dragged and ordered.
type AliadoTab = "registro" | "visitas" | "cuenta";
const aliadoTabs: Array<{ id: AliadoTab; label: string; cards: string[] }> = [
  { id: "registro", label: "Mi registro", cards: ["registro", "mes"] },
  { id: "visitas", label: "Visitas y pendientes", cards: ["visitas", "viviendas", "pendientes"] },
  { id: "cuenta", label: "Cuenta y reglas", cards: ["contrasena", "reglas", "ayuda", "frase"] },
];
const isAliadoTab = (value: string): value is AliadoTab => aliadoTabs.some((tab) => tab.id === value);

const secondaryButton =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950";
const card = "rounded-[28px] border border-black/10 bg-white p-5 sm:p-6";

// "Mi cuenta" for a Zentro aliado: only their own visits, the homes they work on and their
// password. No owner tools and no admin.
export function AliadoDashboard({ data }: { data: AliadoPanelData }) {
  const router = useRouter();
  const { member } = data;
  const upcoming = (data.visits ?? []).filter((visit) => !visit.cancelled);
  const [reports, setReports] = useState(data.reports);
  const [selectedDate, setSelectedDate] = useState(() => boliviaToday());
  const [month, setMonth] = useState(() => boliviaToday().slice(0, 7));
  const [loadedMonths, setLoadedMonths] = useState<string[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [tab, setTab] = useState<AliadoTab | null>(null);

  // The tab lives in the address (#visitas, #cuenta) so links and the back button keep it.
  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      setTab(isAliadoTab(hash) ? hash : null);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  // The panel arrives with the last weeks; older months load when the aliado opens them.
  async function openMonth(next: string) {
    setMonth(next);
    const loaded = reports?.some((report) => report.date.startsWith(next)) || loadedMonths.includes(next) || next >= boliviaToday().slice(0, 7);
    if (loaded) return;
    setLoadingMonth(true);
    try {
      const response = await fetch(`/api/cliente/reportes?mes=${next}`);
      const body = (await response.json().catch(() => ({}))) as { reports?: AliadoReport[] };
      if (response.ok && body.reports) {
        const fresh = body.reports;
        setReports((current) => [...(current ?? []).filter((report) => !report.date.startsWith(next)), ...fresh]);
        setLoadedMonths((current) => [...current, next]);
      }
    } finally {
      setLoadingMonth(false);
    }
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    if (!date.startsWith(month)) void openMonth(date.slice(0, 7));
  }

  async function logout() {
    const response = await fetch("/api/auth/signout", { method: "POST" });
    if (!response.ok) { window.alert("No se pudo cerrar la sesión. Intenta nuevamente."); return; }
    window.dispatchEvent(new Event(sessionEventName));
    router.push("/login");
  }

  const cards: BoardCard[] = [
    ...(reports !== null && member ? [{
      key: "registro",
      title: "Tu registro del día",
      node: <ReportCard reports={reports} setReports={(update) => setReports((current) => update(current ?? []))} selectedDate={selectedDate} setSelectedDate={selectDate} />,
    }, {
      key: "mes",
      title: "Tu mes",
      node: <MonthCard reports={reports} month={month} setMonth={openMonth} loading={loadingMonth} selectedDate={selectedDate} setSelectedDate={selectDate} />,
    }, {
      key: "pendientes",
      title: "Mis pendientes",
      node: <TodoCard initial={data.panel?.todos ?? []} />,
    }] : []),
    {
      key: "visitas",
      title: "Tus visitas",
      node: (
      <section className={card} aria-labelledby="aliado-visitas">
        <h2 id="aliado-visitas" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-950">
          <CalendarCheck className="h-5 w-5 text-[#087c65]" aria-hidden="true" />
          Tus visitas
        </h2>
        <p className="mt-1 text-sm text-neutral-600">Las visitas reservadas en la web de las viviendas donde tú muestras la casa.</p>
        {data.visits === null ? (
          <p className="mt-4 text-sm text-neutral-600">Las reservas de visita todavía no están activas.</p>
        ) : upcoming.length === 0 ? (
          <p className="mt-4 rounded-[18px] bg-neutral-50 p-4 text-sm text-neutral-600">Aún no tienes visitas. Cuando alguien reserve, aparece aquí con su nombre y su WhatsApp.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {upcoming.map((visit) => (
              <li key={visit.id} className="flex flex-wrap items-center gap-3 rounded-[20px] border border-black/10 p-4">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-semibold text-neutral-950 first-letter:uppercase">{visit.when}</p>
                  <p className="mt-1 text-sm text-neutral-700">
                    <Link href={`/propiedades/${visit.slug}`} className="underline-offset-2 hover:underline">{visit.title}</Link>
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">Visita: {visit.visitorName}{visit.note ? ` · “${visit.note}”` : ""}</p>
                </div>
                <a
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#087c65] px-4 text-sm font-semibold text-white transition hover:bg-[#06624f]"
                  href={`https://wa.me/${visit.visitorWhatsapp}?text=${encodeURIComponent(`Hola ${visit.visitorName}, soy ${member?.name ?? data.name}, ${data.roleLabel}. Te escribo por tu visita a "${visit.title}" el ${visit.when}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Escribirle
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      ),
    },
    {
      key: "viviendas",
      title: "Viviendas a tu cargo",
      node: (
      <section className={card} aria-labelledby="aliado-viviendas">
        <h2 id="aliado-viviendas" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-950">
          <Home className="h-5 w-5 text-[#087c65]" aria-hidden="true" />
          Viviendas a tu cargo
        </h2>
        {data.homes.length === 0 ? (
          <p className="mt-4 rounded-[18px] bg-neutral-50 p-4 text-sm text-neutral-600">Todavía no tienes viviendas asignadas. Zentro te las asigna cuando un dueño que ayudaste publica y se aprueba su anuncio.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {data.homes.map((home) => (
              <li key={home.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] border border-black/10 px-4 py-3">
                <Link href={`/propiedades/${home.slug}`} className="font-semibold text-neutral-950 underline-offset-2 hover:underline">{home.title}</Link>
                <span className="text-sm text-neutral-600">{home.roleLabel}{home.handlesVisits ? " · muestras la casa" : ""} · {home.zone}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      ),
    },
    { key: "contrasena", title: "Contraseña", node: <PasswordSection hasPassword={data.hasPassword} /> },
    {
      key: "reglas",
      title: "Reglas del Aliado Zentro",
      node: (
      <section className={card} aria-labelledby="aliado-reglas">
        <h2 id="aliado-reglas" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-950">
          <ShieldCheck className="h-5 w-5 text-[#087c65]" aria-hidden="true" />
          Reglas del Aliado Zentro
        </h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-neutral-700">
          <li>Nunca cobras comisión, ni al dueño ni al inquilino.</li>
          <li>No negocias el precio ni recibes dinero de nadie: eso lo hablan el dueño y el inquilino.</li>
          <li>Zentro te paga por cada anuncio aprobado.</li>
          <li>Te presentas como Aliado Zentro, nunca como agente o asesor.</li>
        </ul>
      </section>
      ),
    },
    {
      key: "ayuda",
      title: "¿Ayudas a un dueño a publicar?",
      node: (
      <section className={card} aria-labelledby="aliado-ayuda">
        <h2 id="aliado-ayuda" className="text-lg font-semibold tracking-tight text-neutral-950">¿Ayudas a un dueño a publicar?</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">El dueño crea su propia cuenta y publica desde su celular. Tú lo acompañas paso a paso.</p>
        <Link href="/equipo" className={`${secondaryButton} mt-4 w-full`}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Ver la guía del aliado
        </Link>
      </section>
      ),
    },
    ...(member?.bio ? [{
      key: "frase",
      title: "Tu frase en la web",
      node: (
          <section className={card}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#58745f]">Tu frase en la web</p>
            <p className="mt-2 text-sm leading-6 text-neutral-700">“{member.bio}”</p>
            <p className="mt-2 text-xs text-neutral-500">{member.levelLabel} en Nuestro equipo. Para cambiarla, escríbele a Zentro.</p>
          </section>
      ),
    }] : []),
  ];

  const available = new Set(cards.map((item) => item.key));
  const tabs = aliadoTabs.filter((item) => item.cards.some((key) => available.has(key)));
  const activeTab = tab && tabs.some((item) => item.id === tab) ? tab : tabs[0].id;
  const visibleCards = tabs.find((item) => item.id === activeTab)!.cards;

  function showTab(next: AliadoTab) {
    setTab(next);
    window.history.replaceState(null, "", next === tabs[0].id ? window.location.pathname + window.location.search : `#${next}`);
  }

  return (
    <div className="bg-neutral-50">
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 pb-3 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <TeamAvatar name={member?.name ?? data.name} photoUrl={member?.photoUrl ?? null} size={64} />
          <div className="min-w-0 flex-1 basis-56">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#58745f]">Panel de aliado</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere] sm:text-4xl">Hola, {member?.name ?? data.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600">
              <span className="rounded-full bg-[#eef7ef] px-3 py-1 text-xs font-semibold text-[#285340]">{data.roleLabel}</span>
              {member ? member.department : null}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {member ? (
              <Link href={`/nuestro-equipo#${member.slug}`} className={`${secondaryButton} flex-1 sm:flex-none`}>
                <UsersRound className="h-4 w-4" aria-hidden="true" />
                Mi perfil público
              </Link>
            ) : null}
            <button type="button" onClick={logout} className={secondaryButton} aria-label="Salir">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-8" aria-label="Secciones de tu panel">
          {tabs.map((item) => {
            const active = item.id === activeTab;
            const count = item.id === "visitas" && upcoming.length ? upcoming.length : null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => showTab(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 border-b-[3px] px-3 py-3 text-sm font-semibold transition ${active ? "border-[#087c65] text-[#087c65]" : "border-transparent text-neutral-600 hover:text-neutral-950"}`}
              >
                {item.label}
                {count !== null ? <span className={`rounded-full px-2 text-[11px] leading-5 ${active ? "bg-[#087c65] text-white" : "bg-neutral-100 text-neutral-800"}`}>{count}</span> : null}
              </button>
            );
          })}
        </nav>
      </section>

      {!member ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="rounded-[22px] border border-dashed border-black/15 bg-white p-5">
              <p className="text-base font-semibold text-neutral-950">Tu cuenta todavía no está unida a tu ficha del equipo</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Avísale a Zentro Urbano. Cuando la unamos, aquí vas a ver tus visitas y las viviendas a tu cargo.</p>
          </div>
        </div>
      ) : null}
      <AliadoBoard cards={cards} visible={visibleCards} layout={normalizeLayout(data.panel?.layout ?? null, defaultLayout, cards.map((item) => item.key))} defaults={defaultLayout} onSave={(next) => void savePanel({ action: "layout", layout: next })} />
    </div>
  );
}
