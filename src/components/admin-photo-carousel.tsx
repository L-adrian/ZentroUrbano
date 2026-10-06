"use client";

import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import NextImage from "next/image";
import { useState, type KeyboardEvent } from "react";

export type AdminPhoto = { key: string; href: string };

// Every photo of a request in one place: a large view with arrows and a strip of thumbnails.
export function AdminPhotoCarousel({ photos, title }: { photos: AdminPhoto[]; title: string }) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) return null;
  const current = Math.min(index, photos.length - 1);
  const photo = photos[current];
  const go = (next: number) => setIndex((next + photos.length) % photos.length);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") { event.preventDefault(); go(current - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); go(current + 1); }
  }

  return (
    <div className="admin-carousel" role="region" aria-roledescription="carrusel" aria-label={`Fotos de ${title}`} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="admin-carousel-stage">
        <NextImage key={photo.key} src={photo.href} alt={`Foto ${current + 1} de ${photos.length}`} fill unoptimized sizes="(max-width: 760px) 100vw, 720px" className="object-contain" />
        {photos.length > 1 ? <>
          <button type="button" className="admin-carousel-arrow" data-side="left" onClick={() => go(current - 1)} aria-label="Foto anterior"><ChevronLeft size={20} aria-hidden="true" /></button>
          <button type="button" className="admin-carousel-arrow" data-side="right" onClick={() => go(current + 1)} aria-label="Foto siguiente"><ChevronRight size={20} aria-hidden="true" /></button>
        </> : null}
        <span className="admin-carousel-count" aria-live="polite">{current + 1} / {photos.length}</span>
        <a className="admin-carousel-open" href={photo.href} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />Original</a>
      </div>
      {photos.length > 1 ? (
        <div className="admin-carousel-thumbs">
          {photos.map((item, itemIndex) => (
            <button key={item.key} type="button" onClick={() => setIndex(itemIndex)} aria-label={`Ver foto ${itemIndex + 1}`} aria-current={itemIndex === current ? "true" : undefined}>
              <NextImage src={item.href} alt="" fill unoptimized sizes="88px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
