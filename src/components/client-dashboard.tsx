"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Edit3,
  Eye,
  Home,
  Inbox,
  LayoutGrid,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  Save,
  Send,
  Share2,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
  Clock3,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { cloneElement, useEffect, useMemo, useRef, useState } from "react";
import { BeforeVisitFields, type BeforeVisitFormValue } from "@/components/before-visit-fields";
import { PriceDisplay } from "@/components/currency-preference";
import { OwnerLocationDialog } from "@/components/owner-location-dialog";
import { OwnerServicesNote } from "@/components/owner-services-note";
import { UrbanitoBanner, UrbanitoStrip, UrbanitoTab, type UrbanitoAccount } from "@/components/urbanito-panel";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { OwnerShareKit } from "@/components/owner-share-kit";
import { AccountAvatar, OwnerProfilePanel, type AccountLogin, type AccountProfile } from "@/components/owner-profile-panel";
import { OwnerCalendar } from "@/components/owner-calendar";
import { OwnerVisitsSection, type OwnerVisits } from "@/components/owner-visits-section";
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
import { getOwnerListingSuggestions, ownerListingChecks } from "@/lib/owner-listing-suggestions";
import { ownerLocationStatus } from "@/lib/owner-location";
import { type Property, type PropertyType } from "@/lib/properties";
import type { PetsPolicy } from "@/lib/publication-input";
import { getDirectRentals, rentalPropertyTypes } from "@/lib/rentals";
import { whatsappUrl } from "@/lib/site";
import { boliviaDayKey, defaultVisitSettings, visitShortLabel, visitWhenLabel } from "@/lib/visit-slots";
import type { VisitBooking } from "@/lib/visits";

const sessionEventName = "morada-session";

type ListingAction = "confirm" | "rented" | "republish";
type EditedProperty = Property & { petsPolicy?: PetsPolicy; beforeVisit?: BeforeVisitFormValue };

