"use client";

import {
  Building2,
  ChevronDown,
  ChevronUp,
  Home,
  KeyRound,
  Landmark,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trees,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { PropertyMap } from "@/components/property-map";
import type { ListingPlan, Operation, Property, PropertyType } from "@/lib/properties";

type OperationFilter = "Todos" | Operation;
type PropertyTypeFilter = "Todos" | PropertyType;
type PlanFilter = "Todos" | ListingPlan;
type ZoneFilter = "Todas" | string;

type MapExplorerProps = {
  properties: Property[];
  initialOperation?: Operation;
  initialPropertyType?: PropertyType;
  initialPlan?: ListingPlan;
  initialZone?: string;
};

const operations: Array<{
  value: OperationFilter;
  label: string;
  icon: ReactNode;
}> = [
  { value: "Todos", label: "Todo", icon: <Sparkles className="h-4 w-4" /> },
  { value: "Alquiler", label: "Alquiler", icon: <KeyRound className="h-4 w-4" /> },
  { value: "Compra", label: "Venta", icon: <Home className="h-4 w-4" /> },
  { value: "Anticrético", label: "Anticrético", icon: <Landmark className="h-4 w-4" /> },
];

const propertyTypes: Array<{
  value: PropertyTypeFilter;
  label: string;
  icon: ReactNode;
}> = [
  { value: "Todos", label: "Todos", icon: <SlidersHorizontal className="h-4 w-4" /> },
  { value: "Casa", label: "Casas", icon: <Home className="h-4 w-4" /> },
  { value: "Departamento", label: "Deptos.", icon: <Building2 className="h-4 w-4" /> },
  { value: "Terreno", label: "Terrenos", icon: <Trees className="h-4 w-4" /> },
];

const planFilters: Array<{
  value: PlanFilter;
  label: string;
  icon: ReactNode;
}> = [
  { value: "Todos", label: "Todas", icon: <Sparkles className="h-4 w-4" /> },
  { value: "featured", label: "Premium", icon: <Star className="h-4 w-4" /> },
  { value: "standard", label: "Curadas", icon: <MapPin className="h-4 w-4" /> },
];

export function MapExplorer({
  properties,
  initialOperation,
  initialPropertyType,
  initialPlan,
  initialZone,
}: MapExplorerProps) {
  const [operation, setOperation] = useState<OperationFilter>(initialOperation ?? "Todos");
  const [propertyType, setPropertyType] = useState<PropertyTypeFilter>(
    initialPropertyType ?? "Todos",
  );
  const [plan, setPlan] = useState<PlanFilter>(initialPlan ?? "Todos");
  const [zone, setZone] = useState<ZoneFilter>(initialZone ?? "Todas");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const zones = useMemo(
    () => Array.from(new Set(properties.map((property) => property.zone))).sort(),
    [properties],
  );

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) => {
        const matchesOperation = operation === "Todos" || property.operation === operation;
        const matchesType = propertyType === "Todos" || property.type === propertyType;
        const matchesPlan = plan === "Todos" || property.listingPlan === plan;
        const matchesZone = zone === "Todas" || property.zone === zone;

        return matchesOperation && matchesType && matchesPlan && matchesZone;
      }),
    [operation, plan, properties, propertyType, zone],
  );

  const premiumRentals = properties.filter(
    (property) => property.operation === "Alquiler" && property.listingPlan === "featured",
  ).length;
  const hasActiveFilters =
    operation !== "Todos" || propertyType !== "Todos" || plan !== "Todos" || zone !== "Todas";
  const activeFilterCount = [operation, propertyType, plan, zone].filter(
    (value) => value !== "Todos" && value !== "Todas",
  ).length;
  const title =
    operation === "Alquiler"
      ? "Alquileres disponibles en el mapa."
      : operation === "Compra"
        ? "Propiedades en venta sobre el mapa."
        : operation === "Anticrético"
          ? "Anticréticos ubicados visualmente."
          : "Explora propiedades por ubicación real.";

  return (
    <section className="bg-neutral-50 py-8 sm:py-12">
      <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-black/10 bg-white p-4 shadow-none sm:p-5 sm:shadow-[0_24px_80px_rgba(20,20,20,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
                Mapa interactivo
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
                Filtra por alquiler, venta, anticrético y visibilidad premium.
              </h1>
              <p className="mt-3 hidden text-base leading-7 text-neutral-600 sm:block">
                Las propiedades premium tienen marker destacado, prioridad visual y mejor presencia
                cuando el usuario explora zonas con muchas opciones.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-[420px]">
              <MapStat label="Resultados" value={filteredProperties.length} />
              <MapStat label="Premium" value={filteredProperties.filter(isPremium).length} />
              <MapStat label="Alquiler premium" value={premiumRentals} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileFilters((current) => !current)}
            className="mt-5 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white xl:hidden"
            aria-expanded={showMobileFilters}
          >
            {showMobileFilters ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            {showMobileFilters ? "Ocultar filtros" : "Mostrar filtros"}
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-white/14 px-2 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <div
            className={`mt-5 gap-4 xl:grid xl:grid-cols-[1.1fr_0.95fr_0.95fr_0.8fr] ${
              showMobileFilters ? "grid" : "hidden"
            }`}
          >
            <FilterGroup title="Operación">
              {operations.map((item) => (
                <FilterPill
                  key={item.value}
                  active={operation === item.value}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => setOperation(item.value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Tipo">
              {propertyTypes.map((item) => (
                <FilterPill
                  key={item.value}
                  active={propertyType === item.value}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => setPropertyType(item.value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Visibilidad">
              {planFilters.map((item) => (
                <FilterPill
                  key={item.value}
                  active={plan === item.value}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => setPlan(item.value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Zona">
              <select
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                className="h-10 w-full cursor-pointer rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 outline-none transition focus:border-[#21352b] focus:ring-4 focus:ring-[#21352b]/10"
              >
                <option value="Todas">Todas</option>
                {zones.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterGroup>
          </div>

          {hasActiveFilters ? (
            <div className="mt-5 flex flex-col gap-3 rounded-[24px] bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {operation !== "Todos" ? <ActiveChip label={formatOperation(operation)} /> : null}
                {propertyType !== "Todos" ? <ActiveChip label={propertyType} /> : null}
                {plan !== "Todos" ? <ActiveChip label={plan === "featured" ? "Premium" : "Curadas"} /> : null}
                {zone !== "Todas" ? <ActiveChip label={zone} /> : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOperation("Todos");
                  setPropertyType("Todos");
                  setPlan("Todos");
                  setZone("Todas");
                }}
                className="inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <PropertyMap
        properties={filteredProperties}
        eyebrow={`${filteredProperties.length} propiedades visibles`}
        title={title}
        description="Haz zoom, mueve el mapa y toca un marker para ver la ficha. Los markers premium se muestran con mayor peso visual y prioridad sobre el mapa."
        sectionClassName="bg-neutral-50 pt-8 pb-0"
        containerClassName="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8"
        mapClassName="relative min-h-[760px] overflow-hidden rounded-[34px] border border-black/10 bg-[#e9ece3] shadow-none sm:min-h-[720px] sm:shadow-[0_30px_100px_rgba(20,20,20,0.13)] lg:min-h-[760px]"
        showZoneShortcuts={false}
      />
    </section>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterPill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 ${
        active
          ? "bg-neutral-950 text-white"
          : "bg-neutral-50 text-neutral-700 ring-1 ring-black/10 hover:bg-white hover:text-neutral-950"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MapStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-black/10">
      <p className="text-xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
    </div>
  );
}

function ActiveChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-black/10">
      {label}
    </span>
  );
}

function isPremium(property: Property) {
  return property.listingPlan === "featured";
}

function formatOperation(operation: Operation) {
  return operation === "Compra" ? "Venta" : operation;
}
