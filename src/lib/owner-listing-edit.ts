import { normalizePublicationPhone } from "@/lib/publication-input";

// Hosts next/image can render (next.config.mjs remotePatterns); other hosts would break the listing page.
const remoteImageHost = /^https:\/\/(images\.unsplash\.com|lh[3-6]\.googleusercontent\.com)\//;

export function allowedOwnerImage(value: string, currentImages: unknown[]) {
  return value.startsWith("/images/") || value.startsWith("/media/propiedades/") || remoteImageHost.test(value) || currentImages.includes(value);
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
  const phone = normalizePublicationPhone(next);
  if (phone) return phone;
  if (/^[+\d\s()-]{6,24}$/.test(next.trim())) return next.trim();
  return /^https:\/\/wa\.me\/\d{6,20}(\?[^\s]*)?$/.test(next.trim()) ? next.trim() : undefined;
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
