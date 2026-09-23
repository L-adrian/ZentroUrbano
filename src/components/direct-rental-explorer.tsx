"use client";

import {
  Car,
  List,
  Map,
  PawPrint,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useCurrencyPreference } from "@/components/currency-preference";
import { PropertyCard } from "@/components/property-card";
import { PropertyMap } from "@/components/property-map";
import { getPropertyPriceInCurrency } from "@/lib/currency";
import { evaluatePropertySearch, hasSearchQuery } from "@/lib/property-search";
import type { Property, PropertyType } from "@/lib/properties";
import { getRentalZones } from "@/lib/rentals";

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
type RentalTypeFilter = "" | "Casa" | "Departamento" | "Monoambiente";

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
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [zone, setZone] = useState(initialZone);
  const [propertyType, setPropertyType] = useState<RentalTypeFilter>(
    initialBedrooms === "Monoambiente"
      ? "Monoambiente"
      : initialPropertyType === "Casa" || initialPropertyType === "Departamento"
        ? initialPropertyType
        : "",
  );
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [bedrooms, setBedrooms] = useState(
    initialBedrooms === "Monoambiente" ? "" : initialBedrooms,
  );
  const [bathrooms, setBathrooms] = useState(initialBathrooms);
  const [pets, setPets] = useState(initialAmenity === "pets");
  const [garage, setGarage] = useState(initialAmenity === "garage");
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(initialBedrooms || initialBathrooms || initialAmenity),
  );
  const [view, setView] = useState<ResultsView>(initialView);
  const displayCurrency = useCurrencyPreference();
  const zones = useMemo(() => getRentalZones(properties), [properties]);

  const filteredProperties = useMemo(() => {
    const parsedMin = parseNumber(minPrice);
    const parsedMax = parseNumber(maxPrice);
    const hasQuery = hasSearchQuery(deferredQuery);

    return properties
      .map((property, index) => ({
        property,
        index,
        evaluation: evaluatePropertySearch(property, deferredQuery),
      }))
      .filter(({ property, evaluation }) => {
        const price = getPropertyPriceInCurrency(property, displayCurrency);
        const matchesQuery = !hasQuery || evaluation.matches;
        const matchesZone = !zone || property.zone === zone;
        const matchesType =
          !propertyType ||
          (propertyType === "Monoambiente"
            ? isMonoambiente(property)
            : property.type === propertyType);
        const matchesMin = parsedMin === null || price >= parsedMin;
        const matchesMax = parsedMax === null || price <= parsedMax;
        const matchesBedrooms = !bedrooms || property.bedrooms >= Number(bedrooms);
        const matchesBathrooms = !bathrooms || property.bathrooms >= Number(bathrooms);
        const matchesPets = !pets || property.pets;
        const matchesGarage = !garage || property.garage > 0;

        return (
          matchesQuery &&
          matchesZone &&
          matchesType &&
          matchesMin &&
          matchesMax &&
          matchesBedrooms &&
          matchesBathrooms &&
          matchesPets &&
          matchesGarage
        );
      })
      .sort((first, second) => {
        if (!hasQuery) {
          return first.index - second.index;
        }

        return second.evaluation.score - first.evaluation.score || first.index - second.index;
      })
      .map(({ property }) => property);
  }, [
    bathrooms,
    bedrooms,
    displayCurrency,
    garage,
    maxPrice,
    minPrice,
    pets,
    properties,
    propertyType,
    deferredQuery,
    zone,
  ]);

  const activeFilterCount = [
    query.trim(),
    zone,
    propertyType,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    pets ? "pets" : "",
    garage ? "garage" : "",
  ].filter(Boolean).length;

  function clearFilters() {
    setQuery("");
    setZone("");
    setPropertyType("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setBathrooms("");
    setPets(false);
    setGarage(false);
  }

  return (
    <div className="zu-explorer">
      <div className="sticky top-0 z-[40] border-y border-neutral-200 bg-white lg:top-[76px]">
        <div className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(120px,0.65fr)_minmax(100px,0.55fr)_auto]">
            <label className="relative col-span-2 block md:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                aria-label="Buscar alquiler por zona o características"
                placeholder="Zona, avenida o característica"
                className="h-11 w-full border border-neutral-300 bg-white pl-10 pr-3 text-sm font-medium outline-none focus:border-[#176b4d]"
              />
            </label>

            <FilterSelect label="Zona" value={zone} onChange={setZone}>
              <option value="">Todas las zonas</option>
              {zones.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Tipo"
              value={propertyType}
              onChange={(value) => setPropertyType(value as RentalTypeFilter)}
            >
              <option value="">Cualquier tipo</option>
              <option value="Casa">Casa</option>
              <option value="Departamento">Departamento</option>
              <option value="Monoambiente">Monoambiente</option>
            </FilterSelect>

            <label className="relative block">
              <span className="sr-only">Precio máximo</span>
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder={`Máx. ${displayCurrency === "USD" ? "$us" : "Bs"}`}
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
              {activeFilterCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center bg-neutral-950 px-1 text-[11px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          {showAdvanced ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3">
              <FilterSelect label="Dormitorios" value={bedrooms} onChange={setBedrooms} compact>
                <option value="">Dormitorios</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </FilterSelect>
              <FilterSelect label="Baños" value={bathrooms} onChange={setBathrooms} compact>
                <option value="">Baños</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </FilterSelect>
              <label className="sr-only" htmlFor="min-rental-price">Precio mínimo</label>
              <input
                id="min-rental-price"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder={`Mín. ${displayCurrency === "USD" ? "$us" : "Bs"}`}
                className="h-10 w-36 border border-neutral-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#176b4d]"
              />
              <FilterToggle
                active={pets}
                label="Acepta mascotas"
                icon={<PawPrint className="h-4 w-4" />}
                onClick={() => setPets((current) => !current)}
              />
              <FilterToggle
                active={garage}
                label="Con parqueo"
                icon={<Car className="h-4 w-4" />}
                onClick={() => setGarage((current) => !current)}
              />
              {activeFilterCount > 0 ? (
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
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-neutral-950">
              {filteredProperties.length} {filteredProperties.length === 1 ? "alquiler" : "alquileres"}
            </p>
            <p className="text-sm text-neutral-500">Contacto directo con el propietario</p>
          </div>
          <div className="grid grid-cols-2 border border-neutral-300 lg:hidden">
            <ViewButton active={view === "list"} label="Lista" icon={<List className="h-4 w-4" />} onClick={() => setView("list")} />
            <ViewButton active={view === "map"} label="Mapa" icon={<Map className="h-4 w-4" />} onClick={() => setView("map")} />
          </div>
        </div>

        <div data-results aria-busy={query !== deferredQuery} className={`${query !== deferredQuery ? "results-pending" : ""} lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)] lg:gap-5`}>
          <div className={view === "map" ? "hidden lg:block" : "block"}>
            {filteredProperties.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredProperties.map((property, index) => (
                  <PropertyCard key={property.slug} property={property} eagerImage={index < 4} />
                ))}
              </div>
            ) : (
              <div className="border border-neutral-300 bg-neutral-50 p-8 text-center">
                <Search className="mx-auto h-6 w-6 text-neutral-400" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-semibold">No encontramos coincidencias</h2>
                <p className="mt-1 text-sm text-neutral-600">Prueba otra zona o elimina un filtro.</p>
                <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-[#176b4d] hover:underline">
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          <div className={`${view === "list" ? "hidden lg:block" : "block"} lg:sticky lg:top-[9.25rem] lg:self-start`}>
            {filteredProperties.length > 0 ? (
              <PropertyMap
                properties={filteredProperties}
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

function parseNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isMonoambiente(property: Property) {
  return (
    property.type === "Departamento" &&
    property.bedrooms === 1 &&
    (property.title.toLocaleLowerCase("es").includes("monoambiente") ||
      property.tags.some((tag) => tag.toLocaleLowerCase("es").includes("monoambiente")))
  );
}
