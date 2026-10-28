import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getPropertyPriceInCurrency } from "@/lib/currency";
import { formatPrice, type Property } from "@/lib/properties";

// Urbanito, the Telegram assistant, reads Zentro through /api/urbanito/* with a shared key
// (URBANITO_API_KEY here = ZENTRO_API_KEY in the bot). Read-only: it never publishes or edits.

export const urbanitoResultLimit = 8;
export const urbanitoCodeMinutes = 15;
// No 0/O or 1/I, so a code read aloud or copied by hand still works.
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

export function urbanitoKeyMatches(header: string | null, key: string | undefined) {
  if (!key || !header?.startsWith("Bearer ")) return false;
  return timingSafeEqual(sha256(header.slice(7).trim()), sha256(key));
}

export function newLinkCode() {
  return Array.from({ length: 6 }, () => codeAlphabet[randomInt(codeAlphabet.length)]).join("");
}

export function normalizeLinkCode(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase().replace(/[\s-]/g, "") : "";
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

export const hashLinkCode = (code: string) => sha256(code).toString("hex");

// Telegram user ids are positive integers well below 2^53.
export function readTelegramId(value: unknown) {
  const id = typeof value === "string" && /^\d{1,15}$/.test(value) ? Number(value) : value;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
}

export type UrbanitoFilters = {
  texto?: string;
  ciudad?: string;
  zona?: string;
  tipo?: string;
  precioMaxBs?: number;
  dormitoriosMin?: number;
  mascotas?: boolean;
  amoblado?: boolean;
};

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function readBool(value: string | null) {
  if (value === "true" || value === "1" || value === "si") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return undefined;
}

function readNumber(value: string | null) {
  const number = value ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function readText(value: string | null) {
  const text = value?.trim().slice(0, 80);
  return text ? text : undefined;
}

export function readUrbanitoFilters(params: URLSearchParams): UrbanitoFilters {
  return {
    texto: readText(params.get("texto")),
    ciudad: readText(params.get("ciudad")),
    zona: readText(params.get("zona")),
    tipo: readText(params.get("tipo")),
    precioMaxBs: readNumber(params.get("precio_max_bs")),
    dormitoriosMin: readNumber(params.get("dormitorios_min")),
    mascotas: readBool(params.get("mascotas")),
    amoblado: readBool(params.get("amoblado")),
  };
}

export function matchesUrbanitoFilters(property: Property, filters: UrbanitoFilters) {
  if (filters.ciudad && !fold(property.city).includes(fold(filters.ciudad))) return false;
  if (filters.zona && !fold(property.zone).includes(fold(filters.zona))) return false;
  if (filters.tipo && fold(property.type) !== fold(filters.tipo)) return false;
  if (filters.precioMaxBs && getPropertyPriceInCurrency(property, "BOB") > filters.precioMaxBs) return false;
  if (filters.dormitoriosMin && property.bedrooms < filters.dormitoriosMin) return false;
  if (filters.mascotas !== undefined && property.pets !== filters.mascotas) return false;
  if (filters.amoblado !== undefined && property.furnished !== filters.amoblado) return false;
  if (filters.texto) {
    const haystack = fold([property.title, property.zone, property.city, property.shortDescription, ...property.tags].join(" "));
    if (!fold(filters.texto).split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  return true;
}

export function listingLink(origin: string, slug: string) {
  return `${origin}/propiedades/${encodeURIComponent(slug)}`;
}

// What the bot gets for each listing: no owner phone or email, the bot sends people to the page.
export function toUrbanitoListing(property: Property, origin: string) {
  return {
    titulo: property.title,
    tipo: property.type,
    ciudad: property.city,
    zona: property.zone,
    precio: formatPrice(property),
    dormitorios: property.bedrooms,
    banos: property.bathrooms,
    garaje: property.garage,
    superficie: property.area,
    mascotas: property.pets,
    amoblado: property.furnished,
    link: listingLink(origin, property.slug),
  };
}
