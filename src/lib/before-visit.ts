// "Antes de visitar" (F5): optional facts the owner can give in /publicar and in the editor.
// They live inside rental_details; listings and requests without them keep working.
// Nothing here is assumed: what the owner did not answer is shown as "Pendiente de consulta".

export const includedServiceOptions = [
  ["agua", "Agua"],
  ["luz", "Luz"],
  ["gas", "Gas"],
  ["internet", "Internet"],
  ["cable", "Cable"],
] as const;
export type IncludedService = (typeof includedServiceOptions)[number][0];
// Form-only marker for "the owner said no service is included"; stored as an empty list.
export const noServicesValue = "ninguno";

export type BeforeVisit = {
  availableFrom?: string; // YYYY-MM-DD, Bolivia's calendar day
  minContractMonths?: number;
  advanceMonths?: number; // months of rent paid in advance, apart from the guarantee
  includedServices?: IncludedService[]; // [] = no service included
};
export type BeforeVisitErrors = Partial<Record<keyof BeforeVisit, string>>;
export const beforeVisitFields = ["availableFrom", "minContractMonths", "advanceMonths", "includedServices"] as const;

export const minContractChoices = [1, 3, 6, 12, 24];
export const advanceMonthChoices = [1, 2, 3, 6, 12];
const maxContractMonths = 120;
const maxAdvanceMonths = 12;

const serviceKeys = includedServiceOptions.map(([key]) => key) as readonly string[];

function isBlank(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
}

function wholeNumber(value: unknown, min: number, max: number) {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

export function isCalendarDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2020 && year <= 2100 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Form and request input: strings from the wizard or the editor, numbers from older clients.
export function parseBeforeVisitInput(input: Record<string, unknown>): { values: BeforeVisit; errors: BeforeVisitErrors } {
  const values: BeforeVisit = {};
  const errors: BeforeVisitErrors = {};

  if (!isBlank(input.availableFrom)) {
    const day = typeof input.availableFrom === "string" ? input.availableFrom.trim() : input.availableFrom;
    if (isCalendarDay(day)) values.availableFrom = day;
    else errors.availableFrom = "Disponible desde: elige una fecha válida o deja el campo vacío.";
  }
  if (!isBlank(input.minContractMonths)) {
    const months = wholeNumber(input.minContractMonths, 1, maxContractMonths);
    if (months === null) errors.minContractMonths = `Contrato mínimo: indica entre 1 y ${maxContractMonths} meses, o deja el campo vacío.`;
    else values.minContractMonths = months;
  }
  if (!isBlank(input.advanceMonths)) {
    const months = wholeNumber(input.advanceMonths, 1, maxAdvanceMonths);
    if (months === null) errors.advanceMonths = `Adelanto: indica entre 1 y ${maxAdvanceMonths} meses de alquiler, o deja el campo vacío.`;
    else values.advanceMonths = months;
  }
  if (input.includedServices !== undefined && input.includedServices !== null) {
    const list = input.includedServices;
    if (!Array.isArray(list) || list.some((item) => typeof item !== "string" || (item !== noServicesValue && !serviceKeys.includes(item)))) {
      errors.includedServices = "Servicios incluidos: elige de la lista.";
    } else if (list.includes(noServicesValue) && list.length > 1) {
      errors.includedServices = "Servicios incluidos: marca los que incluye o «Ninguno», no los dos.";
    } else if (list.includes(noServicesValue)) {
      values.includedServices = [];
    } else if (list.length > 0) {
      // No box ticked means the owner did not answer, not "none".
      values.includedServices = serviceKeys.filter((key) => list.includes(key)) as IncludedService[];
    }
  }
  return { values, errors };
}

// Stored rental_details may come from older code or hand edits; anything malformed is unknown.
export function readBeforeVisit(details: unknown): BeforeVisit {
  if (!details || typeof details !== "object") return {};
  const source = details as Record<string, unknown>;
  const result: BeforeVisit = {};
  if (isCalendarDay(source.availableFrom)) result.availableFrom = source.availableFrom;
  const contract = wholeNumber(source.minContractMonths, 1, maxContractMonths);
  if (contract !== null) result.minContractMonths = contract;
  const advance = wholeNumber(source.advanceMonths, 1, maxAdvanceMonths);
  if (advance !== null) result.advanceMonths = advance;
  if (Array.isArray(source.includedServices) && source.includedServices.every((item) => typeof item === "string" && serviceKeys.includes(item))) {
    result.includedServices = serviceKeys.filter((key) => (source.includedServices as string[]).includes(key)) as IncludedService[];
  }
  return result;
}

// Values for the form fields (wizard and editor).
export function beforeVisitFormValues(details: unknown) {
  const known = readBeforeVisit(details);
  return {
    availableFrom: known.availableFrom ?? "",
    minContractMonths: known.minContractMonths ? String(known.minContractMonths) : "",
    advanceMonths: known.advanceMonths ? String(known.advanceMonths) : "",
    includedServices: known.includedServices === undefined ? [] : known.includedServices.length === 0 ? [noServicesValue] : [...known.includedServices],
  };
}

const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function formatCalendarDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${day} ${monthNames[month - 1]} ${year}`;
}

export function formatMonths(months: number) {
  if (months >= 12 && months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? "año" : "años"}`;
  }
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}

