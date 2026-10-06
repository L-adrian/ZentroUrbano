"use client";

import {
  ArrowDownUp,
  Car,
  Check,
  ChevronDown,
  Info,
  Columns2,
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
import { trackAnalyticsEvent } from "@/lib/analytics-events";
import {
  formatApproxDistance,
  getKnownPlace,
  getNearbyListings,
  getZoneCenters,
  knownPlaces,
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
  getRentalTypes,
  getUnsupportedSearchIntent,
  readRentalSearchParams,
  rentalBathroomOptions,
  rentalBedroomOptions,
  roomOptionLabel,
  rentalSearchParamKeys,
  rentalSortOptions,
  rentalTypeOptions,
  searchRentals,
  toRentalTypeFilter,
  understandRentalQuery,
  withoutRentalFilter,
  type GuaranteeFilter,
  type PendingReason,
  type RentalFilterKey,
  type RentalSearchFilters,
  type RentalSearchMatch,
  type RentalSort,
  type RentalType,
} from "@/lib/property-search";
import type { Property } from "@/lib/properties";
import { canonicalZone, getZoneSector, joinZones, locateHome, otherZonesLabel, santaCruzSectors, splitZones } from "@/lib/santa-cruz-zones";
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

// "split" shows the list beside the map on wide screens (on phones it behaves like "list").
type ResultsView = "split" | "list" | "map";

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
  initialView = "split",
  layout = "list",
}: DirectRentalExplorerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Filters live in the URL, so going back from a listing or opening a shared link restores them.
  const [filters, setFilters] = useState<RentalSearchFilters>(() => readRentalSearchParams(searchParams, initialFilters));
  const deferredQuery = useDeferredValue(filters.query);
  // Phones and tablets open the filter sidebar as a panel over the page.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<ResultsView>(initialView);
  const filtersRef = useRef<HTMLElement>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const displayCurrency = useCurrencyPreference();
  const selectedZones = useMemo(() => splitZones(filters.zone), [filters.zone]);
  const zoneAverages = useMemo(() => getZoneAverages(properties), [properties]);
  const zoneCenters = useMemo(() => getZoneCenters(properties), [properties]);

  const appliedFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [filters, deferredQuery]);
  const appliedZones = useMemo(() => splitZones(appliedFilters.zone), [appliedFilters.zone]);
  // "Cerca de" and the zone average talk about one zone, so they only show when one is chosen.
  const singleZone = appliedZones.length === 1 ? appliedZones[0] : "";
  // How many homes each choice would show with the other filters as they are.
  const optionCounts = useMemo(() => {
    const countWith = (changes: Partial<RentalSearchFilters>) =>
      searchRentals(properties, { ...appliedFilters, ...changes, sort: "" }, displayCurrency, { zoneAverages });
    // Homes per neighborhood and per zone (a home counts once in its zone and once in its place).
    const byZone = new Map<string, number>();
    const add = (name: string) => byZone.set(name, (byZone.get(name) ?? 0) + 1);
    const unplaced = new Set<string>();
    // Names the owner typed that are not in the list, shown inside the zone their map point is in,
    // and homes that only say the zone ("Norte"), so a zone's number always adds up.
    const extraPlaces = new Map<string, Set<string>>();
    const unnamed = new Map<string, number>();
    for (const match of countWith({ zone: "" })) {
      const { place, sector } = locateHome(match.property);
      add(sector ?? otherZonesLabel);
      if (place) add(place);
      if (place && !sector) unplaced.add(place);
      if (place && sector && getZoneSector(place) === null) extraPlaces.set(sector, (extraPlaces.get(sector) ?? new Set()).add(place));
      if (!place && sector) unnamed.set(sector, (unnamed.get(sector) ?? 0) + 1);
    }
    const count = (key: "bedrooms" | "bathrooms", options: string[]) =>
      new Map(options.map((option) => [option, countWith({ [key]: option }).length]));
    return {
      byZone,
      unplaced,
      extraPlaces,
      unnamed,
      bedrooms: count("bedrooms", rentalBedroomOptions),
      bathrooms: count("bathrooms", rentalBathroomOptions),
    };
  }, [appliedFilters, displayCurrency, properties, zoneAverages]);
  // Zona Norte, Sur, Este… each with its neighborhoods and avenues; places outside the list last.
  const zoneGroups = useMemo<ZoneGroup[]>(() => {
    const countOf = (name: string) => optionCounts.byZone.get(name) ?? 0;
    const groups: ZoneGroup[] = santaCruzSectors.map((sector) => ({
      name: sector.name,
      selectable: true,
      count: countOf(sector.name),
      unnamed: optionCounts.unnamed.get(sector.name) ?? 0,
      places: [...sector.places.map((place) => place.name), ...(optionCounts.extraPlaces.get(sector.name) ?? [])]
        .map((name) => ({ name, count: countOf(name) }))
        .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name, "es")),
    }));
    // Homes without a map point and with a name outside the list.
    const known = new Set(groups.flatMap((group) => [group.name, ...group.places.map((place) => place.name)]));
    const others = Array.from(new Set([...optionCounts.unplaced, ...selectedZones.filter((name) => !known.has(name))]))
      .map((name) => ({ name, count: countOf(name) }))
      .sort((first, second) => first.name.localeCompare(second.name, "es"));
    if (others.length) {
      groups.push({ name: otherZonesLabel, selectable: false, count: countOf(otherZonesLabel), unnamed: 0, places: others });
    }
    return groups;
  }, [optionCounts, selectedZones]);
  const matches = useMemo(
    () => searchRentals(properties, appliedFilters, displayCurrency, { zoneAverages }),
    [appliedFilters, displayCurrency, properties, zoneAverages],
  );
  const results = useMemo(() => matches.map(({ property }) => property), [matches]);
  const hasMap = results.length > 0;
  const mainMatches = matches.filter((match) => match.pending.length === 0);
  const pendingMatches = matches.filter((match) => match.pending.length > 0);
  const onlyPetsPending = pendingMatches.every((match) => match.pending.every((reason) => reason === "pets"));
  const understanding = useMemo(
    () => understandRentalQuery(deferredQuery, properties, displayCurrency),
    [deferredQuery, displayCurrency, properties],
  );
  const distancePlace = getKnownPlace(appliedFilters.near) ?? findPlaceInQuery(deferredQuery);

  const activeFilters = getActiveRentalFilters(filters);
  const selectedTypes = getRentalTypes(filters.type);
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
    if (!singleZone) return [];
    const candidates = searchRentals(
      properties,
      { ...appliedFilters, zone: "", area: null, near: "", sort: "" },
      displayCurrency,
      { zoneAverages },
    )
      .filter((match) => match.pending.length === 0)
      .map((match) => match.property);
    return getNearbyListings(candidates, singleZone, zoneCenters.get(singleZone));
  }, [appliedFilters, displayCurrency, properties, singleZone, zoneAverages, zoneCenters]);

  const serializedFilters = useMemo(
    () => buildRentalSearchParams(appliedFilters, displayCurrency, initialFilters).toString(),
    [appliedFilters, displayCurrency, initialFilters],
  );
  // Alerts always carry the currency, so a price typed in the text keeps meaning $us or Bs.
  const alertParams = useMemo(() => {
    const params = new URLSearchParams(serializedFilters);
    if (!params.has("currency")) params.set("currency", displayCurrency);
    return params.toString();
  }, [serializedFilters, displayCurrency]);
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

  // One "search_empty" per search that stays without results, not per keystroke.
  const reportedEmpty = useRef<string | null>(null);
  const emptySearch = results.length === 0 && properties.length > 0;
  useEffect(() => {
    if (!emptySearch || reportedEmpty.current === serializedFilters) return;
    const timer = window.setTimeout(() => {
      reportedEmpty.current = serializedFilters;
      trackAnalyticsEvent("search_empty", { filters: serializedFilters || "(sin filtros)" });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [emptySearch, serializedFilters]);

  // The open filter panel takes the focus, closes with Escape and gives the focus back to "Filtros".
  useEffect(() => {
    if (!filtersOpen) return;
    const button = filtersButtonRef.current;
    filtersRef.current?.querySelector<HTMLElement>(".catalog-sidebar-close")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.documentElement.classList.add("catalog-filters-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.documentElement.classList.remove("catalog-filters-open");
      if (button?.offsetParent) button.focus();
    };
  }, [filtersOpen]);

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

  // A zone ("Zona Norte") covers its places, so picking it replaces any of its places already picked;
  // unticking one place of a picked zone keeps the zone's other places.
  function toggleZone(zone: string, checked: boolean) {
    setFilters((current) => {
      const selected = splitZones(current.zone);
      const sector = zoneGroups.find((item) => item.selectable && item.name === zone);
      if (sector) {
        const inside = new Set([sector.name, ...sector.places.map((place) => place.name)]);
        const rest = selected.filter((item) => !inside.has(item));
        return { ...current, zone: joinZones(checked ? [...rest, sector.name] : rest) };
      }
      const parent = zoneGroups.find((item) => item.selectable && item.places.some((place) => place.name === zone));
      if (!checked && parent && selected.includes(parent.name)) {
        const siblings = parent.places.map((place) => place.name).filter((name) => name !== zone);
        return { ...current, zone: joinZones([...selected.filter((item) => item !== parent.name), ...siblings]) };
      }
      const rest = selected.filter((item) => item !== zone);
      return { ...current, zone: joinZones(checked ? [...rest, zone] : rest) };
    });
  }

  function toggleType(type: RentalType, checked: boolean) {
    setFilters((current) => {
      const types = new Set<string>(getRentalTypes(current.type));
      if (checked) types.add(type);
      else types.delete(type);
      return { ...current, type: toRentalTypeFilter(types) };
    });
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
      .filter((average) => appliedZones.length === 0 || appliedZones.includes(canonicalZone(average.zone)))
      .sort((first, second) => first.zone.localeCompare(second.zone, "es"));
    if (averages.length === 0) {
      return singleZone
        ? `${singleZone} todavía no tiene ${zoneAverageMinListings} anuncios publicados para calcular su promedio.`
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
      {filtersOpen ? <button type="button" className="catalog-filters-backdrop" aria-label="Cerrar filtros" tabIndex={-1} onClick={() => setFiltersOpen(false)} /> : null}
      <div className="catalog-layout mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <aside
          id="rental-filters"
          ref={filtersRef}
          className={`catalog-sidebar${filtersOpen ? " is-open" : ""}`}
          aria-label="Filtros"
          role={filtersOpen ? "dialog" : undefined}
          aria-modal={filtersOpen || undefined}
        >
          <div className="catalog-sidebar-head">
            <h2>Filtros</h2>
            {activeFilters.length > 0 ? (
              <button type="button" onClick={clearFilters} className="catalog-sidebar-clear">Limpiar</button>
            ) : null}
            <button type="button" onClick={() => setFiltersOpen(false)} className="catalog-sidebar-close" aria-label="Cerrar filtros">
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="catalog-sidebar-body">
            <FilterGroup title="¿Qué estás buscando?">
              {rentalTypeOptions.map((option) => (
                <FilterCheckbox
                  key={option}
                  label={option}
                  checked={selectedTypes.includes(option)}
                  onChange={(checked) => toggleType(option, checked)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Zonas">
              <ZonePicker groups={zoneGroups} selected={selectedZones} onToggle={toggleZone} onClear={() => updateFilter("zone", "")} />
            </FilterGroup>

            <FilterGroup title="Dormitorios">
              <RoomPicker
                label="Dormitorios"
                options={rentalBedroomOptions}
                value={filters.bedrooms}
                counts={optionCounts.bedrooms}
                onChange={(value) => updateFilter("bedrooms", value)}
              />
            </FilterGroup>

            <FilterGroup title="Baños">
              <RoomPicker
                label="Baños"
                options={rentalBathroomOptions}
                value={filters.bathrooms}
                counts={optionCounts.bathrooms}
                onChange={(value) => updateFilter("bathrooms", value)}
              />
            </FilterGroup>

            <FilterGroup title="Precio por mes">
              <div className="catalog-filter-pair">
                <label className="block min-w-0">
                  <span className="sr-only">Precio mínimo por mes</span>
                  <input
                    value={filters.minPrice}
                    onChange={(event) => updateFilter("minPrice", event.target.value)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-describedby="rental-price-hint"
                    placeholder={`Mín. ${priceLabel}`}
                    className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#176b4d]"
                  />
                </label>
                <label className="block min-w-0">
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
              </div>
              <div className="catalog-price-presets" aria-label="Presupuestos rápidos">
                {(priceCurrency === "USD" ? [200, 350, 600, 900] : [1500, 2500, 4000, 6000]).map((amount) => {
                  const selected = !filters.minPrice.trim() && priceBounds.max?.amount === amount && priceBounds.max.currency === priceCurrency;
                  return (
                    <button
                      key={amount}
                      type="button"
                      aria-pressed={selected}
                      className={selected ? "is-selected" : undefined}
                      onClick={() => {
                        setFilters((current) => ({ ...current, minPrice: "", maxPrice: selected ? "" : String(amount), priceCurrency: selected ? null : priceCurrency }));
                      }}
                    >
                      Hasta {formatPriceBound({ amount, currency: priceCurrency })}
                    </button>
                  );
                })}
              </div>
              <FilterCheckbox
                label="Incluir expensas en el presupuesto"
                icon={<Receipt />}
                checked={filters.includeExpenses}
                onChange={(checked) => updateFilter("includeExpenses", checked)}
              />
              <FilterCheckbox
                label="Bajo el promedio de la zona"
                icon={<TrendingDown />}
                checked={filters.belowZoneAverage}
                onChange={(checked) => updateFilter("belowZoneAverage", checked)}
              />
            </FilterGroup>

            <FilterGroup title="Comodidades">
              <FilterCheckbox label="Acepta mascotas" icon={<PawPrint />} checked={filters.pets} onChange={(checked) => updateFilter("pets", checked)} />
              <FilterCheckbox label="Con parqueo" icon={<Car />} checked={filters.garage} onChange={(checked) => updateFilter("garage", checked)} />
              <FilterCheckbox label="Amoblado" icon={<Sofa />} checked={filters.furnished} onChange={(checked) => updateFilter("furnished", checked)} />
            </FilterGroup>

            <FilterGroup title="Para entrar">
              <FilterSelect label="Garantía" value={filters.guarantee} onChange={(value) => updateFilter("guarantee", value as GuaranteeFilter)}>
                <option value="">Garantía: cualquiera</option>
                <option value="sin">Sin garantía</option>
                <option value="hasta-1-mes">Garantía hasta 1 mes</option>
              </FilterSelect>
              <label className="block">
                <span className="sr-only">Para entrar, hasta (primer mes, expensas y garantía)</span>
                <input
                  value={filters.maxEntry}
                  onChange={(event) => updateFilter("maxEntry", event.target.value)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-describedby="rental-price-hint"
                  placeholder={`Para entrar, hasta ${priceLabel}`}
                  className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#176b4d]"
                />
              </label>
            </FilterGroup>

            {knownPlaces.length > 0 ? (
              <FilterGroup title="Cerca de">
                <FilterSelect label="Cerca de" value={filters.near} onChange={selectPlace}>
                  <option value="">Cualquier lugar</option>
                  {knownPlaces.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                </FilterSelect>
              </FilterGroup>
            ) : null}

            <p className="catalog-advanced-note">
              Lo que el dueño no indicó (garantía, expensas o costo para entrar) sale al final como “pendiente de consulta”.
              El promedio de la zona se calcula solo en zonas con {zoneAverageMinListings} o más anuncios.
            </p>
          </div>

          <div className="catalog-sidebar-foot">
            <button type="button" onClick={() => setFiltersOpen(false)} className="zu-button zu-button-primary">
              Ver {countLabel}
            </button>
          </div>
        </aside>

        <div className="catalog-main">
          <label className="catalog-search relative block">
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
              <button
                ref={filtersButtonRef}
                type="button"
                onClick={() => setFiltersOpen(true)}
                aria-expanded={filtersOpen}
                aria-controls="rental-filters"
                className="catalog-phone-button"
              >
                <SlidersHorizontal aria-hidden="true" />
                Filtros
                {activeFilters.length > 0 ? <FilterCount count={activeFilters.length} /> : null}
              </button>
              <div className="catalog-view-toggle" role="group" aria-label="Ver resultados como">
                <ViewButton active={view === "split"} label="Lista y mapa" icon={<Columns2 />} onClick={() => setView("split")} className="catalog-view-split" />
                <ViewButton active={view === "list"} label="Lista" icon={<List />} onClick={() => setView("list")} className={view === "split" && !mapLayout ? "is-split-fallback" : ""} />
                <ViewButton active={view === "map"} label="Mapa" icon={<MapIcon />} onClick={() => setView("map")} className={view === "split" && mapLayout ? "is-split-fallback" : ""} />
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
            className={`${filters.query !== deferredQuery ? "results-pending" : ""} catalog-results-grid${view === "split" && hasMap ? " is-split" : ""}`}
          >
            {/* The key restarts a short fade each time the search changes, instead of a sudden swap. */}
            <div
              key={serializedFilters}
              className={`zu-fade ${!hasMap ? "block" : view === "map" || (view === "split" && mapLayout) ? (view === "split" ? "hidden lg:block" : "hidden") : "block"}`}
            >
              {results.length > 0 ? (
                <>
                  {mainMatches.length > 0 ? (
                    <div className="catalog-card-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                      <div className="catalog-card-grid mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                      params={alertParams}
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

            {/* With no results the map closes; the list column shows what to change. */}
            {hasMap ? (
            <div className={`${view === "list" ? "hidden" : view === "split" && !mapLayout ? "hidden lg:block" : "block"} catalog-map-column`}>
                <PropertyMap
                  properties={results}
                  sectionClassName="h-full bg-white"
                  containerClassName="h-full"
                  headerClassName="hidden"
                  mapClassName="rental-results-map relative min-h-[70svh] w-full overflow-hidden border border-neutral-300 bg-[#e9ece3] lg:min-h-[calc(100svh-11rem)]"
                  showZoneShortcuts={false}
                  loadOnView
                  preserveView={Boolean(filters.area)}
                />
            </div>
            ) : null}
          </div>

          {nearby.length > 0 ? (
            <section className="catalog-nearby" aria-labelledby="nearby-heading">
              <h2 id="nearby-heading">Cerca de {singleZone}</h2>
              <p>Viviendas de zonas vecinas que también cumplen tu búsqueda. Distancias aproximadas, en línea recta.</p>
              <div className="catalog-card-grid mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {nearby.map(({ property, distanceKm }) => (
                  <PropertyCard
                    key={property.slug}
                    property={property}
                    notes={[capitalize(formatApproxDistance(distanceKm, singleZone) ?? "")].filter(Boolean)}
                    contactSource="cercanos"
                  />
                ))}
              </div>
            </section>
          ) : null}

          <RecentlyViewed properties={properties} />
        </div>
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
        trackAnalyticsEvent("search_share", { method: "compartir" });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      trackAnalyticsEvent("search_share", { method: "copiar" });
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
        onClick={() => trackAnalyticsEvent("search_share", { method: "whatsapp" })}
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

// Exact counts: "1" shows only one-bedroom homes; the last option ("4+") also covers more.
function RoomPicker({
  label,
  options,
  value,
  counts,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  counts: Map<string, number>;
  onChange: (value: string) => void;
}) {
  const choices = [{ value: "", text: "Todos" }, ...options.map((option) => ({ value: option, text: roomOptionLabel(option, options) }))];
  return (
    <div className="catalog-rooms" role="radiogroup" aria-label={label}>
      {choices.map((choice) => {
        const count = choice.value ? counts.get(choice.value) ?? 0 : null;
        const selected = value === choice.value;
        return (
          <button
            key={choice.value || "all"}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={choice.value ? `${choice.text} ${label.toLocaleLowerCase("es")}, ${count} ${count === 1 ? "alquiler" : "alquileres"}` : `${label}: todos`}
            className={selected ? "is-selected" : undefined}
            disabled={!selected && count === 0}
            onClick={() => onChange(choice.value)}
          >
            {choice.text}
          </button>
        );
      })}
    </div>
  );
}

type ZoneGroup = {
  name: string;
  selectable: boolean;
  count: number;
  // Homes in the zone whose owner gave no neighborhood.
  unnamed: number;
  places: Array<{ name: string; count: number }>;
};

// Zona Norte, Sur, Este, Oeste…: ticking a zone picks all of it; opening it shows its places.
function ZonePicker({
  groups,
  selected,
  onToggle,
  onClear,
}: {
  groups: ZoneGroup[];
  selected: string[];
  onToggle: (zone: string, checked: boolean) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string[]>([]);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const term = normalize(search.trim());
  const visible = groups
    .map((group) => ({
      ...group,
      places: term && !normalize(group.name).includes(term) ? group.places.filter((place) => normalize(place.name).includes(term)) : group.places,
    }))
    .filter((group) => !term || normalize(group.name).includes(term) || group.places.length > 0);
  return (
    <div className="catalog-zones">
      {selected.length > 0 ? (
        <div className="catalog-zones-selected">
          {selected.map((zone) => (
            <button key={zone} type="button" className="catalog-chip" onClick={() => onToggle(zone, false)} aria-label={`Quitar ${zone}`}>
              {zone}
              <X aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="catalog-zones-clear" onClick={onClear}>Todas las zonas</button>
        </div>
      ) : null}
      <label className="catalog-zones-search">
        <span className="sr-only">Buscar zona, barrio o avenida</span>
        <Search aria-hidden="true" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Buscar barrio o avenida" autoComplete="off" />
      </label>
      <div className="catalog-zones-list">
        {visible.map((group) => {
          const whole = group.selectable && selected.includes(group.name);
          const some = !whole && group.places.some((place) => selected.includes(place.name));
          const expanded = Boolean(term) || open.includes(group.name);
          const panelId = `zona-${normalize(group.name).replace(/[^a-z0-9]+/g, "-")}`;
          return (
            <div key={group.name} className="catalog-zone-group">
              <div className="catalog-zone-row">
                {group.selectable ? (
                  <label className={`catalog-check${group.count === 0 ? " is-empty" : ""}`}>
                    <input
                      type="checkbox"
                      checked={whole}
                      ref={(input) => { if (input) input.indeterminate = some; }}
                      onChange={(event) => onToggle(group.name, event.target.checked)}
                    />
                    <span className="catalog-zone-name">{group.name}</span>
                    <span className="catalog-check-count">{group.count}</span>
                  </label>
                ) : (
                  <span className="catalog-check catalog-zone-other">
                    <span className="catalog-zone-name">{group.name}</span>
                    <span className="catalog-check-count">{group.count}</span>
                  </span>
                )}
                <button
                  type="button"
                  className="catalog-zone-toggle"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  aria-label={`${expanded ? "Ocultar" : "Ver"} barrios de ${group.name}`}
                  onClick={() => setOpen((current) => (current.includes(group.name) ? current.filter((name) => name !== group.name) : [...current, group.name]))}
                >
                  <ChevronDown aria-hidden="true" />
                </button>
              </div>
              {expanded ? (
                <div id={panelId} className="catalog-zone-places">
                  {group.places.map((place) => (
                    <label key={place.name} className={`catalog-check${place.count === 0 ? " is-empty" : ""}`}>
                      <input
                        type="checkbox"
                        checked={whole || selected.includes(place.name)}
                        onChange={(event) => onToggle(place.name, event.target.checked)}
                      />
                      <span>{place.name}</span>
                      <span className="catalog-check-count">{place.count}</span>
                    </label>
                  ))}
                  {group.unnamed > 0 ? (
                    <p className="catalog-zone-unnamed">
                      {group.unnamed} {group.unnamed === 1 ? "alquiler" : "alquileres"} sin barrio indicado
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {visible.length === 0 ? <p className="catalog-zones-empty">No encontramos ese barrio. Prueba con la zona (Norte, Sur, Este u Oeste).</p> : null}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="catalog-filter-group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterCheckbox({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="catalog-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {icon ? <span aria-hidden="true" className="catalog-check-icon">{icon}</span> : null}
      <span>{label}</span>
    </label>
  );
}

function ViewButton({
  active,
  label,
  icon,
  onClick,
  className = "",
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`catalog-view-button${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}>
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
