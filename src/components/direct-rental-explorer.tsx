"use client";

import {
  ArrowDownUp,
  Car,
  Check,
  Info,
  List,
  Map as MapIcon,
  PawPrint,
  Receipt,
  Search,
  Share2,
  SlidersHorizontal,
  Sofa,
  TrendingDown,
  X,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useCurrencyPreference } from "@/components/currency-preference";
import { PropertyCard } from "@/components/property-card";
import { PropertyMap } from "@/components/property-map";
import { SearchAlertButton } from "@/components/search-alert-button";
import { RecentlyViewed, SavedListingsLink } from "@/components/recently-viewed";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import {
  formatApproxDistance,
  getKnownPlace,
  getNearbyListings,
  getZoneCenters,
  knownPlaces,
  roundMapArea,
  type MapArea,
} from "@/lib/catalog-geo";
import { convertPrice } from "@/lib/currency";
import {
  buildRentalSearchParams,
  describePriceBounds,
  describeRentalFilter,
  describeRentalSearch,
  emptyRentalSearchFilters,
  findPlaceInQuery,
  formatPriceBound,
  getActiveRentalFilters,
  getEntryBound,
  getPriceBounds,
  getUnsupportedSearchIntent,
  readRentalSearchParams,
  rentalBathroomOptions,
  rentalBedroomOptions,
  rentalSearchParamKeys,
  rentalSortOptions,
  searchRentals,
  understandRentalQuery,
  withoutRentalFilter,
  type GuaranteeFilter,
  type PendingReason,
  type RentalFilterKey,
  type RentalSearchFilters,
  type RentalSearchMatch,
  type RentalSort,
  type RentalTypeFilter,
} from "@/lib/property-search";
import type { Property } from "@/lib/properties";
import { getRentalZones } from "@/lib/rentals";
import { absoluteUrl, whatsappUrl } from "@/lib/site";
import { getZoneAverages, zoneAverageMinListings } from "@/lib/zone-prices";

type DirectRentalExplorerProps = {
  properties: Property[];
  // Page defaults: the zone of a zone page or the filter of a need page. The URL wins over them.
  initialFilters?: Partial<RentalSearchFilters>;
  initialView?: ResultsView;
  // "map" (/mapa): on desktop the map takes most of the width.
  layout?: "list" | "map";
};

type ResultsView = "list" | "map";

const unsupportedSearchCopy = {
  anticretico: "No hay anticréticos.",
  venta: "No hay viviendas en venta.",
  habitacion: "No hay habitaciones ni cuartos compartidos.",
};

const pendingLabels: Record<PendingReason, string> = {
  pets: "Mascotas: a consultar",
  expenses: "Expensas: a consultar",
  guarantee: "Garantía: a consultar",
  entry: "Para entrar: a consultar",
};

const noDefaults: Partial<RentalSearchFilters> = {};

