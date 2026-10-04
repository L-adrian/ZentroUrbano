import { parseCurrencyAmount } from "@/lib/currency";
import type { Property } from "@/lib/properties";
import { getPublicationCosts } from "@/lib/publication-costs";

// Facts shared by listing cards and the listing page, so both always agree.

export function getAvailabilityDays(property: Pick<Property, "availabilityConfirmedAt">, now = Date.now()) {
  if (!property.availabilityConfirmedAt) return null;
  const confirmedAt = new Date(property.availabilityConfirmedAt).getTime();
  if (!Number.isFinite(confirmedAt)) return null;
  return Math.max(0, Math.floor((now - confirmedAt) / 86_400_000));
}

// Product rule: a confirmation is valid for 21 days, or until 5 people report
// that the home is no longer available. After that the listing asks tenants to check first.
export const availabilityFreshDays = 21;
export const availabilityReportLimit = 5;

export type AvailabilityState = {
  fresh: boolean;
  reason: "confirmed" | "old" | "missing" | "reported";
  days: number | null;
  label: string;
  detail: string;
  shortLabel: string;
};

export function getAvailabilityState(
  property: Pick<Property, "availabilityConfirmedAt" | "availabilityReports">,
  now = Date.now(),
): AvailabilityState {
  const days = getAvailabilityDays(property, now);
  const when = days === null ? "" : days === 0 ? "hoy" : `hace ${days} ${days === 1 ? "día" : "días"}`;
  if ((property.availabilityReports ?? 0) >= availabilityReportLimit) {
    return {
      fresh: false,
      reason: "reported",
      days,
      label: "Disponibilidad por confirmar",
      detail: "Varias personas avisaron que ya no estaría disponible. Pregunta antes de ir.",
      shortLabel: "Por confirmar",
    };
  }
  if (days === null) {
    return {
      fresh: false,
      reason: "missing",
      days,
      label: "Disponibilidad por confirmar",
      detail: "Pregunta si sigue disponible antes de ir.",
      shortLabel: "Por confirmar",
    };
  }
  if (days > availabilityFreshDays) {
    return {
      fresh: false,
      reason: "old",
      days,
      label: "Disponibilidad por confirmar",
      detail: `El dueño la confirmó ${when}. Pregunta si sigue disponible antes de ir.`,
      shortLabel: "Por confirmar",
    };
  }
  return {
    fresh: true,
    reason: "confirmed",
    days,
    label: "Disponible",
    detail: `Confirmado ${when}`,
    shortLabel: `Disponible · ${when}`,
  };
}

export function getGuaranteeLabel(property: Pick<Property, "requirements">) {
  const requirement = property.requirements.find((item) => /garant[ií]a/i.test(item));
  if (!requirement) return "Consultar";
  if (/sin garant[ií]a/i.test(requirement)) return "Sin garantía";
  if (/2\s*mes/i.test(requirement)) return "2 meses";
  if (/1\s*mes|un mes|equivalente a un mes/i.test(requirement)) return "1 mes";
  return "Consultar";
}

export type EntryCost = { rent: number; expenses: number; deposit: number; total: number };

// What a tenant pays at signing: first month (with expenses) plus the guarantee. Null when unknown.
export function getEntryCost(property: Pick<Property, "price" | "rentalDetails" | "requirements">): EntryCost | null {
  const details = property.rentalDetails;
  if (details) {
    const costs = getPublicationCosts({
      price: String(property.price),
      commonExpenses: String(details.commonExpenses),
      guarantee: details.guarantee,
      guaranteeAmount: details.guaranteeAmount === null ? "" : String(details.guaranteeAmount),
    });
    if (costs.deposit === null || costs.entry === null) return null;
    return { rent: property.price, expenses: costs.monthly - property.price, deposit: costs.deposit, total: costs.entry };
  }
  const guarantee = getGuaranteeLabel(property);
  const months = guarantee === "Sin garantía" ? 0 : guarantee === "1 mes" ? 1 : guarantee === "2 meses" ? 2 : null;
  if (months === null) return null;
  return { rent: property.price, expenses: 0, deposit: property.price * months, total: property.price * (months + 1) };
}

// Rent plus common expenses per month, in the listing's currency. Null when the owner did not say
// what the expenses are ("pendiente de consulta").
export function getMonthlyCost(property: Pick<Property, "price" | "rentalDetails" | "requirements">): number | null {
  const expenses = property.rentalDetails?.commonExpenses;
  if (property.rentalDetails) {
    return typeof expenses === "number" && Number.isFinite(expenses) && expenses >= 0 ? property.price + expenses : null;
  }
  const line = property.requirements.find((item) => /expensas/i.test(item));
  if (!line) return null;
  if (/incluid|sin expensas|no se cobra/i.test(line)) return property.price;
  const amount = parseCurrencyAmount(/(\d[\d.,\s]*\d|\d)/.exec(line)?.[1]?.trim());
  return amount === null ? null : property.price + amount;
}

// Confirmed amenities only; "unknown" is never shown as a tag.
export function getListingHighlights(property: Property, limit = 3) {
  return [
    property.pets ? "Acepta mascotas" : null,
    property.garage > 0 ? "Parqueo" : null,
    property.furnished ? "Amoblado" : null,
    property.pool ? "Piscina" : null,
    property.patio ? "Patio" : null,
    property.security ? "Seguridad" : null,
    property.grill ? "Churrasquera" : null,
  ].filter((value): value is string => Boolean(value)).slice(0, limit);
}
