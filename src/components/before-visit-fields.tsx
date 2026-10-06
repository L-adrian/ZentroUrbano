"use client";

import { advanceMonthChoices, formatMonths, includedServiceOptions, minContractChoices, noServicesValue } from "@/lib/before-visit";

export type BeforeVisitFormValue = {
  availableFrom: string;
  minContractMonths: string;
  advanceMonths: string;
  includedServices: string[];
};

// "Antes de visitar" questions, shared by /publicar and the editor in Mi cuenta. All optional.
export function BeforeVisitFields({
  value,
  onChange,
  idPrefix,
  inputClassName,
  labelClassName = "text-sm font-semibold text-neutral-800",
  optionClassName = "inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700",
}: {
  value: BeforeVisitFormValue;
  onChange: <K extends keyof BeforeVisitFormValue>(field: K, next: BeforeVisitFormValue[K]) => void;
  idPrefix: string;
  inputClassName: string;
  labelClassName?: string;
  optionClassName?: string;
}) {
  const services = value.includedServices;
  const none = services.includes(noServicesValue);

  function toggleService(key: string, checked: boolean) {
    if (key === noServicesValue) onChange("includedServices", checked ? [noServicesValue] : []);
    else onChange("includedServices", checked ? [...services.filter((item) => item !== noServicesValue && item !== key), key] : services.filter((item) => item !== key));
  }

  return (
    <fieldset className="before-visit-fields grid min-w-0 gap-4 sm:grid-cols-3">
      <legend className={`${labelClassName} mb-1 sm:col-span-3`}>Antes de visitar (opcional)</legend>
      <p className="-mt-2 text-xs leading-5 text-neutral-600 sm:col-span-3">
        Lo que no indiques se verá como «Pendiente de consulta».
      </p>
      <label className="grid min-w-0 content-start gap-1.5">
        <span className={labelClassName}>Disponible desde</span>
        <input
          id={`${idPrefix}-available-from`}
          type="date"
          min="2020-01-01"
          max="2100-12-31"
          value={value.availableFrom}
          onChange={(event) => onChange("availableFrom", event.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="grid min-w-0 content-start gap-1.5">
        <span className={labelClassName}>Contrato mínimo</span>
        <select value={value.minContractMonths} onChange={(event) => onChange("minContractMonths", event.target.value)} className={inputClassName}>
          <option value="">Sin indicar</option>
          {withCurrent(minContractChoices, value.minContractMonths).map((months) => (
            <option key={months} value={String(months)}>{formatMonths(months)}</option>
          ))}
        </select>
      </label>
      <label className="grid min-w-0 content-start gap-1.5">
        <span className={labelClassName}>Adelanto</span>
        <select value={value.advanceMonths} onChange={(event) => onChange("advanceMonths", event.target.value)} aria-describedby={`${idPrefix}-advance-help`} className={inputClassName}>
          <option value="">Sin indicar</option>
          {withCurrent(advanceMonthChoices, value.advanceMonths).map((months) => (
            <option key={months} value={String(months)}>{formatMonths(months)} de alquiler</option>
          ))}
        </select>
        <span id={`${idPrefix}-advance-help`} className="text-xs text-neutral-600">Meses que se pagan por adelantado, aparte de la garantía.</span>
      </label>
      <div className="grid min-w-0 gap-1.5 sm:col-span-3" role="group" aria-labelledby={`${idPrefix}-services-label`}>
        <span id={`${idPrefix}-services-label`} className={labelClassName}>Servicios incluidos en el alquiler</span>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {includedServiceOptions.map(([key, label]) => (
            <label key={key} className={optionClassName}>
              <input type="checkbox" checked={services.includes(key)} onChange={(event) => toggleService(key, event.target.checked)} className="h-4 w-4 accent-[#176b4d]" />
              {label}
            </label>
          ))}
          <label className={optionClassName}>
            <input type="checkbox" checked={none} onChange={(event) => toggleService(noServicesValue, event.target.checked)} className="h-4 w-4 accent-[#176b4d]" />
            Ninguno
          </label>
        </div>
      </div>
    </fieldset>
  );
}

function withCurrent(choices: number[], current: string) {
  const value = Number(current);
  return Number.isInteger(value) && value > 0 && !choices.includes(value) ? [...choices, value].sort((a, b) => a - b) : choices;
}
