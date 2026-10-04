import { parseCurrencyAmount } from "@/lib/currency";

// Months of rent paid in advance ("Adelanto"); without an answer, the first month as always.
export function advanceRentMonths(value: unknown) {
  const months = typeof value === "number" ? value : typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(months) && months >= 1 && months <= 12 ? months : 1;
}

export function getPublicationCosts(form: { price: string; commonExpenses: string; guarantee: string; guaranteeAmount: string; advanceMonths?: string | number | null }) {
  const rent = parseCurrencyAmount(form.price) ?? 0;
  const expenses = parseCurrencyAmount(form.commonExpenses) ?? 0;
  const deposit = form.guarantee === "Sin garantía" ? 0
    : form.guarantee === "1 mes de alquiler" ? rent
    : form.guarantee === "2 meses de alquiler" ? rent * 2
    : form.guarantee === "Otro monto" ? parseCurrencyAmount(form.guaranteeAmount)
    : null;
  const rentMonths = advanceRentMonths(form.advanceMonths);
  return { monthly: rent + expenses, deposit, entry: deposit === null ? null : rent * rentMonths + expenses + deposit };
}
