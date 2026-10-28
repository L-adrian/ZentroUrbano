"use client";

import {
  BarChart3,
  Bell,
  CalendarCheck,
  Check,
  Clock3,
  Copy,
  FileText,
  MessageCircle,
  Mic,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import type { UrbanitoSnapshot } from "@/lib/urbanito-input";

export type UrbanitoAccount = {
  linked: boolean;
  botUsername: string;
  // What the bot last reported; null until it does (or while 014_urbanito_snapshots is missing).
  snapshot: (UrbanitoSnapshot & { updatedAt: string }) | null;
  showChat: boolean;
};

const mascot = "/images/urbanito/urbanito.png";
// Only the mascot is pixel art; it is drawn on a 32 px grid and scaled by whole steps.
const mascotClass = "[image-rendering:pixelated] select-none";

const panel = "rounded-[22px] border border-black/10 bg-white p-5";
const heroClass =
  "relative overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#0f3b2b_0%,#14513a_55%,#1f7a55_100%)] text-white shadow-[0_20px_50px_rgb(15_59_43/0.25)]";
const heroDots = "pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.10)_1.2px,transparent_1.4px)] [background-size:16px_16px]";
const mintButton =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[#3fbf87] px-6 text-base font-bold text-[#0b2e21] shadow-[0_6px_0_#2a8f63] transition hover:bg-[#4fcf96] active:translate-y-[3px] active:shadow-[0_3px_0_#2a8f63] disabled:cursor-wait disabled:opacity-70";
const newTag = "inline-flex items-center gap-1.5 rounded-full bg-[#f2b33d] px-3 py-1 text-xs font-bold tracking-[0.06em] text-[#4a2c00]";

const examples = ["¿Quién vio mi depa?", "Recuérdame la visita de mañana", "Hazme la ficha en PDF"];

type CodeState = { code: string; minutes: number } | null;

// Asks the site for a code to send to the bot, or disconnects Telegram.
function useUrbanitoLink() {
  const router = useRouter();
  const [code, setCode] = useState<CodeState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(method: "POST" | "DELETE" | "PATCH", body?: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/cliente/urbanito", {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; minutes?: number; message?: string } | null;
      if (!response.ok || !result?.ok) throw new Error(result?.message || "No se pudo ahora. Intenta de nuevo.");
      if (method === "POST" && result.code) setCode({ code: result.code, minutes: result.minutes ?? 15 });
      else router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo ahora. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return {
    code,
    busy,
    error,
    requestCode: () => call("POST"),
    disconnect: () => {
      if (window.confirm("¿Desconectar Urbanito? Dejará de ver tus anuncios y visitas. Puedes volver a conectarlo cuando quieras.")) void call("DELETE");
    },
    setChatVisible: (visible: boolean) => call("PATCH", { mostrarChat: visible }),
  };
}

// Resumen: the big invitation while the owner has not connected Urbanito yet.
export function UrbanitoBanner({ greetingName, nextVisit, onOpen }: { greetingName: string; nextVisit: string | null; onOpen: () => void }) {
  const bubble = nextVisit ? `¡Hola, ${greetingName}! ${nextVisit} ¿Te lo recuerdo?` : `¡Hola, ${greetingName}! Te aviso de cada visita y te cuento quién vio tus anuncios.`;
  return (
    <section aria-labelledby="urbanito-banner-title" className={`${heroClass} grid items-center gap-2 p-5 sm:p-7 lg:grid-cols-[1.35fr_1fr]`}>
      <div className={heroDots} aria-hidden="true" />
      <div className="relative order-2 lg:order-1">
        <span className={newTag}>
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          NUEVO · GRATIS EN TELEGRAM
        </span>
        <h2 id="urbanito-banner-title" className="mt-3 max-w-[520px] text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          Conoce a Urbanito, tu asistente para alquilar
        </h2>
        <p className="mt-2 max-w-[540px] text-[15px] leading-6 text-[#d3ecdf]">
          Pregúntale por tus anuncios, quién los vio y tus visitas. Te avisa antes de cada visita y te arma la ficha de tu vivienda en PDF. Puedes hablarle con audios.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ejemplos de lo que le puedes pedir">
          {examples.map((example) => (
            <li key={example} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] font-semibold">{example}</li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <button type="button" onClick={onOpen} className={`${mintButton} w-full sm:w-auto`}>
            <Send className="h-[18px] w-[18px]" aria-hidden="true" />
            Conectar Urbanito
          </button>
          <span className="max-w-[240px] text-[13px] leading-5 text-[#a9d3bf]">Toma 1 minuto: te damos un código y se lo mandas por Telegram.</span>
        </div>
      </div>
      <div className="relative order-1 flex items-end gap-3 lg:order-2 lg:min-h-[270px] lg:flex-col lg:items-center lg:justify-end lg:gap-0">
        <p className="relative order-2 mb-6 flex-1 rounded-[16px] bg-[#fff] px-3.5 py-3 text-[13px] font-semibold leading-5 text-[#13231c] shadow-[0_10px_24px_rgb(0_0_0/0.2)] lg:order-1 lg:mb-3.5 lg:max-w-[260px] lg:flex-none lg:text-sm">
          {bubble}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- 64 px sprite scaled with pixelated rendering */}
        <img src={mascot} alt="Urbanito, la mascota de Zentro Urbano" width={64} height={64} className={`${mascotClass} order-1 h-[120px] w-[120px] drop-shadow-[0_10px_0_rgb(0_0_0/0.18)] lg:order-2 lg:h-[192px] lg:w-[192px]`} />
        <span className="hidden h-5 w-[200px] rounded-[50%] bg-black/20 lg:order-3 lg:-mt-3 lg:block" aria-hidden="true" />
      </div>
    </section>
  );
}

// Resumen once connected: a slim strip, so it does not take the page every day.
export function UrbanitoStrip({ botUsername, onOpen }: { botUsername: string; onOpen: () => void }) {
  return (
    <section aria-label="Urbanito" className="flex flex-wrap items-center gap-3 rounded-[20px] bg-[linear-gradient(120deg,#0f3b2b,#1f7a55)] p-3 pr-4 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- 64 px sprite scaled with pixelated rendering */}
      <img src={mascot} alt="" width={64} height={64} className={`${mascotClass} h-12 w-12`} />
      <div className="min-w-0 flex-1 basis-48">
        <p className="flex items-center gap-2 text-sm font-bold">
          Urbanito conectado
          <span className="inline-flex items-center gap-1 rounded-full bg-[#3fbf87] px-2 py-0.5 text-[11px] text-[#0b2e21]"><Check className="h-3 w-3" aria-hidden="true" />Activo</span>
        </p>
        <p className="text-[13px] text-[#cde6d9]">Te avisa de cada visita en Telegram. Pregúntale lo que quieras sobre tus anuncios.</p>
      </div>
      <button type="button" onClick={onOpen} className="h-10 cursor-pointer rounded-[12px] border border-white/25 px-3 text-sm font-semibold hover:bg-white/10">Ver qué hizo</button>
      <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#3fbf87] px-4 text-sm font-bold text-[#0b2e21]">
        <Send className="h-4 w-4" aria-hidden="true" />
        Abrir
      </a>
    </section>
  );
}

const dayTime = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const dayOnly = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "numeric", month: "short" });
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function UrbanitoTab({ account, ownerName, phone }: { account: UrbanitoAccount; ownerName: string; phone: string }) {
  return account.linked ? <LinkedTab account={account} ownerName={ownerName} phone={phone} /> : <ConnectTab botUsername={account.botUsername} />;
}

function ConnectTab({ botUsername }: { botUsername: string }) {
  const link = useUrbanitoLink();
  const [copied, setCopied] = useState(false);
  const botUrl = `https://t.me/${botUsername}`;
  const steps: Array<[string, string]> = [
    ["Toca «Conectar»", "Te damos un código de 6 letras."],
    ["Abre Urbanito en Telegram", "Se abre desde el botón. Si no tienes Telegram, lo bajas gratis."],
    ["Mándale el código", "Escribe /vincular y el código. Listo, ya te conoce."],
  ];

  async function copy(text: string) {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <section aria-labelledby="urbanito-connect-title" className={`${heroClass} grid items-center gap-5 p-5 sm:p-7 lg:grid-cols-[240px_1fr]`}>
        <div className={heroDots} aria-hidden="true" />
        <div className="relative flex items-end gap-3 lg:flex-col lg:items-center lg:gap-0">
          <p className="relative order-2 mb-6 flex-1 rounded-[16px] bg-[#fff] px-3.5 py-3 text-[13px] font-semibold leading-5 text-[#13231c] shadow-[0_10px_24px_rgb(0_0_0/0.2)] lg:order-1 lg:mb-3 lg:flex-none lg:text-sm">
            ¡Hola! Soy Urbanito. Te ayudo con tus anuncios desde Telegram.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- 64 px sprite scaled with pixelated rendering */}
          <img src={mascot} alt="Urbanito" width={64} height={64} className={`${mascotClass} order-1 h-[120px] w-[120px] lg:order-2 lg:h-[192px] lg:w-[192px]`} />
        </div>
        <div className="relative">
          <span className={newTag}>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            NUEVO · GRATIS EN TELEGRAM
          </span>
          <h2 id="urbanito-connect-title" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Conecta Urbanito en 3 pasos</h2>
          <ol className="mt-4 grid gap-2.5 md:grid-cols-3">
            {steps.map(([title, detail], index) => (
              <li key={title} className="flex gap-2.5 rounded-[14px] border border-white/15 bg-white/[0.08] p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2b33d] text-sm font-extrabold text-[#4a2c00]">{index + 1}</span>
                <span>
                  <strong className="block text-sm">{title}</strong>
                  <span className="text-[12.5px] leading-5 text-[#bfe0cf]">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[18px] bg-[#fff] p-4 text-[#13231c]">
            {link.code ? (
              <>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#5f6b65]">Envía esto a @{botUsername}</p>
                  <p className="font-mono text-2xl font-bold tracking-[0.08em] sm:text-3xl">/vincular {link.code.code}</p>
                  <p className="text-[12.5px] font-semibold text-[#a5660b]">Vale por {link.code.minutes} minutos. Cuando Urbanito te confirme, recarga esta página.</p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                  <button type="button" onClick={() => copy(`/vincular ${link.code?.code ?? ""}`)} className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[#cfe3d7] px-4 text-sm font-semibold text-[#0d4d36]">
                    {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                  <a href={botUrl} target="_blank" rel="noopener noreferrer" className={`${mintButton} flex-1`}>
                    <Send className="h-[18px] w-[18px]" aria-hidden="true" />
                    Abrir en Telegram
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="min-w-0 flex-1 basis-56 text-sm leading-6 text-[#3d4743]">Toca el botón y te damos tu código. Sirve solo para tu cuenta.</p>
                <button type="button" disabled={link.busy} onClick={link.requestCode} className={`${mintButton} w-full sm:w-auto`}>
                  <Send className="h-[18px] w-[18px]" aria-hidden="true" />
                  {link.busy ? "Un momento..." : "Conectar Urbanito"}
                </button>
              </>
            )}
          </div>
          {link.error ? <p role="alert" className="mt-2 text-sm font-semibold text-[#ffd7c9]">{link.error}</p> : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panel}>
          <PanelTitle icon={<Sparkles />}>Qué hace por ti</PanelTitle>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Ask icon={<Bell />} title="Te recuerda las visitas" detail="La noche antes o 1 h 30 antes, según la hora." />
            <Ask icon={<BarChart3 />} title="Te cuenta cómo van tus anuncios" detail="Quién los vio y quién te escribió." />
            <Ask icon={<FileText />} title="Te arma fichas en PDF" detail="Con tus fotos, listas para compartir." />
            <Ask icon={<Mic />} title="Entiende audios" detail="Le hablas como a una persona." />
          </div>
        </section>
        <section className={panel}>
          <PanelTitle icon={<ShieldCheck />}>Tus datos están seguros</PanelTitle>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Urbanito solo ve tus anuncios y tus visitas. No publica ni cambia nada en Zentro, y puedes desconectarlo cuando quieras desde aquí. Para que recuerde de qué hablaban, guarda la conversación 90 días; puedes borrarla antes escribiéndole /borrar.
          </p>
          <ChatBubbles chat={[{ rol: "user", texto: "¿Quién viene mañana?", cuando: null }, { rol: "assistant", texto: "Te cuento apenas tengas visitas reservadas, y te aviso antes de cada una.", cuando: null }]} />
        </section>
      </div>
    </>
  );
}

function LinkedTab({ account, ownerName, phone }: { account: UrbanitoAccount; ownerName: string; phone: string }) {
  const link = useUrbanitoLink();
  const snapshot = account.snapshot;
  const botUrl = `https://t.me/${account.botUsername}`;
  const totals = snapshot?.totales ?? null;

  return (
    <>
      <section aria-labelledby="urbanito-linked-title" className={`${heroClass} grid items-center gap-5 p-5 sm:p-7 lg:grid-cols-[180px_1fr_200px]`}>
        <div className={heroDots} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- 64 px sprite scaled with pixelated rendering */}
        <img src={mascot} alt="Urbanito" width={64} height={64} className={`${mascotClass} relative h-[128px] w-[128px] lg:h-[176px] lg:w-[176px]`} />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3fbf87] px-3 py-1 text-xs font-bold text-[#0b2e21]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Conectado
          </span>
          <h2 id="urbanito-linked-title" className="mt-2.5 text-2xl font-bold tracking-tight sm:text-[28px]">Urbanito ya trabaja para ti</h2>
          <p className="mt-2 text-[14.5px] leading-6 text-[#d3ecdf]">
            Conectado a Telegram como <strong className="text-white">{ownerName}</strong>{phone ? ` · ${phone}` : ""}. Ve tus anuncios y tus visitas, pero no puede cambiar nada en Zentro.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={botUrl} target="_blank" rel="noopener noreferrer" className={mintButton}>
              <Send className="h-[18px] w-[18px]" aria-hidden="true" />
              Abrir Urbanito en Telegram
            </a>
            <button type="button" disabled={link.busy} onClick={link.disconnect} className="cursor-pointer text-sm font-semibold text-[#bfe6d2] underline underline-offset-4 disabled:opacity-60">
              Desconectar
            </button>
          </div>
          {link.error ? <p role="alert" className="mt-2 text-sm font-semibold text-[#ffd7c9]">{link.error}</p> : null}
        </div>
        <dl className="relative grid grid-cols-3 gap-2 lg:grid-cols-1">
          {([
            [totals?.recordatorios, "recordatorios enviados"],
            [totals?.fichas, "fichas en PDF"],
            [totals?.preguntas, "preguntas respondidas"],
          ] as const).map(([value, label]) => (
            <div key={label} className="rounded-[14px] border border-white/15 bg-white/[0.09] px-3 py-2.5">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block text-xl font-bold leading-none lg:text-2xl">{value ?? "—"}</span>
                <span className="text-[12.5px] text-[#bfe0cf]">{label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {!snapshot ? (
        <p className="rounded-[18px] bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          Urbanito todavía no nos contó qué hizo. Escríbele algo en Telegram y en unos minutos verás aquí tus recordatorios y fichas.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className={panel}>
          <PanelTitle icon={<Bell />}>Próximos recordatorios</PanelTitle>
          <p className="mt-1 text-sm text-neutral-600">Urbanito te escribe por Telegram antes de cada visita.</p>
          {snapshot?.recordatorios.length ? (
            <ul className="mt-3">
              {snapshot.recordatorios.map((reminder) => {
                const [day, ...time] = capitalize(dayTime.format(new Date(reminder.cuando))).split(", ");
                return (
                  <li key={`${reminder.cuando}-${reminder.texto}`} className="grid grid-cols-[64px_1fr] items-center gap-x-3 gap-y-1.5 border-t border-black/10 py-3 sm:grid-cols-[64px_1fr_auto]">
                    <span className="rounded-[12px] bg-[#eef5f0] py-1.5 text-center text-xs leading-4">
                      <strong className="block text-[13px] text-[#0d4d36]">{day}</strong>
                      <span className="text-neutral-600">{time.join(" ")}</span>
                    </span>
                    <span className="text-sm font-semibold text-neutral-950">{reminder.texto}</span>
                    <span className="col-start-2 inline-flex items-center gap-1 justify-self-start rounded-full bg-[#e9f6ef] px-2.5 py-1 text-xs font-semibold text-[#176b4d] sm:col-start-3">
                      <Bell className="h-3 w-3" aria-hidden="true" />
                      Programado
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 rounded-[14px] bg-neutral-50 p-3 text-sm text-neutral-600">No hay recordatorios programados. Pídele «Recuérdame la visita de mañana».</p>
          )}
        </section>

        <section className={panel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <PanelTitle icon={<MessageCircle />}>Lo último que hablaron</PanelTitle>
              <p className="mt-1 text-sm text-neutral-600">Solo tú lo ves. Se borra a los 90 días.</p>
            </div>
            <Switch label="Mostrar la conversación aquí" checked={account.showChat} disabled={link.busy} onChange={(next) => void link.setChatVisible(next)} />
          </div>
          {!account.showChat ? (
            <p className="mt-3 rounded-[14px] bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">
              Elegiste no mostrar la conversación en Zentro. Urbanito ya no la manda, y la que había aquí se borró. Siguen en Telegram.
            </p>
          ) : snapshot?.chat.length ? (
            <ChatBubbles chat={snapshot.chat} />
          ) : (
            <p className="mt-3 rounded-[14px] bg-neutral-50 p-3 text-sm text-neutral-600">Cuando le escribas, verás aquí los últimos mensajes.</p>
          )}
          <p className="mt-3 text-xs leading-5 text-neutral-500">Para borrar todo lo que hablaron, escríbele /borrar a Urbanito.</p>
        </section>
      </div>

      <section className={panel}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <PanelTitle icon={<FileText />}>Fichas que te armó Urbanito</PanelTitle>
          <span className="text-sm text-neutral-600">Pídeselas de nuevo en Telegram para descargarlas o compartirlas.</span>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(snapshot?.fichas ?? []).map((ficha) => (
            <li key={`${ficha.creado}-${ficha.titulo}`} className="flex gap-3 rounded-[16px] border border-black/10 p-3">
              <span className="grid h-14 w-12 shrink-0 place-items-center rounded-[10px] bg-[#fbe9e5] text-[11px] font-bold text-[#c2412d]">PDF</span>
              <span className="min-w-0">
                <strong className="block text-sm text-neutral-950 [overflow-wrap:anywhere]">{ficha.titulo}</strong>
                <span className="text-[12.5px] text-neutral-600">Hecha el {dayOnly.format(new Date(ficha.creado))}{ficha.paginas ? ` · ${ficha.paginas} página${ficha.paginas === 1 ? "" : "s"}` : ""}</span>
              </span>
            </li>
          ))}
          <li className="flex flex-col items-center justify-center gap-1 rounded-[16px] border-2 border-dashed border-[#cfd8d2] p-4 text-center text-[13px] text-neutral-600">
            <strong className="text-[15px] text-neutral-950">Pedir una ficha nueva</strong>
            Escríbele «hazme la ficha de mi depa».
          </li>
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panel}>
          <PanelTitle icon={<Sparkles />}>Cosas que le puedes pedir</PanelTitle>
          <p className="mt-1 text-sm text-neutral-600">Escríbele o mándale un audio, como a una persona.</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Ask icon={<BarChart3 />} title="Tus anuncios" detail="«¿Cuál de mis casas tiene más vistas?»" />
            <Ask icon={<CalendarCheck />} title="Visitas" detail="«¿Quién viene esta semana?»" />
            <Ask icon={<Pencil />} title="Fichas" detail="«Hazme la ficha del depa con fotos»" />
            <Ask icon={<Clock3 />} title="Recordatorios" detail="«Avísame el viernes de pagar expensas»" />
          </div>
        </section>
        <section className={panel}>
          <PanelTitle icon={<ShieldCheck />}>Tu plan y tus datos</PanelTitle>
          {snapshot?.plan ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p>
                  <strong className="block text-[15px] text-neutral-950">Plan {snapshot.plan.nombre}</strong>
                  <span className="text-[13px] text-neutral-600">
                    {snapshot.plan.limite ? `${snapshot.plan.usados} de ${snapshot.plan.limite} archivos este mes` : `${snapshot.plan.usados} archivos este mes`}
                  </span>
                </p>
                <a href={botUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#176b4d] underline underline-offset-4">Ver planes</a>
              </div>
              {snapshot.plan.limite ? (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuenow={snapshot.plan.usados} aria-valuemin={0} aria-valuemax={snapshot.plan.limite} aria-label="Archivos usados este mes">
                  <div className="h-full rounded-full bg-[#176b4d]" style={{ width: `${Math.min(100, Math.round((snapshot.plan.usados / snapshot.plan.limite) * 100))}%` }} />
                </div>
              ) : null}
            </>
          ) : null}
          <ul className="mt-4 grid gap-2 text-sm leading-6 text-neutral-700">
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#176b4d]" aria-hidden="true" />Urbanito guarda la conversación 90 días para recordar de qué hablaban. Después se borra sola.</li>
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#176b4d]" aria-hidden="true" />Escríbele /borrar y elimina todo lo que hablaron.</li>
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#176b4d]" aria-hidden="true" />Si desconectas Urbanito, aquí se borra lo que nos contó.</li>
          </ul>
        </section>
      </div>
    </>
  );
}

function PanelTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-950">
      <span className="text-[#176b4d] [&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden="true">{icon}</span>
      {children}
    </h2>
  );
}

function Ask({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-[14px] border border-black/10 bg-[#fbfcfb] p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
        <span className="text-[#176b4d] [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">{icon}</span>
        {title}
      </p>
      <p className="mt-1 text-[13px] text-neutral-600">{detail}</p>
    </div>
  );
}

function ChatBubbles({ chat }: { chat: UrbanitoSnapshot["chat"] }) {
  return (
    <ol className="mt-3 flex flex-col gap-2 rounded-[16px] bg-[#f3f6f4] p-3.5" aria-label="Conversación con Urbanito">
      {chat.map((message, index) => (
        <li
          key={`${index}-${message.cuando ?? ""}`}
          className={`max-w-[85%] whitespace-pre-line rounded-[14px] px-3 py-2 text-[13.5px] leading-5 [overflow-wrap:anywhere] ${
            message.rol === "user" ? "self-end rounded-br-[4px] bg-[#176b4d] text-white" : "self-start rounded-bl-[4px] border border-black/10 bg-white text-neutral-900"
          }`}
        >
          <span className="sr-only">{message.rol === "user" ? "Tú: " : "Urbanito: "}</span>
          {message.texto}
        </li>
      ))}
    </ol>
  );
}

function Switch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition disabled:cursor-wait disabled:opacity-60 ${checked ? "bg-[#176b4d]" : "bg-neutral-300"}`}
    >
      <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${checked ? "left-[23px]" : "left-[3px]"}`} />
    </button>
  );
}
