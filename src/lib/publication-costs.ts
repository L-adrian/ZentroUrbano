import { parseCurrencyAmount } from "@/lib/currency";

export function getPublicationCosts(form: { price: string; commonExpenses: string; guarantee: string; guaranteeAmount: string }) {
  const rent = parseCurrencyAmount(form.price) ?? 0;
  const expenses = parseCurrencyAmount(form.commonExpenses) ?? 0;
  const deposit = form.guarantee === "Sin garantía" ? 0
    : form.guarantee === "1 mes de alquiler" ? rent
    : form.guarantee === "2 meses de alquiler" ? rent * 2
    : form.guarantee === "Otro monto" ? parseCurrencyAmount(form.guaranteeAmount)
    : null;
  return { monthly: rent + expenses, deposit, entry: deposit === null ? null : rent + expenses + deposit };
}