export function DirectRentalExplorer({
  properties,
  initialFilters = noDefaults,
  initialView = "list",
  layout = "list",
}: DirectRentalExplorerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Filters live in the URL, so going back from a listing or opening a shared link restores them.
  const [filters, setFilters] = useState<RentalSearchFilters>(() => readRentalSearchParams(searchParams, initialFilters));
  const deferredQuery = useDeferredValue(filters.query);
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      filters.bedrooms || filters.bathrooms || filters.minPrice || filters.pets || filters.garage || filters.furnished ||
        filters.guarantee || filters.includeExpenses || filters.maxEntry || filters.belowZoneAverage || filters.near,
    ),
  );
  const [view, setView] = useState<ResultsView>(initialView);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const displayCurrency = useCurrencyPreference();
  const zones = useMemo(() => {
    const available = getRentalZones(properties);
    return filters.zone && !available.includes(filters.zone) ? [...available, filters.zone] : available;
  }, [filters.zone, properties]);
  const zoneAverages = useMemo(() => getZoneAverages(properties), [properties]);
  const zoneCenters = useMemo(() => getZoneCenters(properties), [properties]);

  const appliedFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [filters, deferredQuery]);
  const matches = useMemo(
    () => searchRentals(properties, appliedFilters, displayCurrency, { zoneAverages }),
    [appliedFilters, displayCurrency, properties, zoneAverages],
  );
  const results = useMemo(() => matches.map(({ property }) => property), [matches]);
  const mainMatches = matches.filter((match) => match.pending.length === 0);
  const pendingMatches = matches.filter((match) => match.pending.length > 0);
  const onlyPetsPending = pendingMatches.every((match) => match.pending.every((reason) => reason === "pets"));
  const understanding = useMemo(
    () => understandRentalQuery(deferredQuery, properties, displayCurrency),
    [deferredQuery, displayCurrency, properties],
  );
  const distancePlace = getKnownPlace(appliedFilters.near) ?? findPlaceInQuery(deferredQuery);

  const activeFilters = getActiveRentalFilters(filters);
  const relaxations = useMemo(() => {
    if (matches.length > 0) return [];
    return getActiveRentalFilters(appliedFilters)
      .map((key) => ({
        key,
        label: `Sin “${describeRentalFilter(key, appliedFilters, displayCurrency)}”`,
        count: searchRentals(properties, withoutRentalFilter(appliedFilters, key), displayCurrency, { zoneAverages }).length,
      }))
      .filter((item) => item.count > 0)
      .sort((first, second) => second.count - first.count);
  }, [appliedFilters, displayCurrency, matches.length, properties, zoneAverages]);

  // D10: under a zone's results, 3 to 6 homes from neighboring zones that fit the other filters.
  const nearby = useMemo(() => {
    if (!appliedFilters.zone) return [];
    const candidates = searchRentals(
      properties,
      { ...appliedFilters, zone: "", area: null, near: "", sort: "" },
      displayCurrency,
      { zoneAverages },
    )
      .filter((match) => match.pending.length === 0)
      .map((match) => match.property);
    return getNearbyListings(candidates, appliedFilters.zone, zoneCenters.get(appliedFilters.zone));
  }, [appliedFilters, displayCurrency, properties, zoneAverages, zoneCenters]);

  const serializedFilters = useMemo(
    () => buildRentalSearchParams(appliedFilters, displayCurrency, initialFilters).toString(),
    [appliedFilters, displayCurrency, initialFilters],
  );
  const shareUrl = absoluteUrl(`${pathname}${serializedFilters ? `?${serializedFilters}` : ""}`);
  const searchSummary = describeRentalSearch(appliedFilters, displayCurrency).join(", ");
  const unsupportedIntent = getUnsupportedSearchIntent(deferredQuery);

  const priceCurrency = filters.priceCurrency ?? displayCurrency;
  const priceLabel = priceCurrency === "USD" ? "$us" : "Bs";
  const priceBounds = getPriceBounds(filters, displayCurrency);
  const entryBound = getEntryBound(filters, displayCurrency);
  const moneyHint = [
    describePriceBounds(priceBounds.min, priceBounds.max),
    filters.includeExpenses && (priceBounds.min || priceBounds.max) ? "con expensas" : null,
    entryBound ? `para entrar hasta ${formatPriceBound(entryBound)}` : null,
  ].filter(Boolean).join(", ");
  const unreadablePrice = [
    !priceBounds.min && filters.minPrice.trim() ? filters.minPrice.trim() : null,
    !priceBounds.max && filters.maxPrice.trim() ? filters.maxPrice.trim() : null,
    !entryBound && filters.maxEntry.trim() ? filters.maxEntry.trim() : null,
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

  function updateFilter<Key extends keyof RentalSearchFilters>(key: Key, value: RentalSearchFilters[Key]) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (!next.minPrice.trim() && !next.maxPrice.trim() && !next.maxEntry.trim()) next.priceCurrency = null;
      return next;
    });
  }

  // Picking a place orders by distance; clearing it goes back to the normal order.
  function selectPlace(near: string) {
    setFilters((current) => ({
      ...current,
      near,
      sort: near ? (current.sort === "" ? "cercania" : current.sort) : current.sort === "cercania" ? "" : current.sort,
    }));
  }

  function removeFilter(key: RentalFilterKey) {
    setFilters((current) => withoutRentalFilter(current, key));
  }

  function clearFilters() {
    setFilters((current) => ({ ...emptyRentalSearchFilters, sort: current.sort === "cercania" ? "" : current.sort }));
  }

  function openFilters() {
    setShowAdvanced(true);
    filterBarRef.current?.scrollIntoView({ block: "start" });
  }

  function searchArea(area: MapArea) {
    updateFilter("area", roundMapArea(area));
  }

  const formatMoney = (amountBob: number) => {
    const amount = convertPrice(amountBob, "BOB", displayCurrency);
    return formatPriceBound({ amount: Math.round(amount), currency: displayCurrency });
  };

  function cardNotes(match: RentalSearchMatch) {
    const notes: string[] = [];
    if (distancePlace && match.distanceKm !== null) {
      const distance = formatApproxDistance(match.distanceKm, distancePlace.name);
      if (distance) notes.push(capitalize(distance));
    }
    if (appliedFilters.belowZoneAverage && match.zoneAverage) {
      const { differenceBob, averageBob, count, zone } = match.zoneAverage;
      notes.push(`${formatMoney(differenceBob)} bajo el promedio de ${zone} (${formatMoney(averageBob)}, ${count} anuncios)`);
    }
    return notes;
  }

  const zoneAverageNote = (() => {
    if (!appliedFilters.belowZoneAverage) return null;
    const averages = Array.from(zoneAverages.values())
      .filter((average) => !appliedFilters.zone || average.zone === appliedFilters.zone)
      .sort((first, second) => first.zone.localeCompare(second.zone, "es"));
    if (averages.length === 0) {
      return appliedFilters.zone
        ? `${appliedFilters.zone} todavía no tiene ${zoneAverageMinListings} anuncios publicados para calcular su promedio.`
        : `Todavía ninguna zona tiene ${zoneAverageMinListings} anuncios publicados para calcular su promedio.`;
    }
    return `Promedio del alquiler mensual por zona, con los anuncios publicados: ${averages
      .map((average) => `${average.zone} ${formatMoney(average.averageBob)} (${average.count} anuncios)`)
      .join(" · ")}.`;
  })();

  const alertMessage = searchSummary
    ? `Hola, busco alquiler en Zentro Urbano y todavía no encuentro lo que necesito: ${searchSummary}. ¿Me avisan si aparece uno así? ${shareUrl}`
    : "Hola, busco alquiler en Zentro Urbano. ¿Me avisan cuando haya nuevos alquileres?";

  const countLabel = `${results.length} ${results.length === 1 ? "alquiler" : "alquileres"}`;
  const subline =
    pendingMatches.length > 0
      ? onlyPetsPending
        ? `${mainMatches.length} ${mainMatches.length === 1 ? "acepta" : "aceptan"} mascotas · ${pendingMatches.length} a consultar`
        : `${mainMatches.length} con todo lo que pides · ${pendingMatches.length} ${pendingMatches.length === 1 ? "pendiente" : "pendientes"} de consulta`
      : "Contacto directo con el propietario";
  const mapLayout = layout === "map";

  return (
    <div className={`zu-explorer${mapLayout ? " is-map-layout" : ""}`}>
      <div ref={filterBarRef} className="catalog-filter-bar z-[40] border-y border-neutral-200 bg-white lg:sticky lg:top-[76px]">
        <div className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(120px,0.65fr)_minmax(100px,0.55fr)_auto]">
            <label className="relative col-span-2 block md:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                value={filters.query}
                onChange={(event) => updateFilter("query", event.target.value)}
                type="search"
                aria-label="Buscar alquiler por zona o características"
                aria-describedby={understanding.chips.length || understanding.unused.length ? "search-understood" : undefined}
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
              aria-controls="rental-advanced-filters"
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 hover:border-neutral-950"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
              Filtros
              {activeFilters.length > 0 ? <FilterCount count={activeFilters.length} /> : null}
            </button>
          </div>

          {showAdvanced ? (
            <div id="rental-advanced-filters" className="catalog-advanced mt-3 border-t border-neutral-200 pt-3">
              <div className="flex flex-wrap items-center gap-2">
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
                <FilterToggle active={filters.pets} label="Acepta mascotas" icon={<PawPrint className="h-4 w-4" />} onClick={() => updateFilter("pets", !filters.pets)} />
                <FilterToggle active={filters.garage} label="Con parqueo" icon={<Car className="h-4 w-4" />} onClick={() => updateFilter("garage", !filters.garage)} />
                <FilterToggle active={filters.furnished} label="Amoblado" icon={<Sofa className="h-4 w-4" />} onClick={() => updateFilter("furnished", !filters.furnished)} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <FilterSelect label="Garantía" value={filters.guarantee} onChange={(value) => updateFilter("guarantee", value as GuaranteeFilter)} compact>
                  <option value="">Garantía: cualquiera</option>
                  <option value="sin">Sin garantía</option>
                  <option value="hasta-1-mes">Garantía hasta 1 mes</option>
                </FilterSelect>
                <label className="sr-only" htmlFor="max-rental-entry">Para entrar, hasta (primer mes, expensas y garantía)</label>
                <input
                  id="max-rental-entry"
                  value={filters.maxEntry}
                  onChange={(event) => updateFilter("maxEntry", event.target.value)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-describedby="rental-price-hint"
                  placeholder={`Para entrar, hasta ${priceLabel}`}
                  className="h-10 w-52 border border-neutral-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#176b4d]"
                />
                <FilterToggle
                  active={filters.includeExpenses}
                  label="Incluir expensas en el presupuesto"
                  icon={<Receipt className="h-4 w-4" />}
                  onClick={() => updateFilter("includeExpenses", !filters.includeExpenses)}
                />
                <FilterToggle
                  active={filters.belowZoneAverage}
                  label="Bajo el promedio de la zona"
                  icon={<TrendingDown className="h-4 w-4" />}
                  onClick={() => updateFilter("belowZoneAverage", !filters.belowZoneAverage)}
                />
                {knownPlaces.length > 0 ? (
                  <FilterSelect label="Cerca de" value={filters.near} onChange={selectPlace} compact>
                    <option value="">Cerca de…</option>
                    {knownPlaces.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                  </FilterSelect>
                ) : null}
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
              <p className="catalog-advanced-note">
                Lo que el dueño no indicó (garantía, expensas o costo para entrar) sale al final como “pendiente de consulta”.
                El promedio de la zona se calcula solo en zonas con {zoneAverageMinListings} o más anuncios.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        {understanding.chips.length > 0 || understanding.unused.length > 0 ? (
          <div id="search-understood" className="search-understood">
            {understanding.chips.length > 0 ? (
              <>
                <span className="search-understood-label">Entendimos:</span>
                {understanding.chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="catalog-chip"
                    onClick={() => updateFilter("query", chip.query)}
                    aria-label={`Quitar ${chip.label} de la búsqueda`}
                  >
                    {chip.label}
                    <X aria-hidden="true" />
                  </button>
                ))}
              </>
            ) : null}
            {understanding.unused.length > 0 ? (
              <span className="search-unused">
                No usamos: {understanding.unused.map((word) => `“${shorten(word, 24)}”`).join(", ")}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="catalog-results-bar">
          <p className="catalog-count" aria-live="polite" aria-atomic="true">{countLabel}</p>
          <SortControl
            id="rental-sort"
            className="catalog-sort is-inline"
            value={filters.sort}
            placeName={distancePlace?.name}
            onChange={(value) => updateFilter("sort", value)}
          />
          <div className="catalog-phone-actions">
            <button type="button" onClick={openFilters} className="catalog-phone-button">
              <SlidersHorizontal aria-hidden="true" />
              Filtros
              {activeFilters.length > 0 ? <FilterCount count={activeFilters.length} /> : null}
            </button>
            <div className="catalog-view-toggle" role="group" aria-label="Ver resultados como">
              <ViewButton active={view === "list"} label="Lista" icon={<List />} onClick={() => setView("list")} />
              <ViewButton active={view === "map"} label="Mapa" icon={<MapIcon />} onClick={() => setView("map")} />
            </div>
          </div>
        </div>
        <SortControl
          id="rental-sort-phone"
          className="catalog-sort is-below"
          value={filters.sort}
          placeName={distancePlace?.name}
          onChange={(value) => updateFilter("sort", value)}
        />

        <p className="mt-1 text-sm text-neutral-500">{subline}</p>
        <p id="rental-price-hint" className="mt-1 text-sm" aria-live="polite">
          {unreadablePrice ? (
            <span className="text-[#a12d1c] dark:text-[#ff9c8a]">No entendimos “{shorten(unreadablePrice, 24)}”. Escribe solo el monto, por ejemplo 3.000.</span>
          ) : moneyHint ? (
            <span className="font-semibold text-[#10533b]">{capitalize(moneyHint)}</span>
          ) : null}
        </p>
        {zoneAverageNote ? <p className="catalog-average-note">{zoneAverageNote}</p> : null}

        {activeFilters.length > 0 ? (
          <div className="catalog-chips" role="group" aria-label="Filtros activos">
            {activeFilters.map((key) => {
              const label = describeRentalFilter(key, filters, displayCurrency);
              return (
                <button key={key} type="button" className="catalog-chip" onClick={() => removeFilter(key)} aria-label={`Quitar filtro: ${label}`}>
                  {label}
                  <X aria-hidden="true" />
                </button>
              );
            })}
            <button type="button" className="catalog-chip-clear" onClick={clearFilters}>Limpiar todo</button>
          </div>
        ) : null}

        <div className="catalog-share-row">
          {activeFilters.length > 0 ? (
            <SearchShareActions
              url={shareUrl}
              message={`Mira estos alquileres en Zentro Urbano${searchSummary ? `: ${searchSummary}` : ""}`}
            />
          ) : null}
          <SavedListingsLink className="saved-listings-link" />
        </div>

        {unsupportedIntent ? (
          <p className="mb-4 flex gap-2 border border-[#f0d49a] bg-[#fff8e8] p-3 text-sm text-[#5c3b00]" role="note">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Por ahora Zentro Urbano solo publica alquileres mensuales de casas, departamentos y monoambientes. {unsupportedSearchCopy[unsupportedIntent]}
            </span>
          </p>
        ) : null}

        <div
          data-results
          aria-busy={filters.query !== deferredQuery}
          className={`${filters.query !== deferredQuery ? "results-pending" : ""} catalog-results-grid lg:grid lg:gap-5`}
        >
          <div className={view === "map" ? "hidden lg:block" : "block"}>
            {results.length > 0 ? (
              <>
                {mainMatches.length > 0 ? (
                  <div className="catalog-card-grid grid gap-4 sm:grid-cols-2">
                    {mainMatches.map((match, index) => (
                      <PropertyCard key={match.property.slug} property={match.property} eagerImage={index < 4} notes={cardNotes(match)} />
                    ))}
                  </div>
                ) : (
                  <p className="border border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
                    {onlyPetsPending
                      ? "Ningún anuncio con esta búsqueda confirma todavía que acepta mascotas."
                      : "Ningún anuncio con esta búsqueda tiene todos los datos que pides. Mira abajo los que están pendientes de consulta."}
                  </p>
                )}
                {pendingMatches.length > 0 ? (
                  <section className="mt-8" aria-labelledby="pending-heading">
                    <h2 id="pending-heading" className="flex items-center gap-2 text-base font-semibold text-neutral-950">
                      {onlyPetsPending ? <PawPrint className="h-4 w-4" aria-hidden="true" /> : <Info className="h-4 w-4" aria-hidden="true" />}
                      {onlyPetsPending ? "Mascotas: a consultar" : "Pendiente de consulta"}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      {onlyPetsPending
                        ? "El propietario no indicó si acepta mascotas. Pregúntale antes de visitar."
                        : "El propietario no indicó alguno de estos datos. Pregúntale antes de visitar."}
                    </p>
                    <div className="catalog-card-grid mt-4 grid gap-4 sm:grid-cols-2">
                      {pendingMatches.map((match, index) => (
                        <PropertyCard
                          key={match.property.slug}
                          property={match.property}
                          pending={match.pending.map((reason) => pendingLabels[reason])}
                          notes={cardNotes(match)}
                          eagerImage={mainMatches.length === 0 && index < 4}
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
                  <SearchAlertButton
                    params={serializedFilters}
                    summary={searchSummary}
                    whatsappHref={whatsappUrl(alertMessage)}
                    className="zu-button zu-button-primary"
                  />
                  <p className="text-xs text-neutral-500">
                    Guardamos tu búsqueda y te escribimos cuando se publique una así. Si prefieres,{" "}
                    <a href={whatsappUrl(alertMessage)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                      envíanos tu búsqueda por WhatsApp
                    </a>
                    .
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={`${view === "list" ? "hidden lg:block" : "block"} catalog-map-column lg:sticky lg:top-[9.25rem] lg:self-start`}>
            {results.length > 0 ? (
              <PropertyMap
                properties={results}
                sectionClassName="h-full bg-white"
                containerClassName="h-full"
                headerClassName="hidden"
                mapClassName="rental-results-map relative min-h-[70svh] w-full overflow-hidden border border-neutral-300 bg-[#e9ece3] lg:min-h-[calc(100svh-11rem)]"
                showZoneShortcuts={false}
                loadOnView
                onSearchArea={searchArea}
                preserveView={Boolean(filters.area)}
              />
            ) : (
              <div className="flex min-h-[55svh] items-center justify-center border border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                El mapa se actualizará cuando existan resultados.
              </div>
            )}
          </div>
        </div>

        {nearby.length > 0 ? (
          <section className="catalog-nearby" aria-labelledby="nearby-heading">
            <h2 id="nearby-heading">Cerca de {appliedFilters.zone}</h2>
            <p>Viviendas de zonas vecinas que también cumplen tu búsqueda. Distancias aproximadas, en línea recta.</p>
            <div className="catalog-card-grid mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map(({ property, distanceKm }) => (
                <PropertyCard
                  key={property.slug}
                  property={property}
                  notes={[capitalize(formatApproxDistance(distanceKm, appliedFilters.zone) ?? "")].filter(Boolean)}
                  contactSource="cercanos"
                />
              ))}
            </div>
          </section>
        ) : null}

        <RecentlyViewed properties={properties} />
      </div>
    </div>
  );
}

function SortControl({
  id,
  className,
  value,
  placeName,
  onChange,
}: {
  id: string;
  className: string;
  value: RentalSort;
  placeName?: string;
  onChange: (value: RentalSort) => void;
}) {
  return (
    <label className={className} htmlFor={id}>
      <ArrowDownUp aria-hidden="true" />
      <span>Ordenar</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as RentalSort)}>
        {rentalSortOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
        {placeName ? <option value="cercania">Más cerca de {placeName}</option> : null}
      </select>
    </label>
  );
}

function FilterCount({ count }: { count: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center bg-neutral-950 px-1 text-[12px] text-white">
      {count}
    </span>
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
    <div className="flex flex-wrap items-center gap-2">
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
      <span aria-hidden="true" className="shrink-0">{icon}</span>
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
    <button type="button" onClick={onClick} aria-pressed={active} className={`catalog-view-button${active ? " is-active" : ""}`}>
      <span aria-hidden="true" className="catalog-view-icon">{icon}</span>
      <span className="catalog-view-label">{label}</span>
    </button>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("es") + value.slice(1);
}

function shorten(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
