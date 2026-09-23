"use client";

import {
  BadgeDollarSign,
  Bath,
  BedDouble,
  Building2,
  Car,
  Filter,
  Flame,
  Home,
  KeyRound,
  Landmark,
  MapPin,
  PawPrint,
  Ruler,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sofa,
  Trees,
  Waves,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useCurrencyPreference } from "@/components/currency-preference";
import { PropertyCard } from "@/components/property-card";
import {
  getCurrencyLabel,
  getPropertyPriceInCurrency,
  type DisplayCurrency,
} from "@/lib/currency";
import { evaluatePropertySearch, hasSearchQuery } from "@/lib/property-search";
import {
  popularZones,
  type Operation,
  type Property,
  type PropertyType,
} from "@/lib/properties";

type BudgetCurrency = "Todos" | Property["currency"];
type CountFilter = "Todos" | "Monoambiente" | "1" | "2" | "3" | "4";
type BathFilter = "Todos" | "1" | "2" | "3";
type AmenityFilter =
  | "garage"
  | "pets"
  | "furnished"
  | "security"
  | "pool"
  | "patio"
  | "grill"
  | "elevator";

type PropertyExplorerProps = {
  properties: Property[];
  initialQuery?: string;
  initialOperation?: Operation;
  initialPropertyType?: PropertyType;
  initialLifestyle?: string;
  initialCurrency?: Property["currency"];
  initialMinPrice?: string;
  initialMaxPrice?: string;
  initialBedrooms?: CountFilter;
  initialBathrooms?: BathFilter;
  initialMinArea?: string;
  initialMaxArea?: string;
};

const operations: Array<{
  value: "Todos" | Operation;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "Todos",
    label: "Todas",
    description: "Ver todas",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: "Alquiler",
    label: "Alquiler",
    description: "Mudanza rápida",
    icon: <KeyRound className="h-4 w-4" />,
  },
  {
    value: "Compra",
    label: "Compra",
    description: "Hogar propio",
    icon: <Home className="h-4 w-4" />,
  },
  {
    value: "Anticrético",
    label: "Anticrético",
    description: "Capital cuidado",
    icon: <Landmark className="h-4 w-4" />,
  },
];

const propertyTypes: Array<{
  value: "Todos" | PropertyType;
  label: string;
  icon: ReactNode;
}> = [
  { value: "Todos", label: "Todos", icon: <SlidersHorizontal className="h-4 w-4" /> },
  { value: "Casa", label: "Casas", icon: <Home className="h-4 w-4" /> },
  { value: "Departamento", label: "Departamentos", icon: <Building2 className="h-4 w-4" /> },
  { value: "Terreno", label: "Terrenos", icon: <Trees className="h-4 w-4" /> },
];

