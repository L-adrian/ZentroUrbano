import { getPropertyPriceInCurrency } from "@/lib/currency";
import type { Property } from "@/lib/properties";

// Zone price average, an optional filter the tenant turns on ("Bajo el promedio de la zona").
// Owner's decision: "que sea un filtro, no siempre". It is never shown on cards unless the
// tenant asked for it. Monthly rent in bolivianos, from the published listings only, and only
// for zones with at least 3 of them, so one expensive house never defines a whole zone.

export const zoneAverageMinListings = 3;

export type ZoneAverage = { zone: string; averageBob: number; count: number };
export type ZoneAverageComparison = ZoneAverage & { priceBob: number; differenceBob: number };

type PricedProperty = Pick<Property, "zone" | "price" | "currency" | "exchangeRate">;

export function getZoneAverages(properties: PricedProperty[], minListings = zoneAverageMinListings) {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const property of properties) {
    const price = getPropertyPriceInCurrency(property, "BOB");
    if (!property.zone || !Number.isFinite(price) || price <= 0) continue;
    const total = totals.get(property.zone) ?? { sum: 0, count: 0 };
    total.sum += price;
    total.count += 1;
    totals.set(property.zone, total);
  }
  const averages = new Map<string, ZoneAverage>();
  for (const [zone, { sum, count }] of totals) {
    if (count >= minListings) averages.set(zone, { zone, averageBob: Math.round(sum / count), count });
  }
  return averages;
}

// Null when the zone has no average (fewer than 3 listings).
export function compareWithZoneAverage(
  property: PricedProperty,
  averages: Map<string, ZoneAverage>,
): ZoneAverageComparison | null {
  const average = averages.get(property.zone);
  if (!average) return null;
  const priceBob = getPropertyPriceInCurrency(property, "BOB");
  return { ...average, priceBob, differenceBob: Math.round(average.averageBob - priceBob) };
}

export function isBelowZoneAverage(comparison: ZoneAverageComparison | null) {
  return Boolean(comparison && comparison.priceBob < comparison.averageBob);
}
