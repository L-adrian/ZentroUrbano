// Lists kept only on this phone or computer (localStorage): saved homes, recently viewed homes and
// the time of the last visit (for the "Nuevo" label). No account, nothing is sent anywhere.
// Storage can be disabled or full (private mode, blocked site data), so every access is wrapped in
// try/catch and the pages work the same without it.

export const savedListingsKey = "zu-guardados";
export const recentListingsKey = "zu-vistos";
export const lastVisitKey = "zu-visita";
export const localListsEventName = "zu-local-lists";

export const savedListingsLimit = 50;
export const recentListingsLimit = 12;
// "Vistos recientemente" forgets a home a week after it was last opened, so the list does not grow old.
export const recentListingsMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
// A new visit starts after 30 minutes away; "Nuevo" marks homes published after the last moment
// of the previous visit.
export const visitGapMs = 30 * 60 * 1000;

export type SavedListing = { slug: string; title: string; savedAt: number };
export type RecentListing = { slug: string; viewedAt: number };
export type VisitState = { previous: number | null; lastSeen: number };

const slugPattern = /^[a-z0-9-]{1,200}$/;

function parseArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseSavedListings(raw: string | null | undefined): SavedListing[] {
  const seen = new Set<string>();
  return parseArray(raw).flatMap((item) => {
    if (!isRecord(item) || typeof item.slug !== "string" || !slugPattern.test(item.slug) || seen.has(item.slug)) return [];
    seen.add(item.slug);
    return [{
      slug: item.slug,
      title: typeof item.title === "string" ? item.title.slice(0, 220) : "",
      savedAt: typeof item.savedAt === "number" && Number.isFinite(item.savedAt) ? item.savedAt : 0,
    }];
  }).slice(0, savedListingsLimit);
}

// With "now", homes opened more than a week before it are left out.
export function parseRecentListings(raw: string | null | undefined, now?: number): RecentListing[] {
  const seen = new Set<string>();
  return parseArray(raw).flatMap((item) => {
    if (!isRecord(item) || typeof item.slug !== "string" || !slugPattern.test(item.slug) || seen.has(item.slug)) return [];
    seen.add(item.slug);
    const viewedAt = typeof item.viewedAt === "number" && Number.isFinite(item.viewedAt) ? item.viewedAt : 0;
    if (now !== undefined && viewedAt < now - recentListingsMaxAgeMs) return [];
    return [{ slug: item.slug, viewedAt }];
  }).slice(0, recentListingsLimit);
}

// Newest first; saving again keeps a single entry.
export function toggleSavedListing(list: SavedListing[], listing: { slug: string; title: string }, now: number) {
  if (list.some((item) => item.slug === listing.slug)) return list.filter((item) => item.slug !== listing.slug);
  return [{ slug: listing.slug, title: listing.title.slice(0, 220), savedAt: now }, ...list].slice(0, savedListingsLimit);
}

export function addRecentListing(list: RecentListing[], slug: string, now: number) {
  if (!slugPattern.test(slug)) return list;
  return [{ slug, viewedAt: now }, ...list.filter((item) => item.slug !== slug && item.viewedAt >= now - recentListingsMaxAgeMs)]
    .slice(0, recentListingsLimit);
}

export function parseVisitState(raw: string | null | undefined): VisitState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || typeof value.lastSeen !== "number" || !Number.isFinite(value.lastSeen)) return null;
    const previous = typeof value.previous === "number" && Number.isFinite(value.previous) ? value.previous : null;
    return { previous, lastSeen: value.lastSeen };
  } catch {
    return null;
  }
}

// First visit ever: no "previous", so nothing is labeled "Nuevo" (everything would be).
export function rollVisit(state: VisitState | null, now: number, gapMs = visitGapMs): VisitState {
  if (!state) return { previous: null, lastSeen: now };
  if (now - state.lastSeen > gapMs) return { previous: state.lastSeen, lastSeen: now };
  return { previous: state.previous, lastSeen: now };
}

export function isNewSinceVisit(publishedAt: string | null | undefined, previousVisit: number | null) {
  if (!publishedAt || previousVisit === null) return false;
  const published = Date.parse(publishedAt);
  return Number.isFinite(published) && published > previousVisit;
}

// Browser access. Snapshots are the raw stored strings, which React can compare as they are.

export function readLocalList(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalList(key: string, value: string) {
  if (typeof window === "undefined") return false;
  let stored = false;
  try {
    window.localStorage.setItem(key, value);
    stored = true;
  } catch {
    stored = false;
  }
  window.dispatchEvent(new Event(localListsEventName));
  return stored;
}

export function subscribeLocalLists(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(localListsEventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localListsEventName, callback);
  };
}

let visitBaseline: number | null | undefined;

// Last moment of the previous visit, computed once per page load (the visit is rolled forward here).
export function getPreviousVisit(): number | null {
  if (typeof window === "undefined") return null;
  if (visitBaseline !== undefined) return visitBaseline;
  const next = rollVisit(parseVisitState(readLocalList(lastVisitKey)), Date.now());
  try {
    window.localStorage.setItem(lastVisitKey, JSON.stringify(next));
  } catch {
    // Without storage every visit is a first visit: nothing is labeled "Nuevo".
  }
  visitBaseline = next.previous;
  return visitBaseline;
}
