"use client";

import {
  Car,
  Check,
  Info,
  List,
  Map,
  PawPrint,
  Search,
  Share2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useCurrencyPreference } from "@/components/currency-preference";
import { PropertyCard } from "@/components/property-card";
import { PropertyMap } from "@/components/property-map";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import {
  buildRentalSearchParams,
  describePriceBounds,
  describeRentalSearch,
  emptyRentalSearchFilters,
  getActiveRentalFilters,
  getPriceBounds,
  getUnsupportedSearchIntent,
  readRentalSearchParams,
  rentalBathroomOptions,
  rentalBedroomOptions,
  rentalSearchParamKeys,
  searchRentals,
  withoutRentalFilter,
  type RentalFilterKey,
  type RentalSearchFilters,
  type RentalTypeFilter,
} from "@/lib/property-search";
import type { Property, PropertyType } from "@/lib/properties";
import { getRentalZones } from "@/lib/rentals";
import { absoluteUrl, whatsappUrl } from "@/lib/site";

type DirectRentalExplorerProps = {
  properties: Property[];
  initialQuery?: string;
  initialZone?: string;
  initialPropertyType?: PropertyType;
  initialMinPrice?: string;
  initialMaxPrice?: string;
  initialBedrooms?: string;
  initialBathrooms?: string;
  initialAmenity?: string;
  initialView?: ResultsView;
};

type ResultsView = "list" | "map";

const unsupportedSearchCopy = {
  anticretico: "No hay anticréticos.",
  venta: "No hay viviendas en venta.",
  habitacion: "No hay habitaciones ni cuartos compartidos.",
};

const removeFilterLabels: Record<RentalFilterKey, (filters: RentalSearchFilters) => string> = {
  query: (filters) => `Quitar “${shorten(filters.query.trim(), 28)}”`,
  zone: (filters) => `Quitar zona ${filters.zone}`,
  type: (filters) => `Quitar tipo ${filters.type}`,
  minPrice: () => "Quitar precio mínimo",
  maxPrice: () => "Quitar precio máximo",
  bedrooms: () => "Quitar dormitorios",
  bathrooms: () => "Quitar baños",
  pets: () => "Quitar mascotas",
  garage: () => "Quitar parqueo",
};

