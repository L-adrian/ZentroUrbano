"use client";

import { Check, Copy, Send } from "lucide-react";
import { useState } from "react";

type Props = { linked: boolean; botUsername: string };
type State = { step: "idle" } | { step: "code"; code: string; minutes: number } | { step: "linked" };

// Mi cuenta: connects the owner's account to Urbanito, the Telegram assistant, with a short code.
// Once connected, the owner can ask Urbanito about their homes, views and visits.
export function UrbanitoConnect({ linked, botUsername }: Props) {
  const [state, setState] = useState<State>(linked ? { step: "linked" } : { step: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const botUrl = `https://t.me/${botUsername}`;

  async function send(method: "POST" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/cliente/urbanito", { method, headers: { "Content-Type": "application/json" } });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; code?: string; minutes?: number; message?: string } | null;
      if (!response.ok || !body?.ok) throw new Error(body?.message || "No se pudo ahora. Intenta de nuevo.");
      setState(method === "POST" && body.code ? { step: "code", code: body.code, minutes: body.minutes ?? 15 } : { step: "idle" });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo ahora. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section aria-label="Urbanito en Telegram" className="rounded-[28px] border border-black/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#58745f]">Urbanito en Telegram</p>
      {state.step === "linked" ? (
        <>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-950">
            <Check className="h-4 w-4 text-[#176b4d]" aria-hidden="true" />
            Tu cuenta está conectada
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Pregúntale a Urbanito cuántas personas vieron tus anuncios o qué visitas tienes.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={botUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white">
              <Send className="h-4 w-4" aria-hidden="true" />
              Abrir Urbanito
            </a>
            <button type="button" disabled={busy} onClick={() => send("DELETE")} className="inline-flex h-10 cursor-pointer items-center rounded-full border border-black/10 px-4 text-sm font-semibold text-neutral-700 hover:border-neutral-950 disabled:opacity-60">
              Desconectar
            </button>
          </div>
        </>
      ) : state.step === "code" ? (
        <>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Envía este mensaje a @{botUsername} en Telegram:</p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-[16px] border border-black/10 bg-neutral-50 px-3 py-2">
            <code className="text-base font-semibold tracking-wide text-neutral-950">/vincular {state.code}</code>
            <button type="button" onClick={() => copy(`/vincular ${state.code}`)} className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#176b4d]">
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-neutral-500">El código vale {state.minutes} minutos. Cuando Urbanito te confirme, recarga esta página.</p>
          <a href={botUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white">
            <Send className="h-4 w-4" aria-hidden="true" />
            Abrir Telegram
          </a>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Tu asistente en Telegram. Conecta tu cuenta y pregúntale por tus anuncios, las personas que los vieron y tus próximas visitas.
          </p>
          <button type="button" disabled={busy} onClick={() => send("POST")} className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
            <Send className="h-4 w-4" aria-hidden="true" />
            {busy ? "Un momento..." : "Conectar Urbanito"}
          </button>
        </>
      )}
      {error ? <p role="alert" className="mt-2 text-xs leading-5 text-red-700">{error}</p> : null}
    </section>
  );
}
