import { parsePropertyExchangeRate } from "@/lib/currency";

export type PublicationDetails = {
  title:string; type:"Casa"|"Departamento"|"Monoambiente"; zone:string; address:string;
  bedrooms:number|null; bathrooms:number|null; garage:number; area:number|null;
  pets:boolean; furnished:boolean; security:boolean; pool:boolean; patio:boolean; grill:boolean; elevator:boolean;
  price:number; currency:"BOB"|"USD"; exchangeRate:number|null; commonExpenses:number;
  guarantee:string; guaranteeAmount:number|null; description:string;
};

export type PublicationFieldErrors = Partial<Record<keyof PublicationDetails | "contactName" | "whatsapp" | "details", string>>;

export function normalizePublicationPhone(value: unknown): string | null {
  if (typeof value !== "string" || !/^[+\d\s()-]+$/.test(value.trim())) return null;
  const digits = value.replace(/\D/g, "");
  return /^(591)?[67]\d{7}$/.test(digits) ? (digits.startsWith("591") ? digits : `591${digits}`) : null;
}

export function getPublicationContactErrors(contactName: unknown, whatsapp: unknown): PublicationFieldErrors {
  const errors: PublicationFieldErrors = {};
  if (typeof contactName !== "string" || !contactName.trim() || contactName.trim().length > 160) {
    errors.contactName = "Indica el nombre del propietario (máximo 160 caracteres).";
  }
  if (!normalizePublicationPhone(whatsapp)) {
    errors.whatsapp = "WhatsApp: escribe 8 dígitos que empiecen por 6 o 7, con o sin +591. Ejemplo: 78504969.";
  }
  return errors;
}

export function validatePublicationDetails(value: unknown): { details: PublicationDetails | null; fieldErrors: PublicationFieldErrors } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { details: null, fieldErrors: { details: "Faltan los datos de la vivienda. Revisa el paso Información." } };
  }
  const input = value as Record<string,unknown>;
  const fieldErrors: PublicationFieldErrors = {};
  const text = (key:string,max:number) => typeof input[key] === "string" && input[key].trim().length <= max ? input[key].trim() : "";
  const number = (key:string,max:number,integer=false): number|null => {
    const raw = input[key];
    if (raw === null || raw === undefined || (typeof raw === "string" && !raw.trim()) || (typeof raw !== "string" && typeof raw !== "number")) return null;
    const number = Number(raw);
    return Number.isFinite(number) && number >= 0 && number <= max && (!integer || Number.isInteger(number)) ? number : null;
  };
  const title=text("title",220), zone=text("zone",160), address=text("address",255), description=text("description",10000);
  const price=number("price",100_000_000), commonExpenses=number("commonExpenses",1_000_000), garage=number("garage",100,true);
  const guarantee=text("guarantee",80);
  const guaranteeAmount=number("guaranteeAmount",100_000_000);
  const exchangeRate=input.currency === "USD" ? parsePropertyExchangeRate(input.exchangeRate) : null;
  if (title.length < 8) fieldErrors.title = "Escribe un título de entre 8 y 220 caracteres.";
  if (!zone) fieldErrors.zone = "Indica la zona (máximo 160 caracteres).";
  if (!address) fieldErrors.address = "Indica una dirección aproximada (máximo 255 caracteres).";
  if (description.length < 30) fieldErrors.description = "La descripción debe tener entre 30 y 10.000 caracteres.";
  if (!price) fieldErrors.price = "Indica un alquiler mensual mayor a 0 y de hasta 100.000.000.";
  if (commonExpenses === null) fieldErrors.commonExpenses = "Indica las expensas mensuales. Escribe 0 si están incluidas o no se cobran (máximo 1.000.000).";
  if (garage === null) fieldErrors.garage = "Indica entre 0 y 100 parqueos, sin decimales. Escribe 0 si no tiene.";
  if (!["Casa","Departamento","Monoambiente"].includes(String(input.type))) fieldErrors.type = "Selecciona un tipo de vivienda válido.";
  if (!["BOB","USD"].includes(String(input.currency))) fieldErrors.currency = "Selecciona bolivianos o dólares.";
  if (input.currency === "USD" && exchangeRate === null) fieldErrors.exchangeRate = "Indica un tipo de cambio mayor a 0 y de hasta 1.000 Bs por USD.";
  if (!["Sin garantía","1 mes de alquiler","2 meses de alquiler","Otro monto","Consultar con el propietario"].includes(guarantee)) fieldErrors.guarantee = "Selecciona la garantía del alquiler.";
  if (guarantee === "Otro monto" && guaranteeAmount === null) fieldErrors.guaranteeAmount = "Indica el monto de la garantía, entre 0 y 100.000.000.";
  const labels = { bedrooms: "Dormitorios", bathrooms: "Baños", area: "Superficie" };
  for (const key of ["bedrooms","bathrooms","area"] as const) {
    if (input[key] !== "" && input[key] != null && number(key,key === "area" ? 1_000_000 : 100,true) === null) {
      fieldErrors[key] = `${labels[key]}: indica un número entero entre 0 y ${key === "area" ? "1.000.000" : "100"}, o deja el campo vacío.`;
    }
  }
  const flags=["pets","furnished","security","pool","patio","grill","elevator"] as const;
  if (flags.some(key=>typeof input[key] !== "boolean")) fieldErrors.details = "Revisa las características de la vivienda en el paso Información.";
  if (Object.keys(fieldErrors).length || price === null || commonExpenses === null || garage === null) return { details: null, fieldErrors };
  return {fieldErrors,details:{title,type:input.type as PublicationDetails["type"],zone,address,description,price,currency:input.currency as "BOB"|"USD",exchangeRate,
    bedrooms:number("bedrooms",100,true),bathrooms:number("bathrooms",100,true),area:number("area",1_000_000,true),garage,commonExpenses,guarantee,guaranteeAmount,
    pets:input.pets as boolean,furnished:input.furnished as boolean,security:input.security as boolean,pool:input.pool as boolean,patio:input.patio as boolean,grill:input.grill as boolean,elevator:input.elevator as boolean}};
}

const priceFields = new Set(["price", "currency", "exchangeRate", "commonExpenses", "guarantee", "guaranteeAmount", "contactName", "whatsapp"]);

export function publicationFieldStep(field: string): 1 | 2 {
  return priceFields.has(field) ? 2 : 1;
}

export function getPublicationStepErrors(step: number, value: unknown, contactName: unknown, whatsapp: unknown): PublicationFieldErrors {
  const errors = { ...validatePublicationDetails(value).fieldErrors, ...getPublicationContactErrors(contactName, whatsapp) };
  return Object.fromEntries(Object.entries(errors).filter(([field]) => publicationFieldStep(field) === step));
}

export function parsePublicationDetails(value: unknown): PublicationDetails | null {
  return validatePublicationDetails(value).details;
}