// "Agua, luz e internet": Spanish uses "e" before a word that starts with the "i" sound.
export function formatServiceList(services: readonly IncludedService[]) {
  const labels = services.map((key, index) => {
    const label = includedServiceOptions.find(([value]) => value === key)?.[1] ?? key;
    return index === 0 ? label : label.toLocaleLowerCase("es");
  });
  if (labels.length <= 1) return labels[0] ?? "";
  const last = labels[labels.length - 1];
  return `${labels.slice(0, -1).join(", ")}${/^h?i(?![aeiouáéíóú])/i.test(last) ? " e " : " y "}${last}`;
}

export type BeforeVisitRow = { label: string; value: string | null };

// Rows for the listing page; null when the owner gave none of the four facts.
export function beforeVisitRows(details: unknown): BeforeVisitRow[] | null {
  const known = readBeforeVisit(details);
  if (Object.keys(known).length === 0) return null;
  return [
    { label: "Disponible desde", value: known.availableFrom ? formatCalendarDay(known.availableFrom) : null },
    { label: "Contrato mínimo", value: known.minContractMonths ? formatMonths(known.minContractMonths) : null },
    { label: "Adelanto", value: known.advanceMonths ? `${formatMonths(known.advanceMonths)} de alquiler` : null },
    {
      label: "Servicios incluidos",
      value: known.includedServices === undefined ? null : known.includedServices.length === 0 ? "Ninguno" : formatServiceList(known.includedServices),
    },
  ];
}

// JSON merge patch for the editor: every field is sent, so a cleared field goes back to
// "Pendiente de consulta" (null removes the key) and nothing else in rental_details changes.
export function beforeVisitPatch(values: BeforeVisit) {
  return {
    availableFrom: values.availableFrom ?? null,
    minContractMonths: values.minContractMonths ?? null,
    advanceMonths: values.advanceMonths ?? null,
    includedServices: values.includedServices ?? null,
  };
}

// The same change applied to a copy already in memory (Mi cuenta after saving).
export function withBeforeVisit<T extends object>(details: T, values: BeforeVisit): T {
  const next = { ...details } as Record<string, unknown>;
  for (const field of beforeVisitFields) delete next[field];
  return { ...next, ...values } as T;
}

// Plain lines for the request text the admin reads.
export function beforeVisitSummary(values: BeforeVisit) {
  return beforeVisitRows(values)?.map((row) => `${row.label}: ${row.value ?? "sin indicar"}`) ?? [];
}
