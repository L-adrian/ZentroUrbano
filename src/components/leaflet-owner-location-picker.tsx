"use client";

import type L from "leaflet";
import { useEffect, type CSSProperties } from "react";
import { MapContainer, useMapEvents } from "react-leaflet";
import { ResilientMapTiles } from "@/components/resilient-map-tiles";
import { BOLIVIA_MAP_BOUNDS, MAP_DETAIL_MIN_ZOOM, MAP_MAX_ZOOM, MAP_WHEEL_PX_PER_ZOOM_LEVEL } from "@/lib/map-config";

export type OwnerLocationPickerProps = {
  initial: { lat: number; lng: number };
  onMove: (point: { lat: number; lng: number }) => void;
  onReady: (map: L.Map) => void;
};

// The pin stays in the middle and the owner moves the map under it: easier than dragging a small
// marker with a finger. Tapping a spot also brings it under the pin.
export function LeafletOwnerLocationPicker({ initial, onMove, onReady }: OwnerLocationPickerProps) {
  return (
    <div className="owner-location-map">
      <MapContainer
        className="morada-leaflet-map absolute inset-0"
        center={[initial.lat, initial.lng]}
        zoom={17}
        minZoom={MAP_DETAIL_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        maxBounds={BOLIVIA_MAP_BOUNDS}
        maxBoundsViscosity={0.85}
        wheelPxPerZoomLevel={MAP_WHEEL_PX_PER_ZOOM_LEVEL}
        scrollWheelZoom
        touchZoom
        doubleClickZoom
        dragging
        keyboard
        zoomControl={false}
        attributionControl
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
      >
        <ResilientMapTiles />
        <CenterTracker onMove={onMove} onReady={onReady} />
      </MapContainer>
      <span className="owner-location-pin" aria-hidden="true">
        <span className="morada-location-pin" style={{ "--morada-location-bg": "#087c65", "--morada-location-fg": "#ffffff" } as CSSProperties}>
          <span className="morada-location-logo">ZU</span>
        </span>
      </span>
      <span className="owner-location-dot" aria-hidden="true" />
    </div>
  );
}

function CenterTracker({ onMove, onReady }: Pick<OwnerLocationPickerProps, "onMove" | "onReady">) {
  const map = useMapEvents({
    move() {
      const center = map.getCenter();
      onMove({ lat: center.lat, lng: center.lng });
    },
    click(event) {
      map.panTo(event.latlng, { animate: false });
    },
  });

  useEffect(() => {
    onReady(map);
    const resize = () => map.invalidateSize({ animate: false });
    const frame = window.requestAnimationFrame(resize);
    const timer = window.setTimeout(resize, 300);
    window.addEventListener("resize", resize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("resize", resize);
    };
  }, [map, onReady]);

  return null;
}
