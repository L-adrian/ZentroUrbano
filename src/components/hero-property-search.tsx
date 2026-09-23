"use client";

import {
  BadgeCheck,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Compass,
  Home,
  KeyRound,
  Landmark,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Trees,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Operation, PropertyType } from "@/lib/properties";

type BudgetCurrency = "Todos" | "USD" | "BOB";
type HeroPropertySearchProps = {
  variant?: "default" | "mobile-basic";
};

const operationFilters: Array<{
  value: Operation;
  label: string;
  copy: string;
  icon: ReactNode;
}> = [
  {
    value: "Alquiler",
    label: "Alquiler",
    copy: "Listo para mudarte",
    icon: <KeyRound className="h-4 w-4" />,
  },
  {
    value: "Compra",
    label: "Compra",
    copy: "Inversión y hogar",
    icon: <Home className="h-4 w-4" />,
  },
  {
    value: "Anticrético",
    label: "Anticrético",
    copy: "Opciones curadas",
    icon: <Landmark className="h-4 w-4" />,
  },
];

const lifestyleShortcuts = ["Mascotas", "Home office", "Zonas tranquilas", "Económicos"];

const propertyTypeFilters: Array<{
  value: PropertyType;
  label: string;
  icon: ReactNode;
}> = [
  {
    value: "Departamento",
    label: "Departamentos",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    value: "Casa",
    label: "Casas",
    icon: <Home className="h-4 w-4" />,
  },
  {
    value: "Terreno",
    label: "Terrenos",
    icon: <Trees className="h-4 w-4" />,
  },
];

