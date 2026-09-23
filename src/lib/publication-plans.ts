import { Building2, Layers3, Megaphone, type LucideIcon } from "lucide-react";

export const publicationExchangeRateBobPerUsd = 7;

export type PublicationPlanTier = "basic" | "pro" | "premium";

export type PublicationPlan = {
  slug: PublicationPlanTier;
  icon: LucideIcon;
  eyebrow: string;
  name: string;
  priceUsd: number;
  priceBob: number;
  durationLabel: string;
  durationDays: number | null;
  durationType: "fixed" | "until_sold";
  summary: string;
  bestFor: string;
  visibilityLevel: "standard" | "enhanced" | "maximum";
  benefits: string[];
  segmentationTags: string[];
  featured?: boolean;
};

export const publicationPlans: PublicationPlan[] = [
  {
    slug: "basic",
    icon: Building2,
    eyebrow: "Básico",
    name: "Básico",
    priceUsd: 30,
    priceBob: 210,
    durationLabel: "1 mes",
    durationDays: 30,
    durationType: "fixed",
    summary:
      "Para publicar una propiedad con ficha profesional, mapa real y contacto directo durante 30 días.",
    bestFor: "Propietarios que quieren validar una propiedad puntual sin pagar de más.",
    visibilityLevel: "standard",
    benefits: [
      "Ficha visual curada por Zentro Urbano",
      "Galería de fotos ordenada",
      "Marker estándar en el mapa",
      "Etiquetas lifestyle y atributos clave",
      "Contacto directo por WhatsApp",
      "Revisión manual antes de publicar",
      "Rotación normal en catálogo",
    ],
    segmentationTags: ["particular", "una_propiedad", "validacion", "presupuesto_controlado"],
  },
  {
    slug: "pro",
    icon: Layers3,
    eyebrow: "Pro",
    name: "Pro",
    priceUsd: 50,
    priceBob: 350,
    durationLabel: "3 meses",
    durationDays: 90,
    durationType: "fixed",
    summary:
      "Para mantener una propiedad activa por más tiempo con mejor relación costo/mes y una ficha optimizada.",
    bestFor: "Propietarios que necesitan exposición constante sin renovar cada mes.",
    visibilityLevel: "enhanced",
    benefits: [
      "Todo lo incluido en Básico",
      "Publicación activa por 90 días",
      "Mejor costo mensual efectivo",
      "Optimización inicial de título y etiquetas",
      "Una actualización visual durante el periodo",
      "Prioridad moderada frente a fichas básicas",
      "Ideal para viviendas que necesitan más tiempo para alquilarse",
    ],
    segmentationTags: ["propietario", "propietario_recurrente", "exposicion_constante", "ahorro"],
  },
  {
    slug: "premium",
    icon: Megaphone,
    eyebrow: "Premium",
    name: "Premium",
    priceUsd: 80,
    priceBob: 560,
    durationLabel: "Hasta que se alquile",
    durationDays: null,
    durationType: "until_sold",
    summary:
      "Para viviendas que necesitan máxima visibilidad hasta concretar el alquiler directo con el propietario.",
    bestFor: "Propietarios que buscan mayor exposición para su vivienda en alquiler.",
    visibilityLevel: "maximum",
    featured: true,
    benefits: [
      "Todo lo incluido en Pro",
      "Vigencia hasta concretar el alquiler",
      "Marker premium en mapa",
      "Mayor presencia en listados y destacados",
      "Etiqueta premium visible en la ficha",
      "Consulta mensual de disponibilidad al cierre de cada mes",
      "Revisión mensual de estado y presentación",
      "Prioridad para propiedades similares",
      "Recomendado para inmuebles de alto valor o urgentes",
    ],
    segmentationTags: ["propietario", "alta_visibilidad", "propiedad_urgente", "premium"],
  },
];

export function getPublicationPlan(slug: PublicationPlanTier) {
  return publicationPlans.find((plan) => plan.slug === slug);
}
