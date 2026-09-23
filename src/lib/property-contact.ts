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
