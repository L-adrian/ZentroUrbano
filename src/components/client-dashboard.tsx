"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Eye,
  Home,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  Save,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { useMemo, useState } from "react";
import { BeforeVisitFields, type BeforeVisitFormValue } from "@/components/before-visit-fields";
import { PriceDisplay } from "@/components/currency-preference";
import { OwnerLocationDialog } from "@/components/owner-location-dialog";
import { OwnerServicesNote } from "@/components/owner-services-note";
import { OwnerShareKit } from "@/components/owner-share-kit";
import "./listing-tones.css";
import { currencyExchangeRateBobPerUsd, maxPropertyExchangeRate, parseCurrencyAmount, parsePropertyExchangeRate } from "@/lib/currency";
import {
  getDemoAccountProperties,
  type DemoAccount,
  type OwnerListingAudience,
  type OwnerListingState,
  type OwnerRequestSummary,
} from "@/lib/demo-accounts";
import {
  availabilityPrompt,
  formatBoliviaDay,
  movePhoto,
  moveToCover,
  nextShortDescription,
  ownerListingStatusLabels,
  ownerPhotoSrc,
  type OwnerListingStatus,
} from "@/lib/listing-moderation";
import { beforeVisitFormValues, parseBeforeVisitInput, withBeforeVisit } from "@/lib/before-visit";
import { availabilityFreshDays, availabilityReportLimit } from "@/lib/listing-summary";
import { getOwnerListingSuggestions } from "@/lib/owner-listing-suggestions";
import { ownerLocationStatus } from "@/lib/owner-location";
import { type Property, type PropertyType } from "@/lib/properties";
import type { PetsPolicy } from "@/lib/publication-input";
import { getDirectRentals, rentalPropertyTypes } from "@/lib/rentals";
import { whatsappUrl } from "@/lib/site";

const sessionEventName = "morada-session";

