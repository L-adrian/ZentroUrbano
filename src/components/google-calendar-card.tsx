"use client";

import { CalendarCheck, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type Status = { configured: boolean; ready: boolean; connected: boolean; email: string | null; lastSyncAt: string | null; lastError: string | null };

const button =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-[13px] font-semibold text-neutral-900 transition hover:border-[#176b4d] disabled:cursor-not-allowed disabled:opacity-50";
const timeLabel = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
// A page of the API that sends the person to Google: a plain link, not a client-side route.
const connectHref = "/api/cliente/google-calendar/conectar";
const returnMessages: Record<string, string> = {
  conectado: "Listo. Tus eventos ya van a tu Google Calendar.",
  cancelado: "No se conectó: cancelaste en Google.",
  "sin-permiso": "Falta marcar el permiso del calendario en la ventana de Google. Prueba otra vez.",
  "no-configurado": "Google Calendar todavía no está activado en Zentro.",
  "no-listo": "Google Calendar todavía no está listo. Intenta más tarde.",
  error: "No se pudo conectar con Google. Intenta de nuevo.",
};

// Google Calendar in Mi cuenta: connect, see the last sync, sync now or disconnect. Zentro only
// adds and updates its own events; nothing else in the person's calendar is read or touched.
export function GoogleCalendarCard({ subject = "Tus visitas, llamadas, firmas y avisos" }: { subject?: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<"sync" | "off" | null>(null);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let live = true;
    const back = new URLSearchParams(window.location.search).get("google");
    const note = back ? returnMessages[back] : undefined;
    if (note) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("google");
      window.history.replaceState(null, "", clean.pathname + clean.search + clean.hash);
    }
    fetch("/api/cliente/google-calendar", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (!live) return;
        if (result.ok) setStatus(result.status);
        if (note) setMessage(note);
      })
      .catch(() => live && note && setMessage(note));
    return () => {
      live = false;
    };
  }, []);

  async function act(kind: "sync" | "off") {
    if (busy) return;
    setBusy(kind);
    setMessage("");
    try {
      const response = await fetch("/api/cliente/google-calendar", { method: kind === "sync" ? "POST" : "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudo.");
      setStatus(result.status);
      setConfirming(false);
      if (kind === "sync") setMessage(result.result?.message ?? (result.result?.written || result.result?.removed ? `Listo: ${result.result.written} actualizados, ${result.result.removed} quitados.` : "Todo estaba al día."));
      else setMessage("Desconectado. Quitamos de Google los eventos que venían de Zentro.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo.");
    } finally {
      setBusy(null);
    }
  }

  const off = !status || !status.configured || !status.ready;
  return (
    <div className="self-start rounded-[8px] border border-black/10 bg-white px-4 py-3 text-[13px] leading-5 text-neutral-600">
      <p className="flex items-center gap-2 font-semibold text-neutral-900">
        <CalendarCheck className="h-4 w-4 text-[#176b4d]" aria-hidden="true" />
        Google Calendar{status?.connected ? " · conectado" : off && status ? " · pronto" : ""}
      </p>
      {!status ? (
        <p className="mt-1 text-neutral-500">Cargando…</p>
      ) : off ? (
        <p className="mt-1">
          Muy pronto vas a poder conectarlo. Mientras tanto, con <b className="font-semibold text-neutral-800">Bajar al celular</b> tus próximos eventos pasan al calendario de tu teléfono.
        </p>
      ) : status.connected ? (
        <>
          <p className="mt-1">
            {subject} de los próximos 60 días se copian solos a {status.email ? <b className="font-semibold text-neutral-800">{status.email}</b> : "tu Google Calendar"}.
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">
            {status.lastError ? <span className="font-semibold text-red-700">{status.lastError}</span> : status.lastSyncAt ? `Última vez: ${timeLabel.format(new Date(status.lastSyncAt))}` : "Copiando por primera vez…"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {status.lastError?.includes("conectar") ? (
              <a className={button} href={connectHref}>Volver a conectar</a>
            ) : (
              <button type="button" className={button} disabled={busy !== null} onClick={() => act("sync")}>
                {busy === "sync" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                Sincronizar ahora
              </button>
            )}
            {confirming ? (
              <>
                <button type="button" className={`${button} border-red-300 text-red-900`} disabled={busy !== null} onClick={() => act("off")}>Sí, desconectar</button>
                <button type="button" className={button} onClick={() => setConfirming(false)}>No</button>
              </>
            ) : (
              <button type="button" className={button} onClick={() => setConfirming(true)}>Desconectar</button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-1">{subject} se copian solos a tu Google Calendar, con el aviso de Google en tu celular. Zentro no lee ni cambia tus otros eventos.</p>
          <a className="mt-2 inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#176b4d] px-3.5 text-[13px] font-semibold text-white hover:bg-[#10533b]" href={connectHref}>
            Conectar Google Calendar
          </a>
        </>
      )}
      {message ? <p className="mt-2 text-[12.5px] font-semibold text-[#0d4d36]" role="status">{message}</p> : null}
    </div>
  );
}