export function DirectRentalExplorer({
  properties,
  initialQuery = "",
  initialZone = "",
  initialPropertyType,
  initialMinPrice = "",
  initialMaxPrice = "",
  initialBedrooms = "",
  initialBathrooms = "",
  initialAmenity = "",
  initialView = "list",
}: DirectRentalExplorerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Filters live in the URL, so going back from a listing or opening a shared link restores them.
  const [filters, setFilters] = useState<RentalSearchFilters>(() => {
    const defaults = new URLSearchParams();
    const values = {
      q: initialQuery,
      zone: initialZone,
      type: initialPropertyType ?? "",
      minPrice: initialMinPrice,
      maxPrice: initialMaxPrice,
      bedrooms: initialBedrooms,
      bathrooms: initialBathrooms,
      amenity: initialAmenity,
    };
    for (const [key, value] of Object.entries(values)) if (value) defaults.set(key, value);
    return readRentalSearchParams(searchParams, readRentalSearchParams(defaults));
  });
  const deferredQuery = useDeferredValue(filters.query);
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(filters.bedrooms || filters.bathrooms || filters.minPrice || filters.pets || filters.garage),
  );
  const [view, setView] = useState<ResultsView>(initialView);
  const displayCurrency = useCurrencyPreference();
  const zones = useMemo(() => {
    const available = getRentalZones(properties);
    return filters.zone && !available.includes(filters.zone) ? [...available, filters.zone] : available;
  }, [filters.zone, properties]);

  const appliedFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [filters, deferredQuery]);
  const matches = useMemo(
    () => searchRentals(properties, appliedFilters, displayCurrency),
    [appliedFilters, displayCurrency, properties],
  );
  const results = useMemo(() => matches.map(({ property }) => property), [matches]);
  const petsToConfirm = appliedFilters.pets ? matches.filter((match) => match.petsPolicy === "consult") : [];
  const mainResults = appliedFilters.pets
    ? matches.filter((match) => match.petsPolicy === "allowed").map(({ property }) => property)
    : results;

  const activeFilters = getActiveRentalFilters(filters);
  const relaxations = useMemo(() => {
    if (matches.length > 0) return [];
    return getActiveRentalFilters(appliedFilters)
      .map((key) => ({
        key,
        label: removeFilterLabels[key](appliedFilters),
        count: searchRentals(properties, withoutRentalFilter(appliedFilters, key), displayCurrency).length,
      }))
      .filter((item) => item.count > 0)
      .sort((first, second) => second.count - first.count);
  }, [appliedFilters, displayCurrency, matches.length, properties]);

  const serializedFilters = useMemo(
    () => buildRentalSearchParams(appliedFilters, displayCurrency).toString(),
    [appliedFilters, displayCurrency],
  );
  const shareUrl = absoluteUrl(`${pathname}${serializedFilters ? `?${serializedFilters}` : ""}`);
  const searchSummary = describeRentalSearch(appliedFilters, displayCurrency).join(", ");
  const unsupportedIntent = getUnsupportedSearchIntent(deferredQuery);

  const priceCurrency = filters.priceCurrency ?? displayCurrency;
  const priceLabel = priceCurrency === "USD" ? "$us" : "Bs";
  const priceBounds = getPriceBounds(filters, displayCurrency);
  const priceHint = describePriceBounds(priceBounds.min, priceBounds.max);
  const unreadablePrice = [
    !priceBounds.min && filters.minPrice.trim() ? filters.minPrice.trim() : null,
    !priceBounds.max && filters.maxPrice.trim() ? filters.maxPrice.trim() : null,
  ].find(Boolean);

  // Replace (not push) the URL so the back button still leaves the catalog in one step.
  const writtenFilters = useRef<string | null>(null);
  useEffect(() => {
    if (writtenFilters.current === null) {
      writtenFilters.current = serializedFilters;
      return;
    }
    if (writtenFilters.current === serializedFilters) return;
    const timer = window.setTimeout(() => {
      writtenFilters.current = serializedFilters;
      const params = new URLSearchParams(window.location.search);
      for (const key of rentalSearchParamKeys) params.delete(key);
      new URLSearchParams(serializedFilters).forEach((value, key) => params.append(key, value));
      const search = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [serializedFilters]);

  function updateFilter<Key extends RentalFilterKey>(key: Key, value: RentalSearchFilters[Key]) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (!next.minPrice.trim() && !next.maxPrice.trim()) next.priceCurrency = null;
      return next;
    });
  }

  function removeFilter(key: RentalFilterKey) {
    setFilters((current) => withoutRentalFilter(current, key));
  }

  function clearFilters() {
    setFilters(emptyRentalSearchFilters);
  }

  const alertMessage = searchSummary
    ? `Hola, busco alquiler en Zentro Urbano y todavía no encuentro lo que necesito: ${searchSummary}. ¿Me avisan si aparece uno así? ${shareUrl}`
    : "Hola, busco alquiler en Zentro Urbano. ¿Me avisan cuando haya nuevos alquileres?";

  return (
    <div className="zu-explorer">
      <div className="sticky top-0 z-[40] border-y border-neutral-200 bg-white lg:top-[76px]">
        <div className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(120px,0.65fr)_minmax(100px,0.55fr)_auto]">
            <label className="relative col-span-2 block md:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                value={filters.query}
                onChange={(event) => updateFilter("query", event.target.value)}
                type="search"
                aria-label="Buscar alquiler por zona o características"
                placeholder="Zona, avenida o característica"
                className="h-11 w-full border border-neutral-300 bg-white pl-10 pr-3 text-sm font-medium outline-none focus:border-[#176b4d]"
              />
            </label>

            <FilterSelect label="Zona" value={filters.zone} onChange={(value) => updateFilter("zone", value)}>
              <option value="">Todas las zonas</option>
              {zones.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Tipo"
              value={filters.type}
              onChange={(value) => updateFilter("type", value as RentalTypeFilter)}
            >
              <option value="">Cualquier tipo</option>
              <option value="Casa">Casa</option>
              <option value="Departamento">Departamento</option>
              <option value="Monoambiente">Monoambiente</option>
            </FilterSelect>

            <label className="relative block">
              <span className="sr-only">Precio máximo por mes</span>
              <input
                value={filters.maxPrice}
                onChange={(event) => updateFilter("maxPrice", event.target.value)}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-describedby="rental-price-hint"
                placeholder={`Máx. ${priceLabel}`}
                className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#176b4d]"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              aria-expanded={showAdvanced}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 hover:border-neutral-950"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filtros
              {activeFilters.length > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center bg-neutral-950 px-1 text-[12px] text-white">
                  {activeFilters.length}
                </span>
              ) : null}
            </button>
          </div>

          {showAdvanced ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3">
              <FilterSelect label="Dormitorios" value={filters.bedrooms} onChange={(value) => updateFilter("bedrooms", value)} compact>
                <option value="">Dormitorios</option>
                {rentalBedroomOptions.map((option) => <option key={option} value={option}>{option}+</option>)}
              </FilterSelect>
              <FilterSelect label="Baños" value={filters.bathrooms} onChange={(value) => updateFilter("bathrooms", value)} compact>
                <option value="">Baños</option>
                {rentalBathroomOptions.map((option) => <option key={option} value={option}>{option}+</option>)}
              </FilterSelect>
              <label className="sr-only" htmlFor="min-rental-price">Precio mínimo por mes</label>
              <input
                id="min-rental-price"
                value={filters.minPrice}
                onChange={(event) => updateFilter("minPrice", event.target.value)}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-describedby="rental-price-hint"
                placeholder={`Mín. ${priceLabel}`}
                className="h-10 w-36 border border-neutral-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#176b4d]"
              />
              <FilterToggle
                active={filters.pets}
                label="Acepta mascotas"
                icon={<PawPrint className="h-4 w-4" />}
                onClick={() => updateFilter("pets", !filters.pets)}
              />
              <FilterToggle
                active={filters.garage}
                label="Con parqueo"
                icon={<Car className="h-4 w-4" />}
                onClick={() => updateFilter("garage", !filters.garage)}
              />
              {activeFilters.length > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 px-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Limpiar
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-neutral-950">
              {results.length} {results.length === 1 ? "alquiler" : "alquileres"}
            </p>
            <p className="text-sm text-neutral-500">
              {appliedFilters.pets && results.length > 0
                ? `${mainResults.length} ${mainResults.length === 1 ? "acepta" : "aceptan"} mascotas · ${petsToConfirm.length} a consultar`
                : "Contacto directo con el propietario"}
            </p>
            <p id="rental-price-hint" className="mt-1 text-sm" aria-live="polite">
              {unreadablePrice ? (
                <span className="text-[#a12d1c] dark:text-[#ff9c8a]">No entendimos “{shorten(unreadablePrice, 24)}”. Escribe solo el monto, por ejemplo 3.000.</span>
              ) : priceHint ? (
                <span className="font-semibold text-[#10533b]">{capitalize(priceHint)}</span>
              ) : null}
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 border border-neutral-300 lg:hidden">
            <ViewButton active={view === "list"} label="Lista" icon={<List className="h-4 w-4" />} onClick={() => setView("list")} />
            <ViewButton active={view === "map"} label="Mapa" icon={<Map className="h-4 w-4" />} onClick={() => setView("map")} />
          </div>
        </div>

        {activeFilters.length > 0 ? (
          <SearchShareActions
            url={shareUrl}
            message={`Mira estos alquileres en Zentro Urbano${searchSummary ? `: ${searchSummary}` : ""}`}
          />
        ) : null}

        {unsupportedIntent ? (
          <p className="mb-4 flex gap-2 border border-[#f0d49a] bg-[#fff8e8] p-3 text-sm text-[#5c3b00]" role="note">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Por ahora Zentro Urbano solo publica alquileres mensuales de casas, departamentos y monoambientes. {unsupportedSearchCopy[unsupportedIntent]}
            </span>
          </p>
        ) : null}

        <div data-results aria-busy={filters.query !== deferredQuery} className={`${filters.query !== deferredQuery ? "results-pending" : ""} lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)] lg:gap-5`}>
          <div className={view === "map" ? "hidden lg:block" : "block"}>
            {results.length > 0 ? (
              <>
                {mainResults.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {mainResults.map((property, index) => (
                      <PropertyCard key={property.slug} property={property} eagerImage={index < 4} />
                    ))}
                  </div>
                ) : (
                  <p className="border border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
                    Ningún anuncio con esta búsqueda confirma todavía que acepta mascotas.
                  </p>
                )}
                {petsToConfirm.length > 0 ? (
                  <section className="mt-8" aria-labelledby="pets-to-confirm-heading">
                    <h2 id="pets-to-confirm-heading" className="flex items-center gap-2 text-base font-semibold text-neutral-950">
                      <PawPrint className="h-4 w-4" aria-hidden="true" />
                      Mascotas: a consultar
                    </h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      El propietario no indicó si acepta mascotas. Pregúntale antes de visitar.
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {petsToConfirm.map(({ property }, index) => (
                        <PropertyCard
                          key={property.slug}
                          property={property}
                          petsToConfirm
                          eagerImage={mainResults.length === 0 && index < 4}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <div className="border border-neutral-300 bg-neutral-50 p-6 text-center sm:p-8">
                <Search className="mx-auto h-6 w-6 text-neutral-400" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-semibold">
                  {activeFilters.length > 0 ? "No hay alquileres con esta búsqueda" : "Todavía no hay alquileres publicados aquí"}
                </h2>
                {relaxations.length > 0 ? (
                  <>
                    <p className="mt-1 text-sm text-neutral-600">Prueba quitando un filtro:</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {relaxations.map(({ key, label, count }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => removeFilter(key)}
                          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:border-neutral-950"
                        >
                          <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {label} ({count} {count === 1 ? "resultado" : "resultados"})
                        </button>
                      ))}
                    </div>
                  </>
                ) : activeFilters.length > 1 ? (
                  <p className="mt-1 text-sm text-neutral-600">Quitar un solo filtro no alcanza. Prueba limpiar la búsqueda.</p>
                ) : null}
                <div className="mt-4 flex flex-col items-center gap-3">
                  {activeFilters.length > 0 ? (
                    <button type="button" onClick={clearFilters} className="min-h-11 cursor-pointer px-3 text-sm font-semibold text-[#176b4d] hover:underline">
                      Limpiar todos los filtros ({properties.length} {properties.length === 1 ? "alquiler" : "alquileres"})
                    </button>
                  ) : null}
                  <a
                    href={whatsappUrl(alertMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="zu-button support-whatsapp"
                  >
                    <WhatsAppIcon />
                    Avísame cuando haya una así
                  </a>
                  <p className="text-xs text-neutral-500">Se abre WhatsApp con tu búsqueda ya escrita.</p>
                </div>
              </div>
            )}
          </div>

          <div className={`${view === "list" ? "hidden lg:block" : "block"} lg:sticky lg:top-[9.25rem] lg:self-start`}>
            {results.length > 0 ? (
              <PropertyMap
                properties={results}
                sectionClassName="h-full bg-white"
                containerClassName="h-full"
                headerClassName="hidden"
                mapClassName="rental-results-map relative min-h-[70svh] w-full overflow-hidden border border-neutral-300 bg-[#e9ece3] lg:min-h-[calc(100svh-11rem)]"
                showZoneShortcuts={false}
                loadOnView
              />
            ) : (
              <div className="flex min-h-[55svh] items-center justify-center border border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                El mapa se actualizará cuando existan resultados.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchShareActions({ url, message }: { url: string; message: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");

  async function shareSearch() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Alquileres en Zentro Urbano", text: message, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("manual");
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={shareSearch}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 hover:border-neutral-950"
      >
        {status === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
        {status === "copied" ? "Enlace copiado" : "Compartir esta búsqueda"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 hover:border-neutral-950"
      >
        <WhatsAppIcon width={16} height={16} />
        Enviar por WhatsApp
      </a>
      {status === "manual" ? (
        <input
          readOnly
          value={url}
          aria-label="Enlace de esta búsqueda"
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 min-w-0 flex-1 border border-neutral-300 bg-white px-3 text-sm"
        />
      ) : null}
      <span className="sr-only" aria-live="polite">{status === "copied" ? "Enlace copiado" : ""}</span>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <label className={compact ? "block" : "block min-w-0"}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${compact ? "h-10" : "h-11 w-full"} cursor-pointer border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 outline-none focus:border-[#176b4d]`}
      >
        {children}
      </select>
    </label>
  );
}

function FilterToggle({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 cursor-pointer items-center gap-2 border px-3 text-sm font-semibold ${
        active
          ? "border-[#176b4d] bg-[#edf7f2] text-[#10533b]"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-950"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function ViewButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 px-3 text-sm font-semibold ${
        active ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("es") + value.slice(1);
}

function shorten(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
