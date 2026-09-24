"use client";

import {
  ArrowRight,
  BarChart3,
  Edit3,
  Eye,
  LogOut,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent, ReactElement, ReactNode } from "react";
import { useMemo, useState } from "react";
import { PriceDisplay } from "@/components/currency-preference";
import { currencyExchangeRateBobPerUsd, maxPropertyExchangeRate, parseCurrencyAmount, parsePropertyExchangeRate } from "@/lib/currency";
import {
  getDemoAccountProperties,
  getDemoAccountTotals,
  getPerformanceForProperty,
  type DemoAccount,
  type PropertyPerformance,
  type WeeklyReport,
} from "@/lib/demo-accounts";
import { type Property, type PropertyType } from "@/lib/properties";
import { getDirectRentals, rentalPropertyTypes } from "@/lib/rentals";
import { getOwnerListingSuggestions } from "@/lib/owner-listing-suggestions";

const sessionEventName = "morada-session";

export function ClientDashboard({
  account,
}: {
  account: DemoAccount;
}) {
  const router = useRouter();
  const baseProperties = useMemo(() => getDirectRentals(getDemoAccountProperties(account)), [account]);
  const [editedProperties, setEditedProperties] = useState<Record<string, Property>>({});
  const properties = useMemo(
    () => baseProperties.map((property) => editedProperties[property.slug] ?? property),
    [baseProperties, editedProperties],
  );
  const totals = getDemoAccountTotals(account);
  const conversion =
    totals.views > 0 ? `${((totals.whatsappClicks / totals.views) * 100).toFixed(1)}%` : "0%";

  async function logout() {
    const response=await fetch("/api/auth/signout", { method: "POST" });
    if (!response.ok) {window.alert("No se pudo cerrar la sesión. Intenta nuevamente.");return;}
    window.dispatchEvent(new Event(sessionEventName));
    router.push("/login");
  }

  async function saveProperty(nextProperty: Property) {
      const response = await fetch(`/api/propiedades/${nextProperty.slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextProperty),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.stored !== true) throw new Error(result.message || "No se pudieron guardar los cambios.");
      setEditedProperties(current => ({ ...current, [nextProperty.slug]: nextProperty }));
      router.refresh();
  }

  return (
    <div className="bg-neutral-50">
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
                Panel cliente
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
                {account.companyName ?? account.displayName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
                Revisa clicks por vivienda, vistas, WhatsApp, mapa y reportes semanales desde un
                solo lugar.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[auto_auto]">
              <Link
                href="/login"
                className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
              >
                Cambiar cuenta
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Salir
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={<Eye />} label="Vistas totales" value={totals.views.toLocaleString("es-BO")} />
            <MetricCard
              icon={<MessageCircle />}
              label="Clics WhatsApp"
              value={totals.whatsappClicks.toLocaleString("es-BO")}
            />
            <MetricCard
              icon={<BarChart3 />}
              label="Clicks vivienda"
              value={totals.propertyClicks.toLocaleString("es-BO")}
            />
            <MetricCard icon={<BarChart3 />} label="Conversión" value={conversion} />
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-6">
          <AccountSummary account={account} propertyCount={properties.length} />
          <PropertiesSection account={account} properties={properties} onSaveProperty={saveProperty} />
          <ClickAnalyticsSection account={account} properties={properties} />
        </div>

        <aside className="grid gap-6 self-start lg:sticky lg:top-24">
          <ReportsSection reports={account.reports} />
          <MeasurementInfoSection />
        </aside>
      </main>
    </div>
  );
}

function AccountSummary({
  account,
  propertyCount,
}: {
  account: DemoAccount;
  propertyCount: number;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-6">
      <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
        {account.avatarUrl ? (
          <Image
            src={account.avatarUrl}
            alt={account.displayName}
            width={64}
            height={64}
            className="h-16 w-16 rounded-[24px] border border-black/10 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-neutral-950 text-lg font-semibold text-white">
            {account.avatarInitials}
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-neutral-950">{account.displayName}</h2>
            <span className="rounded-full bg-[#eef7ef] px-3 py-1 text-xs font-semibold text-[#285340]">
              {account.roleLabel}
            </span>
          </div>
          <div className="mt-2 grid gap-1 text-sm leading-6 text-neutral-600 sm:grid-cols-2">
            <span>{account.email}</span>
            <span>{account.phone}</span>
            <span>{account.location}</span>
            <span>{propertyCount} propiedad{propertyCount === 1 ? "" : "es"} activa{propertyCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        <Link
          href="/publicar"
          className="inline-flex h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-[#21352b]"
        >
          Publicar otra
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function PropertiesSection({
  account,
  properties,
  onSaveProperty,
}: {
  account: DemoAccount;
  properties: Property[];
  onSaveProperty: (property: Property) => Promise<void>;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8b4b31]">
            Propiedades
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            Fichas publicadas en Zentro Urbano
          </h2>
        </div>
        <p className="text-sm text-neutral-500">Datos de rendimiento por inmueble publicado.</p>
      </div>

      <div className="mt-5 grid gap-4">
        {properties.length === 0 ? (
          <EmptyPanel
            title="Aun no tienes propiedades publicadas"
            copy="Cuando Zentro Urbano active tus fichas, apareceran aqui con vistas, clicks, WhatsApp y reportes semanales."
            actionLabel="Publicar una propiedad"
            href="/publicar"
          />
        ) : null}
        {properties.map((property) => {
          const performance = getPerformanceForProperty(account, property.slug);

          return (
            <PropertyPerformanceCard
              key={property.slug}
              property={property}
              performance={performance}
              onSaveProperty={onSaveProperty}
            />
          );
        })}
      </div>
    </section>
  );
}

function PropertyPerformanceCard({
  property,
  performance,
  onSaveProperty,
}: {
  property: Property;
  performance?: PropertyPerformance;
  onSaveProperty: (property: Property) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const suggestions = getOwnerListingSuggestions(property);

  return (
    <>
      <article className="grid gap-4 rounded-[24px] border border-black/10 bg-neutral-50 p-3 sm:grid-cols-[170px_1fr] sm:p-4">
        <Link
          href={`/propiedades/${property.slug}`}
          className="relative block aspect-[4/3] self-start overflow-hidden rounded-[18px] bg-neutral-200"
        >
          <Image
            src={property.images[0]}
            alt={property.title}
            fill
            sizes="(min-width: 640px) 170px, 100vw"
            className="object-cover transition duration-500 hover:scale-105"
          />
        </Link>

        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-black/10">
                  {property.operation}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-black/10">
                  {property.type}
                </span>
                {performance ? (
                  <span className="rounded-full bg-[#fff2d8] px-3 py-1 text-xs font-semibold text-[#7a5417]">
                    {performance.plan}
                  </span>
                ) : null}
              </div>
              <Link
                href={`/propiedades/${property.slug}`}
                className="mt-3 block text-lg font-semibold tracking-tight text-neutral-950 hover:text-[#21352b]"
              >
                {property.title}
              </Link>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600">
                <MapPin className="h-4 w-4 text-[#58745f]" aria-hidden="true" />
                {property.zone}, {property.city}
              </p>
              <PriceDisplay
                property={property}
                className="mt-1 block text-sm font-semibold text-neutral-950"
              />
            </div>

            <div className="flex flex-wrap items-start gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-[#21352b]"
              >
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                Editar ficha
              </button>
            <Link
              href={`/propiedades/${property.slug}`}
              className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              Ver ficha
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            </div>
          </div>

          {performance ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SmallMetric label="Vistas" value={performance.views} />
                <SmallMetric label="Mapa" value={performance.mapViews} />
                <SmallMetric label="WhatsApp" value={performance.whatsappClicks} />
                <SmallMetric label="Clicks ficha" value={performance.propertyClicks} />
              </div>
              <MiniBars values={performance.weeklyViews} />
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <section className="owner-listing-tips" aria-label="Sugerencias privadas para esta ficha">
              <h3><LockKeyhole size={15} aria-hidden="true" />Mejora tu anuncio <span>Solo visible para ti</span></h3>
              <ul>{suggestions.map(suggestion => <li key={suggestion}>{suggestion}</li>)}</ul>
            </section>
          ) : performance ? (
            <p className="rounded-[18px] bg-white p-3 text-sm leading-6 text-neutral-600 ring-1 ring-black/10">
              <span className="font-semibold text-neutral-950">Sugerencia:</span>{" "}
              {performance.recommendation}
            </p>
          ) : null}
        </div>
      </article>

      {isEditing ? (
        <PropertyEditModal
          property={property}
          onClose={() => setIsEditing(false)}
          onSave={async (nextProperty) => {
            await onSaveProperty(nextProperty);
            setIsEditing(false);
          }}
        />
      ) : null}
    </>
  );
}

const propertyTypeOptions = rentalPropertyTypes;
const featureFields = [
  ["pets", "Acepta mascotas"],
  ["furnished", "Amoblado"],
  ["security", "Seguridad"],
  ["pool", "Piscina"],
  ["patio", "Patio"],
  ["grill", "Churrasquera"],
  ["elevator", "Ascensor"],
] satisfies Array<[keyof Pick<Property, "pets" | "furnished" | "security" | "pool" | "patio" | "grill" | "elevator">, string]>;

function PropertyEditModal({
  property,
  onClose,
  onSave,
}: {
  property: Property;
  onClose: () => void;
  onSave: (property: Property) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Property>(() => ({
    ...property,
    requirements: [...property.requirements],
    images: [...property.images],
    idealFor: [...property.idealFor],
    tags: [...property.tags],
    neighborhoodHighlights: [...property.neighborhoodHighlights],
    coordinates: { ...property.coordinates },
  }));
  const [exchangeRate, setExchangeRate] = useState(String(property.exchangeRate ?? currencyExchangeRateBobPerUsd));
  const [priceInput, setPriceInput] = useState(String(property.price));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function update<K extends keyof Property>(field: K, value: Property[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateCoordinate(field: "lat" | "lng", value: number) {
    setDraft((current) => {
      const coordinates = { ...current.coordinates, [field]: value };
      return { ...current, coordinates,
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}` };
    });
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const uploadedImages = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => URL.createObjectURL(file));

    if (uploadedImages.length === 0) {
      return;
    }

    setDraft((current) => ({
      ...current,
      images: [...uploadedImages, ...current.images],
    }));
  }

  function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("video/")) {
      return;
    }

    update("video", URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const price = parseCurrencyAmount(priceInput);
    if (price === null || price <= 0 || price > 100_000_000) { setSaveError("Indica un precio válido. Puedes escribir 3400 o 3.400; para centavos, 3.400,50."); return; }
    const rate = draft.currency === "USD" ? parsePropertyExchangeRate(exchangeRate) : null;
    if (draft.currency === "USD" && rate === null) { setSaveError("Indica un tipo de cambio válido para este alquiler."); return; }
    setIsSaving(true);
    setSaveError("");
    const images = draft.images.length > 0 ? draft.images : property.images;
    try {
      await onSave({
      ...draft,
      price,
      exchangeRate: rate,
      images,
      mapUrl:
        draft.mapUrl.trim() ||
        `https://www.google.com/maps/search/?api=1&query=${draft.coordinates.lat},${draft.coordinates.lng}`,
    });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="property-edit-overlay fixed inset-0 z-[2000] overflow-y-auto bg-neutral-950/58 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Editar ficha">
      <div className="mx-auto max-w-5xl rounded-[28px] bg-white shadow-[0_30px_110px_rgba(0,0,0,0.28)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white/95 p-5 backdrop-blur sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#58745f]">
              Editar ficha
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              Información completa del inmueble
            </h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Los cambios se validan contra tu cuenta antes de guardarse en la base de datos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 transition hover:border-neutral-950"
            aria-label="Cerrar editor"
            disabled={isSaving}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-7 p-5 sm:p-6">
          <fieldset disabled={isSaving} className="grid min-w-0 gap-7 border-0 p-0">
          <EditorSection title="Datos principales">
            <EditorField label="Título" className="md:col-span-2">
              <input
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                className={inputClassName}
                required
              />
            </EditorField>
            <EditorField label="Contrato">
              <p className="py-3 text-sm text-neutral-600">Alquiler directo con el propietario</p>
            </EditorField>
            <EditorField label="Tipo de propiedad">
              <select
                value={draft.type}
                onChange={(event) => update("type", event.target.value as PropertyType)}
                className={inputClassName}
              >
                {propertyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </EditorField>
            <EditorField label="Moneda">
              <select
                value={draft.currency}
                onChange={(event) => update("currency", event.target.value as Property["currency"])}
                className={inputClassName}
              >
                <option value="USD">$us</option>
                <option value="BOB">Bs</option>
              </select>
            </EditorField>
            <EditorField label="Precio">
              <input
                value={priceInput}
                onChange={(event) => setPriceInput(event.target.value)}
                type="text"
                inputMode="decimal"
                aria-describedby="edit-price-help"
                className={inputClassName}
              />
              <span id="edit-price-help" className="text-xs text-neutral-600">3400 y 3.400 son el mismo importe. Centavos: 3.400,50.</span>
            </EditorField>
            {draft.currency === "USD" && <EditorField label="Tipo de cambio (Bs por USD)">
              <input value={exchangeRate} onChange={event => setExchangeRate(event.target.value)} type="number" min="0.0001" max={maxPropertyExchangeRate} step="0.0001" inputMode="decimal" required className={inputClassName} />
              <span className="exchange-rate-note">1 USD = {exchangeRate || "..."} Bs para este alquiler.</span>
            </EditorField>}
          </EditorSection>

          <EditorSection title="Ubicación y contacto">
            <EditorField label="Ciudad">
              <input
                value={draft.city}
                onChange={(event) => update("city", event.target.value)}
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Zona">
              <input
                value={draft.zone}
                onChange={(event) => update("zone", event.target.value)}
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Dirección aproximada" className="md:col-span-2">
              <input
                value={draft.address}
                onChange={(event) => update("address", event.target.value)}
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Latitud">
              <input
                value={draft.coordinates.lat}
                onChange={(event) => updateCoordinate("lat", Number(event.target.value))}
                type="number"
                step="any"
                min="-90"
                max="90"
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Longitud">
              <input
                value={draft.coordinates.lng}
                onChange={(event) => updateCoordinate("lng", Number(event.target.value))}
                type="number"
                step="any"
                min="-180"
                max="180"
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Google Maps URL" className="md:col-span-2">
              <input
                value={draft.mapUrl}
                onChange={(event) => update("mapUrl", event.target.value)}
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="WhatsApp">
              <input
                value={draft.whatsapp}
                onChange={(event) => update("whatsapp", event.target.value)}
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Video URL">
              <input
                value={draft.video ?? ""}
                onChange={(event) => update("video", event.target.value || undefined)}
                className={inputClassName}
              />
            </EditorField>
            <div className="md:col-span-2">
              <UploadField
                label="Subir video"
                accept="video/*"
                onChange={handleVideoUpload}
                helper="Previsualizacion temporal. El archivo definitivo debe guardarse en el storage que conectemos a Zentro Urbano."
              />
              {draft.video ? (
                <div className="mt-3 rounded-[18px] border border-black/10 bg-neutral-50 p-3">
                  <video src={draft.video} controls className="max-h-64 w-full rounded-[14px] bg-black" />
                </div>
              ) : null}
            </div>
          </EditorSection>

          <EditorSection title="Características">
            <EditorField label="Dormitorios">
              <input
                value={draft.bedrooms}
                onChange={(event) => update("bedrooms", Number(event.target.value))}
                type="number"
                min="0"
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Baños">
              <input
                value={draft.bathrooms}
                onChange={(event) => update("bathrooms", Number(event.target.value))}
                type="number"
                min="0"
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Garaje">
              <input
                value={draft.garage}
                onChange={(event) => update("garage", Number(event.target.value))}
                type="number"
                min="0"
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="Superficie m²">
              <input
                value={draft.area}
                onChange={(event) => update("area", Number(event.target.value))}
                type="number"
                min="0"
                className={inputClassName}
              />
            </EditorField>
            <div className="grid gap-3 md:col-span-2">
              <p className="text-sm font-semibold text-neutral-800">Extras</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {featureFields.map(([field, label]) => (
                  <label
                    key={field}
                    className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-neutral-700"
                  >
                    <input
                      checked={Boolean(draft[field])}
                      onChange={(event) => update(field, event.target.checked)}
                      type="checkbox"
                      className="h-4 w-4 accent-neutral-950"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </EditorSection>

          <EditorSection title="Contenido y curaduría">
            <EditorField label="Descripción corta" className="md:col-span-2">
              <textarea
                value={draft.shortDescription}
                onChange={(event) => update("shortDescription", event.target.value)}
                className={textareaClassName}
                rows={3}
              />
            </EditorField>
            <EditorField label="Descripción larga" className="md:col-span-2">
              <textarea
                value={draft.longDescription}
                onChange={(event) => update("longDescription", event.target.value)}
                className={textareaClassName}
                rows={5}
              />
            </EditorField>
            <EditorField label="Requisitos (uno por línea)" className="md:col-span-2">
              <textarea
                value={draft.requirements.join("\n")}
                onChange={(event) => update("requirements", splitLines(event.target.value))}
                className={textareaClassName}
                rows={4}
              />
            </EditorField>
            <EditorField label="Ideal para (separado por comas)">
              <textarea
                value={draft.idealFor.join(", ")}
                onChange={(event) => update("idealFor", splitComma(event.target.value))}
                className={textareaClassName}
                rows={3}
              />
            </EditorField>
            <EditorField label="Etiquetas lifestyle (separado por comas)">
              <textarea
                value={draft.tags.join(", ")}
                onChange={(event) => update("tags", splitComma(event.target.value))}
                className={textareaClassName}
                rows={3}
              />
            </EditorField>
            <EditorField label="Puntos del barrio (separado por comas)" className="md:col-span-2">
              <textarea
                value={draft.neighborhoodHighlights.join(", ")}
                onChange={(event) => update("neighborhoodHighlights", splitComma(event.target.value))}
                className={textareaClassName}
                rows={3}
              />
            </EditorField>
            <EditorField label="Imágenes (una URL por línea)" className="md:col-span-2">
              <textarea
                value={draft.images.join("\n")}
                onChange={(event) => update("images", splitLines(event.target.value))}
                className={textareaClassName}
                rows={5}
              />
            </EditorField>
            <div className="md:col-span-2">
              <UploadField
                label="Subir imágenes"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                helper="Puedes seleccionar varias imagenes. Se agregan al inicio de la galeria antes de guardar."
              />
              {draft.images.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {draft.images.slice(0, 6).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="relative aspect-[4/3] overflow-hidden rounded-[16px] border border-black/10 bg-neutral-100"
                    >
                      <Image
                        src={image}
                        alt={`Imagen ${index + 1} de ${draft.title}`}
                        fill
                        sizes="(min-width: 640px) 220px, 100vw"
                        className="object-cover"
                        unoptimized={image.startsWith("blob:")}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </EditorSection>

          {saveError && <p role="alert" className="auth-error">{saveError}</p>}
          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-3 border-t border-black/10 bg-white/95 p-5 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:p-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-[#21352b]"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[24px] border border-black/10 bg-neutral-50 p-4">
      <h4 className="text-base font-semibold text-neutral-950">{title}</h4>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function EditorField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      {children}
    </label>
  );
}

function UploadField({
  label,
  accept,
  helper,
  multiple = false,
  onChange,
}: {
  label: string;
  accept: string;
  helper: string;
  multiple?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="grid cursor-pointer gap-2 rounded-[20px] border border-dashed border-[#58745f]/45 bg-white p-4 transition hover:border-[#21352b] hover:bg-[#f6fbf7]">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-950">
        <Upload className="h-4 w-4 text-[#58745f]" aria-hidden="true" />
        {label}
      </span>
      <span className="text-xs leading-5 text-neutral-500">{helper}</span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        className="sr-only"
      />
    </label>
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitComma(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const inputClassName =
  "h-11 w-full rounded-[16px] border border-black/10 bg-white px-4 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";
const textareaClassName =
  "min-h-24 w-full rounded-[16px] border border-black/10 bg-white px-4 py-3 text-sm font-medium leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

function ClickAnalyticsSection({
  account,
  properties,
}: {
  account: DemoAccount;
  properties: Property[];
}) {
  const sortedPerformance = [...account.performance].sort(
    (left, right) => right.propertyClicks - left.propertyClicks,
  );

  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#58745f]">
            Analítica
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            Clicks por vivienda
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Personas que abrieron la ficha de cada inmueble. WhatsApp, mapa y galería se miden por
            separado para entender qué tan fuerte es el interés.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
          {account.performance.length} fichas medidas
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {sortedPerformance.length === 0 ? (
          <EmptyPanel
            title="Todavia no hay mediciones"
            copy="Las metricas se activan cuando tus propiedades reciban vistas, clicks de ficha y contactos por WhatsApp."
            actionLabel="Ver planes"
            href="/publicar"
          />
        ) : null}
        {sortedPerformance.map((performance) => (
          <PropertyClickRow
            key={performance.propertySlug}
            performance={performance}
            property={properties.find((property) => property.slug === performance.propertySlug)}
          />
        ))}
      </div>
    </section>
  );
}

function PropertyClickRow({
  performance,
  property,
}: {
  performance: PropertyPerformance;
  property: Property | undefined;
}) {
  const clickRate =
    performance.views > 0
      ? `${((performance.propertyClicks / performance.views) * 100).toFixed(1)}%`
      : "0%";

  return (
    <article className="rounded-[22px] border border-black/10 bg-neutral-50 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-neutral-950">
              {property?.title ?? performance.propertySlug}
            </p>
            <span className="rounded-full bg-[#eef7ef] px-3 py-1 text-xs font-semibold text-[#285340]">
              {performance.plan}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {property ? `${property.zone}, ${property.city}` : "Propiedad publicada"}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {performance.recommendation}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:min-w-[380px]">
          <SmallMetric label="Vistas" value={performance.views} />
          <SmallMetric label="Clicks ficha" value={performance.propertyClicks} />
          <SmallMetric label="WhatsApp" value={performance.whatsappClicks} />
          <div className="rounded-[16px] bg-white p-3 ring-1 ring-black/10">
            <p className="text-lg font-semibold text-neutral-950">{clickRate}</p>
            <p className="mt-1 text-xs font-semibold text-neutral-500">CTR ficha</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ReportsSection({ reports }: { reports: WeeklyReport[] }) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#8b4b31]" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Reportes semanales</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {reports.length === 0 ? (
          <EmptyPanel
            title="Sin reportes por ahora"
            copy="Cuando exista actividad real, Zentro Urbano mostrara un resumen semanal con vistas, clicks y acciones recomendadas."
            actionLabel="Publicar propiedad"
            href="/publicar"
          />
        ) : null}
        {reports.map((report) => (
          <article key={report.id} className="rounded-[22px] bg-neutral-50 p-4 ring-1 ring-black/10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {report.period}
            </p>
            <h3 className="mt-2 text-base font-semibold text-neutral-950">{report.headline}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{report.summary}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ReportMetric label="Vistas" value={report.views} />
              <ReportMetric label="Clicks ficha" value={report.propertyClicks} />
              <ReportMetric label="WhatsApp" value={report.whatsappClicks} />
            </div>
            <p className="mt-4 rounded-[16px] bg-white p-3 text-sm leading-6 text-neutral-600 ring-1 ring-black/10">
              <span className="font-semibold text-neutral-950">Acción:</span> {report.action}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MeasurementInfoSection() {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-[#58745f]" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Cómo se mide</h2>
      </div>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-neutral-600">
        <p>
          <span className="font-semibold text-neutral-950">Clicks vivienda:</span> personas que
          abren la ficha del inmueble desde catálogo, mapa o destacados.
        </p>
        <p>
          <span className="font-semibold text-neutral-950">WhatsApp:</span> intención directa de
          contacto. Se mide aparte porque es una acción más fuerte que una vista.
        </p>
        <p>
          <span className="font-semibold text-neutral-950">Reporte semanal:</span> resumen de
          vistas, clicks de ficha y WhatsApp para decidir si conviene cambiar fotos, precio o
          visibilidad.
        </p>
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactElement<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-neutral-50 p-4">
      <div className="text-[#58745f]" aria-hidden="true">
        {icon}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-1 text-sm text-neutral-600">{label}</p>
    </div>
  );
}

function EmptyPanel({
  title,
  copy,
  actionLabel,
  href,
}: {
  title: string;
  copy: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/15 bg-neutral-50 p-5">
      <p className="text-base font-semibold text-neutral-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{copy}</p>
      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-[#21352b]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[16px] bg-white p-3 ring-1 ring-black/10">
      <p className="text-lg font-semibold text-neutral-950">{value.toLocaleString("es-BO")}</p>
      <p className="mt-1 text-xs font-semibold text-neutral-500">{label}</p>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-base font-semibold text-neutral-950">{value.toLocaleString("es-BO")}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="rounded-[16px] bg-white p-3 ring-1 ring-black/10">
      <div className="flex h-16 items-end gap-1.5">
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="flex-1 rounded-t-full bg-[#58745f]"
            style={{ height: `${Math.max(16, (value / max) * 100)}%` }}
            title={`${value} vistas`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold text-neutral-500">Últimos 7 días</p>
    </div>
  );
}

