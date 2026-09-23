"use client";

import L from "leaflet";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Tooltip, useMap } from "react-leaflet";
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

export function LeafletPropertyLocationMap({ property }: LeafletPropertyLocationMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number | null>(null);
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
            className="flex h-10 w-10 items-center justify-center text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
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
            className="flex h-10 w-10 items-center justify-center text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/95 text-neutral-800 shadow-sm backdrop-blur transition hover:bg-neutral-100"
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
        dragging
        zoomControl={false}
        attributionControl
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
      >
        <ResilientMapTiles />
        <LocationMapBridge onReady={setMap} />
        <Marker position={position} icon={createLocationIcon(property)}>
          <Tooltip direction="top" offset={[0, -46]} opacity={1} permanent>
            <span className="text-xs font-semibold">{property.title}</span>
          </Tooltip>
        </Marker>
      </MapContainer>

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

function createLocationIcon(property: Property) {
  const publisherLogo = getPublisherLocationLogo(property.publisher);

  return L.divIcon({
    className: "morada-location-marker",
    html: `
      <span
        class="morada-location-pin"
        style="--morada-location-bg:${property.publisher.brandColor};--morada-location-fg:${property.publisher.brandTextColor};"
        aria-hidden="true"
      >
        <span class="morada-location-logo">${publisherLogo}</span>
      </span>
    `,
    iconAnchor: [18, 44],
    iconSize: [36, 44],
  });
}

function getPublisherLocationLogo(publisher: Property["publisher"]) {
  if (!publisher.logo) {
    return escapeHtml(publisher.shortName);
  }

  return `<img class="morada-location-logo-image" src="${escapeHtml(publisher.logo)}" alt="${escapeHtml(
    publisher.name,
  )}" />`;
}

function shouldReduceMapAnimation() {
  return typeof window !== "undefined" && window.innerWidth <= 640;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
