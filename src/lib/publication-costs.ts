export function getPublicationCosts(form: { price: string; commonExpenses: string; guarantee: string; guaranteeAmount: string }) {
  const rent = Math.max(0, Number(form.price) || 0);
  const expenses = Math.max(0, Number(form.commonExpenses) || 0);
  const deposit = form.guarantee === "Sin garantía" ? 0
    : form.guarantee === "1 mes de alquiler" ? rent
    : form.guarantee === "2 meses de alquiler" ? rent * 2
    : form.guarantee === "Otro monto" && form.guaranteeAmount.trim() !== "" ? Math.max(0, Number(form.guaranteeAmount) || 0)
    : null;
  return { monthly: rent + expenses, deposit, entry: deposit === null ? null : rent + expenses + deposit };
}
