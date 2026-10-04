"use client";

import { X } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  reportNoteMaxLength,
  reportReasons,
  supportHoursLabel,
  type ReportReason,
} from "@/lib/property-reports";
import { absoluteUrl, whatsappUrl } from "@/lib/site";

type Status = "idle" | "sending" | "sent" | "error";

// Reports are stored so the admin sees them; five "ya se alquiló" mark the listing as unconfirmed.
export function ReportListingButton({ slug }: { slug: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const supportLink = whatsappUrl(`Hola, quiero reportar este anuncio de Zentro Urbano: ${absoluteUrl(`/propiedades/${slug}`)}`);

  function open() {
    if (status !== "sent") {
      setStatus("idle");
      setMessage("");
    }
    dialog.current?.showModal();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason) {
      setMessage("Elige un motivo.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch(`/api/propiedades/${slug}/reportar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.message ?? "No pudimos guardar el aviso.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setMessage("No pudimos guardar el aviso. Revisa tu conexión.");
    }
  }

  return (
    <>
      <button type="button" className="report-listing-trigger" onClick={open}>
        Reportar este anuncio
      </button>
      <dialog ref={dialog} className="report-dialog" aria-labelledby={titleId} onClick={(event) => event.target === dialog.current && dialog.current?.close()}>
        <div className="report-dialog-body">
          <div className="report-dialog-head">
            <h2 id={titleId}>Reportar este anuncio</h2>
            <button type="button" aria-label="Cerrar" onClick={() => dialog.current?.close()}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {status === "sent" ? (
            <div className="report-dialog-done" role="status">
              <p>Gracias, recibimos tu aviso. Lo revisamos {supportHoursLabel}.</p>
              {reason === "pidio_dinero" ? (
                <p>
                  No pagues nada antes de visitar la vivienda. Si ya pagaste o te sientes en riesgo,{" "}
                  <a href={supportLink} target="_blank" rel="noreferrer">escríbenos por WhatsApp</a>.
                </p>
              ) : null}
              <button type="button" className="report-dialog-submit" onClick={() => dialog.current?.close()}>
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <fieldset>
                <legend>¿Qué pasó?</legend>
                {(Object.keys(reportReasons) as ReportReason[]).map((key) => (
                  <label key={key} className="report-dialog-option">
                    <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} />
                    <span>{reportReasons[key]}</span>
                  </label>
                ))}
              </fieldset>
              <label className="report-dialog-note">
                <span>Detalle (opcional)</span>
                <textarea
                  value={note}
                  maxLength={reportNoteMaxLength}
                  rows={3}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ej.: el dueño me dijo que ya la alquiló."
                />
              </label>
              <p className="report-dialog-hint">No escribas datos bancarios ni contraseñas. No guardamos tu nombre ni tu número.</p>
              {message ? (
                <p className="report-dialog-error" role="alert">
                  {message}{" "}
                  {status === "error" ? <a href={supportLink} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a> : null}
                </p>
              ) : null}
              <button type="submit" className="report-dialog-submit" disabled={status === "sending"}>
                {status === "sending" ? "Enviando..." : "Enviar aviso"}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
