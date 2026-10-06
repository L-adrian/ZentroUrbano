"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  addRecentListing,
  getPreviousVisit,
  parseRecentListings,
  parseSavedListings,
  readLocalList,
  recentListingsKey,
  savedListingsKey,
  subscribeLocalLists,
  toggleSavedListing,
  writeLocalList,
} from "@/lib/local-lists";

const noSubscription = () => () => {};
const serverSnapshot = () => null;

function useStoredString(key: string) {
  const getSnapshot = useCallback(() => readLocalList(key), [key]);
  return useSyncExternalStore(subscribeLocalLists, getSnapshot, serverSnapshot);
}

export function useSavedListings() {
  const raw = useStoredString(savedListingsKey);
  return useMemo(() => parseSavedListings(raw), [raw]);
}

export function useRecentListings() {
  const raw = useStoredString(recentListingsKey);
  // Homes opened more than a week ago are removed from the phone once the list is shown.
  useEffect(() => {
    if (!raw) return;
    const fresh = JSON.stringify(parseRecentListings(raw, Date.now()));
    if (fresh !== JSON.stringify(parseRecentListings(raw))) writeLocalList(recentListingsKey, fresh);
  }, [raw]);
  return useMemo(() => parseRecentListings(raw), [raw]);
}

// Null on the server and during hydration, so "Nuevo" never causes a hydration mismatch.
export function usePreviousVisit() {
  return useSyncExternalStore(noSubscription, getPreviousVisit, serverSnapshot);
}

// Returns whether the home is saved after the change (false when storage is not available).
export function toggleSavedListingInStorage(listing: { slug: string; title: string }) {
  const next = toggleSavedListing(parseSavedListings(readLocalList(savedListingsKey)), listing, Date.now());
  const stored = writeLocalList(savedListingsKey, JSON.stringify(next));
  return stored && next.some((item) => item.slug === listing.slug);
}

export function removeSavedListingFromStorage(slug: string) {
  const next = parseSavedListings(readLocalList(savedListingsKey)).filter((item) => item.slug !== slug);
  writeLocalList(savedListingsKey, JSON.stringify(next));
}

export function recordRecentListing(slug: string) {
  writeLocalList(recentListingsKey, JSON.stringify(addRecentListing(parseRecentListings(readLocalList(recentListingsKey)), slug, Date.now())));
}
