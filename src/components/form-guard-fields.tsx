"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Browser side of src/lib/form-guard.ts: fetches the signed form ticket when the form opens,
// renders the invisible field and, when the site has Turnstile keys, the "I am a person" box.

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

export type FormGuard = {
  ticket: string;
  siteKey: string | null;
  turnstileToken: string;
  // Fields to add to the JSON body; the invisible field is read from the submitted form.
  fields: (form: HTMLFormElement | null) => Record<string, string>;
  // After a refused or finished attempt: a new ticket and, if shown, a new Turnstile check.
  renew: () => void;
  setTurnstileToken: (token: string) => void;
  resetSignal: number;
};

export function useFormGuard(purpose: "registro" | "visita", active = true): FormGuard {
  const [ticket, setTicket] = useState("");
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetch(`/api/form-ticket?para=${purpose}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { ticket?: string; turnstileSiteKey?: string | null }) => {
        if (cancelled) return;
        setTicket(typeof data.ticket === "string" ? data.ticket : "");
        setSiteKey(typeof data.turnstileSiteKey === "string" ? data.turnstileSiteKey : null);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [purpose, active, round]);

  const renew = useCallback(() => {
    setRound((value) => value + 1);
    setTurnstileToken("");
    setResetSignal((value) => value + 1);
  }, []);

  return {
    ticket,
    siteKey,
    turnstileToken,
    fields: (form) => ({ ticket, turnstile: turnstileToken, sitioWeb: readHoneypot(form) }),
    renew,
    setTurnstileToken,
    resetSignal,
  };
}

// Off-screen field; people using a screen reader are told to leave it empty.
export function HoneypotField() {
  return (
    <div className="form-trap" aria-hidden="true">
      <label>
        Sitio web (deja este campo vacío)
        <input type="text" name="sitioWeb" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export function readHoneypot(form: HTMLFormElement | null) {
  const input = form?.elements.namedItem("sitioWeb");
  return input instanceof HTMLInputElement ? input.value : "";
}

let turnstileScript: Promise<void> | null = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  turnstileScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { turnstileScript = null; reject(new Error("turnstile")); };
    document.head.appendChild(script);
  });
  return turnstileScript;
}

export function TurnstileBox({ guard }: { guard: FormGuard }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const { siteKey, setTurnstileToken, resetSignal } = guard;

  useEffect(() => {
    if (!siteKey || !boxRef.current) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return;
        widgetRef.current = window.turnstile.render(boxRef.current, {
          sitekey: siteKey,
          language: "es",
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => setTurnstileToken(""),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [siteKey, setTurnstileToken]);

  useEffect(() => {
    if (resetSignal && widgetRef.current && window.turnstile) window.turnstile.reset(widgetRef.current);
  }, [resetSignal]);

  return siteKey ? <div ref={boxRef} className="form-turnstile" /> : null;
}