export function HeroPropertySearch({ variant = "default" }: HeroPropertySearchProps) {
  const [query, setQuery] = useState("");
  const [operation, setOperation] = useState<Operation | "">("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [lifestyle, setLifestyle] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState<BudgetCurrency>("Todos");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const budgetLabel = formatBudgetFilterLabel(budgetCurrency, minPrice, maxPrice);
  const hasBudgetFilter =
    budgetCurrency !== "Todos" || minPrice.trim() !== "" || maxPrice.trim() !== "";
  const hasFilters = operation !== "" || propertyType !== "" || lifestyle !== "" || hasBudgetFilter;
  const activeLabels = [
    operation || null,
    propertyType ? getPropertyTypeLabel(propertyType) : null,
    lifestyle || null,
    budgetLabel,
  ].filter(Boolean) as string[];

  const clearFilters = () => {
    setOperation("");
    setPropertyType("");
    setLifestyle("");
    setBudgetCurrency("Todos");
    setMinPrice("");
    setMaxPrice("");
  };

  const openMap = () => {
    window.location.assign("/mapa");
  };

  if (variant === "mobile-basic") {
    return (
      <form action="/propiedades" method="get" className="zu-mobile-basic-search">
        {operation ? <input type="hidden" name="operation" value={operation} /> : null}
        {propertyType ? <input type="hidden" name="type" value={propertyType} /> : null}
        {lifestyle ? <input type="hidden" name="lifestyle" value={lifestyle} /> : null}
        {hasBudgetFilter && budgetCurrency !== "Todos" ? (
          <input type="hidden" name="currency" value={budgetCurrency} />
        ) : null}

        <div className="zu-mobile-chip-row" aria-label="Estilo de vida">
          {lifestyleShortcuts.map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              onClick={() => setLifestyle((current) => (current === shortcut ? "" : shortcut))}
              aria-pressed={lifestyle === shortcut}
              className={`zu-mobile-chip ${lifestyle === shortcut ? "is-active" : ""}`}
            >
              {shortcut}
            </button>
          ))}
        </div>

        <label className="zu-mobile-search-field">
          <span className="sr-only">Buscar por zona o palabra clave</span>
          <input
            name={query.trim() ? "q" : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="¿Dónde quieres vivir? Ej. Equipetrol"
            className="zu-mobile-search-input"
            type="search"
          />
        </label>

        <button type="submit" className="zu-mobile-submit">
          Buscar
        </button>

        <div className="zu-mobile-operation-grid" aria-label="Operación">
          {operationFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() =>
                setOperation((current) => (current === filter.value ? "" : filter.value))
              }
              aria-pressed={operation === filter.value}
              className={`zu-mobile-operation ${operation === filter.value ? "is-active" : ""}`}
            >
              <strong>{filter.label}</strong>
              <span>{filter.copy}</span>
            </button>
          ))}
        </div>

        <div className="zu-mobile-action-grid">
          <button
            type="button"
            onClick={() =>
              setPropertyType((current) => (current === "Departamento" ? "" : "Departamento"))
            }
            aria-pressed={propertyType === "Departamento"}
            className={`zu-mobile-action ${
              propertyType === "Departamento" ? "is-active" : ""
            }`}
          >
            Departamentos
          </button>
          <button type="button" onClick={openMap} className="zu-mobile-action">
            Ver mapa
          </button>
          <button
            type="button"
            onClick={() => setShowMoreFilters((current) => !current)}
            aria-expanded={showMoreFilters}
            className={`zu-mobile-action ${showMoreFilters ? "is-active" : ""}`}
          >
            Filtros
          </button>
        </div>

        {showMoreFilters ? (
          <div className="zu-mobile-more-filters">
            <p className="zu-mobile-filter-title">Presupuesto</p>
            <div className="zu-mobile-currency-row">
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
                  className={`zu-mobile-mini-chip ${
                    budgetCurrency === item.value ? "is-active" : ""
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="zu-mobile-price-row">
              <input
                aria-label="Precio mínimo"
                name={minPrice.trim() ? "minPrice" : undefined}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                inputMode="numeric"
                min="0"
                placeholder="Desde"
                type="number"
                className="zu-mobile-price-input"
              />
              <input
                aria-label="Precio máximo"
                name={maxPrice.trim() ? "maxPrice" : undefined}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                inputMode="numeric"
                min="0"
                placeholder="Hasta"
                type="number"
                className="zu-mobile-price-input"
              />
            </div>
            <div className="zu-mobile-type-grid" aria-label="Tipo de propiedad">
              {propertyTypeFilters.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setPropertyType((current) => (current === type.value ? "" : type.value))
                  }
                  aria-pressed={propertyType === type.value}
                  className={`zu-mobile-mini-chip ${
                    propertyType === type.value ? "is-active" : ""
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {hasFilters ? (
          <div className="zu-mobile-active-filters">
            <span>{activeLabels.join(" · ")}</span>
            <button type="button" onClick={clearFilters}>
              Limpiar
            </button>
          </div>
        ) : null}

        <div className="zu-mobile-proof-list">
          <span>Curado manualmente</span>
          <span>Mapa real</span>
          <span>WhatsApp directo</span>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:flex sm:flex-wrap">
        {lifestyleShortcuts.map((shortcut) => (
          <button
            key={shortcut}
            type="button"
            onClick={() => setLifestyle((current) => (current === shortcut ? "" : shortcut))}
            aria-pressed={lifestyle === shortcut}
            className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 text-center text-xs font-semibold transition hover:bg-white hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 sm:px-4 sm:text-sm sm:focus-visible:ring-white/20 ${
              lifestyle === shortcut
                ? "border-neutral-950 bg-neutral-950 text-white sm:border-white sm:bg-white sm:text-neutral-950"
                : "border-black/10 bg-white text-neutral-700 sm:border-white/18 sm:bg-white/10 sm:text-white"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {shortcut}
          </button>
        ))}
      </div>

      <form
        action="/propiedades"
        method="get"
        className="mt-3 w-full max-w-full rounded-[24px] border border-white/70 bg-white p-2.5 text-neutral-950 shadow-none sm:mt-4 sm:rounded-[30px] sm:p-4 sm:shadow-[0_24px_90px_rgba(0,0,0,0.28)] lg:mt-0"
      >
        {operation ? <input type="hidden" name="operation" value={operation} /> : null}
        {propertyType ? <input type="hidden" name="type" value={propertyType} /> : null}
        {lifestyle ? <input type="hidden" name="lifestyle" value={lifestyle} /> : null}
        {hasBudgetFilter && budgetCurrency !== "Todos" ? (
          <input type="hidden" name="currency" value={budgetCurrency} />
        ) : null}

        <div className="grid gap-2 sm:gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400 sm:h-6 sm:w-6"
              aria-hidden="true"
            />
            <input
              name={query.trim() ? "q" : undefined}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="¿Dónde quieres vivir? Ej. Equipetrol, Urubó, mascotas..."
              className="h-12 w-full rounded-full border border-black/10 bg-white pl-12 pr-4 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#21352b] focus:ring-4 focus:ring-[#21352b]/10 sm:h-16 sm:pl-14 sm:text-base"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#111916] px-7 text-sm font-semibold text-white transition hover:bg-[#21352b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/20 sm:h-16 lg:w-auto"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Buscar
          </button>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid grid-cols-3 gap-2">
            {operationFilters.map((filter) => (
              <SearchFilterCard
                key={filter.value}
                active={operation === filter.value}
                icon={filter.icon}
                label={filter.label}
                copy={filter.copy}
                onClick={() =>
                  setOperation((current) => (current === filter.value ? "" : filter.value))
                }
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <PillToggle
              active={propertyType === "Departamento"}
              icon={<Building2 className="h-4 w-4" />}
              label="Departamentos"
              className="justify-center"
              onClick={() =>
                setPropertyType((current) =>
                  current === "Departamento" ? "" : "Departamento",
                )
              }
            />
            <PillToggle
              active={false}
              icon={<MapPin className="h-4 w-4" />}
              label="Ver mapa"
              className="justify-center"
              onClick={openMap}
            />
            <PillToggle
              active={showMoreFilters}
              icon={<SlidersHorizontal className="h-4 w-4" />}
              label="Filtros"
              className="col-span-2 justify-center sm:col-span-1"
              onClick={() => setShowMoreFilters((current) => !current)}
            />
          </div>
        </div>

        {showMoreFilters ? (
          <div className="mt-3 space-y-4 rounded-[22px] bg-neutral-50 p-3">
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
                      className={`h-9 cursor-pointer rounded-full px-3 text-xs font-semibold transition ${
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
                  name={minPrice.trim() ? "minPrice" : undefined}
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
                  name={maxPrice.trim() ? "maxPrice" : undefined}
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

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {propertyTypeFilters.map((type) => (
                <PillToggle
                  key={type.value}
                  active={propertyType === type.value}
                  icon={type.icon}
                  label={type.label}
                  onClick={() =>
                    setPropertyType((current) => (current === type.value ? "" : type.value))
                  }
                />
              ))}
              {lifestyleShortcuts.map((shortcut) => (
                <PillToggle
                  key={shortcut}
                  active={lifestyle === shortcut}
                  label={shortcut}
                  onClick={() =>
                    setLifestyle((current) => (current === shortcut ? "" : shortcut))
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        {hasFilters ? (
          <div className="mt-3 flex flex-col gap-2 rounded-[22px] bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {activeLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex h-8 items-center rounded-full bg-white px-3 text-xs font-semibold text-neutral-700 ring-1 ring-black/10"
                >
                  {label}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 w-fit cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:border-neutral-950"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpiar
            </button>
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 px-1 text-xs text-neutral-600 sm:grid-cols-3 sm:text-sm">
          <HeroProof icon={<BadgeCheck className="h-4 w-4" />} label="Curado manualmente" />
          <HeroProof icon={<Compass className="h-4 w-4" />} label="Mapa real" />
          <HeroProof icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp directo" />
        </div>
      </form>
    </>
  );
}

function SearchFilterCard({
  active,
  icon,
  label,
  copy,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  copy: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex min-h-[74px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[18px] border p-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 sm:min-h-[82px] sm:items-start sm:justify-between sm:gap-2 sm:rounded-[22px] sm:p-3 sm:text-left ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-black/10 bg-neutral-50 text-neutral-950 hover:border-neutral-950 hover:bg-white"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 sm:h-8 sm:w-8 ${
          active
            ? "bg-white/12 text-white ring-white/15"
            : "bg-white text-[#58745f] ring-black/10"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold leading-tight">{label}</span>
        <span
          className={`mt-0.5 hidden text-xs font-medium sm:block ${
            active ? "text-white/65" : "text-neutral-500"
          }`}
        >
          {copy}
        </span>
      </span>
    </button>
  );
}

function PillToggle({
  active,
  icon,
  label,
  className = "",
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/12 ${className} ${
        active
          ? "bg-neutral-950 text-white"
          : "border border-black/10 bg-white text-neutral-700 hover:border-neutral-950"
      }`}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
    </button>
  );
}

function HeroProof({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex min-h-8 items-center justify-center gap-1.5 text-center font-semibold leading-tight sm:gap-2">
      <span className="text-[#58745f]" aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
  );
}

function getPropertyTypeLabel(type: PropertyType) {
  return propertyTypeFilters.find((filter) => filter.value === type)?.label ?? type;
}

function formatBudgetFilterLabel(
  currency: BudgetCurrency,
  minPrice: string,
  maxPrice: string,
) {
  const cleanMinPrice = minPrice.trim();
  const cleanMaxPrice = maxPrice.trim();

  if (!cleanMinPrice && !cleanMaxPrice && currency === "Todos") {
    return null;
  }

  const currencyLabel = currency === "USD" ? "$us" : currency === "BOB" ? "Bs" : "";

  if (cleanMinPrice && cleanMaxPrice) {
    return `${currencyLabel} ${cleanMinPrice} - ${cleanMaxPrice}`.trim();
  }

  if (cleanMaxPrice) {
    return `Hasta ${currencyLabel} ${cleanMaxPrice}`.trim();
  }

  if (cleanMinPrice) {
    return `Desde ${currencyLabel} ${cleanMinPrice}`.trim();
  }

  return currency === "BOB" ? "Solo Bs" : "Solo $us";
}
