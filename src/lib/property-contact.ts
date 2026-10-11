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
  extraLines: string[] = [],
) {
  const firstName = ownerFirstName(property.agent.name);
  const kind = (property.rentalDetails?.type ?? property.type).toLocaleLowerCase("es");
  return [
    `${firstName ? `Hola ${firstName}` : "Hola"}, vi en Zentro Urbano tu ${kind} en ${property.zone} a ${price}: ${url}`,
    "¿Sigue disponible? Me gustaría coordinar una visita.",
    ...extraLines,
  ].join("\n");
}

// "guardados": cards on /guardados; "cercanos": cards under "Cerca de {zona}" in the catalog.
export const whatsappContactSources = ["ficha", "tarjeta", "barra", "galeria", "recorrido", "mapa", "guardados", "cercanos"] as const;
export type WhatsappContactSource = (typeof whatsappContactSources)[number];

export function whatsappContactPath(slug: string, source: WhatsappContactSource) {
  return `/api/propiedades/${slug}/whatsapp?desde=${source}`;
}

// After a visit is booked on the listing page: the visitor sends this to the owner (or to the
// Zentro embajador in charge of the home), with the link to the page of booked times.
export function buildVisitWhatsappMessage(input: {
  hostKind: "owner" | "embajador";
  hostName: string | null;
  visitorName: string;
  property: Pick<Property, "type" | "zone" | "rentalDetails">;
  when: string;
  listingUrl: string;
  visitsUrl: string;
}) {
  const firstName = ownerFirstName(input.hostName);
  const kind = (input.property.rentalDetails?.type ?? input.property.type).toLocaleLowerCase("es");
  const home = input.hostKind === "owner" ? `tu ${kind}` : "la vivienda";
  return [
    `${firstName ? `Hola ${firstName}` : "Hola"}, soy ${input.visitorName}. Reservé por Zentro Urbano una visita para ver ${home} en ${input.property.zone} el ${input.when}.`,
    `Anuncio: ${input.listingUrl}`,
    `Horarios reservados: ${input.visitsUrl}`,
    "¿Me confirmas la visita?",
  ].join("\n");
}