export function ClientDashboard({
  account,
  visits = null,
  login = null,
  urbanito = null,
  calendar = false,
}: {
  account: DemoAccount;
  visits?: OwnerVisits | null;
  login?: AccountLogin | null;
  // Null hides Urbanito (not configured, or 013_urbanito_links not run yet).
  urbanito?: UrbanitoAccount | null;
  // Mi cuenta > Calendario reads /api/cliente/calendario, which needs a database account.
  calendar?: boolean;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile>({
    displayName: account.displayName,
    phone: account.phone,
    avatarUrl: account.avatarUrl ?? null,
    avatarInitials: account.avatarInitials,
  });
  const [tab, setTab] = useState<AccountTab>("resumen");
  const urbanitoAvailable = Boolean(urbanito);
  const [period, setPeriod] = useState<Period>("30");
  // Read the clock once per visit, so the page stays stable while it is open.
  const [{ todayLabel, tomorrowKey, now }] = useState(() => ({
    todayLabel: capitalizeFirst(new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", weekday: "long", day: "numeric", month: "long" }).format(new Date())),
    tomorrowKey: boliviaDayKey(new Date(Date.now() + 24 * 60 * 60_000)),
    now: Date.now(),
  }));
  const [focusSlug, setFocusSlug] = useState<string | null>(null);

  // The tab lives in the address (#visitas, #perfil...) so links and the back button keep it.
  useEffect(() => {
    const fromHash = () => {
      // #visitas was the old name of the calendar tab.
      const hash = window.location.hash.slice(1) === "visitas" ? "calendario" : window.location.hash.slice(1);
      setTab(isAccountTab(hash) && (hash !== "urbanito" || urbanitoAvailable) ? hash : "resumen");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [urbanitoAvailable]);

  function showTab(next: AccountTab) {
    setTab(next);
    if (next !== "anuncios") setFocusSlug(null);
    window.history.replaceState(null, "", next === "resumen" ? window.location.pathname + window.location.search : `#${next}`);
  }
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
    const response=await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    if (!response?.ok) {window.alert("No se pudo cerrar la sesión. Revisa tu conexión e intenta nuevamente.");return;}
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

  const upcomingVisits = (visits?.bookings ?? [])
    .filter((booking) => booking.status === "reserved" && !booking.past)
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const visitCounts = new Map<string, number>();
  for (const booking of upcomingVisits) visitCounts.set(booking.propertySlug, (visitCounts.get(booking.propertySlug) ?? 0) + 1);
  const titles = new Map(properties.map((property) => [property.slug, property.title]));
  const liveProperties = properties.filter((property) => listingFor(property).status === "live");
  const toConfirm = liveProperties.filter((property) => availabilityPrompt(property)?.urgent);
  const toLocate = liveProperties.filter((property) => property.rentalDetails && !ownerLocationStatus(property).confirmed);
  const hoursOff = visits ? liveProperties.filter((property) => !(visits.settings[property.slug] ?? defaultVisitSettings).enabled) : [];
  const needsFix = requests.filter((request) => request.status === "changes_requested" && !request.corrected);

  function openListing(slug: string) {
    setFocusSlug(slug);
    showTab("anuncios");
  }

  async function confirmAll() {
    for (const property of toConfirm) await runListingAction(property.slug, "confirm");
  }

  const listingCards = (list: Property[]) => list.map((property) => (
    <OwnerListingCard
      key={property.slug}
      property={property}
      listing={listingFor(property)}
      audienceUnavailable={Boolean(account.audienceUnavailable)}
      visitCount={visits ? visitCounts.get(property.slug) ?? 0 : null}
      focused={focusSlug === property.slug}
      onAction={runListingAction}
      onSaveProperty={saveProperty}
      onConfirmLocation={confirmLocation}
    />
  ));

  const emptyListings = properties.length === 0 ? (
    <EmptyPanel
      title={pendingCount ? "Tu vivienda está en revisión" : "Aún no tienes anuncios publicados"}
      copy={pendingCount
        ? "Cuando la aprobemos, tu anuncio aparecerá aquí con sus visitas."
        : "Cuando publiques tu vivienda y la aprobemos, aparecerá aquí con sus visitas y contactos."}
      actionLabel={pendingCount ? "Ver mis solicitudes" : "Publicar mi vivienda"}
      href={pendingCount ? "/cliente/solicitudes" : "/publicar"}
    />
  ) : null;

  const periodKey = period === "7" ? "7" : period === "30" ? "30" : "Total";
  const periodStart = period === "total" ? null : now - Number(period) * 24 * 60 * 60_000;
  const periodTotals: PeriodTotals | null = showTotals ? {
    views: audiences.reduce((total, audience) => total + audience[`views${periodKey}`], 0),
    contacts: audiences.reduce((total, audience) => total + audience[`contacts${periodKey}`], 0),
    visits: (visits?.bookings ?? []).filter((booking) => booking.status === "reserved" && (periodStart === null || new Date(booking.createdAt).getTime() >= periodStart)).length,
  } : null;
  // The home most people saw without writing gets one hint from its missing details.
  const quiet = showTotals
    ? liveProperties
        .map((property) => ({ property, audience: listingFor(property).audience }))
        .filter(({ audience }) => audience && audience[`views${periodKey}`] >= 10 && audience[`contacts${periodKey}`] === 0)
        .sort((first, second) => (second.audience?.[`views${periodKey}`] ?? 0) - (first.audience?.[`views${periodKey}`] ?? 0))[0]
    : undefined;
  const quietHint = quiet ? getOwnerListingSuggestions(quiet.property)[0] : undefined;
  const funnelTip = quiet
    ? `${quiet.property.title} tiene ${quiet.audience?.[`views${periodKey}`]} vistas y ningún mensaje.${quietHint ? ` ${quietHint}` : " Revisa el precio y las fotos."}`
    : null;

  const navCounts: Partial<Record<AccountTab, number>> = {
    anuncios: properties.length,
    ...(visits ? { calendario: upcomingVisits.length } : {}),
    solicitudes: requests.length,
  };
  const ownerName = account.companyName ?? profile.displayName;
  const nextVisit = upcomingVisits[0] ?? null;

  return (
    <div className="zu-tones bg-neutral-50">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6 sm:py-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-7 lg:px-8">
        <OwnerNav
          profile={profile}
          roleLabel={account.roleLabel}
          tab={tab}
          counts={navCounts}
          pending={Boolean(toConfirm.length || needsFix.length)}
          showUrbanito={Boolean(urbanito)}
          urbanitoNew={Boolean(urbanito && !urbanito.linked)}
          onSelect={showTab}
          onLogout={logout}
        />

        <main className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f6b65]">
                Mi cuenta · {tab === "resumen" ? todayLabel : accountTabs.find(([id]) => id === tab)?.[1]}
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere] sm:text-3xl">
                {tab === "resumen" ? `Hola, ${ownerName}` : tabTitles[tab]}
              </h1>
            </div>
            {tab === "resumen" && showTotals ? <PeriodPicker period={period} onChange={setPeriod} /> : null}
          </header>

          {tab === "resumen" ? (
            <>
              {urbanito && !urbanito.linked ? (
                <UrbanitoBanner
                  greetingName={ownerName}
                  nextVisit={nextVisit ? `${capitalizeFirst(visitWhenLabel(nextVisit.startsAt))} viene ${nextVisit.visitorName.split(" ")[0]}.` : null}
                  onOpen={() => showTab("urbanito")}
                />
              ) : null}
              <TodaySection
                toConfirm={toConfirm.length}
                onConfirmAll={confirmAll}
                needsFix={needsFix.length}
                nextVisit={nextVisit}
                nextVisitTitle={nextVisit ? titles.get(nextVisit.propertySlug) ?? "" : ""}
                toLocate={toLocate[0] ?? null}
                hoursOff={hoursOff.length}
                noPhoto={!profile.avatarUrl}
                noListings={properties.length === 0 && !pendingCount}
                onOpenListing={openListing}
                onShowTab={showTab}
              />
              {urbanito?.linked ? <UrbanitoStrip botUsername={urbanito.botUsername} onOpen={() => showTab("urbanito")} /> : null}
              <KpiCards
                period={period}
                totals={periodTotals}
                upcomingVisits={visits ? upcomingVisits.length : null}
                tomorrowVisits={visits ? upcomingVisits.filter((booking) => boliviaDayKey(booking.startsAt) === tomorrowKey).length : 0}
                liveCount={liveCount}
                toConfirm={toConfirm.length}
              />
              {emptyListings ?? (
                <ListingsTable
                  properties={properties}
                  listingFor={listingFor}
                  audienceUnavailable={Boolean(account.audienceUnavailable)}
                  period={period}
                  visitCounts={visits ? visitCounts : null}
                  onManage={openListing}
                />
              )}
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
                {periodTotals ? <FunnelPanel period={period} totals={periodTotals} tip={funnelTip} /> : null}
                {visits ? <UpcomingVisits bookings={upcomingVisits.slice(0, 4)} titles={titles} onShowAll={() => showTab("calendario")} /> : null}
              </div>
            </>
          ) : null}

          {tab === "anuncios" ? (
            <section className="rounded-[22px] border border-black/10 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-neutral-600">Edita, comparte o marca como alquilada cada vivienda.</p>
                <Link href="/publicar" className={greenButton}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Publicar otra
                </Link>
              </div>
              <div className="mt-4 grid gap-3">
                {emptyListings}
                {listingCards(properties)}
              </div>
            </section>
          ) : null}

          {tab === "calendario" ? (
            <div className="grid gap-6">
              {calendar ? <OwnerCalendar homes={properties.map((property) => ({ slug: property.slug, title: property.title }))} /> : null}
              {visits && properties.length > 0 ? (
                <div className="grid gap-3">
                  {calendar ? <h2 className="text-lg font-semibold tracking-[-0.01em] text-neutral-950">Reservas y horarios de visita</h2> : null}
                  <OwnerVisitsSection visits={visits} homes={properties.map((property) => ({ slug: property.slug, title: property.title }))} />
                </div>
              ) : calendar ? null : (
                <EmptyPanel
                  title="Todavía no hay visitas"
                  copy="Cuando tengas un anuncio publicado, aquí verás quién reservó una visita y podrás elegir los días y horas."
                  actionLabel="Publicar mi vivienda"
                  href="/publicar"
                />
              )}
            </div>
          ) : null}

          {tab === "solicitudes" ? (
            requests.length ? (
              <RequestsSection requests={requests} liveSlugs={new Set(liveProperties.map((property) => property.slug))} />
            ) : (
              <EmptyPanel
                title="No tienes solicitudes recientes"
                copy="Cada vez que publicas o vuelves a publicar una vivienda, la revisamos. Aquí verás en qué va."
                actionLabel="Ver todas mis solicitudes"
                href="/cliente/solicitudes"
              />
            )
          ) : null}

          {tab === "urbanito" && urbanito ? <UrbanitoTab account={urbanito} ownerName={ownerName} phone={profile.phone} /> : null}

          {tab === "perfil" ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <OwnerProfilePanel
                profile={profile}
                email={account.email}
                login={login}
                hasListing={properties.length > 0}
                hoursOn={properties.length > 0 && hoursOff.length === 0}
                onProfileChange={(next) => {
                  setProfile((current) => ({ ...current, ...next }));
                  router.refresh();
                  // The header shows the photo and name too; ask it to read the session again.
                  window.dispatchEvent(new Event("morada-session"));
                }}
                onLogout={logout}
              />
            </div>
          ) : null}

          {tab !== "resumen" && tab !== "urbanito" && tab !== "perfil" ? <OwnerServicesNote className="rounded-[22px]" /> : null}
        </main>
      </div>
    </div>
  );
}

type AccountTab = "resumen" | "anuncios" | "calendario" | "solicitudes" | "urbanito" | "perfil";
const accountTabs: Array<[AccountTab, string]> = [
  ["resumen", "Resumen"],
  ["anuncios", "Anuncios"],
  ["calendario", "Calendario"],
  ["solicitudes", "Solicitudes"],
  ["urbanito", "Urbanito"],
  ["perfil", "Mi perfil"],
];
const tabTitles: Record<AccountTab, string> = {
  resumen: "Resumen",
  anuncios: "Tus viviendas",
  calendario: "Calendario",
  solicitudes: "Solicitudes",
  urbanito: "Urbanito",
  perfil: "Mi perfil",
};
const isAccountTab = (value: string): value is AccountTab => accountTabs.some(([id]) => id === value);
const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const greenButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#176b4d] px-4 text-sm font-semibold text-white transition hover:bg-[#10533b]";
const outlineButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#cfe3d7] bg-white px-4 text-sm font-semibold text-[#0d4d36] transition hover:border-[#176b4d]";

const navIcons: Record<AccountTab, ReactElement<{ className?: string }>> = {
  resumen: <LayoutGrid />,
  anuncios: <Home />,
  calendario: <CalendarCheck />,
  solicitudes: <Inbox />,
  urbanito: <Send />,
  perfil: <UserRound />,
};

// Green menu of Mi cuenta: a column on the computer, a grid of big buttons on the phone.
function OwnerNav({
  profile,
  roleLabel,
  tab,
  counts,
  pending,
  showUrbanito,
  urbanitoNew,
  onSelect,
  onLogout,
}: {
  profile: AccountProfile;
  roleLabel: string;
  tab: AccountTab;
  counts: Partial<Record<AccountTab, number>>;
  pending: boolean;
  showUrbanito: boolean;
  urbanitoNew: boolean;
  onSelect: (tab: AccountTab) => void;
  onLogout: () => void;
}) {
  const items = accountTabs.filter(([id]) => id !== "urbanito" || showUrbanito);
  const item = "relative flex cursor-pointer items-center rounded-[12px] font-semibold transition";
  return (
    <aside className="owner-nav rounded-[22px] bg-[linear-gradient(180deg,#0f3b2b,#14513a)] p-3.5 text-white shadow-[0_18px_40px_rgb(15_59_43/0.25)] lg:sticky lg:top-24 lg:self-start lg:p-[18px]">
      <div className="flex items-center gap-3 px-1 pb-3 lg:border-b lg:border-white/10 lg:pb-4">
        <AccountAvatar account={profile} size="lg" onClick={() => onSelect("perfil")} initialsClassName="bg-[#3fbf87] text-[#0f3b2b]" />
        <div className="min-w-0">
          <p className="truncate text-[15.5px] font-semibold">{profile.displayName}</p>
          <span className="mt-0.5 inline-block rounded-full bg-white/[0.12] px-2 py-0.5 text-xs font-semibold text-[#bdf0d5]">{roleLabel}</span>
        </div>
      </div>
      <nav aria-label="Secciones de tu cuenta" className="mt-1 grid grid-cols-3 gap-2 lg:mt-3 lg:grid-cols-1 lg:gap-0.5">
        {items.map(([id, label]) => {
          const active = tab === id;
          const count = counts[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? "page" : undefined}
              className={`${item} flex-col justify-center gap-1.5 border border-white/15 px-1 py-3 text-[13px] lg:h-11 lg:flex-row lg:justify-start lg:gap-3 lg:border-0 lg:px-3 lg:py-0 lg:text-[14.5px] ${
                active ? "bg-white/[0.14] text-white" : "bg-white/[0.06] text-[#cde6d9] hover:bg-white/10 hover:text-white lg:bg-transparent"
              }`}
            >
              {id === "urbanito" ? (
                // eslint-disable-next-line @next/next/no-img-element -- 64 px sprite scaled with pixelated rendering
                <img src="/images/urbanito/urbanito.png" alt="" width={64} height={64} className="h-6 w-6 [image-rendering:pixelated] lg:h-[22px] lg:w-[22px]" />
              ) : (
                cloneElement(navIcons[id], { className: "h-[18px] w-[18px] opacity-90" })
              )}
              {label}
              {id === "urbanito" && urbanitoNew ? (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-[#f2b33d] px-1.5 text-[11px] font-bold leading-5 text-[#4a2c00] lg:static lg:ml-auto">Nuevo</span>
              ) : count !== undefined ? (
                <span className={`absolute right-1.5 top-1.5 min-w-6 rounded-full px-1.5 text-center text-xs leading-5 lg:static lg:ml-auto ${active ? "bg-[#3fbf87] text-[#0f3b2b]" : "bg-white/[0.12] text-white"}`}>{count}</span>
              ) : id === "resumen" && pending ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f2b33d] lg:static lg:ml-auto" aria-label="Hay algo pendiente" />
              ) : null}
            </button>
          );
        })}
        <Link href="/servicios" className={`${item} hidden gap-3 px-3 text-[14.5px] text-[#cde6d9] hover:bg-white/10 hover:text-white lg:flex lg:h-11`}>
          <ShoppingBag className="h-[18px] w-[18px] opacity-90" aria-hidden="true" />
          Servicios
        </Link>
        <button type="button" onClick={onLogout} className={`${item} hidden gap-3 px-3 text-[14.5px] text-[#cde6d9] hover:bg-white/10 hover:text-white lg:mt-2 lg:flex lg:h-11 lg:border-t lg:border-white/10 lg:pt-2`}>
          <LogOut className="h-[18px] w-[18px] opacity-90" aria-hidden="true" />
          Salir
        </button>
      </nav>
      <Link href="/publicar" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#3fbf87] text-[14.5px] font-semibold text-[#0f3b2b] transition hover:bg-[#4fcf96]">
        <Plus className="h-[17px] w-[17px]" aria-hidden="true" />
        Publicar vivienda
      </Link>
      <div className="mt-3.5 hidden rounded-[12px] bg-white/[0.07] p-3 text-[12.5px] leading-5 text-[#bcd6c8] lg:block">
        <strong className="mb-0.5 block text-[13.5px] text-white">Publicar es gratis</strong>
        ¿Ayuda con fotos o contrato?{" "}
        <a href={whatsappUrl("Hola, quiero saber de los paquetes mensuales para propietarios de Zentro Urbano.")} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline underline-offset-2">
          Escríbenos por WhatsApp
        </a>
        , de 08:00 a 00:00.
      </div>
    </aside>
  );
}

