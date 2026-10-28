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

// What Urbanito did for a linked owner (POST /api/urbanito/resumen), shown in Mi cuenta > Urbanito.
export type UrbanitoSnapshot = {
  recordatorios: Array<{ cuando: string; texto: string }>;
  fichas: Array<{ titulo: string; creado: string; paginas: number | null }>;
  chat: Array<{ rol: "user" | "assistant"; texto: string; cuando: string | null }>;
  plan: { nombre: string; usados: number; limite: number | null } | null;
  totales: { recordatorios: number; fichas: number; preguntas: number };
};

const snapshotLimits = { recordatorios: 10, fichas: 12, chat: 4, texto: 500 };

const list = (value: unknown) => (Array.isArray(value) ? value : []);
const record = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});
const text = (value: unknown, max = 160) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
const isoDate = (value: unknown) => {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

// Everything is capped and cleaned: the bot is trusted with the key, but the page still never
// stores more than it shows.
export function readUrbanitoSnapshot(body: unknown, showChat: boolean): UrbanitoSnapshot {
  const input = record(body);
  const plan = record(input.plan);
  const totals = record(input.totales);
  return {
    recordatorios: list(input.recordatorios).flatMap((item) => {
      const when = isoDate(record(item).cuando);
      const label = text(record(item).texto);
      return when && label ? [{ cuando: when, texto: label }] : [];
    }).slice(0, snapshotLimits.recordatorios),
    fichas: list(input.fichas).flatMap((item) => {
      const title = text(record(item).titulo, 120);
      const created = isoDate(record(item).creado);
      const pages = count(record(item).paginas);
      return title && created ? [{ titulo: title, creado: created, paginas: pages || null }] : [];
    }).slice(0, snapshotLimits.fichas),
    chat: showChat
      ? list(input.chat).flatMap((item) => {
          const role = record(item).rol;
          const message = text(record(item).texto, snapshotLimits.texto);
          return (role === "user" || role === "assistant") && message ? [{ rol: role as "user" | "assistant", texto: message, cuando: isoDate(record(item).cuando) }] : [];
        }).slice(-snapshotLimits.chat)
      : [],
    plan: text(plan.nombre, 40) ? { nombre: text(plan.nombre, 40), usados: count(plan.usados), limite: count(plan.limite) || null } : null,
    totales: { recordatorios: count(totals.recordatorios), fichas: count(totals.fichas), preguntas: count(totals.preguntas) },
  };
}
