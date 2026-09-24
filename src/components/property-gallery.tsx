"use client";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Property } from "@/lib/properties";
import { getPropertyVideoUrl } from "@/lib/property-video";

export function PropertyGallery({ property }: { property: Property }) {
  const [active, setActive] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const photoCount = property.images.length;
  const videoUrl = getPropertyVideoUrl(property.video);
  const count = photoCount + (videoUrl ? 1 : 0);
  const showingVideo = Boolean(videoUrl && active === photoCount);
  const [videoFailed, setVideoFailed] = useState(false);
  const opened = active !== null;
  useEffect(() => {
    if (!opened) return;
    const node = dialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (node && !node.open) {
      if (typeof node.showModal === "function") node.showModal();
      else { node.setAttribute("open", ""); node.querySelector<HTMLButtonElement>("button")?.focus(); }
    }
    return () => {
      document.body.style.overflow = previous;
      if (typeof node?.close === "function") node.close();
      else node?.removeAttribute("open");
      trigger.current?.focus();
    };
  }, [opened]);
  function open(index: number) { trigger.current = document.activeElement as HTMLElement; setVideoFailed(false); setActive(index); }
  function move(direction: number) { setActive(index => index === null ? null : (index + direction + count) % count); }
  if (!count) return <div className="zu-empty"><Images size={30} /><p>Las fotos aún no están disponibles.</p></div>;
  return <>
    {photoCount > 0 && <div className={`property-gallery ${photoCount === 1 ? "single-photo" : ""}`}>
      <button type="button" className="gallery-main" onClick={() => open(0)} aria-label="Ver galería de fotos">
        <Image src={property.images[0]} alt={property.title} fill priority quality={72} sizes="(min-width: 1024px) 780px, 100vw" />
        <span><Images size={17} />{photoCount === 1 ? "Ver foto" : `Ver las ${photoCount} fotos`}</span>
      </button>
      {photoCount > 1 && <div className="gallery-side">{property.images.slice(1, 3).map((src, index) => <button key={src + index} type="button" onClick={() => open(index + 1)} aria-label={`Ver foto ${index + 2}`}><Image src={src} alt={`${property.title}, foto ${index + 2}`} fill sizes="400px" quality={72} /></button>)}</div>}
    </div>}
    {videoUrl && <div className="gallery-media-actions"><button type="button" className="zu-button zu-button-secondary" onClick={() => open(photoCount)}><Play size={16} aria-hidden="true" />Ver video</button></div>}
    {property.rentalDetails?.mediaNote && <p className="gallery-media-note">{property.rentalDetails.mediaNote}</p>}
    <dialog ref={dialog} className="gallery-dialog" onCancel={() => setActive(null)} onClose={() => setActive(null)} aria-modal="true" aria-label={`Galería: ${property.title}`} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); setActive(null); }
      if (event.target instanceof HTMLVideoElement) return;
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "Tab") {
        const buttons = event.currentTarget.querySelectorAll<HTMLElement>("button, video[controls], a[href]");
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      {active !== null && <>
        <div className="gallery-toolbar"><div><p>{property.title}</p><span aria-live="polite">{showingVideo ? "Video de la vivienda" : `Foto ${active + 1} de ${photoCount}`}</span></div><button type="button" onClick={() => setActive(null)} aria-label="Cerrar galería" title="Cerrar galería"><X size={23} /></button></div>
        <div className={`gallery-full-image${showingVideo ? " gallery-showing-video" : ""}`}>
          {showingVideo ? <div className="gallery-video-container">
            <video key={videoUrl} src={videoUrl!} controls playsInline preload="metadata" aria-label={`Video: ${property.title}`} onError={() => setVideoFailed(true)} />
            {videoFailed && <p role="alert">No se pudo reproducir el video. <a href={videoUrl!} target="_blank" rel="noreferrer">Abrir video</a></p>}
          </div> : <Image key={property.images[active]} src={property.images[active]} alt={`${property.title}, foto ${active + 1}`} width={1400} height={1000} sizes="(min-width: 1400px) 1280px, 100vw" quality={74} loading="eager" className="gallery-full-photo" />}
          {count > 1 && <><button type="button" className="gallery-prev" onClick={() => move(-1)} aria-label={videoUrl ? "Contenido anterior" : "Foto anterior"} title="Anterior"><ChevronLeft size={24} /></button><button type="button" className="gallery-next" onClick={() => move(1)} aria-label={videoUrl ? "Siguiente contenido" : "Siguiente foto"} title="Siguiente"><ChevronRight size={24} /></button></>}
        </div>
        <div className="gallery-thumbs">{property.images.map((src, index) => <button key={src + index} type="button" onClick={() => setActive(index)} aria-label={`Ir a foto ${index + 1}`} aria-pressed={active === index}><Image src={src} alt="" width={160} height={100} sizes="85px" quality={68} className="h-full w-full object-cover" /></button>)}{videoUrl && <button type="button" className="gallery-video-thumb" onClick={() => setActive(photoCount)} aria-label="Ir al video" aria-pressed={showingVideo}><Play size={19} aria-hidden="true" /><span>Video</span></button>}</div>
      </>}
    </dialog>
  </>;
}