type Period = "7" | "30" | "total";
const periodLabels: Record<Period, string> = { "7": "7 días", "30": "30 días", total: "Todo" };
type PeriodTotals = { views: number; contacts: number; visits: number };

function PeriodPicker({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return (
    <div role="group" aria-label="Período de los números" className="flex rounded-[12px] border border-black/10 bg-white p-[3px]">
      {(Object.keys(periodLabels) as Period[]).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={period === value}
          onClick={() => onChange(value)}
          className={`h-8 cursor-pointer rounded-[9px] px-3 text-[13px] font-semibold ${period === value ? "bg-[#176b4d] text-white" : "text-neutral-600 hover:text-neutral-950"}`}
        >
          {periodLabels[value]}
        </button>
      ))}
    </div>
  );
}

function KpiCards({
  period,
  totals,
  upcomingVisits,
  tomorrowVisits,
  liveCount,
  toConfirm,
}: {
  period: Period;
  totals: PeriodTotals | null;
  upcomingVisits: number | null;
  tomorrowVisits: number;
  liveCount: number;
  toConfirm: number;
}) {
  const [open, setOpen] = useState(false);
  const when = period === "total" ? "desde que publicaste" : `últimos ${periodLabels[period]}`;
  const share = totals && totals.views ? Math.round((totals.contacts / totals.views) * 100) : null;
  const cards: Array<{ icon: ReactElement<{ className?: string }>; label: string; value: number | null; note: string; muted?: boolean }> = [
    { icon: <Eye />, label: "Personas que vieron", value: totals?.views ?? null, note: totals ? when : "Aún sin datos" },
    { icon: <MessageCircle />, label: "Te escribieron", value: totals?.contacts ?? null, note: share !== null ? `${share}% de los que vieron` : when },
    { icon: <CalendarCheck />, label: "Visitas reservadas", value: upcomingVisits, note: tomorrowVisits ? `${tomorrowVisits} mañana` : "Próximas" },
    { icon: <Home />, label: "Anuncios activos", value: liveCount, note: toConfirm ? `${toConfirm} por confirmar` : liveCount ? "Todos al día" : "Publica la primera", muted: !toConfirm },
  ];
  return (
    <section aria-label="Tus números">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
        {cards.map((card, index) => (
          <div key={card.label} className={`rounded-[18px] border p-3.5 sm:p-[18px] ${index === 0 ? "kpi-highlight border-[#176b4d] bg-[#176b4d] text-white" : "border-black/10 bg-white"}`}>
            <p className={`flex items-center gap-2 text-[13px] font-medium sm:text-[13.5px] ${index === 0 ? "text-[#cdeedd]" : "text-neutral-600"}`}>
              {cloneElement(card.icon, { className: `h-4 w-4 shrink-0 ${index === 0 ? "text-white" : "text-[#176b4d]"}` })}
              {card.label}
            </p>
            <p className={`mt-2.5 text-[26px] font-semibold leading-none tracking-tight sm:text-[30px] ${index === 0 ? "text-white" : "text-neutral-950"}`}>
              {card.value === null ? "—" : card.value.toLocaleString("es-BO")}
            </p>
            <p className={`mt-1.5 text-[12.5px] font-semibold ${index === 0 ? "text-[#cdeedd]" : card.muted ? "font-medium text-neutral-500" : "text-[#176b4d]"}`}>{card.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-neutral-600">Contamos personas distintas por anuncio: una vez por teléfono o computadora.</p>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#176b4d] underline-offset-4 hover:underline">
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
        ¿Cómo contamos?
      </button>
      {open ? <MeasurementInfo /> : null}
    </section>
  );
}

function ListingsTable({
  properties,
  listingFor,
  audienceUnavailable,
  period,
  visitCounts,
  onManage,
}: {
  properties: Property[];
  listingFor: (property: Property) => OwnerListingState;
  audienceUnavailable: boolean;
  period: Period;
  visitCounts: Map<string, number> | null;
  onManage: (slug: string) => void;
}) {
  const columns = "lg:grid-cols-[minmax(0,3.2fr)_1fr_0.6fr_0.75fr_0.6fr_1fr_88px]";
  const pick = (audience: OwnerListingAudience | null | undefined, kind: "views" | "contacts") =>
    audienceUnavailable || !audience ? null : audience[`${kind}${period === "7" ? "7" : period === "30" ? "30" : "Total"}`];
  return (
    <section className="overflow-hidden rounded-[18px] border border-black/10 bg-white" aria-labelledby="owner-homes-title">
      <div className="flex items-center justify-between gap-3 p-4 sm:px-5">
        <h2 id="owner-homes-title" className="text-base font-semibold text-neutral-950">Tus viviendas</h2>
        <Link href="/publicar" className={outlineButton}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Publicar otra
        </Link>
      </div>
      <div className={`hidden h-[38px] items-center gap-3 border-y border-black/10 bg-neutral-50 px-5 text-xs font-semibold uppercase tracking-[0.04em] text-neutral-500 lg:grid ${columns}`} aria-hidden="true">
        <span>Vivienda</span><span>Estado</span><span>Vistas</span><span>WhatsApp</span><span>Visitas</span><span>Anuncio</span><span />
      </div>
      <ul>
        {properties.map((property) => {
          const listing = listingFor(property);
          const live = listing.status === "live";
          const urgent = live && availabilityPrompt(property)?.urgent;
          const cover = property.images[0] ? ownerPhotoSrc(property.images[0], live) : null;
          const percent = Math.round(((ownerListingChecks - getOwnerListingSuggestions(property).length) / ownerListingChecks) * 100);
          const numbers: Array<[string, number | null]> = [
            ["vistas", pick(listing.audience, "views")],
            ["WhatsApp", pick(listing.audience, "contacts")],
            ["visitas", visitCounts ? visitCounts.get(property.slug) ?? 0 : null],
          ];
          return (
            <li key={property.slug} className={`grid grid-cols-3 items-center gap-3 border-t border-black/10 p-4 first:border-t-0 lg:px-5 lg:first:border-t-0 ${columns}`}>
              <div className="col-span-3 flex min-w-0 items-center gap-3 lg:col-span-1">
                {cover ? (
                  <Image src={cover} alt="" width={168} height={124} sizes="96px" unoptimized={cover.startsWith("/api/")} className="h-[72px] w-24 shrink-0 rounded-[12px] object-cover lg:h-[62px] lg:w-[84px]" />
                ) : (
                  <span className="grid h-[72px] w-24 shrink-0 place-items-center rounded-[12px] bg-neutral-100 text-neutral-500 lg:h-[62px] lg:w-[84px]"><Home className="h-5 w-5" aria-hidden="true" /></span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-neutral-950 [overflow-wrap:anywhere]">{property.title}</p>
                  <p className="text-[12.5px] text-neutral-600">{property.zone} · <PriceDisplay property={property} /></p>
                </div>
              </div>
              <div className="col-span-3 lg:col-span-1">
                {urgent ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-[12.5px] font-semibold text-amber-900"><span className="h-1.5 w-1.5 rounded-full bg-current" />Por confirmar</span>
                ) : (
                  <ListingStatusBadge status={listing.status} />
                )}
              </div>
              {numbers.map(([label, value]) => (
                <p key={label} className="text-[15px] font-semibold text-neutral-950">
                  {value === null ? "—" : value.toLocaleString("es-BO")}
                  <span className="block text-[11.5px] font-normal text-neutral-500 lg:hidden">{label}</span>
                </p>
              ))}
              <div className="col-span-2 flex items-center gap-2 text-[12.5px] text-neutral-600 lg:col-span-1">
                <span
                  className="relative grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(#176b4d ${percent * 3.6}deg, rgb(0 0 0 / 0.1) 0)` }}
                  role="img"
                  aria-label={`Anuncio completo ${percent}%`}
                >
                  <span className="h-[22px] w-[22px] rounded-full bg-white" />
                </span>
                <span><strong className="text-neutral-950">{percent}%</strong><br />completo</span>
              </div>
              <div className="flex justify-end gap-1.5">
                <Link href={`/propiedades/${property.slug}`} className={iconButton} title="Ver anuncio" aria-label={`Ver anuncio: ${property.title}`}>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Link>
                <button type="button" onClick={() => onManage(property.slug)} className={iconButton} title="Editar y más opciones" aria-label={`Editar y más opciones: ${property.title}`}>
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const iconButton =
  "grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] border border-[#cfe3d7] bg-white text-[#0d4d36] transition hover:border-[#176b4d]";

function FunnelPanel({ period, totals, tip }: { period: Period; totals: PeriodTotals; tip: string | null }) {
  const steps: Array<[string, number]> = [
    ["Vieron", totals.views],
    ["Te escribieron", totals.contacts],
    ["Reservaron visita", totals.visits],
  ];
  const top = Math.max(1, totals.views);
  return (
    <section className="rounded-[18px] border border-black/10 bg-white p-5" aria-labelledby="owner-funnel-title">
      <h2 id="owner-funnel-title" className="flex items-center gap-2 text-base font-semibold text-neutral-950">
        <BarChart3 className="h-[17px] w-[17px] text-[#176b4d]" aria-hidden="true" />
        Del anuncio a la visita
      </h2>
      <p className="mt-1 text-[13.5px] text-neutral-600">
        Cuántas personas avanzan en cada paso, {period === "total" ? "desde que publicaste" : `en los últimos ${periodLabels[period]}`}.
      </p>
      <dl className="mt-4 grid gap-2.5">
        {steps.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[96px_1fr_40px] items-center gap-3 text-[13.5px] sm:grid-cols-[120px_1fr_44px]">
            <dt className="text-neutral-700">{label}</dt>
            <dd className="h-[30px] overflow-hidden rounded-[8px] bg-neutral-100">
              <span className="block h-full rounded-[8px] bg-[linear-gradient(90deg,#1f8a5e,#176b4d)]" style={{ width: `${value ? Math.max(4, Math.round((value / top) * 100)) : 0}%` }} />
            </dd>
            <dd className="text-right font-semibold text-neutral-950">{value.toLocaleString("es-BO")}</dd>
          </div>
        ))}
      </dl>
      {tip ? (
        <p className="mt-4 flex gap-2 rounded-[12px] bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-900">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {tip}
        </p>
      ) : null}
    </section>
  );
}

function UpcomingVisits({ bookings, titles, onShowAll }: { bookings: VisitBooking[]; titles: Map<string, string>; onShowAll: () => void }) {
  return (
    <section className="rounded-[18px] border border-black/10 bg-white p-5" aria-labelledby="owner-visits-title">
      <h2 id="owner-visits-title" className="flex items-center gap-2 text-base font-semibold text-neutral-950">
        <CalendarCheck className="h-[17px] w-[17px] text-[#176b4d]" aria-hidden="true" />
        Próximas visitas
      </h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-neutral-600">Todavía no hay visitas reservadas.</p>
      ) : (
        <>
          <p className="mt-1 text-[13.5px] text-neutral-600">Escríbele a cada persona para confirmar la dirección.</p>
          <ul className="mt-2">
            {bookings.map((booking) => {
              const [day, rest] = visitShortLabel(booking.startsAt).split(" · ");
              const message = `Hola ${booking.visitorName.split(" ")[0]}, te escribo por la visita que reservaste en Zentro Urbano para el ${visitWhenLabel(booking.startsAt)}.`;
              return (
                <li key={booking.id} className="flex items-center gap-3 border-t border-black/10 py-2.5">
                  <span className="grid w-12 shrink-0 place-items-center rounded-[10px] border border-black/10 py-1 text-center text-[11.5px] font-semibold leading-4 text-neutral-500">
                    <span>{day.split(" ")[0]}</span>
                    <span className="text-[17px] text-neutral-950">{day.split(" ").slice(1, 2).join(" ")}</span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <strong className="block font-semibold text-neutral-950">{rest} · {booking.visitorName}</strong>
                    <span className="block truncate text-[12.5px] text-neutral-600">{titles.get(booking.propertySlug) ?? ""}</span>
                  </span>
                  <a className={outlineButton} href={`https://wa.me/${booking.visitorWhatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                    <WhatsAppIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Escribir</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <button type="button" onClick={onShowAll} className="mt-3 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-[#176b4d] underline-offset-4 hover:underline">
        Ver visitas y horarios <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}

function TodaySection({
  toConfirm,
  onConfirmAll,
  needsFix,
  nextVisit,
  nextVisitTitle,
  toLocate,
  hoursOff,
  noPhoto,
  noListings,
  onOpenListing,
  onShowTab,
}: {
  toConfirm: number;
  onConfirmAll: () => Promise<void>;
  needsFix: number;
  nextVisit: VisitBooking | null;
  nextVisitTitle: string;
  toLocate: Property | null;
  hoursOff: number;
  noPhoto: boolean;
  noListings: boolean;
  onOpenListing: (slug: string) => void;
  onShowTab: (tab: AccountTab) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const tasks: ReactNode[] = [];

  if (noListings) {
    tasks.push(
      <TaskRow key="publish" icon={<Home />} title="Publica tu primera vivienda" detail="Es gratis. Te guiamos paso a paso: fotos, datos y precio.">
        <Link href="/publicar" className={taskButtonDark}>Publicar</Link>
      </TaskRow>,
    );
  }
  if (toConfirm) {
    tasks.push(
      <TaskRow
        key="confirm"
        tone="warn"
        icon={<CheckCircle2 />}
        title={toConfirm === 1 ? "1 anuncio por confirmar" : `${toConfirm} anuncios por confirmar`}
        detail="Si siguen libres, vuelven a verse disponibles. Si alguno ya se alquiló, márcalo en Anuncios."
      >
        <button
          type="button"
          disabled={busy}
          className={taskButtonAmber}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onConfirmAll();
              setNotice(`Listo. Se verán disponibles durante ${availabilityFreshDays} días.`);
            } catch (confirmError) {
              setError(confirmError instanceof Error ? confirmError.message : "No se pudo guardar el cambio.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          {toConfirm === 1 ? "Sí, sigue libre" : "Sí, siguen libres"}
        </button>
      </TaskRow>,
    );
  }
  if (needsFix) {
    tasks.push(
      <TaskRow key="fix" tone="warn" icon={<ClipboardList />} title="Te pedimos una corrección" detail="Tu vivienda todavía no está publicada. Lee lo que te pedimos y reenvía.">
        <button type="button" className={taskButton} onClick={() => onShowTab("solicitudes")}>Ver qué falta</button>
      </TaskRow>,
    );
  }
  if (nextVisit) {
    const message = `Hola ${nextVisit.visitorName.split(" ")[0]}, te escribo por la visita que reservaste en Zentro Urbano para el ${visitWhenLabel(nextVisit.startsAt)}.`;
    tasks.push(
      <TaskRow key="visit" tone="green" icon={<MessageCircle />} title={`${capitalizeFirst(visitWhenLabel(nextVisit.startsAt))} viene ${nextVisit.visitorName.split(" ")[0]}`} detail={`${nextVisitTitle}. Escríbele para confirmar la dirección.`}>
        <a className={taskButtonDark} href={`https://wa.me/${nextVisit.visitorWhatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <WhatsAppIcon className="h-4 w-4" />
          Escribir a {nextVisit.visitorName.split(" ")[0]}
        </a>
      </TaskRow>,
    );
  }
  if (hoursOff) {
    tasks.push(
      <TaskRow key="hours" icon={<Clock3 />} title="Elige días y horas para visitar" detail="Así los interesados reservan solos y tú no coordinas por chat.">
        <button type="button" className={taskButton} onClick={() => onShowTab("calendario")}>Elegir horarios</button>
      </TaskRow>,
    );
  }
  if (toLocate) {
    tasks.push(
      <TaskRow key="locate" icon={<MapPin />} title="Verifica la ubicación de tu anuncio" detail={`${toLocate.title}: confirma el punto en el mapa para que te encuentren.`}>
        <button type="button" className={taskButton} onClick={() => onOpenListing(toLocate.slug)}>Verificar</button>
      </TaskRow>,
    );
  }
  if (noPhoto) {
    tasks.push(
      <TaskRow key="photo" icon={<Camera />} title="Sube tu foto de perfil" detail="Una cara da confianza: los inquilinos saben con quién hablan.">
        <button type="button" className={taskButton} onClick={() => onShowTab("perfil")}>Subir foto</button>
      </TaskRow>,
    );
  }

  return (
    <section className="rounded-[20px] border border-black/10 bg-white p-4 sm:p-[18px]" aria-labelledby="owner-today-title">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="owner-today-title" className="flex items-center gap-2 text-[17px] font-semibold text-neutral-950">
          <CheckCircle2 className="h-[18px] w-[18px] text-[#176b4d]" aria-hidden="true" />
          Para hoy
        </h2>
        <p className="text-[13.5px] text-neutral-600">
          {tasks.length ? (tasks.length === 1 ? "1 cosa que te ayuda a alquilar más rápido" : `${tasks.length} cosas que te ayudan a alquilar más rápido`) : "Todo al día"}
        </p>
      </div>
      {tasks.length ? <div className={`mt-3.5 grid gap-3 ${tasks.length === 1 ? "" : tasks.length % 2 === 0 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>{tasks}</div> : (
        <p className="mt-2 text-sm leading-6 text-neutral-600">No tienes nada pendiente. Te avisaremos aquí cuando algo necesite tu atención.</p>
      )}
      {notice ? <p role="status" className="mt-3 text-sm font-semibold text-[#176b4d]">{notice}</p> : null}
      {error ? <p role="alert" className="auth-error mt-3">{error}</p> : null}
    </section>
  );
}

const taskButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#cfe3d7] bg-white px-4 text-sm font-semibold text-[#0d4d36] transition hover:border-[#176b4d]";
const taskButtonDark =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#176b4d] px-4 text-sm font-semibold text-white transition hover:bg-[#10533b] disabled:cursor-wait disabled:opacity-60";
const taskButtonAmber =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#c77d12] px-4 text-sm font-semibold text-white transition hover:bg-[#a9690f] disabled:cursor-wait disabled:opacity-60";

// One card of "Para hoy": icon, what to do and one button. Side by side on wide screens.
function TaskRow({
  icon,
  title,
  detail,
  tone,
  children,
}: {
  icon: ReactElement<{ className?: string }>;
  title: string;
  detail: string;
  tone?: "warn" | "green";
  children: ReactNode;
}) {
  const bubble = tone === "warn" ? "bg-amber-100 text-amber-900" : tone === "green" ? "bg-[#e3f4ea] text-[#176b4d]" : "bg-neutral-100 text-[#58745f]";
  return (
    <div className={`grid grid-cols-[40px_1fr] content-start gap-x-3 gap-y-1 rounded-[16px] p-4 ring-1 md:flex md:flex-col md:gap-1.5 ${tone === "warn" ? "bg-amber-50 ring-amber-300" : "bg-neutral-50 ring-black/10"}`}>
      <span className={`row-span-2 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] md:mb-1 ${bubble}`} aria-hidden="true">
        {cloneElement(icon, { className: "h-5 w-5" })}
      </span>
      <p className="text-[15px] font-semibold text-neutral-950">{title}</p>
      <p className="col-start-2 text-[13px] leading-5 text-neutral-600 md:mb-2">{detail}</p>
      <div className="col-start-2 mt-2 md:mt-auto [&>*]:w-full md:[&>*]:w-auto">{children}</div>
    </div>
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
  visitCount,
  focused,
  onAction,
  onSaveProperty,
  onConfirmLocation,
}: {
  property: Property;
  listing: OwnerListingState;
  audienceUnavailable: boolean;
  visitCount: number | null;
  focused: boolean;
  onAction: (slug: string, action: ListingAction) => Promise<void>;
  onSaveProperty: (property: EditedProperty) => Promise<void>;
  onConfirmLocation: (slug: string, point: { lat: number; lng: number }) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [busy, setBusy] = useState<ListingAction | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Cards mount again when the tab changes, so the card "Verificar" points to starts open.
  const [moreOpen, setMoreOpen] = useState(focused);
  const [shareOpen, setShareOpen] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const live = listing.status === "live";

  // "Verificar" in "Para hoy" opens this card's options and brings it into view.
  useEffect(() => {
    if (!focused) return;
    articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focused]);
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

  const urgent = Boolean(prompt?.urgent);
  const completeness = Math.round(((ownerListingChecks - suggestions.length) / ownerListingChecks) * 100);

  return (
    <>
      <article
        ref={articleRef}
        id={`anuncio-${property.slug}`}
        className="grid scroll-mt-28 grid-cols-[88px_1fr] gap-x-3 gap-y-3 rounded-[22px] border border-black/10 bg-neutral-50 p-3 sm:grid-cols-[150px_1fr] sm:gap-x-4"
      >
        {live ? (
          <Link href={`/propiedades/${property.slug}`} className="relative block aspect-square self-start overflow-hidden rounded-[16px] bg-neutral-200 sm:aspect-[4/3]">
            {image}
          </Link>
        ) : (
          <div className="relative aspect-square self-start overflow-hidden rounded-[16px] bg-neutral-200 opacity-80 sm:aspect-[4/3]">{image}</div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <ListingStatusBadge status={listing.status} />
            {urgent ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Por confirmar</span> : null}
            <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-black/10 sm:inline">{property.type}</span>
          </div>
          {live ? (
            <Link
              href={`/propiedades/${property.slug}`}
              className="mt-2 block text-base font-semibold leading-snug tracking-tight text-neutral-950 hover:text-[#21352b] [overflow-wrap:anywhere] sm:text-lg"
            >
              {property.title}
            </Link>
          ) : (
            <p className="mt-2 text-base font-semibold leading-snug tracking-tight text-neutral-950 [overflow-wrap:anywhere] sm:text-lg">{property.title}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-neutral-600">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#58745f]" aria-hidden="true" />
            {property.zone} ·
            <PriceDisplay property={property} className="font-semibold text-neutral-950" />
          </p>
          {!audienceUnavailable && listing.audience ? (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600" title="Personas distintas en los últimos 30 días">
              <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4 text-[#58745f]" aria-hidden="true" /><b className="text-neutral-950">{listing.audience.views30.toLocaleString("es-BO")}</b> vistas</span>
              <span className="inline-flex items-center gap-1"><MessageCircle className="h-4 w-4 text-[#58745f]" aria-hidden="true" /><b className="text-neutral-950">{listing.audience.contacts30.toLocaleString("es-BO")}</b> WhatsApp</span>
              {visitCount !== null ? (
                <span className="inline-flex items-center gap-1"><CalendarCheck className="h-4 w-4 text-[#58745f]" aria-hidden="true" /><b className="text-neutral-950">{visitCount}</b> visita{visitCount === 1 ? "" : "s"}</span>
              ) : null}
            </p>
          ) : null}
          <div className="mt-2 hidden sm:block">
            <CompletenessBar percent={completeness} missing={suggestions.length} onShow={() => setMoreOpen(true)} />
          </div>
        </div>

        <div className="col-span-2 sm:hidden">
          <CompletenessBar percent={completeness} missing={suggestions.length} onShow={() => setMoreOpen(true)} />
        </div>

        <div className="col-span-2 grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-black/10 pt-3 sm:col-span-1 sm:col-start-2 sm:flex sm:flex-wrap">
          <button type="button" onClick={() => setIsEditing(true)} className={cardButton}>
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Editar
          </button>
          {live ? (
            <button type="button" onClick={() => setShareOpen(!shareOpen)} aria-expanded={shareOpen} className={cardButton}>
              <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Compartir
            </button>
          ) : (
            <span className="sm:hidden" />
          )}
          {live ? (
            <Link href={`/propiedades/${property.slug}`} className={`${cardButton.replace("inline-flex ", "")} hidden sm:inline-flex`}>
              Ver anuncio
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
          <button type="button" onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className={cardButton}>
            <span className="sr-only sm:not-sr-only">Más opciones</span>
            <ChevronDown className={`h-4 w-4 transition ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </div>

        <div className="col-span-2 grid min-w-0 gap-3 empty:hidden sm:col-span-1 sm:col-start-2">
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

          {notice ? <p role="status" className="text-sm font-semibold text-[#176b4d]">{notice}</p> : null}
          {error ? <p role="alert" className="auth-error">{error}</p> : null}

          {shareOpen && live ? <OwnerShareKit property={property} defaultOpen /> : null}

          {moreOpen ? (
            <>
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

              {live && property.rentalDetails ? (
                <LocationRow property={property} onVerify={() => setIsLocating(true)} />
              ) : null}

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

              {suggestions.length > 0 ? (
                <section className="owner-listing-tips" aria-label="Sugerencias privadas para este anuncio">
                  <h3><LockKeyhole size={15} aria-hidden="true" />Mejora tu anuncio <span>Solo visible para ti</span></h3>
                  <ul>{suggestions.map(suggestion => <li key={suggestion}>{suggestion}</li>)}</ul>
                </section>
              ) : null}

              <Link
                href={`/publicar?parecida=${encodeURIComponent(property.slug)}`}
                className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-[#176b4d] underline-offset-4 hover:underline"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Publicar otra unidad parecida
              </Link>
            </>
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

const cardButton =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950";

function CompletenessBar({ percent, missing, onShow }: { percent: number; missing: number; onShow: () => void }) {
  return (
    <div>
      <p className="text-xs text-neutral-600">
        Anuncio completo {percent}%
        {missing ? (
          <>
            {" · "}
            <button type="button" onClick={onShow} className="cursor-pointer font-semibold text-[#176b4d] underline underline-offset-2">
              ver qué falta
            </button>
          </>
        ) : null}
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Qué tan completo está el anuncio">
        <div className="h-full rounded-full bg-[#087c65]" style={{ width: `${percent}%` }} />
      </div>
    </div>
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
            <EditorField label={draft.type === "Local" ? "Tipo" : "Tipo de vivienda"}>
              <select
                value={draft.type}
                onChange={(event) => update("type", event.target.value as PropertyType)}
                disabled={draft.type === "Local"}
                className={inputClassName}
              >
                {/* A local stays a local and a home stays a home; Casa and Departamento can swap. */}
                {propertyTypeOptions.filter((option) => (option === "Local") === (draft.type === "Local")).map((option) => (
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

function MeasurementInfo() {
  return (
    <div className="mt-3 grid gap-2 text-sm leading-6 text-neutral-600">
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
    <div className="rounded-[22px] border border-dashed border-black/15 bg-white p-5">
      <p className="text-base font-semibold text-neutral-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{copy}</p>
      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-[12px] bg-[#176b4d] px-4 text-sm font-semibold text-white transition hover:bg-[#10533b]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
