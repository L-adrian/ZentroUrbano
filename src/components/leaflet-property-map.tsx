"use client";

import L, { type LatLngBoundsExpression } from "leaflet";
import {
  ChevronDown,
  ChevronUp,
  LocateFixed,
  Minus,
  Navigation,
  Plus,
  Route,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Tooltip, useMap } from "react-leaflet";
import Supercluster from "supercluster";
import { PriceDisplay, useCurrencyPreference } from "@/components/currency-preference";
import { LifestyleTag } from "@/components/lifestyle-tag";
import { PublisherBadge } from "@/components/publisher-badge";
import { ResilientMapTiles } from "@/components/resilient-map-tiles";
import { formatPriceInCurrency, type DisplayCurrency } from "@/lib/currency";
import {
  BOLIVIA_MAP_BOUNDS,
  hasValidPropertyCoordinates,
  MAP_CLUSTER_MAX_ZOOM,
  MAP_FOCUS_ZOOM,
  MAP_MARKER_LABEL_MIN_ZOOM,
  MAP_MAX_ZOOM,
  MAP_OVERVIEW_MIN_ZOOM,
  MAP_WHEEL_PX_PER_ZOOM_LEVEL,
  SANTA_CRUZ_CENTER,
} from "@/lib/map-config";
import type { Property } from "@/lib/properties";
import { getDirectRentals } from "@/lib/rentals";

type LeafletPropertyMapProps = {
  properties: Property[];
  eyebrow?: string;
  title?: string;
  description?: string;
  sectionClassName?: string;
  containerClassName?: string;
  headerClassName?: string;
  mapClassName?: string;
  showZoneShortcuts?: boolean;
};

type PropertyPointProperties = {
  property: Property;
  slug: string;
  isFeatured: boolean;
};

type PropertyClusterProperties = {
  featuredCount: number;
};

type PropertyClusterOrPoint =
  | Supercluster.ClusterFeature<PropertyClusterProperties>
  | Supercluster.PointFeature<PropertyPointProperties>;

