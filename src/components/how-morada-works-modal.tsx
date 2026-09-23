"use client";

import { ArrowRight, Route, Search, Tags, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

const steps = [
  {
    icon: Search,
    title: "Explora por intención",
    copy: "Elige operación, zona, presupuesto o etiqueta lifestyle sin navegar un catálogo saturado.",
  },
  {
    icon: Tags,
    title: "Compara con contexto",
    copy: "Las etiquetas resumen lo importante: mascotas, home office, colegios, luz y seguridad.",
  },
  {
    icon: Route,
    title: "Confirma el punto real",
    copy: "El mapa abre la misma latitud y longitud en Google Maps para evitar ubicaciones confusas.",
  },
];

export function HowZentroUrbanoWorksModal() {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12"
      >
        Cómo funciona Zentro Urbano
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-neutral-950/52 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            role="dialog"
            className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/30 bg-white text-neutral-950 shadow-[0_40px_120px_rgba(0,0,0,0.28)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5 sm:p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
                  Menos fricción
                </p>
                <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
                  Una búsqueda inmobiliaria que se entiende rápido.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 text-neutral-600 transition hover:border-neutral-950 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <p className="max-w-xl text-sm leading-6 text-neutral-600 sm:text-base sm:leading-7">
                Zentro Urbano evita registro público, anuncios sin curar y navegación corporativa. La
                experiencia se concentra en ver, filtrar, comparar, ubicar y contactar.
              </p>

              <div className="mt-6 grid gap-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef7ef] text-[#285340]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 border-b border-black/10 pb-4 last:border-b-0 last:pb-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                          0{index + 1}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold tracking-tight">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-neutral-600">{step.copy}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12"
                >
                  Cerrar
                </button>
                <Link
                  href="/propiedades"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Explorar propiedades
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
