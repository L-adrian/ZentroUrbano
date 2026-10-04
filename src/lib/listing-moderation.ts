import { availabilityFreshDays, getAvailabilityState, type AvailabilityState } from "@/lib/listing-summary";
import { reportReasonPriority, type ReportReason } from "@/lib/property-reports";
import type { Property } from "@/lib/properties";

// Shared by Mi cuenta, the admin panel and their routes. No database access here.

// client_account_properties.status: "active" (published), "rented" and "paused" (hidden, never deleted),
// "review" (the owner asked to publish it again; an admin must approve), "closed" (out of every panel).
export type OwnerListingStatus = "live" | "rented" | "paused" | "review";

export function ownerListingStatus(accountStatus: string, published: boolean): OwnerListingStatus {
  if (accountStatus === "review") return "review";
  if (published) return "live";
  return accountStatus === "rented" ? "rented" : "paused";
}

export const ownerListingStatusLabels: Record<OwnerListingStatus, string> = {
  live: "Publicado",
  rented: "Alquilado · oculto",
  paused: "Pausado · oculto",
  review: "En revisión",
};

// Owners are asked a few days before the 21-day confirmation runs out.
export const availabilityReminderDays = 18;

export type AvailabilityPrompt = {
  state: AvailabilityState;
  ask: boolean;
  urgent: boolean;
  message: string;
};

export function availabilityPrompt(
  property: Pick<Property, "availabilityConfirmedAt" | "availabilityReports">,
  now = Date.now(),
): AvailabilityPrompt {
  const state = getAvailabilityState(property, now);
  if (!state.fresh) {
    const message = state.reason === "reported"
      ? "Varias personas avisaron que ya no estaría disponible. Si sigue libre, confírmalo; si no, márcalo como alquilado."
      : "Tu anuncio muestra \"Disponibilidad por confirmar\". Si sigue libre, confírmalo para que vuelva a verse disponible.";
    return { state, ask: true, urgent: true, message };
  }
  const days = state.days ?? 0;
  if (days >= availabilityReminderDays) {
    const left = Math.max(0, availabilityFreshDays - days);
    return {
      state,
      ask: true,
      urgent: false,
      message: left === 0
        ? "Hoy vence tu confirmación. ¿Sigue disponible?"
        : `En ${left} ${left === 1 ? "día" : "días"} vence tu confirmación. ¿Sigue disponible?`,
    };
  }
  return { state, ask: false, urgent: false, message: "" };
}

// Mi cuenta keeps a request in view while it is pending and for 45 days after the decision.
export const recentRequestDays = 45;

export function recentOwnerRequests<T extends { status: string; createdAt: string; reviewedAt?: string | null }>(requests: T[], now = Date.now()) {
  return requests.filter((request) => {
    if (request.status === "pending_review") return true;
    const decidedAt = new Date(request.reviewedAt ?? request.createdAt).getTime();
    return Number.isFinite(decidedAt) && now - decidedAt < recentRequestDays * 86_400_000;
  });
}

// Hidden listings are not served by the public photo route, so their owner gets a private copy.
export function ownerPhotoSrc(src: string, published: boolean) {
  const match = /^\/media\/propiedades\/(publication_[a-f0-9]{24})\/(\d{2}\.(?:jpg|png|webp))$/.exec(src);
  return match && !published ? `/api/cliente/fotos/${match[1]}/${match[2]}` : src;
}

// Gallery order editing: the first photo is the cover.
export function movePhoto(images: string[], index: number, offset: -1 | 1) {
  const target = index + offset;
  if (index < 0 || index >= images.length || target < 0 || target >= images.length) return images;
  const next = [...images];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function moveToCover(images: string[], index: number) {
  if (index <= 0 || index >= images.length) return images;
  return [images[index], ...images.slice(0, index), ...images.slice(index + 1)];
}

// The short text stays derived from the description when it was derived before.
export function nextShortDescription(previous: { shortDescription: string; longDescription: string }, longDescription: string) {
  const derived = previous.shortDescription.trim() === previous.longDescription.trim().slice(0, 240).trim();
  return derived ? longDescription.trim().slice(0, 240) : previous.shortDescription;
}

export type ReportedListing = { reasons: Partial<Record<ReportReason, number>>; total: number; lastAt: string };

// Possible scams first, then the listing with more people reporting, then the newest.
export function sortReportedListings<T extends ReportedListing>(items: T[]) {
  const rank = (item: T) => {
    const index = reportReasonPriority.findIndex((reason) => (item.reasons[reason] ?? 0) > 0);
    return index === -1 ? reportReasonPriority.length : index;
  };
  return [...items].sort((a, b) => rank(a) - rank(b) || b.total - a.total || b.lastAt.localeCompare(a.lastAt));
}

// A wa.me link the admin opens by hand; nothing is sent automatically.
export function ownerWhatsappLink(value: string | null | undefined, message: string) {
  const text = encodeURIComponent(message);
  if (!value) return null;
  const link = /^https:\/\/wa\.me\/(\d{6,20})/.exec(value.trim());
  const digits = link ? link[1] : value.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}?text=${text}` : null;
}

const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Bolivia is UTC-4 all year; formatting by hand keeps server and browser output identical.
export function formatBoliviaDay(value: string | null | undefined) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  if (!Number.isFinite(time)) return "fecha desconocida";
  const local = new Date(time - 4 * 3_600_000);
  return `${local.getUTCDate()} ${monthNames[local.getUTCMonth()]} ${local.getUTCFullYear()}`;
}
