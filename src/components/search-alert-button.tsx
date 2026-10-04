"use client";

import { BellRing, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { supportHoursLabel } from "@/lib/property-reports";
import { normalizeAlertEmail, normalizeAlertWhatsapp, searchAlertConsentText, searchAlertLimits } from "@/lib/search-alert-input";

type Status = "idle" | "sending" | "sent" | "error";

// "Avísame cuando haya una así": saves the search and a contact with consent. Until the
// alerts table exists on the server, the form offers the same search by WhatsApp instead.
export function SearchAlertButton({
  params,
  summary,
  whatsappHref,
  className,
  label = "Avísame cuando haya una así",
}: {
  params: string;
  summary: string;
  whatsappHref: string;
  className?: string;
  label?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  const [openRequests, setOpenRequests] = useState(0);
  useEffect(() => {
    if (openRequests > 0 && !dialog.current?.open) dialog.current?.showModal();
  }, [openRequests]);

  function open() {
    if (status !== "sent") {
      setStatus("idle");
      setMessage("");
    }
    setOpenRequests((count) => count + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const whatsapp = normalizeAlertWhatsapp(contact);
    const email = whatsapp ? null : normalizeAlertEmail(contact);
    if (!whatsapp && !email) {
      setMessage("Escribe un WhatsApp de Bolivia (8 dígitos) o un correo.");
      return;
    }
    if (!consent) {
      setMessage("Marca la casilla para que podamos guardar tu contacto.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/alertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp, email, params, summary, consent }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; fallback?: string };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setFallback(data.fallback === "whatsapp");
        setMessage(data.message ?? "No pudimos guardar tu alerta.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setFallback(true);
      setMessage("No pudimos guardar tu alerta. Revisa tu conexión.");
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={open}>
        <BellRing size={17} aria-hidden="true" />
        {label}
      </button>
      {openRequests > 0 ? createPortal(<dialog ref={dialog} className="report-dialog" aria-labelledby={titleId} onClick={(event) => event.target === dialog.current && dialog.current?.close()}>
        <div className="report-dialog-body">
          <div className="report-dialog-head">
            <h2 id={titleId}>Te avisamos cuando haya una así</h2>
            <button type="button" aria-label="Cerrar" onClick={() => dialog.current?.close()}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {status === "sent" ? (
            <div className="report-dialog-done" role="status">
              <p>Listo, guardamos tu alerta: {summary}.</p>
              <p>Cuando se publique una vivienda así, te escribimos nosotros ({supportHoursLabel}). Cada aviso trae un enlace para darte de baja.</p>
              <button type="button" className="report-dialog-submit" onClick={() => dialog.current?.close()}>
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p className="search-alert-summary">Tu búsqueda: <strong>{summary}</strong></p>
              <label className="report-dialog-note">
                <span>Tu nombre (opcional)</span>
                <input value={name} maxLength={searchAlertLimits.name} autoComplete="given-name" onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="report-dialog-note">
                <span>WhatsApp o correo</span>
                <input value={contact} maxLength={searchAlertLimits.email} autoComplete="tel" placeholder="Ej.: 71234567 o tu@correo.com" onChange={(event) => setContact(event.target.value)} />
              </label>
              <label className="report-dialog-option">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>{searchAlertConsentText}</span>
              </label>
              <p className="report-dialog-hint">Solo lo usamos para esta alerta. No lo compartimos con los dueños.</p>
              {message ? (
                <p className="report-dialog-error" role="alert">
                  {message}{" "}
                  {status === "error" && fallback ? <a href={whatsappHref} target="_blank" rel="noreferrer">Enviar mi búsqueda por WhatsApp</a> : null}
                </p>
              ) : null}
              <button type="submit" className="report-dialog-submit" disabled={status === "sending"}>
                {status === "sending" ? "Guardando..." : "Guardar alerta"}
              </button>
            </form>
          )}
        </div>
      </dialog>, document.body) : null}
    </>
  );
}
