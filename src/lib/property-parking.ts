import type { Property } from "./properties";

export function getPropertyParkingLabel(property: Pick<Property, "garage" | "requirements" | "rentalDetails">): string | number {
  if (property.rentalDetails?.parkingNote) return property.rentalDetails.parkingNote;
  if (property.garage > 0) return property.garage;
  const requirements = property.requirements.join(" ");
  if (/\bsin\s+(garaje|parqueo)\b/i.test(requirements)) return "Sin garaje";
  if (/\b(parqueo|garaje)\s+disponible\b/i.test(requirements)) return "Consultar capacidad";
  return "Consultar";
}
