"use client";
import Image from "next/image";
import { AlertTriangle, ArrowLeft, ArrowRight, Box, Images, LoaderCircle, MessageCircle, RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { TOUR_DISCLAIMER, type PublicTour } from "@/lib/property-tour-contract";
import TourScene, { type TourActions } from "./property-tour-scene";
import TourMovement from "./property-tour-movement";

export default function PropertyTourViewer({ tour, preview, onReady, onError }: { tour: PublicTour; preview: boolean; onReady: () => void; onError: () => void }) {
  const [original, setOriginal] = useState(false);
  const [index, setIndex] = useState(0);
  const [quality, setQuality] = useState("auto");
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [limit, setLimit] = useState(false);
  const actions = useRef<TourActions | null>(null);
  const reported = useRef(false);
  const ready = useCallback(() => { setStatus("ready"); if (!reported.current) { reported.current = true; onReady(); } }, [onReady]);
  const fail = useCallback(() => { setStatus("error"); onError(); }, [onError]);
  function restart() { setStatus("loading"); setAttempt(value => value + 1); }
  return <>
    <div className="tour-toolbar">
      <div className="tour-tabs" role="group" aria-label="Vista del recorrido"><button type="button" aria-pressed={!original} onClick={() => { if (original) restart(); setOriginal(false); }}><Box size={16} />3D</button><button type="button" aria-pressed={original} onClick={() => setOriginal(true)}><Images size={16} />Fotos originales</button></div>
      {!original && <div className="tour-settings"><select aria-label="Calidad del recorrido" value={quality} onChange={event => { setQuality(event.target.value); setStatus("loading"); }}><option value="auto">Automática</option><option value="mobile">Ligera</option><option value="high">Alta calidad</option></select><button type="button" className="tour-icon" title="Restablecer cámara" aria-label="Restablecer cámara" disabled={status !== "ready"} onClick={() => { actions.current?.reset(); setLimit(false); }}><RotateCcw size={18} /></button></div>}
    </div>
    <div className="tour-canvas-area">
      {original ? <div className="tour-original"><Image src={tour.photos[index].src} alt={tour.photos[index].label} fill sizes="100vw" quality={74} /><div className="tour-photo-paging"><button className="tour-icon" title="Foto anterior" aria-label="Foto anterior" type="button" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft size={18} /></button><span>{index + 1} / {tour.photos.length}</span><button className="tour-icon" title="Foto siguiente" aria-label="Foto siguiente" type="button" disabled={index === tour.photos.length - 1} onClick={() => setIndex(i => i + 1)}><ArrowRight size={18} /></button></div></div> : <>
        {status !== "error" && <TourScene key={`${attempt}-${quality}`} tour={tour} quality={quality} actionsRef={actions} onReady={ready} onError={fail} onLimitChange={setLimit} />}
        {status === "loading" && <div className="tour-loading" role="status"><LoaderCircle className="tour-spin" />Cargando ambiente 3D</div>}
        {status === "error" && <div className="tour-error" role="alert"><AlertTriangle size={25} /><p>No se pudo abrir el recorrido en este dispositivo.</p><div><button className="zu-button zu-button-secondary" type="button" onClick={restart}><RotateCcw size={16} />Reintentar</button><button className="zu-button zu-button-primary" type="button" onClick={() => setOriginal(true)}><Images size={16} />Ver fotos</button></div></div>}
        {status === "ready" && <TourMovement actions={actions} limit={limit} />}
      </>}
    </div>
    <div className="tour-disclaimer"><AlertTriangle size={16} aria-hidden="true" /><p>{TOUR_DISCLAIMER}</p></div>
    <footer className="tour-footer"><small>Generado con World Labs / Marble</small>{!preview && <a className="zu-button zu-button-primary" href={`/api/propiedades/${tour.slug}/whatsapp`} target="_blank" rel="noreferrer"><MessageCircle size={17} />Contactar al propietario</a>}</footer>
  </>;
}
