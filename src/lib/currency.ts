import type { Property } from "@/lib/properties";

export type DisplayCurrency = Property["currency"];

export const currencyExchangeRateBobPerUsd = 7;
export const maxPropertyExchangeRate = 1000;

export function parsePropertyExchangeRate(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+(?:[.,]\d{1,4})?$/.test(value.trim())) return null;
  const rate = typeof value === "string" ? Number(value.trim().replace(",", ".")) : value;
  if (!Number.isFinite(rate) || rate <= 0 || rate > maxPropertyExchangeRate) return null;
  const rounded = Math.round(rate * 10000) / 10000;
  return rounded > 0 ? rounded : null;
}

export function getPropertyExchangeRate(property: Pick<Property, "currency" | "exchangeRate">) {
  return property.currency === "USD"
    ? parsePropertyExchangeRate(property.exchangeRate) ?? currencyExchangeRateBobPerUsd
    : currencyExchangeRateBobPerUsd;
}
export const defaultDisplayCurrency: DisplayCurrency = "USD";
export const currencyPreferenceStorageKey = "morada.displayCurrency";
export const currencyPreferenceEventName = "morada-currency";

export function isDisplayCurrency(value: string | null): value is DisplayCurrency {
  return value === "USD" || value === "BOB";
}

export function convertPrice(
  amount: number,
  fromCurrency: DisplayCurrency,
  toCurrency: DisplayCurrency,
  exchangeRate = currencyExchangeRateBobPerUsd,
) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (fromCurrency === "USD") {
    return amount * (parsePropertyExchangeRate(exchangeRate) ?? currencyExchangeRateBobPerUsd);
  }

  return amount / (parsePropertyExchangeRate(exchangeRate) ?? currencyExchangeRateBobPerUsd);
}

export function getPropertyPriceInCurrency(
  property: Pick<Property, "currency" | "price" | "exchangeRate">,
  displayCurrency: DisplayCurrency,
) {
  return convertPrice(property.price, property.currency, displayCurrency, getPropertyExchangeRate(property));
}

export function formatPriceInCurrency(
  property: Pick<Property, "currency" | "price" | "operation" | "exchangeRate">,
  displayCurrency: DisplayCurrency,
  showPeriod = true,
) {
  const convertedPrice = getPropertyPriceInCurrency(property, displayCurrency);
  const amount = new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 0,
  }).format(convertedPrice);
  const prefix = displayCurrency === "USD" ? "$us" : "Bs";
  const suffix = showPeriod && property.operation === "Alquiler" ? "/mes" : "";

  return `${prefix} ${amount}${suffix}`;
}

export function getCurrencyLabel(currency: DisplayCurrency) {
  return currency === "USD" ? "$us" : "Bs";
}