export function LeafletPropertyMap({
  properties,
  eyebrow = "Mapa real",
  title = "Explora Santa Cruz desde el mapa.",
  description,
  sectionClassName = "bg-[#f6f6f1] py-10 sm:py-16",
  containerClassName = "mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8",
  headerClassName = "mb-6 flex flex-col gap-5 px-1 sm:flex-row sm:items-end sm:justify-between",
  mapClassName = "relative min-h-[690px] overflow-hidden rounded-[34px] border border-black/10 bg-[#e9ece3] shadow-none sm:min-h-[760px] sm:shadow-[0_30px_100px_rgba(20,20,20,0.13)] lg:min-h-[820px]",
  showZoneShortcuts = true,
}: LeafletPropertyMapProps) {
  const mapProperties = useMemo(
    () => getDirectRentals(properties).filter(hasValidPropertyCoordinates),
    [properties],
  );
  const [selectedSlug, setSelectedSlug] = useState(mapProperties[0]?.slug);
  const [map, setMap] = useState<L.Map | null>(null);
  const [isCardMinimized, setIsCardMinimized] = useState(true);
  const displayCurrency = useCurrencyPreference();
  const quickZoneProperties = useMemo(() => getUniqueZoneProperties(mapProperties), [mapProperties]);
  const selected =
    mapProperties.find((property) => property.slug === selectedSlug) ?? mapProperties[0];
  const bounds = useMemo(() => getBounds(mapProperties), [mapProperties]);
  const previousSelectedSlug = useRef(selected?.slug);

  useEffect(() => {
    if (!selected) {
      return;
    }

    if (previousSelectedSlug.current !== selected.slug) {
      previousSelectedSlug.current = selected.slug;
      setIsCardMinimized(false);
    }
  }, [selected]);

  function selectProperty(slug: string) {
    setSelectedSlug(slug);
    setIsCardMinimized(false);
  }

  if (!selected) {
    return (
      <section id="mapa" className={sectionClassName}>
        <div className={containerClassName}>
          <div className="rounded-[34px] border border-black/10 bg-white p-8 text-neutral-800 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b4b31]">
              Mapa pendiente
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
              Añade latitud y longitud válidas para mostrar las propiedades.
            </h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="mapa" className={sectionClassName}>
      <div className={containerClassName}>
        <div className={headerClassName}>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b4b31]">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
                {description}
              </p>
            ) : null}
          </div>

          {showZoneShortcuts ? (
            <div className="flex flex-col gap-3 sm:items-end">
              {showZoneShortcuts ? (
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {quickZoneProperties.map((property) => (
                    <button
                      key={property.slug}
                      type="button"
                      onClick={() => selectProperty(property.slug)}
                      className={`h-10 rounded-full px-4 text-sm font-semibold shadow-sm transition ${
                        property.slug === selected.slug
                          ? "bg-neutral-950 text-white"
                          : "bg-white text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-950 hover:text-white"
                      }`}
                    >
                      {property.zone}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={`${mapClassName} isolate z-0`}>
          <div className="absolute left-4 top-4 z-[500] flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm backdrop-blur sm:left-6 sm:top-6">
            <Navigation className="h-4 w-4 text-[#58745f]" aria-hidden="true" />
            Santa Cruz, Bolivia
          </div>

          <MapControls
            map={map}
            bounds={bounds}
            selected={selected}
            avoidSelectedCard={!isCardMinimized}
            minZoom={MAP_OVERVIEW_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            onShowAll={() => {
              if (bounds && map) {
                fitMapToBounds(map, bounds);
              }
            }}
          />

          <MapContainer
            key="interactive-home-map"
            className="morada-leaflet-map absolute inset-0"
            center={SANTA_CRUZ_CENTER}
            zoom={12}
            minZoom={MAP_OVERVIEW_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            maxBounds={BOLIVIA_MAP_BOUNDS}
            maxBoundsViscosity={0.85}
            wheelPxPerZoomLevel={MAP_WHEEL_PX_PER_ZOOM_LEVEL}
            zoomAnimation={false}
            fadeAnimation={false}
            markerZoomAnimation={false}
            inertia={false}
            scrollWheelZoom
            touchZoom
            doubleClickZoom
            boxZoom
            dragging
            zoomControl={false}
            attributionControl
          >
            <ResilientMapTiles />
            <MapInstanceBridge onReady={setMap} />
            <FitMapToProperties bounds={bounds} selected={selected} />
            <ClusteredPropertyMarkers
              properties={mapProperties}
              selected={selected}
              onSelect={selectProperty}
              displayCurrency={displayCurrency}
            />
          </MapContainer>

          {isCardMinimized ? (
            <div className="absolute inset-x-3 bottom-3 z-[500] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[360px]">
              <button
                type="button"
                onClick={() => setIsCardMinimized(false)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[22px] border border-black/10 bg-white/95 p-3 text-left shadow-none backdrop-blur-xl transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 sm:shadow-[0_20px_70px_rgba(20,20,20,0.16)]"
                aria-label="Mostrar ficha seleccionada"
              >
                <span className="min-w-0">
                  <PriceDisplay
                    property={selected}
                    className="block truncate text-sm font-semibold text-neutral-950"
                  />
                  <span className="mt-0.5 block truncate text-xs font-medium text-neutral-500">
                    {selected.title}
                  </span>
                </span>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            </div>
          ) : null}

          <aside className={`${isCardMinimized ? "hidden" : ""} absolute inset-x-3 bottom-3 z-[500] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-[26px] border border-black/10 bg-white/95 p-2 shadow-none backdrop-blur-xl sm:bottom-5 sm:left-auto sm:right-5 sm:max-h-[calc(100%-2.5rem)] sm:w-[390px] sm:p-3 sm:shadow-[0_24px_80px_rgba(20,20,20,0.18)]`}>
            <div className="mb-2 flex items-center justify-between gap-3 px-1 sm:mb-3">
              <span className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Propiedad seleccionada
              </span>
              <button
                type="button"
                onClick={() => setIsCardMinimized(true)}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-950 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12"
                aria-label="Minimizar ficha seleccionada"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                Minimizar
              </button>
            </div>
            <div className="grid grid-cols-[108px_1fr] gap-3 sm:block">
              <div className="relative aspect-square overflow-hidden rounded-[20px] bg-neutral-100 sm:aspect-[2/1] sm:rounded-[24px]">
                <Image
                  src={selected.images[0]}
                  alt={selected.title}
                  fill
                  loading="eager"
                  quality={68}
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 390px, 108px"
                  className="object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-neutral-900 backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:text-xs">
                  {selected.operation}
                </span>
                {selected.listingPlan === "featured" ? (
                  <span className="absolute right-2 top-2 rounded-full bg-[#d6a16b] px-2 py-1 text-[11px] font-bold text-neutral-950 backdrop-blur sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                    Destacada
                  </span>
                ) : null}
              </div>

              <div className="space-y-2 p-1 sm:pt-4">
                <div>
                  <PublisherBadge property={selected} className="mb-2 max-w-full" />
                  <PriceDisplay
                    property={selected}
                    className="block text-lg font-semibold tracking-tight text-neutral-950 sm:text-2xl"
                  />
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-neutral-950 sm:text-xl">
                    {selected.title}
                  </h3>
                  <p className="mt-2 hidden max-h-[3.25rem] overflow-hidden text-sm leading-6 text-neutral-600 sm:block">
                    {selected.shortDescription}
                  </p>
                </div>

                <div className="hidden flex-wrap gap-2 sm:flex">
                  {selected.neighborhoodHighlights.map((highlight) => (
                    <LifestyleTag key={highlight} label={highlight} tone="green" />
                  ))}
                </div>

                <div className="hidden grid-cols-3 gap-2 text-center text-sm sm:grid">
                  {getMapSummaryMetrics(selected).map((metric) => (
                    <Metric key={metric.label} label={metric.label} value={metric.value} />
                  ))}
                </div>

                <Link
                  href={`/propiedades/${selected.slug}`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:h-12 sm:px-5"
                >
                  <Route className="h-4 w-4" aria-hidden="true" />
                  Ver ficha completa
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ClusteredPropertyMarkers({
  properties,
  selected,
  onSelect,
  displayCurrency,
}: {
  properties: Property[];
  selected: Property;
  onSelect: (slug: string) => void;
  displayCurrency: DisplayCurrency;
}) {
  const map = useMap();
  const [viewState, setViewState] = useState(() => getMapViewState(map));

  useEffect(() => {
    const updateViewState = () => setViewState(getMapViewState(map));

    updateViewState();
    map.on("moveend", updateViewState);
    map.on("zoomend", updateViewState);

    return () => {
      map.off("moveend", updateViewState);
      map.off("zoomend", updateViewState);
    };
  }, [map]);

  const pointFeatures = useMemo(
    () =>
      properties.map(
        (property) =>
          ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [property.coordinates.lng, property.coordinates.lat],
            },
            properties: {
              property,
              slug: property.slug,
              isFeatured: property.listingPlan === "featured",
            },
          }) satisfies Supercluster.PointFeature<PropertyPointProperties>,
      ),
    [properties],
  );

  const clusterIndex = useMemo(() => {
    return new Supercluster<PropertyPointProperties, PropertyClusterProperties>({
      radius: 82,
      maxZoom: MAP_CLUSTER_MAX_ZOOM,
      minPoints: 2,
      map: (properties) => ({
        featuredCount: properties.isFeatured ? 1 : 0,
      }),
      reduce: (accumulated, properties) => {
        accumulated.featuredCount += properties.featuredCount;
      },
    }).load(pointFeatures);
  }, [pointFeatures]);

  const clusters = useMemo(
    () =>
      properties.length <= 3
        ? pointFeatures
        : clusterIndex.getClusters(viewState.bbox, viewState.zoom),
    [clusterIndex, pointFeatures, properties.length, viewState],
  );
  const markerMode =
    properties.length <= 3 || viewState.zoom >= MAP_MARKER_LABEL_MIN_ZOOM ? "full" : "compact";

  return (
    <>
      {clusters.map((clusterOrPoint) => {
        const [lng, lat] = clusterOrPoint.geometry.coordinates;

        if (isClusterFeature(clusterOrPoint)) {
          const clusterId = clusterOrPoint.properties.cluster_id;
          const pointCount = clusterOrPoint.properties.point_count;
          const featuredCount = clusterOrPoint.properties.featuredCount;

          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={createClusterIcon(pointCount, featuredCount)}
              zIndexOffset={featuredCount > 0 ? 720 : 520}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(
                    clusterIndex.getClusterExpansionZoom(clusterId),
                    MAP_MAX_ZOOM,
                  );

                  if (shouldReduceMapAnimation()) {
                    map.setView([lat, lng], expansionZoom, { animate: false });
                  } else {
                    map.flyTo([lat, lng], expansionZoom, { duration: 0.45 });
                  }
                },
              }}
              riseOnHover
            >
              <Tooltip direction="top" offset={[0, -34]} opacity={1}>
                <span className="text-xs font-semibold">
                  {pointCount} propiedades
                </span>
              </Tooltip>
            </Marker>
          );
        }

        const property = clusterOrPoint.properties.property;

        return (
          <Marker
            key={property.slug}
            position={[property.coordinates.lat, property.coordinates.lng]}
            icon={createPropertyIcon(
              property,
              property.slug === selected.slug,
              markerMode,
              displayCurrency,
            )}
            zIndexOffset={
              property.slug === selected.slug
                ? 1000
                : property.listingPlan === "featured"
                  ? 650
                  : 250
            }
            eventHandlers={{
              click: () => onSelect(property.slug),
            }}
            riseOnHover
          >
            <Tooltip direction="top" offset={[0, -46]} opacity={1}>
              <span className="text-xs font-semibold">{property.title}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

function MapControls({
  map,
  bounds,
  selected,
  avoidSelectedCard,
  minZoom,
  maxZoom,
  onShowAll,
}: {
  map: L.Map | null;
  bounds: LatLngBoundsExpression | undefined;
  selected: Property;
  avoidSelectedCard: boolean;
  minZoom: number;
  maxZoom: number;
  onShowAll: () => void;
}) {
  const [zoomLevel, setZoomLevel] = useState<number | null>(null);
  const currentZoom = zoomLevel ?? map?.getZoom() ?? null;
  const canZoomIn = map !== null && currentZoom !== null && currentZoom < maxZoom;
  const canZoomOut = map !== null && currentZoom !== null && currentZoom > minZoom;

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

  const positionClassName = avoidSelectedCard
    ? "right-4 top-4 sm:right-[430px] sm:top-6"
    : "right-4 top-4 sm:right-6 sm:top-6";

  return (
    <div
      className={`absolute z-[500] flex flex-col items-end gap-2 ${positionClassName}`}
    >
      <div className="overflow-hidden rounded-full border border-black/10 bg-white/95 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => {
            if (canZoomIn) {
              const nextZoom = Math.min((map?.getZoom() ?? minZoom) + 1, maxZoom);

              if (shouldReduceMapAnimation()) {
                map?.setView([selected.coordinates.lat, selected.coordinates.lng], nextZoom, {
                  animate: false,
                });
              } else {
                map?.setZoom(nextZoom, {
                  animate: true,
                });
              }
            }
          }}
          disabled={!canZoomIn}
          className="flex h-11 w-11 items-center justify-center text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Acercar mapa"
          title={canZoomIn ? "Acercar" : "Zoom máximo"}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="h-px bg-black/10" />
        <button
          type="button"
          onClick={() => {
            if (canZoomOut) {
              map?.setZoom((map.getZoom() ?? maxZoom) - 1, {
                animate: !shouldReduceMapAnimation(),
              });
            }
          }}
          disabled={!canZoomOut}
          className="flex h-11 w-11 items-center justify-center text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Alejar mapa"
          title={canZoomOut ? "Alejar" : "Zoom mínimo"}
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!map) {
            return;
          }

          if (shouldReduceMapAnimation()) {
            map.setView([selected.coordinates.lat, selected.coordinates.lng], MAP_FOCUS_ZOOM, {
              animate: false,
            });
          } else {
            map.flyTo([selected.coordinates.lat, selected.coordinates.lng], MAP_FOCUS_ZOOM, {
              duration: 0.45,
            });
          }
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/95 text-neutral-800 shadow-sm backdrop-blur transition hover:bg-neutral-100"
        aria-label="Centrar propiedad seleccionada"
        title="Centrar"
      >
        <LocateFixed className="h-5 w-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onShowAll}
        disabled={!bounds}
        className="hidden h-11 items-center rounded-full border border-black/10 bg-white/95 px-4 text-sm font-semibold text-neutral-800 shadow-sm backdrop-blur transition hover:bg-neutral-100 disabled:opacity-50 sm:inline-flex"
      >
        Ver todo
      </button>
    </div>
  );
}

function MapInstanceBridge({ onReady }: { onReady: (map: L.Map) => void }) {
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

function FitMapToProperties({
  bounds,
  selected,
}: {
  bounds: LatLngBoundsExpression | undefined;
  selected: Property;
}) {
  const map = useMap();
  const previousSelectedSlug = useRef(selected.slug);

  useEffect(() => {
    if (bounds) {
      fitMapToBounds(map, bounds);
    }
  }, [bounds, map]);

  useEffect(() => {
    if (previousSelectedSlug.current === selected.slug) {
      return;
    }

    previousSelectedSlug.current = selected.slug;
    const nextZoom = Math.min(Math.max(map.getZoom(), 13), MAP_MAX_ZOOM);

    if (shouldReduceMapAnimation()) {
      map.setView([selected.coordinates.lat, selected.coordinates.lng], nextZoom, {
        animate: false,
      });
      return;
    }

    map.flyTo([selected.coordinates.lat, selected.coordinates.lng], nextZoom, {
      duration: 0.55,
    });
  }, [map, selected]);

  return null;
}

function getBounds(properties: Property[]): LatLngBoundsExpression | undefined {
  if (properties.length === 0) {
    return undefined;
  }

  return properties.map((property) => [
    property.coordinates.lat,
    property.coordinates.lng,
  ]) as LatLngBoundsExpression;
}

function getUniqueZoneProperties(properties: Property[]) {
  return Array.from(new Map(properties.map((property) => [property.zone, property])).values()).slice(
    0,
    4,
  );
}

function getMapViewState(map: L.Map) {
  const bounds = map.getBounds();

  return {
    bbox: [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ] as [number, number, number, number],
    zoom: Math.round(map.getZoom()),
  };
}

function isClusterFeature(
  feature: PropertyClusterOrPoint,
): feature is Supercluster.ClusterFeature<PropertyClusterProperties> {
  return "cluster" in feature.properties;
}

function fitMapToBounds(map: L.Map, bounds: LatLngBoundsExpression) {
  const isDesktop = window.innerWidth >= 768 && !shouldReduceMapAnimation();

  map.fitBounds(bounds, {
    paddingTopLeft: [70, 70],
    paddingBottomRight: isDesktop ? [470, 170] : [70, 280],
    maxZoom: 12,
    animate: !shouldReduceMapAnimation(),
  });
}

function shouldReduceMapAnimation() {
  if (typeof window === "undefined") {
    return true;
  }

  return (
    window.innerWidth <= 768 ||
    window.matchMedia("(hover: none)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function createPropertyIcon(
  property: Property,
  isSelected: boolean,
  mode: "compact" | "full",
  displayCurrency: DisplayCurrency,
) {
  const selectedClass = isSelected ? " is-selected" : "";
  const featuredClass = property.listingPlan === "featured" ? " is-featured" : "";
  const logoClass = property.publisher.logo ? " has-logo" : "";
  const compactClass = mode === "compact" ? " is-compact" : "";
  const price = formatPriceInCurrency(property, displayCurrency);
  const publisherLogo = getPublisherMarkerLogo(property.publisher);
  const markerLabel =
    property.listingPlan === "featured"
      ? `${escapeHtml(price)}<span class="morada-marker-boost">Destacada</span>`
      : escapeHtml(price);

  return L.divIcon({
    className: "morada-marker",
    html: `
      <span
        class="morada-marker-root${featuredClass}${compactClass}"
        style="--morada-marker-bg:${property.publisher.brandColor};--morada-marker-fg:${property.publisher.brandTextColor};"
      >
        <span class="morada-marker-pin${selectedClass}${featuredClass}${logoClass}" aria-hidden="true">
          <span class="morada-marker-logo">${publisherLogo}</span>
        </span>
        <span class="morada-marker-label${selectedClass}${featuredClass}">${markerLabel}</span>
      </span>
    `,
    iconAnchor: [18, 44],
    iconSize: mode === "compact" ? [48, 48] : [190, 48],
  });
}

function getPublisherMarkerLogo(publisher: Property["publisher"]) {
  if (!publisher.logo) {
    return escapeHtml(publisher.shortName);
  }

  return `<img class="morada-marker-logo-image" src="${escapeHtml(publisher.logo)}" alt="${escapeHtml(
    publisher.name,
  )}" />`;
}

function createClusterIcon(pointCount: number, featuredCount: number) {
  const featuredClass = featuredCount > 0 ? " is-featured" : "";

  return L.divIcon({
    className: "morada-cluster",
    html: `
      <span class="morada-cluster-root${featuredClass}">
        <span class="morada-cluster-count">${pointCount}</span>
      </span>
    `,
    iconAnchor: [34, 34],
    iconSize: [68, 68],
  });
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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-3 py-2">
      <p className="text-base font-semibold text-neutral-950">{value}</p>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
    </div>
  );
}

function getMapSummaryMetrics(property: Property) {
  return [
    { label: "Dorm.", value: property.bedrooms > 0 ? property.bedrooms : "?" },
    property.bathrooms > 0
      ? { label: "Baños", value: property.bathrooms }
      : getMapBathroomReplacementMetric(property),
    { label: "m²", value: property.area > 0 ? property.area : "?" },
  ];
}

function getMapBathroomReplacementMetric(property: Property) {
  if (property.security) {
    return { label: "Seg.", value: "Sí" };
  }

  if (property.pool) {
    return { label: "Piscina", value: "Sí" };
  }

  if (property.patio) {
    return { label: "Patio", value: "Sí" };
  }

  if (property.grill) {
    return { label: "BBQ", value: "Sí" };
  }

  if (property.furnished) {
    return { label: "Amobl.", value: "Sí" };
  }

  return { label: "Baños", value: "Consultar" };
}
