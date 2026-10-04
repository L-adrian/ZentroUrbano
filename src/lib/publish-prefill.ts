import { beforeVisitFormValues } from "@/lib/before-visit";
import { photoCategories } from "@/lib/photo-quality";
import type { Property } from "@/lib/properties";
import type { PetsPolicy, PublicationDetails } from "@/lib/publication-input";

// /publicar opened from Mi cuenta with data already loaded:
// - "Corregir y reenviar" (P8): everything the owner sent, photos included, to fix and send again.
// - "Publicar otra unidad parecida" (P11): the building's data; title, price and photos stay empty.
// Values use the wizard's own field names and text format; the wizard checks them like a saved draft.

export type PrefillFormValues = Record<string, string | boolean | string[]>;
export type PrefillPhoto = { url: string; name: string; category: string };
export type PublishPrefill = {
  // Part of the browser draft key, so a prefilled form never overwrites the regular draft.
  id: string;
  kind: "correction" | "similar";
  sourceTitle: string;
  requestId?: string;
  reason?: string | null;
  form: PrefillFormValues;
  photos: PrefillPhoto[];
};

// The guarantee choices the wizard offers; anything else is asked again.
const wizardGuarantees = ["Sin garantía", "1 mes de alquiler", "2 meses de alquiler", "Otro monto"];
const categoryValues = new Set<string>(photoCategories.map((category) => category.value));

function amount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}

function optionalCount(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

// Stored as 591XXXXXXXX; the form shows the 8 local digits.
export function localPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  return /^591[67]\d{7}$/.test(digits) ? digits.slice(3) : (value ?? "");
}

function petsFields(policy: PetsPolicy | undefined, pets: boolean) {
  const petsPolicy = policy ?? (pets ? "allowed" : "consult");
  return { petsPolicy, pets: petsPolicy === "allowed" };
}

function costFields(details: Pick<PublicationDetails, "currency" | "exchangeRate" | "expensesMode" | "commonExpenses" | "guarantee" | "guaranteeAmount">) {
  const expensesMode = details.expensesMode ?? (details.commonExpenses > 0 ? "separate" : "");
  const guarantee = wizardGuarantees.includes(details.guarantee) ? details.guarantee : "";
  return {
    currency: details.currency,
    ...(details.currency === "USD" && details.exchangeRate ? { exchangeRate: String(details.exchangeRate) } : {}),
    expensesMode,
    commonExpenses: expensesMode === "separate" && details.commonExpenses > 0 ? amount(details.commonExpenses) : "",
    guarantee,
    guaranteeAmount: guarantee === "Otro monto" && details.guaranteeAmount !== null ? amount(details.guaranteeAmount) : "",
  };
}

export function correctionFormValues(details: PublicationDetails, contact: { name: string; whatsapp: string }): PrefillFormValues {
  return {
    ownerName: contact.name,
    phone: localPhone(contact.whatsapp),
    title: details.title,
    type: details.type,
    zone: details.zone,
    address: details.address,
    bedrooms: optionalCount(details.bedrooms),
    bathrooms: optionalCount(details.bathrooms),
    garage: String(details.garage),
    area: optionalCount(details.area),
    ...petsFields(details.petsPolicy, details.pets),
    furnished: details.furnished,
    security: details.security,
    pool: details.pool,
    patio: details.patio,
    grill: details.grill,
    elevator: details.elevator,
    price: amount(details.price),
    ...costFields(details),
    description: details.description,
    ...beforeVisitFormValues(details),
  };
}

// Same building: zone, address, expenses, guarantee, amenities and pets. Each unit has its own
// title, price, photos and move-in date.
export function similarUnitFormValues(property: Property): PrefillFormValues {
  const details = property.rentalDetails;
  return {
    zone: property.zone,
    address: property.address,
    ...petsFields(details?.petsPolicy, property.pets),
    furnished: property.furnished,
    security: property.security,
    pool: property.pool,
    patio: property.patio,
    grill: property.grill,
    elevator: property.elevator,
    ...(details
      ? costFields({ ...details, currency: property.currency, exchangeRate: property.exchangeRate ?? details.exchangeRate })
      : { currency: property.currency }),
  };
}

// Room labels of an older request, read from its text ("Fotos seleccionadas: a.jpg [bedroom], ...").
// Newer requests store them with each photo.
export function photoCategoriesFromText(sourceText: string, count: number) {
  const line = sourceText.split("\n").find((item) => item.startsWith("Fotos seleccionadas:")) ?? "";
  const found = Array.from(line.matchAll(/\[([a-z]+|sin clasificar)\]/g), (match) => match[1]);
  return Array.from({ length: count }, (_, index) => (categoryValues.has(found[index] ?? "") ? found[index] : ""));
}

export function validPhotoCategory(value: unknown) {
  return typeof value === "string" && categoryValues.has(value) ? value : "";
}
