"use client";

import { Check, Copy, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

export function PublicationGuideActions({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const text = "Esto necesitas para publicar tu vivienda en alquiler directo en Zentro Urbano.";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage("Enlace copiado.");
      setShowLink(false);
    } catch {
      setCopied(false);
      setMessage("No se pudo copiar automáticamente. Puedes seleccionar el enlace.");
      setShowLink(true);
    }
  }

  async function share() {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: "Qué necesitas para publicar | Zentro Urbano", text, url });
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await copyLink();
    }
  }

  return <div className="guide-actions guide-screen-only">
    <div className="guide-action-buttons">
      <button type="button" className="zu-button zu-button-secondary" onClick={share}><Share2 size={16} aria-hidden="true" />Compartir</button>
      <a className="zu-icon-button" href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartir requisitos por WhatsApp" title="Compartir por WhatsApp"><WhatsAppIcon /></a>
      <button type="button" className="zu-icon-button" onClick={copyLink} aria-label="Copiar enlace" title="Copiar enlace">{copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}</button>
      <button type="button" className="zu-icon-button" onClick={() => window.print()} aria-label="Imprimir o guardar como PDF" title="Imprimir o guardar como PDF"><Printer size={18} aria-hidden="true" /></button>
    </div>
    <p className="guide-action-status" role="status">{message}</p>
    {showLink && <label className="guide-share-fallback">Enlace de la guía<input readOnly value={url} onFocus={event => event.target.select()} /></label>}
  </div>;
}
