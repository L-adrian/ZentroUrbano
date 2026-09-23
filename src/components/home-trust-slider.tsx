"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

const trustMessages = [
  {
    name: "Ana R.",
    role: "Busca alquiler",
    avatar: "/images/testimonials/experience-avatar-1.webp",
    title: "Comparar sin perder tiempo.",
    copy: "La ficha se entiende rápido: fotos, zona, precio y contacto están en el mismo lugar.",
  },
  {
    name: "Marcelo V.",
    role: "Propietario",
    avatar: "/images/testimonials/experience-avatar-2.webp",
    title: "Más orden que un post suelto.",
    copy: "Una propiedad se ve más seria cuando tiene mapa, galería, datos claros y un link para compartir.",
  },
  {
    name: "Lucía M.",
    role: "Familia",
    avatar: "/images/testimonials/experience-avatar-4.webp",
    title: "Menos ruido, mejor decisión.",
    copy: "Filtrar por zona, operación y presupuesto ayuda a revisar opciones sin navegar un catálogo saturado.",
  },
  {
    name: "Diego P.",
    role: "Asesor inmobiliario",
    avatar: "/images/testimonials/experience-avatar-3.webp",
    title: "La ficha ayuda a vender mejor.",
    copy: "Para mandar una propiedad por WhatsApp, un link bien presentado genera más confianza que solo fotos.",
  },
];

export function HomeTrustSlider() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function scrollToCard(index: number) {
    const scroller = scrollerRef.current;
    const target = scroller?.children[index] as HTMLElement | undefined;

    if (!scroller || !target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
    setActiveIndex(index);
  }

  function updateActiveIndex() {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const children = Array.from(scroller.children) as HTMLElement[];
    const nextIndex = children.reduce(
      (closestIndex, child, index) => {
        const currentDistance = Math.abs(child.offsetLeft - scroller.scrollLeft);
        const closestDistance = Math.abs(children[closestIndex].offsetLeft - scroller.scrollLeft);

        return currentDistance < closestDistance ? index : closestIndex;
      },
      0,
    );

    setActiveIndex(nextIndex);
  }

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
              Experiencias representativas
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
              Lo que una ficha bien presentada debe transmitir.
            </h2>
          </div>
          <div className="flex items-end justify-between gap-4 sm:block">
            <p className="max-w-sm text-sm leading-6 text-neutral-600">
              Avatares generados y comentarios representativos mientras reunimos reseñas
              verificadas.
            </p>
            <div className="hidden gap-2 sm:mt-4 sm:flex sm:justify-end">
              <SliderButton
                label="Comentario anterior"
                onClick={() => scrollToCard(Math.max(activeIndex - 1, 0))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </SliderButton>
              <SliderButton
                label="Comentario siguiente"
                onClick={() => scrollToCard(Math.min(activeIndex + 1, trustMessages.length - 1))}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </SliderButton>
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          onScroll={updateActiveIndex}
          className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {trustMessages.map((message) => (
            <article
              key={message.title}
              className="min-w-[86%] snap-start rounded-[28px] border border-black/10 bg-neutral-50 p-5 sm:min-w-[410px] lg:min-w-[31%]"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-neutral-200">
                  <Image
                    src={message.avatar}
                    alt={`${message.name}, persona ficticia para comentario representativo`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-neutral-950">
                    {message.name}
                  </p>
                  <p className="text-sm font-medium text-neutral-500">{message.role}</p>
                </div>
              </div>

              <div className="mt-5 flex gap-1 text-[#d6a16b]" aria-label="Cinco estrellas">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-neutral-950">
                {message.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{message.copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 sm:hidden">
          <div className="flex gap-1.5">
            {trustMessages.map((message, index) => (
              <button
                key={message.title}
                type="button"
                onClick={() => scrollToCard(index)}
                className={`h-2 rounded-full transition ${
                  activeIndex === index ? "w-6 bg-neutral-950" : "w-2 bg-neutral-300"
                }`}
                aria-label={`Ver comentario ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <SliderButton
              label="Comentario anterior"
              onClick={() => scrollToCard(Math.max(activeIndex - 1, 0))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </SliderButton>
            <SliderButton
              label="Comentario siguiente"
              onClick={() => scrollToCard(Math.min(activeIndex + 1, trustMessages.length - 1))}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </SliderButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function SliderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-950 shadow-sm transition hover:border-neutral-950"
      aria-label={label}
    >
      {children}
    </button>
  );
}
