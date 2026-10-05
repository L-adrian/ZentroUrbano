"use client";

import L from "leaflet";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, useMap } from "react-leaflet";
import { useCurrencyPreference } from "@/components/currency-preference";
import { createPropertyIcon } from "@/components/leaflet-property-map";
import { ResilientMapTiles } from "@/components/resilient-map-tiles";
import {
  BOLIVIA_MAP_BOUNDS,
  hasValidPropertyCoordinates,
  MAP_DETAIL_MIN_ZOOM,
  MAP_DETAIL_ZOOM,
  MAP_FOCUS_ZOOM,
  MAP_MAX_ZOOM,
  MAP_WHEEL_PX_PER_ZOOM_LEVEL,
} from "@/lib/map-config";
import type { Property } from "@/lib/properties";

type LeafletPropertyLocationMapProps = {
  property: Property;
};

// The circle covers the area around the point Zentro entered; only the owner's confirmation shows a pin.
const approximateRadiusMeters = 300;

export function LeafletPropertyLocationMap({ property }: LeafletPropertyLocationMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number | null>(null);
  const displayCurrency = useCurrencyPreference();
  const approximate = !property.locationConfirmedAt;
  // On phones one finger scrolls the page; the map moves with two fingers.
  const [touchHint, setTouchHint] = useState(false);
  const [coarsePointer] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const hasCoordinates = hasValidPropertyCoordinates(property);
  const position: [number, number] = hasCoordinates
    ? [property.coordinates.lat, property.coordinates.lng]
    : [0, 0];
  const currentZoom = zoomLevel ?? map?.getZoom() ?? null;
  const canZoomIn = map !== null && currentZoom !== null && currentZoom < MAP_MAX_ZOOM;
  const canZoomOut = map !== null && currentZoom !== null && currentZoom > MAP_DETAIL_MIN_ZOOM;

  useEffect(() => {
    if (!map) {
      return;
    }

    const updateZoomLevel = () => setZoomLevel(map.getZoom());

    updateZoomLevel();
    map.on("zoomend", updateZoomLevel);
    map.on("zoomlevelschange", updateZoomLevel);

    return () => {
      map.off("zoomend", updateZoomLevel);
      map.off("zoomlevelschange", updateZoomLevel);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !coarsePointer) return;
    const container = map.getContainer();
    let hideHint: number | undefined;
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      setTouchHint(true);
      window.clearTimeout(hideHint);
      hideHint = window.setTimeout(() => setTouchHint(false), 1400);
    };
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      container.removeEventListener("touchmove", onTouchMove);
      window.clearTimeout(hideHint);
    };
  }, [map, coarsePointer]);

  if (!hasCoordinates) {
    return (
      <div className="location-map-fallback">
        <p className="zu-eyebrow">
          Ubicación pendiente
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
          Esta propiedad necesita latitud y longitud válidas.
        </h3>
      </div>
    );
  }

  return (
    <div className="property-location-map relative z-0 isolate min-h-[320px] w-full overflow-hidden bg-[var(--subtle)] sm:min-h-[460px]">
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-2 sm:right-5 sm:top-5">
        <div className="overflow-hidden rounded-full border border-black/10 bg-white/95 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => {
              if (canZoomIn) {
                map?.setZoom((map.getZoom() ?? MAP_DETAIL_MIN_ZOOM) + 1, {
                  animate: !shouldReduceMapAnimation(),
                });
              }
            }}
            disabled={!canZoomIn}
            className="flex h-11 w-11 items-center justify-center text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Acercar mapa"
            title={canZoomIn ? "Acercar" : "Zoom máximo"}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="h-px bg-black/10" />
          <button
            type="button"
            onClick={() => {
              if (canZoomOut) {
                map?.setZoom((map.getZoom() ?? MAP_DETAIL_ZOOM) - 1, {
                  animate: !shouldReduceMapAnimation(),
                });
              }
            }}
            disabled={!canZoomOut}
            className="flex h-11 w-11 items-center justify-center text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Alejar mapa"
            title={canZoomOut ? "Alejar" : "Zoom mínimo"}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!map) {
              return;
            }

            if (shouldReduceMapAnimation()) {
              map.setView(position, MAP_FOCUS_ZOOM, { animate: false });
              return;
            }

            map.flyTo(position, MAP_FOCUS_ZOOM, { duration: 0.45 });
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/95 text-neutral-800 shadow-sm backdrop-blur transition hover:bg-neutral-100"
          aria-label="Centrar propiedad"
          title="Centrar"
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <MapContainer
        key="interactive-map"
        className="morada-leaflet-map absolute inset-0"
        center={position}
        zoom={MAP_DETAIL_ZOOM}
        minZoom={MAP_DETAIL_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        maxBounds={BOLIVIA_MAP_BOUNDS}
        maxBoundsViscosity={0.85}
        wheelPxPerZoomLevel={MAP_WHEEL_PX_PER_ZOOM_LEVEL}
        preferCanvas
        scrollWheelZoom
        touchZoom
        doubleClickZoom
        boxZoom
        dragging={!coarsePointer}
        zoomControl={false}
        attributionControl
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
      >
        <ResilientMapTiles />
        <LocationMapBridge onReady={setMap} />
        {/* Same marker as the catalog map; an approximate location also gets a soft zone circle
            (the header above the map already says it is approximate). */}
        {approximate ? (
          <Circle
            center={position}
            radius={approximateRadiusMeters}
            pathOptions={{ color: "#087c65", weight: 1.5, dashArray: "4 6", fillColor: "#087c65", fillOpacity: 0.1 }}
          />
        ) : null}
        <Marker position={position} icon={createPropertyIcon(property, true, "full", displayCurrency)} title={property.title} alt={property.title} />
      </MapContainer>
      {touchHint ? (
        <p className="location-map-touch-hint" role="status">Usa dos dedos para mover el mapa</p>
      ) : null}

    </div>
  );
}

function LocationMapBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);

    const invalidateMapSize = () => {
      map.invalidateSize({ animate: false });
    };
    const frameId = window.requestAnimationFrame(invalidateMapSize);
    const timeoutId = window.setTimeout(invalidateMapSize, 300);

    window.addEventListener("resize", invalidateMapSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", invalidateMapSize);
    };
  }, [map, onReady]);

  return null;
}

function shouldReduceMapAnimation() {
  return typeof window !== "undefined" && window.innerWidth <= 640;
}
