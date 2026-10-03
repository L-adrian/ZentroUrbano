import type { Property } from "@/lib/properties";
import { getPublicationCosts } from "@/lib/publication-costs";

// Facts shared by listing cards and the listing page, so both always agree.

export function getAvailabilityDays(property: Pick<Property, "availabilityConfirmedAt">, now = Date.now()) {
  if (!property.availabilityConfirmedAt) return null;
  const confirmedAt = new Date(property.availabilityConfirmedAt).getTime();
  if (!Number.isFinite(confirmedAt)) return null;
  return Math.max(0, Math.floor((now - confirmedAt) / 86_400_000));
}

export function getAvailabilityLabel(property: Pick<Property, "availabilityConfirmedAt">, now = Date.now()) {
  const days = getAvailabilityDays(property, now);
  if (days === null) return "Confirma disponibilidad antes de visitar";
  if (days === 0) return "Confirmado hoy";
  return `Confirmado hace ${days} ${days === 1 ? "día" : "días"}`;
}

// Short form for cards. Only recent confirmations are advertised; older ones stay on the listing page.
export function getAvailabilityShortLabel(property: Pick<Property, "availabilityConfirmedAt">, now = Date.now()) {
  const days = getAvailabilityDays(property, now);
  if (days === null || days > 30) return null;
  if (days === 0) return "hoy";
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
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
