"use client";
import dynamic from "next/dynamic";
import { Box, LoaderCircle, X } from "lucide-react";
import { Component, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";
import type { PublicTour } from "@/lib/property-tour-contract";
import "./property-tour.css";

const Viewer = dynamic(() => import("./property-tour-viewer"), { ssr: false, loading: () => <div className="tour-loading" role="status"><LoaderCircle className="tour-spin" />Cargando recorrido</div> });

class TourErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? <p className="tour-loading" role="alert">No se pudo cargar el visor. Cierra el recorrido para volver a las fotos.</p> : this.props.children; }
}

export function PropertyTourButton({ tour, preview = false }: { tour: PublicTour; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const [viewed, setViewed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useId();
  const report = useCallback((event: string, extra: Record<string, unknown> = {}) => {
    if (!preview) trackAnalyticsEvent(event, { property_slug: tour.slug, tour_revision: tour.revision, ...extra });
  }, [preview, tour.slug, tour.revision]);
  const ready = useCallback(() => { setViewed(true); report("property_tour_ready"); }, [report]);
  const error = useCallback(() => report("property_tour_error"), [report]);
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    const button = trigger.current;
    const overflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    node?.showModal();
    return () => { node?.close(); document.body.style.overflow = overflow; document.documentElement.style.overflow = rootOverflow; button?.focus(); };
  }, [open]);
  useEffect(() => {
    if (!viewed || preview) return;
    const contact = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.("a[href]");
      if (anchor && new URL((anchor as HTMLAnchorElement).href).pathname === `/api/propiedades/${tour.slug}/whatsapp`) report("property_tour_whatsapp_click");
    };
    document.addEventListener("click", contact, true);
    return () => document.removeEventListener("click", contact, true);
  }, [viewed, preview, report, tour.slug]);
  return <>
    <button ref={trigger} type="button" className="zu-button zu-button-secondary" onClick={() => { setOpen(true); report("property_tour_open"); }}><Box size={17} aria-hidden="true" />{preview ? "Revisar en 3D" : "Explorar en 3D"}<span className="tour-beta">Experimental</span></button>
    {open && <dialog ref={dialog} className="property-tour-dialog" aria-labelledby={heading} onCancel={event => { event.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)}>
      <div className="tour-shell">
        <header className="tour-heading"><div><h2 id={heading}>{tour.scope}</h2><span>{preview ? "Vista privada del administrador" : "Recorrido 3D experimental"}</span></div><button type="button" className="tour-icon" onClick={() => setOpen(false)} aria-label="Cerrar recorrido" title="Cerrar recorrido" autoFocus><X size={22} /></button></header>
        <TourErrorBoundary onError={error}><Viewer tour={tour} preview={preview} onReady={ready} onError={error} /></TourErrorBoundary>
      </div>
    </dialog>}
  </>;
}
