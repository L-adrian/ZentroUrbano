"use client";

import { useSyncExternalStore } from "react";
import {
  currencyPreferenceEventName,
  currencyPreferenceStorageKey,
  defaultDisplayCurrency,
  formatPriceInCurrency,
  getCurrencyLabel,
  isDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/currency";
import type { Property } from "@/lib/properties";

type PriceDisplayProps = {
  property: Pick<Property, "currency" | "price" | "operation" | "exchangeRate">;
  className?: string;
  showPeriod?: boolean;
};

type CurrencySelectorProps = {
  className?: string;
};

const displayCurrencyOptions: Array<{ value: DisplayCurrency; label: string; helper: string }> = [
  { value: "USD", label: "$us", helper: "Dolares" },
  { value: "BOB", label: "Bs", helper: "Bolivianos" },
];

export function PriceDisplay({ property, className, showPeriod = true }: PriceDisplayProps) {
  const displayCurrency = useCurrencyPreference();

  return (
    <span className={className}>
      {formatPriceInCurrency(property, displayCurrency, showPeriod)}
    </span>
  );
}

export function CurrencySelector({ className }: CurrencySelectorProps) {
  const displayCurrency = useCurrencyPreference();

  return (
    <div
      className={`currency-selector ${className ?? ""}`}
      aria-label="Moneda para ver precios"
    >
      {displayCurrencyOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setCurrencyPreference(option.value)}
          aria-pressed={displayCurrency === option.value}
          title={option.helper}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function useCurrencyPreference() {
  return useSyncExternalStore(subscribeToCurrency, getCurrencySnapshot, () => defaultDisplayCurrency);
}

export function setCurrencyPreference(currency: DisplayCurrency) {
  if (typeof window === "undefined") {
    return;
  }

  try { window.localStorage.setItem(currencyPreferenceStorageKey, currency); } catch { /* Storage can be disabled. */ }
  window.dispatchEvent(new Event(currencyPreferenceEventName));
}

export function formatCurrentCurrencyLabel(currency: DisplayCurrency) {
  return getCurrencyLabel(currency);
}

function subscribeToCurrency(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(currencyPreferenceEventName, callback);
  window.addEventListener("focus", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(currencyPreferenceEventName, callback);
    window.removeEventListener("focus", callback);
  };
}

function getCurrencySnapshot() {
  if (typeof window === "undefined") {
    return defaultDisplayCurrency;
  }

  let storedCurrency: string | null = null;
  try { storedCurrency = window.localStorage.getItem(currencyPreferenceStorageKey); } catch { return defaultDisplayCurrency; }

  return isDisplayCurrency(storedCurrency) ? storedCurrency : defaultDisplayCurrency;
}
