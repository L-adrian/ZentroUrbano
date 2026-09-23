"use client";

import { Building2, MapPin, Search, Wallet, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrencyPreference } from "@/components/currency-preference";

export function HomeRentalSearch({ zones }: { zones: string[] }) {
  const currency = useCurrencyPreference();
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const restore = () => setSearching(false);
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  return <form action="/propiedades" method="get" className="home-search" onSubmit={() => setSearching(true)}>
    <input type="hidden" name="currency" value={currency} />
    <label className="search-query"><span><Search size={16} />¿Dónde quieres vivir?</span><input name="q" type="search" autoComplete="off" placeholder="Zona, avenida o característica" /></label>
    <label><span><MapPin size={16} />Zona</span><select name="zone" defaultValue=""><option value="">Todas las zonas</option>{zones.map(zone => <option key={zone}>{zone}</option>)}</select></label>
    <label><span><Wallet size={16} />Presupuesto mensual</span><input name="maxPrice" type="number" min="0" inputMode="decimal" placeholder={currency === "USD" ? "Hasta $us" : "Hasta Bs"} /></label>
    <label><span><Building2 size={16} />Vivienda</span><select name="type" defaultValue=""><option value="">Todos los tipos</option><option>Casa</option><option>Departamento</option></select></label>
    <button type="submit" className="zu-button zu-button-primary" disabled={searching}>{searching ? <LoaderCircle size={18} className="zu-spin" /> : <Search size={18} />}<span>{searching ? "Buscando" : "Buscar"}</span></button>
  </form>;
}
