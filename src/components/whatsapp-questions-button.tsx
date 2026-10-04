"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { whatsappContactPath, type WhatsappContactSource } from "@/lib/property-contact";
import {
  emptyQuestionChoices,
  moveInOptions,
  questionLines,
  questionsQuery,
  whatsappQuestionLabels,
  type MoveIn,
  type WhatsappQuestion,
} from "@/lib/whatsapp-questions";

// Optional: add a few ready questions to the first WhatsApp message. Writing without them is
// always one tap away.
export function WhatsappQuestionsButton({
  slug,
  source,
  suggested,
}: {
  slug: string;
  source: WhatsappContactSource;
  suggested: WhatsappQuestion[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [choices, setChoices] = useState(emptyQuestionChoices);
  const [openRequests, setOpenRequests] = useState(0);
  useEffect(() => {
    if (openRequests > 0 && !dialog.current?.open) dialog.current?.showModal();
  }, [openRequests]);
  const plainHref = whatsappContactPath(slug, source);
  const query = questionsQuery(choices);
  const lines = questionLines(choices);

  function toggle(code: WhatsappQuestion) {
    setChoices((current) => ({
      ...current,
      questions: current.questions.includes(code) ? current.questions.filter((item) => item !== code) : [...current.questions, code],
    }));
  }

  return (
    <>
      <button type="button" className="whatsapp-questions-trigger" onClick={() => setOpenRequests((count) => count + 1)}>
        Agregar preguntas al mensaje
      </button>
      {openRequests > 0 ? createPortal(<dialog ref={dialog} className="report-dialog" aria-labelledby={titleId} onClick={(event) => event.target === dialog.current && dialog.current?.close()}>
        <div className="report-dialog-body">
          <div className="report-dialog-head">
            <h2 id={titleId}>Preguntas para el dueño</h2>
            <button type="button" aria-label="Cerrar" onClick={() => dialog.current?.close()}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="report-dialog-hint">Marca lo que quieras. Se suma al mensaje y puedes cambiarlo en WhatsApp antes de enviarlo.</p>
          <div className="whatsapp-questions-row">
            <label className="report-dialog-note">
              <span>¿Cuántas personas vivirían?</span>
              <select value={choices.people ?? ""} onChange={(event) => setChoices({ ...choices, people: Number(event.target.value) || null })}>
                <option value="">Prefiero no decir</option>
                {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count === 6 ? "6 o más" : count}</option>)}
              </select>
            </label>
            <label className="report-dialog-note">
              <span>¿Cuándo te mudarías?</span>
              <select value={choices.moveIn ?? ""} onChange={(event) => setChoices({ ...choices, moveIn: (event.target.value || null) as MoveIn | null })}>
                <option value="">Prefiero no decir</option>
                {(Object.keys(moveInOptions) as MoveIn[]).map((key) => <option key={key} value={key}>{moveInOptions[key][0].toLocaleUpperCase("es") + moveInOptions[key].slice(1)}</option>)}
              </select>
            </label>
          </div>
          <label className="report-dialog-option">
            <input type="checkbox" checked={choices.pet} onChange={(event) => setChoices({ ...choices, pet: event.target.checked })} />
            <span>Tengo una mascota</span>
          </label>
          <fieldset>
            <legend>Preguntar también</legend>
            {suggested.map((code) => (
              <label key={code} className="report-dialog-option">
                <input type="checkbox" checked={choices.questions.includes(code)} onChange={() => toggle(code)} />
                <span>{whatsappQuestionLabels[code]}</span>
              </label>
            ))}
          </fieldset>
          {lines.length ? (
            <div className="whatsapp-questions-preview" aria-live="polite">
              <p>Se suma al mensaje:</p>
              <ul>{lines.map((line) => <li key={line}>{line}</li>)}</ul>
            </div>
          ) : null}
          <a className="report-dialog-submit zu-whatsapp-cta whatsapp-questions-send" href={query ? `${plainHref}&${query}` : plainHref} target="_blank" rel="noreferrer" onClick={() => dialog.current?.close()}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {lines.length ? "Abrir WhatsApp con mis preguntas" : "Abrir WhatsApp"}
          </a>
          <a className="whatsapp-questions-skip" href={plainHref} target="_blank" rel="noreferrer" onClick={() => dialog.current?.close()}>
            Escribir sin completar
          </a>
        </div>
      </dialog>, document.body) : null}
    </>
  );
}
