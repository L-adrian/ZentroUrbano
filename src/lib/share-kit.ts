import { formatPriceInCurrency } from "@/lib/currency";
import { getEntryCost } from "@/lib/listing-summary";
import type { Property } from "@/lib/properties";
import { absoluteUrl } from "@/lib/site";

// Mi cuenta, "Comparte tu anuncio" (P12): ready-made text the owner pastes in Facebook or WhatsApp.
// Only what the listing says; the entry cost line is left out when it is not known.

type ShareProperty = Pick<Property, "slug" | "type" | "zone" | "price" | "currency" | "exchangeRate" | "operation" | "rentalDetails" | "requirements">;

export function sharedListingPath(slug: string) {
  return `/propiedades/${slug}?desde=compartido`;
}

export function shareImagePath(slug: string) {
  return `/propiedades/${slug}/opengraph-image`;
}

export function ownerShareText(property: ShareProperty, url = absoluteUrl(sharedListingPath(property.slug))) {
  const kind = (property.rentalDetails?.type ?? property.type).toLocaleLowerCase("es");
  const money = (amount: number, period = false) => formatPriceInCurrency({ ...property, price: amount }, property.currency, period);
  const entry = getEntryCost(property);
  const entryParts = entry
    ? [
        entry.advanceMonths ? `${entry.advanceMonths} meses de adelanto` : "primer mes",
        entry.expenses > 0 ? "expensas" : null,
        entry.deposit > 0 ? "garantía" : null,
      ].filter(Boolean) as string[]
    : [];
  const entryDetail = entryParts.length > 1 ? `${entryParts.slice(0, -1).join(", ")} y ${entryParts[entryParts.length - 1]}` : entryParts[0];
  return [
    `Alquilo ${kind} en ${property.zone}.`,
    `Alquiler: ${money(property.price, true)}.`,
    entry ? `Para entrar: ${money(entry.total)} (${entryDetail}).` : null,
    "Trato directo conmigo, sin comisión.",
    `Fotos y datos: ${url}`,
  ].filter(Boolean).join("\n");
}
