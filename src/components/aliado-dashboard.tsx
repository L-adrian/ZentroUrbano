"use client";

import { CalendarCheck, ExternalLink, Home, LogOut, MessageCircle, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
};

const secondaryButton =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950";
const card = "rounded-[28px] border border-black/10 bg-white p-5 sm:p-6";

// "Mi cuenta" for a Zentro aliado: only their own visits, the homes they work on and their
// password. No owner tools and no admin.
export function AliadoDashboard({ data }: { data: AliadoPanelData }) {
  const router = useRouter();
  const { member } = data;
  const upcoming = (data.visits ?? []).filter((visit) => !visit.cancelled);

  async function logout() {
    const response = await fetch("/api/auth/signout", { method: "POST" });
    if (!response.ok) { window.alert("No se pudo cerrar la sesión. Intenta nuevamente."); return; }
    window.dispatchEvent(new Event(sessionEventName));
    router.push("/login");
  }

  return (
    <div className="bg-neutral-50">
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 pb-5 pt-6 sm:px-6 sm:pt-8 lg:px-8">
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
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="grid min-w-0 content-start gap-6">
          {!member ? (
            <div className="rounded-[22px] border border-dashed border-black/15 bg-white p-5">
              <p className="text-base font-semibold text-neutral-950">Tu cuenta todavía no está unida a tu ficha del equipo</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Avísale a Zentro Urbano. Cuando la unamos, aquí vas a ver tus visitas y las viviendas a tu cargo.</p>
            </div>
          ) : null}

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

          <PasswordSection hasPassword={data.hasPassword} />
        </div>

        <aside className="grid content-start gap-6">
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
          <section className={card} aria-labelledby="aliado-ayuda">
            <h2 id="aliado-ayuda" className="text-lg font-semibold tracking-tight text-neutral-950">¿Ayudas a un dueño a publicar?</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">El dueño crea su propia cuenta y publica desde su celular. Tú lo acompañas paso a paso.</p>
            <Link href="/equipo" className={`${secondaryButton} mt-4 w-full`}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Ver la guía del aliado
            </Link>
          </section>
          {member?.bio ? (
            <section className={card}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#58745f]">Tu frase en la web</p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">“{member.bio}”</p>
              <p className="mt-2 text-xs text-neutral-500">{member.levelLabel} en Nuestro equipo. Para cambiarla, escríbele a Zentro.</p>
            </section>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