const bedroomFilters: Array<{ value: CountFilter; label: string }> = [
  { value: "Todos", label: "Todos" },
  { value: "Monoambiente", label: "Monoambiente" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

const quickBedroomFilters: Array<{ value: CountFilter; label: string }> = [
  { value: "Todos", label: "Todos" },
  { value: "Monoambiente", label: "Monoamb." },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
];

const bathroomFilters: Array<{ value: BathFilter; label: string }> = [
  { value: "Todos", label: "Todos" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
];

const amenityFilters: Array<{ value: AmenityFilter; label: string; icon: ReactNode }> = [
  { value: "garage", label: "Garaje", icon: <Car className="h-4 w-4" /> },
  { value: "pets", label: "Mascotas", icon: <PawPrint className="h-4 w-4" /> },
  { value: "furnished", label: "Amoblado", icon: <Sofa className="h-4 w-4" /> },
  { value: "security", label: "Seguridad", icon: <ShieldCheck className="h-4 w-4" /> },
  { value: "pool", label: "Piscina", icon: <Waves className="h-4 w-4" /> },
  { value: "patio", label: "Patio", icon: <Trees className="h-4 w-4" /> },
  { value: "grill", label: "Churrasquera", icon: <Flame className="h-4 w-4" /> },
  { value: "elevator", label: "Ascensor", icon: <Building2 className="h-4 w-4" /> },
];

export function PropertyExplorer({
  properties,
  initialQuery,
  initialOperation,
  initialPropertyType,
  initialLifestyle,
  initialCurrency,
  initialMinPrice,
  initialMaxPrice,
  initialBedrooms,
  initialBathrooms,
  initialMinArea,
  initialMaxArea,
}: PropertyExplorerProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [operation, setOperation] = useState<(typeof operations)[number]["value"]>(
    initialOperation ?? "Todos",
  );
  const [propertyType, setPropertyType] = useState<(typeof propertyTypes)[number]["value"]>(
    initialPropertyType ?? "Todos",
  );
  const [lifestyle, setLifestyle] = useState(initialLifestyle ?? "Todos");
  const [budgetCurrency, setBudgetCurrency] = useState<BudgetCurrency>(
    initialCurrency ?? "Todos",
  );
  const [minPrice, setMinPrice] = useState(initialMinPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice ?? "");
  const [bedrooms, setBedrooms] = useState<CountFilter>(initialBedrooms ?? "Todos");
  const [bathrooms, setBathrooms] = useState<BathFilter>(initialBathrooms ?? "Todos");
  const [bedroomsExact, setBedroomsExact] = useState(false);
  const [bathroomsExact, setBathroomsExact] = useState(false);
  const [minArea, setMinArea] = useState(initialMinArea ?? "");
  const [maxArea, setMaxArea] = useState(initialMaxArea ?? "");
  const [amenities, setAmenities] = useState<AmenityFilter[]>([]);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const displayCurrency = useCurrencyPreference();

  const hasActiveFilters =
    query.trim().length > 0 ||
    operation !== "Todos" ||
    propertyType !== "Todos" ||
    lifestyle !== "Todos" ||
    (budgetCurrency !== "Todos" && (minPrice.trim().length > 0 || maxPrice.trim().length > 0)) ||
    minPrice.trim().length > 0 ||
    maxPrice.trim().length > 0 ||
    bedrooms !== "Todos" ||
    bathrooms !== "Todos" ||
    minArea.trim().length > 0 ||
    maxArea.trim().length > 0 ||
    amenities.length > 0;

  useEffect(() => {
    if (!isMoreFiltersOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreFiltersOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreFiltersOpen]);

  const filteredProperties = useMemo(() => {
    const hasQuery = hasSearchQuery(query);
    const searchEvaluations = properties.map((property, index) => ({
      property,
      index,
      search: evaluatePropertySearch(property, query),
    }));
    const hasAnySearchMatch =
      hasQuery && searchEvaluations.some(({ search }) => search.matches);
    const parsedMinPrice = parsePriceFilterValue(minPrice);
    const parsedMaxPrice = parsePriceFilterValue(maxPrice);
    const parsedMinArea = parsePriceFilterValue(minArea);
    const parsedMaxArea = parsePriceFilterValue(maxArea);

    return searchEvaluations
      .filter(({ property, search }) => {
        const matchesQuery = !hasQuery || !hasAnySearchMatch || search.matches;
        const matchesOperation = operation === "Todos" || property.operation === operation;
        const matchesType = propertyType === "Todos" || property.type === propertyType;
        const matchesLifestyle =
          lifestyle === "Todos" ||
          property.idealFor.includes(lifestyle) ||
          property.tags.includes(lifestyle);
        const matchesBudget = matchesBudgetFilter(
          property,
          budgetCurrency,
          parsedMinPrice,
          parsedMaxPrice,
          displayCurrency,
        );
        const matchesBedrooms = matchesBedroomFilter(property, bedrooms, bedroomsExact);
        const matchesBathrooms = matchesCountFilter(property.bathrooms, bathrooms, bathroomsExact);
        const matchesArea = matchesAreaFilter(property, parsedMinArea, parsedMaxArea);
        const matchesAmenities = amenities.every((amenity) =>
          matchesAmenityFilter(property, amenity),
        );

        return (
          matchesQuery &&
          matchesOperation &&
          matchesType &&
          matchesLifestyle &&
          matchesBudget &&
          matchesBedrooms &&
          matchesBathrooms &&
          matchesArea &&
          matchesAmenities
        );
      })
      .sort((first, second) => {
        if (!hasAnySearchMatch) {
          return first.index - second.index;
        }

        return second.search.score - first.search.score || first.index - second.index;
      })
      .map(({ property }) => property);
  }, [
    amenities,
    bathrooms,
    bathroomsExact,
    bedrooms,
    bedroomsExact,
    budgetCurrency,
    displayCurrency,
    lifestyle,
    maxArea,
    maxPrice,
    minArea,
    minPrice,
    operation,
    properties,
    propertyType,
    query,
  ]);

  const resultLabel =
    filteredProperties.length === 1
      ? "1 propiedad disponible"
      : `${filteredProperties.length} propiedades disponibles`;
  const activeFilterLabels = [
    query.trim().length > 0 ? `"${query.trim()}"` : null,
    operation !== "Todos" ? operation : null,
    propertyType !== "Todos"
      ? (propertyTypes.find((item) => item.value === propertyType)?.label ?? propertyType)
      : null,
    lifestyle !== "Todos" ? lifestyle : null,
    formatBudgetFilterLabel(budgetCurrency, minPrice, maxPrice, displayCurrency),
    formatBedroomFilterLabel(bedrooms, bedroomsExact),
    formatBathroomFilterLabel(bathrooms, bathroomsExact),
    formatAreaFilterLabel(minArea, maxArea),
    ...amenities.map(getAmenityLabel),
  ].filter(Boolean) as string[];

  const clearFilters = () => {
    setQuery("");
    setOperation("Todos");
    setPropertyType("Todos");
    setLifestyle("Todos");
    setBudgetCurrency("Todos");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("Todos");
    setBathrooms("Todos");
    setBedroomsExact(false);
    setBathroomsExact(false);
    setMinArea("");
    setMaxArea("");
    setAmenities([]);
  };

  const toggleAmenity = (amenity: AmenityFilter) => {
    setAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity],
    );
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[34px] border border-black/10 bg-white p-4 shadow-[0_24px_70px_rgba(20,20,20,0.08)] sm:p-5">
        <div className="rounded-[28px] border border-black/10 bg-neutral-50 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#58745f]">
                <Search className="h-4 w-4" aria-hidden="true" />
                Buscar por zona o palabra clave
              </div>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                Equipetrol, Urubó, mascotas, home office o terreno.
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-black/10">
              {resultLabel}
            </span>
          </div>

          <label className="relative mt-4 block">
            <Search
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400 sm:h-6 sm:w-6"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca por zona, ciudad, tipo de propiedad o característica"
              className="h-14 w-full rounded-full border border-black/10 bg-white pl-14 pr-4 text-base font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#21352b] focus:ring-4 focus:ring-[#21352b]/10 sm:h-16 sm:pl-16"
            />
          </label>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
              <KeyRound className="h-4 w-4 text-[#8b4b31]" aria-hidden="true" />
              ¿Qué quieres hacer?
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {operations.map((item) => (
                <FilterCard
                  key={item.value}
                  active={operation === item.value}
                  icon={item.icon}
                  label={item.label}
                  description={item.description}
                  onClick={() => setOperation(item.value)}
                />
              ))}
            </div>
          </div>

          <div className="grid min-w-0 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                <Building2 className="h-4 w-4 text-[#8b4b31]" aria-hidden="true" />
                Tipo de propiedad
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {propertyTypes.map((item) => (
                  <PillButton
                    key={item.value}
                    active={propertyType === item.value}
                    icon={item.icon}
                    label={item.label}
                    onClick={() => setPropertyType(item.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                <BedDouble className="h-4 w-4 text-[#8b4b31]" aria-hidden="true" />
                Habitaciones, baños y superficie
              </div>
              <div className="mt-3 grid gap-3 xl:grid-cols-3">
                <CountFilterGroup
                  title="Habitaciones"
                  icon={<BedDouble className="h-4 w-4" />}
                  options={quickBedroomFilters}
                  value={bedrooms}
                  onChange={setBedrooms}
                />
                <CountFilterGroup
                  title="Baños"
                  icon={<Bath className="h-4 w-4" />}
                  options={bathroomFilters}
                  value={bathrooms}
                  onChange={setBathrooms}
                />
                <AreaFilterGroup
                  minArea={minArea}
                  maxArea={maxArea}
                  onMinAreaChange={setMinArea}
                  onMaxAreaChange={setMaxArea}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsMoreFiltersOpen(true)}
                className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 active:translate-y-0"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Más filtros
                {activeFilterLabels.length > 0 ? (
                  <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-xs text-white">
                    {activeFilterLabels.length}
                  </span>
                ) : null}
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                <BadgeDollarSign className="h-4 w-4 text-[#8b4b31]" aria-hidden="true" />
                Presupuesto
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[auto_8rem_8rem] md:grid-cols-[auto_9rem_9rem]">
                <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-black/10">
                  {[
                    { value: "Todos", label: "Todos" },
                    { value: "USD", label: "$us" },
                    { value: "BOB", label: "Bs" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setBudgetCurrency(item.value as BudgetCurrency)}
                      aria-pressed={budgetCurrency === item.value}
                      className={`h-9 cursor-pointer rounded-full px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 ${
                        budgetCurrency === item.value
                          ? "bg-neutral-950 text-white"
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <input
                  aria-label="Precio mínimo"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  inputMode="numeric"
                  min="0"
                  placeholder="Desde"
                  type="number"
                  className="h-11 min-w-0 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#21352b] focus:ring-4 focus:ring-[#21352b]/10"
                />
                <input
                  aria-label="Precio máximo"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  inputMode="numeric"
                  min="0"
                  placeholder="Hasta"
                  type="number"
                  className="h-11 min-w-0 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#21352b] focus:ring-4 focus:ring-[#21352b]/10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                <MapPin className="h-4 w-4 text-[#8b4b31]" aria-hidden="true" />
                Zonas rápidas
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {popularZones.map((zone) => (
                  <button
                    key={zone.name}
                    type="button"
                    onClick={() => setQuery(zone.name)}
                    className="h-9 cursor-pointer rounded-full bg-[#f7f5ef] px-3 text-xs font-semibold text-neutral-700 ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:bg-white hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 active:translate-y-0"
                  >
                    {zone.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="mt-5 flex flex-col gap-3 rounded-[24px] bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-700">
                Mostrando resultados con filtros activos
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeFilterLabels.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-black/10"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:border-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 active:translate-y-0"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Limpiar filtros
            </button>
          </div>
        ) : null}
      </div>

      {isMoreFiltersOpen ? (
        <MoreFiltersModal
          query={query}
          onQueryChange={setQuery}
          operation={operation}
          onOperationChange={setOperation}
          propertyType={propertyType}
          onPropertyTypeChange={setPropertyType}
          budgetCurrency={budgetCurrency}
          onBudgetCurrencyChange={setBudgetCurrency}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          bedrooms={bedrooms}
          onBedroomsChange={setBedrooms}
          bedroomsExact={bedroomsExact}
          onBedroomsExactChange={setBedroomsExact}
          bathrooms={bathrooms}
          onBathroomsChange={setBathrooms}
          bathroomsExact={bathroomsExact}
          onBathroomsExactChange={setBathroomsExact}
          minArea={minArea}
          maxArea={maxArea}
          onMinAreaChange={setMinArea}
          onMaxAreaChange={setMaxArea}
          amenities={amenities}
          onAmenityToggle={toggleAmenity}
          onClear={clearFilters}
          onClose={() => setIsMoreFiltersOpen(false)}
          resultLabel={resultLabel}
        />
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
            Catálogo curado
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            {resultLabel}
          </h2>
        </div>
      </div>

      {filteredProperties.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      ) : (
        <div className="rounded-[30px] border border-dashed border-black/20 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            <Filter className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-tight text-neutral-950">
            No hay coincidencias con esos filtros
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">
            Prueba quitando un filtro, cambiando la zona o buscando por una etiqueta más amplia
            superficie, precio o cantidad de habitaciones.
          </p>
        </div>
      )}
    </div>
  );
}

function CountFilterGroup<TValue extends CountFilter | BathFilter>({
  title,
  icon,
  options,
  value,
  onChange,
}: {
  title: string;
  icon: ReactNode;
  options: Array<{ value: TValue; label: string }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="rounded-[20px] border border-black/10 bg-white p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
        <span className="text-[#58745f]" aria-hidden="true">
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`h-8 shrink-0 cursor-pointer rounded-full px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 ${
              value === option.value
                ? "bg-neutral-950 text-white"
                : "bg-neutral-50 text-neutral-700 ring-1 ring-black/10 hover:bg-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AreaFilterGroup({
  minArea,
  maxArea,
  onMinAreaChange,
  onMaxAreaChange,
}: {
  minArea: string;
  maxArea: string;
  onMinAreaChange: (value: string) => void;
  onMaxAreaChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[20px] border border-black/10 bg-white p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
        <Ruler className="h-4 w-4 text-[#58745f]" aria-hidden="true" />
        Superficie
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input
          aria-label="Superficie mínima"
          value={minArea}
          onChange={(event) => onMinAreaChange(event.target.value)}
          inputMode="numeric"
          min="0"
          placeholder="Min m²"
          type="number"
          className="h-9 min-w-0 rounded-full border border-black/10 bg-neutral-50 px-3 text-xs font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#21352b] focus:bg-white focus:ring-4 focus:ring-[#21352b]/10"
        />
        <input
          aria-label="Superficie máxima"
          value={maxArea}
          onChange={(event) => onMaxAreaChange(event.target.value)}
          inputMode="numeric"
          min="0"
          placeholder="Max m²"
          type="number"
          className="h-9 min-w-0 rounded-full border border-black/10 bg-neutral-50 px-3 text-xs font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#21352b] focus:bg-white focus:ring-4 focus:ring-[#21352b]/10"
        />
      </div>
    </div>
  );
}

function MoreFiltersModal({
  query,
  onQueryChange,
  operation,
  onOperationChange,
  propertyType,
  onPropertyTypeChange,
  budgetCurrency,
  onBudgetCurrencyChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  bedrooms,
  onBedroomsChange,
  bedroomsExact,
  onBedroomsExactChange,
  bathrooms,
  onBathroomsChange,
  bathroomsExact,
  onBathroomsExactChange,
  minArea,
  maxArea,
  onMinAreaChange,
  onMaxAreaChange,
  amenities,
  onAmenityToggle,
  onClear,
  onClose,
  resultLabel,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  operation: (typeof operations)[number]["value"];
  onOperationChange: (value: (typeof operations)[number]["value"]) => void;
  propertyType: (typeof propertyTypes)[number]["value"];
  onPropertyTypeChange: (value: (typeof propertyTypes)[number]["value"]) => void;
  budgetCurrency: BudgetCurrency;
  onBudgetCurrencyChange: (value: BudgetCurrency) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  bedrooms: CountFilter;
  onBedroomsChange: (value: CountFilter) => void;
  bedroomsExact: boolean;
  onBedroomsExactChange: (value: boolean) => void;
  bathrooms: BathFilter;
  onBathroomsChange: (value: BathFilter) => void;
  bathroomsExact: boolean;
  onBathroomsExactChange: (value: boolean) => void;
  minArea: string;
  maxArea: string;
  onMinAreaChange: (value: string) => void;
  onMaxAreaChange: (value: string) => void;
  amenities: AmenityFilter[];
  onAmenityToggle: (value: AmenityFilter) => void;
  onClear: () => void;
  onClose: () => void;
  resultLabel: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[1200] flex bg-neutral-950/45 p-0 backdrop-blur-sm sm:justify-end sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Más filtros"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex h-full w-full flex-col bg-white shadow-[0_30px_100px_rgba(0,0,0,0.28)] sm:max-w-[540px] sm:overflow-hidden sm:rounded-[32px]">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 px-5">
          <div>
            <p className="text-lg font-semibold tracking-tight text-neutral-950">Más filtros</p>
            <p className="text-xs font-medium text-neutral-500">{resultLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar filtros"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-black/10 text-neutral-700 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          <ModalFilterSection title="Ubicación">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Busca por ubicación o palabra clave"
                className="h-12 w-full rounded-full border border-black/10 bg-neutral-50 pl-11 pr-4 text-sm font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#21352b] focus:bg-white focus:ring-4 focus:ring-[#21352b]/10"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {popularZones.map((zone) => (
                <button
                  key={zone.name}
                  type="button"
                  onClick={() => onQueryChange(zone.name)}
                  className="h-9 cursor-pointer rounded-full bg-[#f7f5ef] px-3 text-xs font-semibold text-neutral-700 ring-1 ring-black/10 transition hover:bg-white"
                >
                  {zone.name}
                </button>
              ))}
            </div>
          </ModalFilterSection>

          <ModalFilterSection title="Tipo de operación">
            <div className="flex flex-wrap gap-2">
              {operations.map((item) => (
                <PillButton
                  key={item.value}
                  active={operation === item.value}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => onOperationChange(item.value)}
                />
              ))}
            </div>
          </ModalFilterSection>

          <ModalFilterSection title="Tipo de propiedad">
            <div className="grid grid-cols-2 gap-2">
              {propertyTypes.map((item) => (
                <BoxToggle
                  key={item.value}
                  active={propertyType === item.value}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => onPropertyTypeChange(item.value)}
                />
              ))}
            </div>
          </ModalFilterSection>

          <ModalFilterSection title="Precio">
            <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr]">
              <div className="flex gap-1 rounded-full bg-neutral-50 p-1 ring-1 ring-black/10">
                {[
                  { value: "Todos", label: "Todos" },
                  { value: "USD", label: "$us" },
                  { value: "BOB", label: "Bs" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onBudgetCurrencyChange(item.value as BudgetCurrency)}
                    aria-pressed={budgetCurrency === item.value}
                    className={`h-9 cursor-pointer rounded-full px-3 text-xs font-semibold transition ${
                      budgetCurrency === item.value
                        ? "bg-neutral-950 text-white"
                        : "text-neutral-600 hover:bg-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <FilterNumberInput
                label="Precio mínimo"
                placeholder="Min"
                value={minPrice}
                onChange={onMinPriceChange}
              />
              <FilterNumberInput
                label="Precio máximo"
                placeholder="Max"
                value={maxPrice}
                onChange={onMaxPriceChange}
              />
            </div>
          </ModalFilterSection>

          <ModalFilterSection title="Habitaciones">
            <div className="flex flex-wrap gap-2">
              {bedroomFilters.map((item) => (
                <PillButton
                  key={item.value}
                  active={bedrooms === item.value}
                  label={item.label}
                  onClick={() => onBedroomsChange(item.value)}
                />
              ))}
            </div>
            <ExactModeToggle
              label="Número exacto de habitaciones"
              checked={bedroomsExact}
              onChange={onBedroomsExactChange}
            />
          </ModalFilterSection>

          <ModalFilterSection title="Baños">
            <div className="flex flex-wrap gap-2">
              {bathroomFilters.map((item) => (
                <PillButton
                  key={item.value}
                  active={bathrooms === item.value}
                  label={item.label}
                  onClick={() => onBathroomsChange(item.value)}
                />
              ))}
            </div>
            <ExactModeToggle
              label="Número exacto de baños"
              checked={bathroomsExact}
              onChange={onBathroomsExactChange}
            />
          </ModalFilterSection>

          <ModalFilterSection title="Superficie">
            <div className="grid grid-cols-2 gap-2">
              <FilterNumberInput
                label="Superficie mínima"
                placeholder="Min m²"
                value={minArea}
                onChange={onMinAreaChange}
              />
              <FilterNumberInput
                label="Superficie máxima"
                placeholder="Max m²"
                value={maxArea}
                onChange={onMaxAreaChange}
              />
            </div>
          </ModalFilterSection>

          <ModalFilterSection title="Extras">
            <div className="grid grid-cols-2 gap-2">
              {amenityFilters.map((item) => (
                <BoxToggle
                  key={item.value}
                  active={amenities.includes(item.value)}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => onAmenityToggle(item.value)}
                />
              ))}
            </div>
          </ModalFilterSection>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-black/10 bg-white p-4">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-neutral-700 transition hover:border-neutral-950"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Ver propiedades
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalFilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-black/10 pb-6 last:border-b-0">
      <h3 className="text-base font-semibold tracking-tight text-neutral-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FilterNumberInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode="numeric"
      min="0"
      placeholder={placeholder}
      type="number"
      className="h-11 min-w-0 rounded-full border border-black/10 bg-neutral-50 px-4 text-sm font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#21352b] focus:bg-white focus:ring-4 focus:ring-[#21352b]/10"
    />
  );
}

function ExactModeToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <span
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-neutral-950" : "bg-neutral-300"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </label>
  );
}

function BoxToggle({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-black/10 bg-neutral-50 text-neutral-700 hover:border-neutral-950 hover:bg-white"
      }`}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
    </button>
  );
}

function FilterCard({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[98px] cursor-pointer rounded-[22px] border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 active:translate-y-0 ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-black/10 bg-neutral-50 text-neutral-800 hover:border-neutral-950 hover:bg-white"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
          active ? "bg-white/12 text-white" : "bg-white text-[#58745f]"
        }`}
      >
        {icon}
      </span>
      <span className="mt-3 block text-sm font-semibold">{label}</span>
      <span className={`mt-1 block text-xs ${active ? "text-white/68" : "text-neutral-500"}`}>
        {description}
      </span>
    </button>
  );
}

function PillButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 text-xs font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 active:translate-y-0 ${
        active
          ? "bg-neutral-950 text-white"
          : "bg-white text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-50"
      }`}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
    </button>
  );
}

function parsePriceFilterValue(value: string) {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
}

function matchesBudgetFilter(
  property: Property,
  currency: BudgetCurrency,
  minPrice: number | null,
  maxPrice: number | null,
  displayCurrency: DisplayCurrency,
) {
  if (minPrice === null && maxPrice === null) {
    return true;
  }

  const targetCurrency = currency === "Todos" ? displayCurrency : currency;
  const convertedPrice = getPropertyPriceInCurrency(property, targetCurrency);

  if (minPrice !== null && convertedPrice < minPrice) {
    return false;
  }

  if (maxPrice !== null && convertedPrice > maxPrice) {
    return false;
  }

  return true;
}

function matchesBedroomFilter(property: Property, filterValue: CountFilter, exactMode: boolean) {
  if (filterValue === "Todos") {
    return true;
  }

  if (filterValue === "Monoambiente") {
    return property.type === "Departamento" && property.bedrooms === 1;
  }

  return matchesCountFilter(property.bedrooms, filterValue, exactMode);
}

function matchesCountFilter(propertyValue: number, filterValue: CountFilter | BathFilter, exactMode: boolean) {
  if (filterValue === "Todos") {
    return true;
  }

  const numericFilter = Number(filterValue);

  if (!Number.isFinite(numericFilter)) {
    return true;
  }

  return exactMode ? propertyValue === numericFilter : propertyValue >= numericFilter;
}

function matchesAreaFilter(
  property: Property,
  minArea: number | null,
  maxArea: number | null,
) {
  if (minArea !== null && property.area < minArea) {
    return false;
  }

  if (maxArea !== null && property.area > maxArea) {
    return false;
  }

  return true;
}

function matchesAmenityFilter(property: Property, amenity: AmenityFilter) {
  if (amenity === "garage") {
    return property.garage > 0;
  }

  if (amenity === "pets") {
    return property.pets;
  }

  if (amenity === "furnished") {
    return property.furnished;
  }

  if (amenity === "security") {
    return property.security;
  }

  if (amenity === "pool") {
    return property.pool;
  }

  if (amenity === "patio") {
    return property.patio;
  }

  if (amenity === "grill") {
    return property.grill;
  }

  return property.elevator;
}

function formatBudgetFilterLabel(
  currency: BudgetCurrency,
  minPrice: string,
  maxPrice: string,
  displayCurrency: DisplayCurrency,
) {
  const cleanMinPrice = minPrice.trim();
  const cleanMaxPrice = maxPrice.trim();

  if (!cleanMinPrice && !cleanMaxPrice) {
    return null;
  }

  const currencyLabel = getCurrencyLabel(currency === "Todos" ? displayCurrency : currency);

  if (cleanMinPrice && cleanMaxPrice) {
    return `${currencyLabel} ${cleanMinPrice} - ${cleanMaxPrice}`.trim();
  }

  if (cleanMaxPrice) {
    return `Hasta ${currencyLabel} ${cleanMaxPrice}`.trim();
  }

  if (cleanMinPrice) {
    return `Desde ${currencyLabel} ${cleanMinPrice}`.trim();
  }

  return null;
}

function formatBedroomFilterLabel(value: CountFilter, exactMode: boolean) {
  if (value === "Todos") {
    return null;
  }

  if (value === "Monoambiente") {
    return "Monoambiente";
  }

  return exactMode ? `${value} habitaciones exactas` : `${value}+ habitaciones`;
}

function formatBathroomFilterLabel(value: BathFilter, exactMode: boolean) {
  if (value === "Todos") {
    return null;
  }

  return exactMode ? `${value} baños exactos` : `${value}+ baños`;
}

function formatAreaFilterLabel(minArea: string, maxArea: string) {
  const cleanMinArea = minArea.trim();
  const cleanMaxArea = maxArea.trim();

  if (!cleanMinArea && !cleanMaxArea) {
    return null;
  }

  if (cleanMinArea && cleanMaxArea) {
    return `${cleanMinArea} - ${cleanMaxArea} m²`;
  }

  if (cleanMinArea) {
    return `Desde ${cleanMinArea} m²`;
  }

  return `Hasta ${cleanMaxArea} m²`;
}

function getAmenityLabel(value: AmenityFilter) {
  return amenityFilters.find((item) => item.value === value)?.label ?? value;
}
