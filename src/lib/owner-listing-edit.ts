import { normalizePublicationPhone } from "@/lib/publication-input";

// Editing a published listing can reorder or remove its reviewed photos, never add others: new photos
// (or another listing's photos) go through a new request and review.
export function allowedOwnerImage(value: string, currentImages: unknown[]) {
  return currentImages.includes(value);
}

export function parseJsonArray(value: unknown): unknown[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// The contact button redirects to this value, so owners may only set a phone number or a wa.me link.
// A value already stored (for example a curated listing's original ad) is kept as is.
export function ownerWhatsapp(value: unknown, current: string | null) {
  const next = nullableText(value);
  if (next === null || next === current) return next;
  // Only Bolivian mobile numbers: a landline or a number without the country code would send
  // tenants to another country on WhatsApp (33456789 opens a French number).
  const link = /^https:\/\/wa\.me\/(\d{6,20})(\?[^\s]*)?$/.exec(next.trim());
  return normalizePublicationPhone(link ? link[1] : next) ?? undefined;
}

export function ownerMapUrl(value: unknown, current: string | null) {
  const next = nullableText(value);
  if (next === null || next === current) return next;
  try {
    return new URL(next).protocol === "https:" ? next : undefined;
  } catch {
    return undefined;
  }
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
