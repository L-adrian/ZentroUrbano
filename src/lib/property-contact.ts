import type { Property } from "@/lib/properties";

export function isExternalContactUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function getPropertyContactCopy(property: Pick<Property, "whatsapp">) {
  return isExternalContactUrl(property.whatsapp)
    ? {
        label: "Ver anuncio original",
        shortLabel: "Anuncio",
        title: "Abrir anuncio original",
      }
    : {
        label: "Contactar por WhatsApp",
        shortLabel: "WhatsApp",
        title: "WhatsApp",
      };
}

// Display names that are not a person's name get a plain "Hola".
const nonPersonalNames = /^(equipo|propietari|due[ñn]o|zentro|inmobiliaria|asesor|administraci|familia|empresa|constructora)/i;

export function ownerFirstName(name: string | null | undefined) {
  const clean = (name ?? "").trim();
  if (!clean || nonPersonalNames.test(clean) || /[\d@]/.test(clean)) return null;
  const first = clean.split(/\s+/)[0];
  return /^[\p{L}'-]{2,}$/u.test(first) ? first : null;
}

// First WhatsApp message: which home, how much, the link, and the two questions owners answer first.
export function buildOwnerWhatsappMessage(
  property: Pick<Property, "agent" | "type" | "zone" | "rentalDetails">,
  price: string,
  url: string,
) {
  const firstName = ownerFirstName(property.agent.name);
  const kind = (property.rentalDetails?.type ?? property.type).toLocaleLowerCase("es");
  return `${firstName ? `Hola ${firstName}` : "Hola"}, vi en Zentro Urbano tu ${kind} en ${property.zone} a ${price}: ${url}\n¿Sigue disponible? Me gustaría coordinar una visita.`;
}

export const whatsappContactSources = ["ficha", "tarjeta", "barra", "galeria", "recorrido", "mapa"] as const;
export type WhatsappContactSource = (typeof whatsappContactSources)[number];

export function whatsappContactPath(slug: string, source: WhatsappContactSource) {
  return `/api/propiedades/${slug}/whatsapp?desde=${source}`;
}
