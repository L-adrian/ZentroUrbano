import type { Property } from "@/lib/properties";
import { businessKindChoices, isBusinessKind, type BusinessKind } from "@/lib/publication-input";

// What kind of local a listing is: chosen by the owner when publishing, or one of its tags.
export function getBusinessKind(property: Property): BusinessKind | null {
  if (property.type !== "Local") return null;
  const chosen = property.rentalDetails?.businessKind;
  if (isBusinessKind(chosen)) return chosen;
  return businessKindChoices.find((kind) => property.tags.includes(kind)) ?? null;
}

// "Galpones", "Oficinas"… for titles like "Galpones en alquiler en Santa Cruz".
export const businessKindPlurals: Record<BusinessKind, string> = {
  "Tienda a la calle": "Tiendas a la calle",
  "Local en galería": "Locales en galería",
  Oficina: "Oficinas",
  Consultorio: "Consultorios",
  Galpón: "Galpones",
  "Depósito o almacén": "Depósitos y almacenes",
  "Kiosco o puesto": "Kioscos y puestos",
  "Local para restaurante": "Locales para restaurante",
  "Canchón o lote comercial": "Canchones y lotes comerciales",
};
