"use client";

import { Check, Copy, Download, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import type { Property } from "@/lib/properties";
import { ownerShareText, shareImagePath } from "@/lib/share-kit";

// Mi cuenta: text and image the owner shares by hand in Facebook groups or WhatsApp.
// Nothing is posted or sent automatically; each button only copies, downloads or opens WhatsApp.
export function OwnerShareKit({ property }: { property: Property }) {
  const text = ownerShareText(property);
  const area = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState<"ok" | "manual" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      // Without clipboard access the text is selected so the owner can copy it.
      area.current?.focus();
      area.current?.select();
      setCopied("manual");
    }
  }

  return (
    <details className="owner-share-kit">
      <summary>
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Comparte tu anuncio
      </summary>
      <div className="owner-share-kit-body">
        <p className="owner-share-kit-hint">Pega este texto en grupos de Facebook o en WhatsApp. El enlace muestra tu foto de portada y el precio.</p>
        <label className="owner-share-kit-label" htmlFor={`share-text-${property.slug}`}>Texto listo para pegar</label>
        <textarea
          ref={area}
          id={`share-text-${property.slug}`}
          readOnly
          value={text}
          rows={5}
          className="owner-share-kit-text"
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="owner-share-kit-actions">
          <button type="button" onClick={copy} className="owner-share-kit-primary">
            {copied === "ok" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            Copiar texto para Facebook / WhatsApp
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="owner-share-kit-secondary">
            <WhatsAppIcon className="h-4 w-4" />
            Abrir WhatsApp con el texto
          </a>
          <a href={shareImagePath(property.slug)} download={`zentro-urbano-${property.slug}.png`} className="owner-share-kit-secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar imagen para compartir
          </a>
        </div>
        <p role="status" className="owner-share-kit-status">
          {copied === "ok" ? "Texto copiado. Pégalo donde quieras compartirlo." : copied === "manual" ? "Seleccionamos el texto: cópialo con el menú de tu teléfono o con Ctrl+C." : ""}
        </p>
      </div>
    </details>
  );
}
