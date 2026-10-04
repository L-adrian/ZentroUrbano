"use client";

import { Building2, MapPin, Search, Wallet, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrencyPreference } from "@/components/currency-preference";
import { formatPriceBound, parsePriceInput } from "@/lib/property-search";

export function HomeRentalSearch({ zones }: { zones: string[] }) {
  const currency = useCurrencyPreference();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [budget, setBudget] = useState("");
  const [type, setType] = useState("");
  // "3.000", "3 mil" or "3k" all mean three thousand; only the understood amount is sent.
  const maxPrice = parsePriceInput(budget, currency);
  useEffect(() => {
    const restore = () => setSearching(false);
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  // Zone has its own field, so the first question is the kind of home; free text goes last and hides on narrow screens.
  return <form action="/propiedades" method="get" className="home-search" onSubmit={() => setSearching(true)}>
    {maxPrice ? <><input type="hidden" name="maxPrice" value={maxPrice.amount} /><input type="hidden" name="currency" value={maxPrice.currency} /></> : null}
    <label className="search-query"><span><Building2 size={16} />¿Qué estás buscando?</span><select name={type ? "type" : undefined} value={type} onChange={event => setType(event.target.value)}><option value="">Casa o departamento</option><option>Casa</option><option>Departamento</option><option>Monoambiente</option></select></label>
    <label><span><MapPin size={16} />Zona</span><select name={zone ? "zone" : undefined} value={zone} onChange={event => setZone(event.target.value)}><option value="">Todas las zonas</option>{zones.map(item => <option key={item}>{item}</option>)}</select></label>
    <label><span><Wallet size={16} />Presupuesto mensual</span><input value={budget} onChange={event => setBudget(event.target.value)} type="text" inputMode="numeric" autoComplete="off" aria-describedby="home-budget-hint" placeholder={currency === "USD" ? "Hasta $us" : "Hasta Bs"} /></label>
    <label><span><Search size={16} />Algo más</span><input name={query.trim() ? "q" : undefined} value={query} onChange={event => setQuery(event.target.value)} type="search" autoComplete="off" placeholder="Ej. mascotas, piscina" /></label>
    <button type="submit" className="zu-button zu-button-primary" disabled={searching}>{searching ? <LoaderCircle size={18} className="zu-spin" /> : <Search size={18} />}<span>{searching ? "Buscando" : "Buscar"}</span></button>
    <p id="home-budget-hint" className={`home-search-hint${budget.trim() && !maxPrice ? " is-error" : ""}`} aria-live="polite" hidden={!budget.trim()}>{maxPrice ? `Hasta ${formatPriceBound(maxPrice)} por mes` : budget.trim() ? "Escribe solo el monto, por ejemplo 3.000" : null}</p>
  </form>;
}
