import { formatPriceInCurrency, type DisplayCurrency } from "@/lib/currency";
import { getAvailabilityState, getEntryCost } from "@/lib/listing-summary";
import type { Property } from "@/lib/properties";
import { absoluteUrl } from "@/lib/site";

export function getAvailabilityLine(property: Pick<Property, "availabilityConfirmedAt" | "availabilityReports">, now = Date.now()) {
  const availability = getAvailabilityState(property, now);
  return availability.fresh ? `Disponible · ${availability.detail}` : availability.detail;
}

// Text for "Enviar la lista por WhatsApp" (a manual https://wa.me/?text=… link, no number).
export function buildSavedListMessage(properties: Property[], currency: DisplayCurrency, now = Date.now()) {
  const lines = properties.map((property, index) => {
    const entry = getEntryCost(property);
    const entryText = entry ? formatPriceInCurrency({ ...property, price: entry.total }, currency, false) : "a consultar";
    return [
      `${index + 1}. ${property.title} (${property.zone})`,
      `${formatPriceInCurrency(property, currency)} · Para entrar: ${entryText}`,
      getAvailabilityLine(property, now),
      absoluteUrl(`/propiedades/${property.slug}`),
    ].join("\n");
  });
  return `Mis alquileres guardados en Zentro Urbano:\n\n${lines.join("\n\n")}`;
}

export function savedListWhatsappUrl(properties: Property[], currency: DisplayCurrency, now = Date.now()) {
  return `https://wa.me/?text=${encodeURIComponent(buildSavedListMessage(properties, currency, now))}`;
}
