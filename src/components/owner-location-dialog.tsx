"use client";

import type L from "leaflet";
import { CheckCircle2, LoaderCircle, LocateFixed, Minus, Plus, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import type { OwnerLocationPickerProps } from "@/components/leaflet-owner-location-picker";
import { distanceMeters, formatDistance, ownerLocationWarnMeters } from "@/lib/owner-location";
import type { Property } from "@/lib/properties";

type Point = { lat: number; lng: number };

// Mi cuenta: the owner puts the pin on the door and confirms. The map loads only when opened.
export function OwnerLocationDialog({
  property,
  onClose,
  onConfirm,
}: {
  property: Pick<Property, "slug" | "title" | "coordinates" | "locationConfirmedAt">;
  onClose: () => void;
  onConfirm: (point: Point) => Promise<void>;
}) {
  const [Picker, setPicker] = useState<ComponentType<OwnerLocationPickerProps> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [point, setPoint] = useState<Point>(property.coordinates);
  const [map, setMap] = useState<L.Map | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = distanceMeters(property.coordinates, point);
  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    let active = true;
    import("@/components/leaflet-owner-location-picker")
      .then((mod) => { if (active) setPicker(() => mod.LeafletOwnerLocationPicker); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    heading.current?.focus();
    return () => { document.body.style.overflow = previous; };
  }, []);

  const onReady = useCallback((instance: L.Map) => setMap(instance), []);

  function locateMe() {
    if (!canLocate || !map) return;
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        map.setView([position.coords.latitude, position.coords.longitude], 18, { animate: false });
      },
      () => {
        setLocating(false);
        setError("No pudimos leer tu ubicación. Mueve el mapa con el dedo o el mouse.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onConfirm(point);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "No se pudo guardar la ubicación.");
      setSaving(false);
    }
  }

  return (
    <div
      className="owner-location-overlay fixed inset-0 z-[2000] overflow-y-auto bg-neutral-950/58 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-location-title"
      onKeyDown={(event) => { if (event.key === "Escape" && !saving) onClose(); }}
    >
      <div className="owner-location-card mx-auto max-w-3xl rounded-[28px] bg-white shadow-[0_30px_110px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5 sm:p-6">
          <div className="min-w-0">
            <h3 id="owner-location-title" ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-neutral-950 outline-none">
              Verificar ubicación
            </h3>
            <p className="mt-1 text-sm text-neutral-600 [overflow-wrap:anywhere]">{property.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 transition hover:border-neutral-950"
            aria-label="Cerrar sin guardar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:p-6">
          <p className="text-sm leading-6 text-neutral-700">
            Mueve el mapa hasta que el pin quede sobre la puerta de tu vivienda. También puedes tocar el lugar en el mapa.
          </p>
          <div className="owner-location-frame relative isolate overflow-hidden rounded-[20px] border border-black/10">
            {Picker ? (
              <Picker initial={property.coordinates} onMove={setPoint} onReady={onReady} />
            ) : (
              <div className="owner-location-map grid place-items-center">
                {loadError ? (
                  <button type="button" className="zu-button zu-button-secondary" onClick={() => { setLoadError(false); setAttempt((value) => value + 1); }}>
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    No cargó el mapa. Reintentar
                  </button>
                ) : (
                  <span role="status" className="inline-flex items-center gap-2 text-sm text-neutral-600">
                    <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" />
                    Cargando mapa…
                  </span>
                )}
              </div>
            )}
            {map ? (
              <div className="owner-location-tools">
                <button type="button" onClick={() => map.zoomIn(1, { animate: false })} aria-label="Acercar mapa" title="Acercar"><Plus className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" onClick={() => map.zoomOut(1, { animate: false })} aria-label="Alejar mapa" title="Alejar"><Minus className="h-4 w-4" aria-hidden="true" /></button>
                {canLocate ? (
                  <button type="button" onClick={locateMe} disabled={locating} aria-label="Usar mi ubicación actual" title="Usar mi ubicación actual">
                    {locating ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="text-sm text-neutral-600" aria-live="polite">
            {moved < 5 ? "El pin está donde lo teníamos." : `Moviste el pin ${formatDistance(moved)}.`}
          </p>
          {moved > ownerLocationWarnMeters ? (
            <p className="rounded-[16px] bg-amber-50 p-3 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
              El nuevo punto está a {formatDistance(moved)} del anterior. Revisa que sea tu vivienda antes de confirmar.
            </p>
          ) : null}
          <p className="text-sm leading-6 text-neutral-600">
            Al confirmar, tu anuncio mostrará este punto exacto en el mapa con «Ubicación confirmada por el dueño». No pasa por una nueva revisión.
          </p>
          {error ? <p role="alert" className="auth-error">{error}</p> : null}

          <div className="flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={saving || !map}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-[#21352b] disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              Confirmar ubicación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