type ListingAction = "confirm" | "rented" | "republish";
type EditedProperty = Property & { petsPolicy?: PetsPolicy; beforeVisit?: BeforeVisitFormValue };

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
  const listings = useMemo(() => new Map((account.listings ?? []).map((listing) => [listing.slug, listing])), [account.listings]);
  const listingFor = (property: Property): OwnerListingState =>
    listings.get(property.slug) ?? { slug: property.slug, status: property.published ? "live" : "paused", audience: null };
  const liveCount = properties.filter((property) => listingFor(property).status === "live").length;
  const audiences = properties.map((property) => listingFor(property).audience).filter((audience): audience is OwnerListingAudience => Boolean(audience));
  const showTotals = !account.audienceUnavailable && audiences.length > 0;
  const requests = account.requests ?? [];
  const pendingCount = requests.filter((request) => request.status === "pending_review").length;

  async function logout() {
    const response=await fetch("/api/auth/signout", { method: "POST" });
    if (!response.ok) {window.alert("No se pudo cerrar la sesión. Intenta nuevamente.");return;}
    window.dispatchEvent(new Event(sessionEventName));
    router.push("/login");
  }

  async function saveProperty(nextProperty: EditedProperty) {
      const response = await fetch(`/api/propiedades/${nextProperty.slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextProperty),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.stored !== true) throw new Error(result.message || "No se pudieron guardar los cambios.");
      const { petsPolicy, beforeVisit, ...property } = nextProperty;
      let rentalDetails = property.rentalDetails;
      if (rentalDetails && petsPolicy) rentalDetails = { ...rentalDetails, petsPolicy };
      if (rentalDetails && beforeVisit) rentalDetails = withBeforeVisit(rentalDetails, parseBeforeVisitInput(beforeVisit).values);
      setEditedProperties(current => ({
        ...current,
        [nextProperty.slug]: { ...property, rentalDetails },
      }));
      router.refresh();
  }

  // "Verificar ubicación": the saved point replaces any edited copy, so a later edit cannot send the old one.
  async function confirmLocation(slug: string, point: { lat: number; lng: number }) {
    const response = await fetch(`/api/cliente/propiedades/${encodeURIComponent(slug)}/ubicacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(point),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudo guardar la ubicación.");
    setEditedProperties((current) => {
      const next = { ...current };
      delete next[slug];
      return next;
    });
    router.refresh();
  }

  async function runListingAction(slug: string, action: ListingAction) {
    const response = await fetch(`/api/cliente/propiedades/${encodeURIComponent(slug)}/estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudo guardar el cambio.");
    setEditedProperties((current) => {
      const next = { ...current };
      delete next[slug];
      return next;
    });
    router.refresh();
  }

  return (
    <div className="zu-tones bg-neutral-50">
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
                Mi cuenta
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
                {account.companyName ?? account.displayName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
                Tus anuncios, cuántas personas los ven y si siguen disponibles.
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricCard icon={<Home />} label="Anuncios publicados" value={liveCount.toLocaleString("es-BO")} />
            <MetricCard
              icon={<Eye />}
              label="Vieron tus anuncios · 30 días"
              value={showTotals ? audiences.reduce((total, audience) => total + audience.views30, 0).toLocaleString("es-BO") : "—"}
            />
            <MetricCard
              icon={<MessageCircle />}
              label="Tocaron WhatsApp · 30 días"
              value={showTotals ? audiences.reduce((total, audience) => total + audience.contacts30, 0).toLocaleString("es-BO") : "—"}
            />
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            Contamos personas distintas por anuncio: una vez por teléfono o computadora.
          </p>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid min-w-0 gap-6">
          <RequestsSection requests={requests} liveSlugs={new Set(properties.filter((property) => listingFor(property).status === "live").map((property) => property.slug))} />
          <AccountSummary account={account} liveCount={liveCount} />
          <section className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8b4b31]">
              Anuncios
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              Tus viviendas en Zentro Urbano
            </h2>
            <div className="mt-5 grid gap-4">
              {properties.length === 0 ? (
                <EmptyPanel
                  title={pendingCount ? "Tu vivienda está en revisión" : "Aún no tienes anuncios publicados"}
                  copy={pendingCount
                    ? "Cuando la aprobemos, tu anuncio aparecerá aquí con sus visitas."
                    : "Cuando publiques tu vivienda y la aprobemos, aparecerá aquí con sus visitas y contactos."}
                  actionLabel={pendingCount ? "Ver mis solicitudes" : "Publicar mi vivienda"}
                  href={pendingCount ? "/cliente/solicitudes" : "/publicar"}
                />
              ) : null}
              {properties.map((property) => (
                <OwnerListingCard
                  key={property.slug}
                  property={property}
                  listing={listingFor(property)}
                  audienceUnavailable={Boolean(account.audienceUnavailable)}
                  onAction={runListingAction}
                  onSaveProperty={saveProperty}
                  onConfirmLocation={confirmLocation}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="grid gap-6 self-start lg:sticky lg:top-24">
          <MeasurementInfoSection />
          <OwnerServicesNote className="rounded-[28px]" />
        </aside>
      </main>
    </div>
  );
}

function AccountSummary({
  account,
  liveCount,
}: {
  account: DemoAccount;
  liveCount: number;
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
            <span className="break-all">{account.email}</span>
            <span>{account.phone}</span>
            <span>{account.location}</span>
            <span>{liveCount} anuncio{liveCount === 1 ? "" : "s"} publicado{liveCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        <Link
          href="/publicar"
          className="inline-flex h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-[#21352b]"
        >
          {liveCount ? "Publicar otra" : "Publicar mi vivienda"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

// The server only sends pending requests and the ones decided in the last 45 days.
function RequestsSection({ requests, liveSlugs }: { requests: OwnerRequestSummary[]; liveSlugs: Set<string> }) {
  const visible = requests.slice(0, 6);
  if (visible.length === 0) return null;
  const pending = visible.some((request) => request.status === "pending_review");
  const needsFix = visible.some((request) => request.status === "changes_requested" && !request.corrected);

  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="owner-requests-title">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#58745f]">Solicitudes</p>
      <h2 id="owner-requests-title" className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        {needsFix ? "Te pedimos una corrección" : pending ? "Tu vivienda está en revisión" : "Tus últimas solicitudes"}
      </h2>
      {needsFix ? (
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Tu vivienda todavía no está publicada. Lee lo que te pedimos, corrige y reenvía: tus datos y fotos ya están cargados.
        </p>
      ) : pending ? (
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Una persona del equipo revisa las fotos, el precio y los datos antes de publicar. Verás el resultado aquí.
        </p>
      ) : null}
      <ul className="mt-4 grid gap-3">
        {visible.map((request) => (
          <li key={request.id} className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-950 [overflow-wrap:anywhere]">{request.title}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {request.kind === "republish" ? "Volver a publicar" : "Nueva publicación"} · enviada el {formatBoliviaDay(request.createdAt)}
                </p>
              </div>
              <RequestStatusBadge status={request.status} />
            </div>
            {request.status === "rejected" || request.status === "changes_requested" ? (
              <div className="mt-3 text-sm leading-6 text-neutral-700">
                {request.reason ? <p><span className="font-semibold">{request.status === "changes_requested" ? "Lo que te pedimos:" : "Motivo:"}</span> {request.reason}</p> : null}
                {request.kind === "republish" ? (
                  <p className="mt-1 text-neutral-600">Puedes editar el anuncio y volver a pedir que se publique.</p>
                ) : request.corrected ? (
                  <p className="mt-1 text-neutral-600">Ya enviaste la corrección. La revisamos y verás el resultado aquí.</p>
                ) : (
                  <Link href={`/publicar?corregir=${encodeURIComponent(request.id)}`} className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-[#176b4d] underline-offset-4 hover:underline">
                    Corregir y reenviar <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            ) : null}
            {request.status === "approved" && request.slug && liveSlugs.has(request.slug) ? (
              <Link href={`/propiedades/${request.slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#176b4d] underline-offset-4 hover:underline">
                Ver anuncio publicado <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      <Link href="/cliente/solicitudes" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-800 underline-offset-4 hover:underline">
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        Ver todas mis solicitudes
      </Link>
    </section>
  );
}

function RequestStatusBadge({ status }: { status: string }) {
  const [label, tone] =
    status === "pending_review" ? ["En revisión", "bg-amber-100 text-amber-900"]
    : status === "approved" ? ["Aprobada", "bg-[#eef7ef] text-[#285340]"]
    : status === "rejected" ? ["No aprobada", "bg-red-100 text-red-900"]
    : status === "changes_requested" ? ["Pide corrección", "bg-amber-100 text-amber-900"]
    : ["En seguimiento", "bg-neutral-100 text-neutral-700"];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function ListingStatusBadge({ status }: { status: OwnerListingStatus }) {
  const tone =
    status === "live" ? "bg-[#eef7ef] text-[#285340]"
    : status === "review" ? "bg-amber-100 text-amber-900"
    : "bg-neutral-200 text-neutral-800";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{ownerListingStatusLabels[status]}</span>;
}

function OwnerListingCard({
  property,
  listing,
  audienceUnavailable,
  onAction,
  onSaveProperty,
  onConfirmLocation,
}: {
  property: Property;
  listing: OwnerListingState;
  audienceUnavailable: boolean;
  onAction: (slug: string, action: ListingAction) => Promise<void>;
  onSaveProperty: (property: EditedProperty) => Promise<void>;
  onConfirmLocation: (slug: string, point: { lat: number; lng: number }) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [busy, setBusy] = useState<ListingAction | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const live = listing.status === "live";
  const prompt = live ? availabilityPrompt(property) : null;
  const suggestions = getOwnerListingSuggestions(property);
  const cover = property.images[0] ? ownerPhotoSrc(property.images[0], live) : null;

  async function act(action: ListingAction) {
    if (busy) return;
    if (action === "rented" && !window.confirm("¿Ocultar este anuncio? No se borra nada. Cuando vuelva a estar libre, toca «Volver a publicar».")) return;
    if (action === "republish" && !window.confirm("Revisaremos el anuncio antes de mostrarlo de nuevo. ¿Lo enviamos a revisión?")) return;
    setBusy(action);
    setError("");
    setNotice("");
    try {
      await onAction(property.slug, action);
      setNotice(
        action === "confirm" ? `Listo. Tu anuncio se verá disponible durante ${availabilityFreshDays} días.`
        : action === "rented" ? "Listo. Tu anuncio ya no se muestra. No se borró nada."
        : "Listo. Lo revisaremos antes de volver a mostrarlo.",
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo guardar el cambio.");
    } finally {
      setBusy(null);
    }
  }

  const image = cover ? (
    <Image
      src={cover}
      alt={property.title}
      fill
      sizes="(min-width: 640px) 170px, 100vw"
      unoptimized={cover.startsWith("/api/")}
      className="object-cover"
    />
  ) : null;

  return (
    <>
      <article className="grid gap-4 rounded-[24px] border border-black/10 bg-neutral-50 p-3 sm:grid-cols-[170px_1fr] sm:p-4">
        {live ? (
          <Link href={`/propiedades/${property.slug}`} className="relative block aspect-[4/3] self-start overflow-hidden rounded-[18px] bg-neutral-200">
            {image}
          </Link>
        ) : (
          <div className="relative aspect-[4/3] self-start overflow-hidden rounded-[18px] bg-neutral-200 opacity-80">{image}</div>
        )}

        <div className="grid min-w-0 gap-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-black/10">
                  {property.type}
                </span>
                <ListingStatusBadge status={listing.status} />
              </div>
              {live ? (
                <Link
                  href={`/propiedades/${property.slug}`}
                  className="mt-3 block text-lg font-semibold tracking-tight text-neutral-950 hover:text-[#21352b] [overflow-wrap:anywhere]"
                >
                  {property.title}
                </Link>
              ) : (
                <p className="mt-3 text-lg font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere]">{property.title}</p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600">
                <MapPin className="h-4 w-4 shrink-0 text-[#58745f]" aria-hidden="true" />
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
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
              >
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                Editar anuncio
              </button>
              {live ? (
                <Link
                  href={`/propiedades/${property.slug}`}
                  className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
                >
                  Ver anuncio
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>

          {prompt ? (
            <div
              className={`grid gap-3 rounded-[18px] p-3 ring-1 sm:grid-cols-[1fr_auto] sm:items-center ${
                prompt.urgent ? "bg-amber-50 ring-amber-300" : "bg-white ring-black/10"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-neutral-950">
                  {prompt.state.fresh ? `Se ve como disponible · ${prompt.state.detail.toLowerCase()}` : "Se ve como «Disponibilidad por confirmar»"}
                </p>
                {prompt.ask ? <p className="mt-1 text-sm leading-6 text-neutral-700">{prompt.message}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => act("confirm")}
                  disabled={busy !== null}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-[#21352b] disabled:cursor-wait disabled:opacity-60"
                >
                  {busy === "confirm" ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                  Sigue disponible
                </button>
                <button
                  type="button"
                  onClick={() => act("rented")}
                  disabled={busy !== null}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 disabled:cursor-wait disabled:opacity-60"
                >
                  {busy === "rented" ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : null}
                  Ya se alquiló
                </button>
              </div>
            </div>
          ) : null}

          {listing.status === "rented" || listing.status === "paused" ? (
            <div className="grid gap-3 rounded-[18px] bg-white p-3 ring-1 ring-black/10 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold text-neutral-950">Este anuncio no se muestra en Zentro Urbano.</p>
                <p className="mt-1 text-sm leading-6 text-neutral-600">No se borró nada. Si vuelve a estar libre, lo revisamos antes de mostrarlo de nuevo.</p>
              </div>
              <button
                type="button"
                onClick={() => act("republish")}
                disabled={busy !== null}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-[#21352b] disabled:cursor-wait disabled:opacity-60"
              >
                {busy === "republish" ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : null}
                Volver a publicar
              </button>
            </div>
          ) : null}

          {listing.status === "review" ? (
            <p className="rounded-[18px] bg-amber-50 p-3 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
              Pediste volver a publicarlo. Una persona del equipo lo revisa antes de mostrarlo; verás el resultado aquí.
            </p>
          ) : null}

          {live && property.rentalDetails ? (
            <LocationRow property={property} onVerify={() => setIsLocating(true)} />
          ) : null}

          {notice ? <p role="status" className="text-sm font-semibold text-[#176b4d]">{notice}</p> : null}
          {error ? <p role="alert" className="auth-error">{error}</p> : null}

          {audienceUnavailable ? (
            <p className="text-sm text-neutral-500">No pudimos cargar las visitas ahora. Intenta más tarde.</p>
          ) : listing.audience ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <AudienceRow
                icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                label="Vieron el anuncio"
                values={[listing.audience.views7, listing.audience.views30, listing.audience.viewsTotal]}
              />
              <AudienceRow
                icon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
                label="Tocaron WhatsApp"
                values={[listing.audience.contacts7, listing.audience.contacts30, listing.audience.contactsTotal]}
              />
            </div>
          ) : null}

          {live ? <OwnerShareKit property={property} /> : null}

          <Link
            href={`/publicar?parecida=${encodeURIComponent(property.slug)}`}
            className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-[#176b4d] underline-offset-4 hover:underline"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Publicar otra unidad parecida
          </Link>

          {suggestions.length > 0 ? (
            <section className="owner-listing-tips" aria-label="Sugerencias privadas para este anuncio">
              <h3><LockKeyhole size={15} aria-hidden="true" />Mejora tu anuncio <span>Solo visible para ti</span></h3>
              <ul>{suggestions.map(suggestion => <li key={suggestion}>{suggestion}</li>)}</ul>
            </section>
          ) : null}
        </div>
      </article>

      {isLocating ? (
        <OwnerLocationDialog
          property={property}
          onClose={() => setIsLocating(false)}
          onConfirm={async (point) => {
            await onConfirmLocation(property.slug, point);
            setIsLocating(false);
            setError("");
            setNotice("Listo. Tu anuncio ya muestra la ubicación que confirmaste.");
          }}
        />
      ) : null}

      {isEditing ? (
        <PropertyEditModal
          property={property}
          published={live}
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

function LocationRow({ property, onVerify }: { property: Property; onVerify: () => void }) {
  const status = ownerLocationStatus(property);
  return (
    <div
      className={`owner-location-row grid gap-3 rounded-[18px] p-3 ring-1 sm:grid-cols-[1fr_auto] sm:items-center ${
        status.confirmed ? "bg-white ring-black/10" : "bg-amber-50 ring-amber-200"
      }`}
    >
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
          {status.confirmed ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#176b4d]" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4 shrink-0 text-amber-900" aria-hidden="true" />
          )}
          {status.label}
        </p>
        <p className="mt-1 text-sm leading-6 text-neutral-700">
          {status.detail}
          {property.locationConfirmedAt ? ` Confirmada el ${formatBoliviaDay(property.locationConfirmedAt)}.` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onVerify}
        className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
      >
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {status.confirmed ? "Cambiar ubicación" : "Verificar ubicación"}
      </button>
    </div>
  );
}

function AudienceRow({ icon, label, values }: { icon: ReactNode; label: string; values: [number, number, number] }) {
  return (
    <div className="rounded-[16px] bg-white p-3 ring-1 ring-black/10">
      <p className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
        <span className="text-[#58745f]">{icon}</span>
        {label}
      </p>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        {(["7 días", "30 días", "Total"] as const).map((period, index) => (
          <div key={period}>
            <dt className="text-xs text-neutral-500">{period}</dt>
            <dd className="text-lg font-semibold text-neutral-950">{values[index].toLocaleString("es-BO")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const propertyTypeOptions = rentalPropertyTypes;
const featureFields = [
  ["furnished", "Amoblado"],
  ["security", "Seguridad"],
  ["pool", "Piscina"],
  ["patio", "Patio"],
  ["grill", "Churrasquera"],
  ["elevator", "Ascensor"],
] satisfies Array<[keyof Pick<Property, "furnished" | "security" | "pool" | "patio" | "grill" | "elevator">, string]>;
const petsOptions: Array<[PetsPolicy, string]> = [
  ["allowed", "Sí"],
  ["not_allowed", "No"],
  ["consult", "A consultar"],
];

function PropertyEditModal({
  property,
  published,
  onClose,
  onSave,
}: {
  property: Property;
  published: boolean;
  onClose: () => void;
  onSave: (property: EditedProperty) => Promise<void>;
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
  const [petsPolicy, setPetsPolicy] = useState<PetsPolicy>(
    () => property.rentalDetails?.petsPolicy ?? (property.pets ? "allowed" : "consult"),
  );
  const [beforeVisit, setBeforeVisit] = useState<BeforeVisitFormValue>(() => beforeVisitFormValues(property.rentalDetails));
  const [exchangeRate, setExchangeRate] = useState(String(property.exchangeRate ?? currencyExchangeRateBobPerUsd));
  const [priceInput, setPriceInput] = useState(String(property.price));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Listings sent through the form keep their currency and entry conditions; changing them needs a new review.
  const reviewedConditions = Boolean(property.rentalDetails);

  function update<K extends keyof Property>(field: K, value: Property[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const price = parseCurrencyAmount(priceInput);
    if (price === null || price <= 0 || price > 100_000_000) { setSaveError("Indica un precio válido. Puedes escribir 3400 o 3.400; para centavos, 3.400,50."); return; }
    const rate = draft.currency === "USD" ? parsePropertyExchangeRate(exchangeRate) : null;
    if (draft.currency === "USD" && rate === null) { setSaveError("Indica un tipo de cambio válido para este alquiler."); return; }
    const beforeVisitProblem = reviewedConditions ? Object.values(parseBeforeVisitInput(beforeVisit).errors)[0] : undefined;
    if (beforeVisitProblem) { setSaveError(beforeVisitProblem); return; }
    setIsSaving(true);
    setSaveError("");
    try {
      await onSave({
        ...draft,
        price,
        exchangeRate: rate,
        images: draft.images.length > 0 ? draft.images : property.images,
        pets: petsPolicy === "allowed",
        petsPolicy,
        ...(reviewedConditions ? { beforeVisit } : {}),
        shortDescription: nextShortDescription(property, draft.longDescription),
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
    <div className="property-edit-overlay fixed inset-0 z-[2000] overflow-y-auto bg-neutral-950/58 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Editar anuncio">
      <div className="mx-auto max-w-4xl rounded-[28px] bg-white shadow-[0_30px_110px_rgba(0,0,0,0.28)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white/95 p-5 backdrop-blur sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#58745f]">
              Editar anuncio
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere]">
              {property.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Los cambios se ven en tu anuncio apenas los guardas.
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
          <section className="grid gap-4 rounded-[24px] border border-black/10 bg-neutral-50 p-4" aria-labelledby="edit-photos-title">
            <div>
              <h4 id="edit-photos-title" className="text-base font-semibold text-neutral-950">Fotos</h4>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                La primera foto es la portada. Usa las flechas para cambiar el orden.{" "}
                <a
                  href={whatsappUrl(`Hola, quiero cambiar las fotos de mi anuncio «${property.title}» en Zentro Urbano.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#176b4d] underline underline-offset-4"
                >
                  ¿Fotos nuevas? Escríbenos por WhatsApp
                </a>
              </p>
            </div>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {draft.images.map((image, index) => {
                const src = ownerPhotoSrc(image, published);
                return (
                  <li key={`${image}-${index}`} className="grid gap-2 rounded-[16px] border border-black/10 bg-white p-2">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-neutral-100">
                      <Image
                        src={src}
                        alt={`Foto ${index + 1} de ${draft.title}`}
                        fill
                        sizes="(min-width: 640px) 220px, 50vw"
                        unoptimized={src.startsWith("/api/")}
                        className="object-cover"
                      />
                      {index === 0 ? (
                        <span className="absolute bottom-2 left-2 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-neutral-900">Portada</span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => update("images", movePhoto(draft.images, index, -1))}
                        disabled={index === 0}
                        aria-label={`Mover la foto ${index + 1} antes`}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-black/10 text-neutral-700 disabled:cursor-default disabled:opacity-30"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {index > 0 ? (
                        <button
                          type="button"
                          onClick={() => update("images", moveToCover(draft.images, index))}
                          className="cursor-pointer px-1 text-xs font-semibold text-[#176b4d] underline-offset-4 hover:underline"
                        >
                          Usar como portada
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => update("images", movePhoto(draft.images, index, 1))}
                        disabled={index === draft.images.length - 1}
                        aria-label={`Mover la foto ${index + 1} después`}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-black/10 text-neutral-700 disabled:cursor-default disabled:opacity-30"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <EditorSection title="Datos principales">
            <EditorField label="Título" className="md:col-span-2">
              <input
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                className={inputClassName}
                maxLength={220}
                required
              />
            </EditorField>
            <EditorField label="Tipo de vivienda">
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
                disabled={reviewedConditions}
                aria-describedby={reviewedConditions ? "edit-currency-help" : undefined}
                className={inputClassName}
              >
                <option value="USD">$us</option>
                <option value="BOB">Bs</option>
              </select>
              {reviewedConditions ? <span id="edit-currency-help" className="text-xs text-neutral-600">Para cambiar la moneda, escríbenos por WhatsApp.</span> : null}
            </EditorField>
            <EditorField label="Alquiler mensual">
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
            <EditorField label="Zona">
              <input
                value={draft.zone}
                onChange={(event) => update("zone", event.target.value)}
                className={inputClassName}
              />
            </EditorField>
            <EditorField label="WhatsApp">
              <input
                value={draft.whatsapp}
                onChange={(event) => update("whatsapp", event.target.value)}
                type="tel"
                inputMode="tel"
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
            <EditorField label="Parqueos">
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
            <fieldset className="grid gap-2 md:col-span-2">
              <legend className="text-sm font-semibold text-neutral-800">¿Acepta mascotas?</legend>
              <div className="flex flex-wrap gap-2">
                {petsOptions.map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-[18px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-neutral-700">
                    <input
                      type="radio"
                      name={`pets-${property.slug}`}
                      value={value}
                      checked={petsPolicy === value}
                      onChange={() => setPetsPolicy(value)}
                      className="h-4 w-4 accent-neutral-950"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
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

          <EditorSection title="Descripción y condiciones">
            <EditorField label="Descripción" className="md:col-span-2">
              <textarea
                value={draft.longDescription}
                onChange={(event) => update("longDescription", event.target.value)}
                className={textareaClassName}
                rows={6}
              />
            </EditorField>
            {reviewedConditions ? (
              <div className="grid gap-2 md:col-span-2">
                <p className="text-sm font-semibold text-neutral-800">Condiciones de ingreso</p>
                <ul className="list-disc pl-5 text-sm leading-6 text-neutral-700">
                  {draft.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
                </ul>
                <p className="text-xs text-neutral-600">Para cambiar la garantía o las expensas, escríbenos por WhatsApp.</p>
              </div>
            ) : (
              <EditorField label="Condiciones de ingreso (una por línea)" className="md:col-span-2">
                <textarea
                  value={draft.requirements.join("\n")}
                  onChange={(event) => update("requirements", splitLines(event.target.value))}
                  className={textareaClassName}
                  rows={4}
                />
              </EditorField>
            )}
          </EditorSection>

          {reviewedConditions ? (
            <section className="grid gap-4 rounded-[24px] border border-black/10 bg-neutral-50 p-4">
              <BeforeVisitFields
                value={beforeVisit}
                onChange={(field, next) => setBeforeVisit((current) => ({ ...current, [field]: next }))}
                idPrefix={`edit-${property.slug}`}
                inputClassName={inputClassName}
                labelClassName="text-base font-semibold text-neutral-950"
              />
            </section>
          ) : null}

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

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

const inputClassName =
  "h-11 w-full rounded-[16px] border border-black/10 bg-white px-4 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 disabled:opacity-60";
const textareaClassName =
  "min-h-24 w-full rounded-[16px] border border-black/10 bg-white px-4 py-3 text-sm font-medium leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

function MeasurementInfoSection() {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-[#58745f]" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Cómo contamos</h2>
      </div>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-neutral-600">
        <p>
          <span className="font-semibold text-neutral-950">Vieron el anuncio:</span> personas distintas que
          lo abrieron. Cada teléfono o computadora cuenta una vez, aunque lo abra varias veces.
        </p>
        <p>
          <span className="font-semibold text-neutral-950">Tocaron WhatsApp:</span> personas distintas que
          tocaron el botón para escribirte. No sabemos si llegaron a enviar el mensaje.
        </p>
        <p>
          <span className="font-semibold text-neutral-950">Disponible:</span> tu anuncio se ve disponible
          durante {availabilityFreshDays} días desde tu última confirmación, o hasta que {availabilityReportLimit} personas
          avisen que ya no está. Después dice «Disponibilidad por confirmar».
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
