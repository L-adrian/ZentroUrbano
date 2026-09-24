import type { Property } from "@/lib/properties";

export function getOwnerListingSuggestions(property: Property): string[] {
  const suggestions: string[] = [];
  const photos = new Set(property.images).size;
  if (photos < 5) suggestions.push(`Tienes ${photos} fotos. Añade ${5 - photos} más para completar al menos 5; incluye baño y cocina si aún no se ven.`);
  if (property.area <= 0) suggestions.push("Completa la superficie en m².");
  if (property.bathrooms <= 0) suggestions.push("Indica cuántos baños tiene la vivienda.");
  if (!property.rentalDetails || property.rentalDetails.guarantee === "Consultar con el propietario") suggestions.push("Aclara el monto de la garantía y los pagos de ingreso.");
  if (!property.pets && property.rentalDetails?.petsPolicy !== "not_allowed") suggestions.push("Confirma si aceptas mascotas.");
  return suggestions;
}
