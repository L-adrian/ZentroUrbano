"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type Ref } from "react";
import type { Property } from "@/lib/properties";

type PropertyMapProps = {
  properties: Property[];
  eyebrow?: string;
  title?: string;
  description?: string;
  sectionClassName?: string;
  containerClassName?: string;
  headerClassName?: string;
  mapClassName?: string;
  showZoneShortcuts?: boolean;
  loadOnView?: boolean;
  eagerOnDesktop?: boolean;
};

type LeafletPropertyMapComponent = ComponentType<PropertyMapProps>;

export function PropertyMap({
  properties,
  eyebrow,
  title,
  description,
  sectionClassName,
  containerClassName,
  headerClassName,
  mapClassName,
  showZoneShortcuts,
  loadOnView = false,
  eagerOnDesktop = false,
}: PropertyMapProps) {
  const [LeafletPropertyMap, setLeafletPropertyMap] =
    useState<LeafletPropertyMapComponent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const shouldLoadMap = !loadOnView || hasEnteredView || eagerOnDesktop || loadAttempt > 0;
  const fallbackRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!loadOnView || shouldLoadMap) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setHasEnteredView(true), 0);
      return () => window.clearTimeout(timer);
    }

    const fallbackElement = fallbackRef.current;

    if (!fallbackElement) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px 0px" },
    );

    observer.observe(fallbackElement);

    return () => observer.disconnect();
  }, [loadOnView, shouldLoadMap]);

  useEffect(() => {
    if (!shouldLoadMap) {
      return;
    }

    let isActive = true;

    import("@/components/leaflet-property-map")
      .then((mod) => {
        if (isActive) {
          setLeafletPropertyMap(() => mod.LeafletPropertyMap);
        }
      })
      .catch(() => {
        if (isActive) {
          setLeafletPropertyMap(null);
          setLoadError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [loadAttempt, shouldLoadMap]);

  if (!shouldLoadMap || !LeafletPropertyMap) {
    return (
      <MapFallback
        ref={fallbackRef}
        eyebrow={eyebrow}
        title={title}
        description={description}
        sectionClassName={sectionClassName}
        containerClassName={containerClassName}
        headerClassName={headerClassName}
        mapClassName={mapClassName}
        hasError={loadError}
        isDeferred={!shouldLoadMap}
        onRetry={() => {
          setHasEnteredView(true);
          setLoadError(false);
          setLoadAttempt((value) => value + 1);
        }}
      />
    );
  }

  return (
    <LeafletPropertyMap
      properties={properties}
      eyebrow={eyebrow}
      title={title}
      description={description}
      sectionClassName={sectionClassName}
      containerClassName={containerClassName}
      headerClassName={headerClassName}
      mapClassName={mapClassName}
      showZoneShortcuts={showZoneShortcuts}
    />
  );
}

function MapFallback({
  ref,
  eyebrow = "Mapa real",
  title = "Explora Santa Cruz desde el mapa.",
  description,
  sectionClassName = "bg-[#f6f6f1] py-16 sm:py-24",
  containerClassName = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
  headerClassName,
  mapClassName = "relative min-h-[690px] overflow-hidden rounded-[34px] border border-black/10 bg-[#e9ece3] shadow-none sm:min-h-[760px] sm:shadow-[0_30px_100px_rgba(20,20,20,0.13)] lg:min-h-[820px]",
  hasError,
  isDeferred,
  onRetry,
}: {
  ref?: Ref<HTMLElement>;
  eyebrow?: string;
  title?: string;
  description?: string;
  sectionClassName?: string;
  containerClassName?: string;
  headerClassName?: string;
  mapClassName?: string;
  hasError: boolean;
  isDeferred: boolean;
  onRetry: () => void;
}) {
  return (
    <section ref={ref} id="mapa" className={sectionClassName}>
      <div className={containerClassName}>
        <div className={headerClassName ?? ""}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b4b31]">
              {eyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">{description}</p>
            ) : null}
          </div>
        </div>
        <div className={`mt-6 flex items-center justify-center p-6 text-center ${mapClassName}`}>
          {hasError ? (
            <div className="max-w-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                No pudimos cargar el mapa.
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Revisa tu conexion e intenta nuevamente para ver las propiedades por ubicacion.
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/20"
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Reintentar mapa
              </button>
            </div>
          ) : isDeferred ? (
            <div className="max-w-sm">
              <p className="text-sm font-semibold text-neutral-700">Mapa de alquileres</p>
            </div>
          ) : (
            <span role="status" className="flex items-center gap-2 text-sm text-neutral-500"><RotateCw className="zu-spin h-5 w-5" />Cargando mapa...</span>
          )}
        </div>
      </div>
    </section>
  );
}
