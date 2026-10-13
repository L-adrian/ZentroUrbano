"use client";

import { Check, ExternalLink, LoaderCircle, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ZoneSuggestions } from "@/components/zone-suggestions";
import { describeFilterPlace, zoneConflict } from "@/lib/santa-cruz-zones";

export type AdminListingPlace = { slug: string; title: string; zone: string; lat: number; lng: number; ownerConfirmed: boolean };

// Fix the zone an owner typed, or move a listing's map point, after it was published.
export function AdminListingPlaces({ listings }: { listings: AdminListingPlace[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const words = query.trim().toLocaleLowerCase("es");
    return words ? listings.filter((item) => `${item.title} ${item.zone}`.toLocaleLowerCase("es").includes(words)) : listings;
  }, [listings, query]);

  return (
    <section id="zona-y-ubicacion" className="rounded-[32px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="admin-places-title">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        Anuncios publicados
      </p>
      <h2 id="admin-places-title" className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">Zona y ubicación</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        Corrige el barrio que escribió el dueño o mueve el punto del mapa. La zona del filtro (Norte, Sur…) sale del punto; un barrio de la lista conserva su zona.
      </p>
      <label className="mt-5 flex max-w-md items-center gap-2 rounded-full border border-black/10 bg-neutral-50 px-4">
        <Search className="h-4 w-4 text-neutral-500" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título o zona" className="h-11 w-full bg-transparent text-sm outline-none" />
      </label>
      <ZoneSuggestions id="admin-zone-suggestions" />
      {shown.length === 0 ? (
        <p className="mt-5 rounded-[20px] border border-dashed border-black/15 bg-neutral-50 p-4 text-sm text-neutral-600">No hay anuncios con esa búsqueda.</p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {shown.map((item) => <PlaceRow key={item.slug} item={item} />)}
        </ul>
      )}
    </section>
  );
}

function PlaceRow({ item }: { item: AdminListingPlace }) {
  const router = useRouter();
  const [zone, setZone] = useState(item.zone);
  const [latitude, setLatitude] = useState(String(item.lat));
  const [longitude, setLongitude] = useState(String(item.lng));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const lat = Number(latitude), lng = Number(longitude);
  const point = latitude.trim() && longitude.trim() && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const conflict = zoneConflict(zone, point);
  const changed = zone.trim() !== item.zone || lat !== item.lat || lng !== item.lng;

  async function save() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/admin/fichas/${item.slug}/ubicacion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone, latitude, longitude }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "No se pudo guardar.");
      setMessage({ ok: true, text: "Guardado. El catálogo ya usa la nueva zona y ubicación." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "No se pudo conectar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-[22px] border border-black/10 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link href={`/propiedades/${item.slug}`} target="_blank" className="font-semibold text-neutral-950 underline-offset-4 hover:underline">{item.title}</Link>
        <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0b6b52]">
          Ver en Google Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-semibold text-neutral-600">Zona o barrio
          <input value={zone} onChange={(event) => setZone(event.target.value)} list="admin-zone-suggestions" autoComplete="off" maxLength={160} disabled={busy} className="h-10 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-neutral-950" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-neutral-600">Latitud
          <input type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} disabled={busy} className="h-10 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-neutral-950" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-neutral-600">Longitud
          <input type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} disabled={busy} className="h-10 rounded-lg border border-black/15 bg-white px-3 text-sm font-normal text-neutral-950" />
        </label>
        <button type="button" onClick={save} disabled={busy || !changed || !zone.trim() || !point} className="zu-button zu-button-primary h-10">
          {busy ? <LoaderCircle size={16} className="zu-spin" /> : <Check size={16} />}Guardar
        </button>
      </div>
      <p className="mt-2 text-xs text-neutral-600">
        En el filtro: <strong className="text-neutral-900">{describeFilterPlace(zone, point)}</strong>
        {conflict ? <span className="ml-1 font-semibold text-[#9a4a12]">· Ojo: dice {conflict.named} pero el punto está en {conflict.byPoint}.</span> : null}
        {item.ownerConfirmed && point && (lat !== item.lat || lng !== item.lng) ? " · Si mueves el punto, deja de decir «Ubicación confirmada por el dueño»." : ""}
      </p>
      {message ? <p role={message.ok ? "status" : "alert"} className={`mt-2 text-sm ${message.ok ? "text-[#285340]" : "text-red-700"}`}>{message.text}</p> : null}
    </li>
  );
}
