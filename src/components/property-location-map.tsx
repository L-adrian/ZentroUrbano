"use client";

import { ArrowUpRight, MapPin, Navigation, RotateCw } from "lucide-react";
import { getGoogleMapsDirectionsUrl } from "@/lib/map-config";
import { useEffect, useState, type ComponentType } from "react";
import type { Property } from "@/lib/properties";

type PropertyLocationMapProps = {
  property: Property;
};

type LeafletPropertyLocationMapComponent = ComponentType<PropertyLocationMapProps>;

export function PropertyLocationMap({ property }: PropertyLocationMapProps) {
  const [LeafletPropertyLocationMap, setLeafletPropertyLocationMap] =
    useState<LeafletPropertyLocationMapComponent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    import("@/components/leaflet-property-location-map")
      .then((mod) => {
        if (isActive) {
          setLeafletPropertyLocationMap(() => mod.LeafletPropertyLocationMap);
        }
      })
      .catch(() => {
        if (isActive) {
          setLeafletPropertyLocationMap(null);
          setLoadError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [loadAttempt]);

  // Directions stay outside the lazy Leaflet layer, including before hydration.
  return (
    <div className="location-map-frame" role="group" aria-label="Mapa de la vivienda">
      <div className="location-map-toolbar">
        <span><MapPin size={17} aria-hidden="true" />{property.zone}</span>
        <a className="map-directions-link zu-button zu-button-primary" href={getGoogleMapsDirectionsUrl(property)} target="_blank" rel="noopener noreferrer" aria-label="Cómo llegar a esta vivienda con Google Maps">
          <Navigation size={17} aria-hidden="true" />Cómo llegar<ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
      {LeafletPropertyLocationMap ? <LeafletPropertyLocationMap property={property} /> : <LocationMapFallback
        hasError={loadError}
        onRetry={() => {
          setLoadError(false);
          setLoadAttempt((value) => value + 1);
        }}
      />}
    </div>
  );
}

function LocationMapFallback({ hasError, onRetry }: { hasError: boolean; onRetry: () => void }) {
  return (
    <div className="location-map-fallback">
      {hasError ? (
        <div className="max-w-xs">
          <h3 className="text-xl font-semibold tracking-tight text-neutral-950">
            No pudimos cargar la ubicación.
          </h3>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Intenta nuevamente para abrir el mapa de esta propiedad.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="zu-button zu-button-secondary mt-6"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : (
        <span role="status"><span className="zu-spin location-map-spinner" aria-hidden="true" /><span className="sr-only">Cargando mapa</span></span>
      )}
    </div>
  );
}
