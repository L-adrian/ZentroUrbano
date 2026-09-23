"use client";

import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { TileLayer } from "react-leaflet";
import {
  MAP_ERROR_TILE_URL,
  MAP_MAX_NATIVE_ZOOM,
  MAP_MAX_ZOOM,
  MAP_TILE_KEEP_BUFFER,
  MAP_TILE_PROVIDERS,
} from "@/lib/map-config";

const MAX_TILE_ERRORS_BEFORE_FALLBACK = 4;

export function ResilientMapTiles() {
  const [providerIndex, setProviderIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const tileErrorCount = useRef(0);
  const provider = MAP_TILE_PROVIDERS[providerIndex];

  return (
    <><TileLayer
      key={`${provider.id}-${attempt}`}
      attribution={provider.attribution}
      url={provider.url}
      errorTileUrl={MAP_ERROR_TILE_URL}
      keepBuffer={MAP_TILE_KEEP_BUFFER}
      maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      updateWhenIdle
      updateWhenZooming={false}
      eventHandlers={{
        tileload: (event) => {
          // Leaflet also emits tileload for the local error placeholder.
          if (event.tile.getAttribute("src") === MAP_ERROR_TILE_URL) return;
          tileErrorCount.current = Math.max(0, tileErrorCount.current - 1);
          setFailed(false);
        },
        tileerror: () => {
          tileErrorCount.current += 1;

          if (
            tileErrorCount.current >= MAX_TILE_ERRORS_BEFORE_FALLBACK &&
            providerIndex < MAP_TILE_PROVIDERS.length - 1
          ) {
            tileErrorCount.current = 0;
            setProviderIndex((currentIndex) => Math.min(currentIndex + 1, MAP_TILE_PROVIDERS.length - 1));
          } else if (tileErrorCount.current >= MAX_TILE_ERRORS_BEFORE_FALLBACK) {
            setFailed(true);
          }
        },
      }}
    />{failed && <div className="map-tile-error" role="status"><span>El mapa no pudo cargar. Tus resultados siguen disponibles.</span><button type="button" className="zu-icon-button" aria-label="Reintentar mapa" title="Reintentar mapa" onClick={() => { tileErrorCount.current = 0; setFailed(false); setAttempt(value => value + 1); }}><RefreshCw size={16} /></button></div>}</>
  );
}
