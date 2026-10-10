// Private recruiter program shown on /equipo (shared by link only, not indexed).
// Prices come from services.ts so the commissions follow the Servicios page.
import { getPackage, getService, servicePackages } from "@/lib/services";

export const listingPay = { firstMonthFirst: 5, firstMonthAmount: 25, regular: 15, photoBonus: 5, photoBonusMin: 8 };
export const goalBonuses = [
  { listings: 10, bonus: 100 },
  { listings: 25, bonus: 300 },
  { listings: 50, bonus: 700 },
];
export const rates = {
  package: 0.3,
  service: 0.25,
  serviceDone: 0.5,
  featured: 0.2,
  ambassadorExtra: 0.05,
};
export const featuredMonths = 6;
export const fieldTasks = [
  { slug: "fotos", title: "Sesión de fotos que pasa la revisión", amount: 120 },
  { slug: "jornada", title: "Jornada de visitas de 2 horas", amount: 60 },
  { slug: "inventario", title: "Inventario de la vivienda", amount: 90 },
] as const;
export const ambassador = { listings: 20, sales: 3, referralBonus: 50, referralListings: 5 };

// Services an aliado can do himself and keep half.
export const doableServices = ["fotos-profesionales", "inventario-con-fotos", "jornada-de-visitas", "anuncio-listo"];
export const sellableServices = [
  "fotos-profesionales", "inventario-con-fotos", "recorrido-3d", "promocion-en-redes",
  "verificacion-de-inquilino", "jornada-de-visitas", "anuncio-listo", "modelo-de-contrato",
];
export const ownerPackages = servicePackages.filter(pkg => pkg.audience === "owner").sort((a, b) => a.price - b.price);
export const featuredPrice = getService("anuncio-destacado")?.price ?? 200;

export type MonthInput = {
  approved: number;
  firstMonth: boolean;
  packages: { slug: string; count: number }[];
  fieldPhotos?: number;
  fieldVisits?: number;
  servicesSold?: string[];
  servicesDone?: string[];
  featured: number;
  ambassador: boolean;
};

export type MonthLine = { key: string; label: string; amount: number };

export function goalBonus(approved: number) {
  return goalBonuses.reduce((best, goal) => approved >= goal.listings ? goal.bonus : best, 0);
}

export function listingAmount(approved: number, firstMonth: boolean) {
  if (!firstMonth) return approved * listingPay.regular;
  const early = Math.min(approved, listingPay.firstMonthFirst);
  return early * listingPay.firstMonthAmount + (approved - early) * listingPay.regular;
}

export function estimateMonth(input: MonthInput): { lines: MonthLine[]; total: number } {
  const extra = input.ambassador ? rates.ambassadorExtra : 0;
  const packageAmount = input.packages.reduce((sum, entry) => sum + (getPackage(entry.slug)?.price ?? 0) * entry.count * (rates.package + extra), 0);
  const sold = (input.servicesSold ?? []).reduce((sum, slug) => sum + (getService(slug)?.price ?? 0) * (rates.service + extra), 0);
  const done = (input.servicesDone ?? []).reduce((sum, slug) => sum + (getService(slug)?.price ?? 0) * rates.serviceDone, 0);
  const field = (input.fieldPhotos ?? 0) * fieldTasks[0].amount + (input.fieldVisits ?? 0) * fieldTasks[1].amount;
  const lines: MonthLine[] = [
    { key: "anuncios", label: "Anuncios aprobados", amount: listingAmount(input.approved, input.firstMonth) },
    { key: "bono", label: "Bono por meta", amount: goalBonus(input.approved) },
    { key: "paquetes", label: "Paquetes vendidos", amount: packageAmount },
    { key: "servicios", label: "Servicios vendidos o hechos por ti", amount: sold + done + field },
    { key: "destacados", label: "Destacados activos", amount: input.featured * featuredPrice * (rates.featured + extra) },
  ];
  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) };
}

export const examples: { title: string; who: string; detail: string; input: MonthInput }[] = [
  {
    title: "Fines de semana",
    who: "Primer mes",
    detail: "6 anuncios aprobados y 1 sesión de fotos vendida.",
    input: { approved: 6, firstMonth: true, packages: [], servicesSold: ["fotos-profesionales"], featured: 0, ambassador: false },
  },
  {
    title: "Medio tiempo",
    who: "Segundo mes",
    detail: "15 anuncios, 1 paquete Empieza bien, 2 sesiones de fotos hechas por ti y 2 destacados activos.",
    input: { approved: 15, firstMonth: false, packages: [{ slug: "empieza-bien", count: 1 }], servicesDone: ["fotos-profesionales", "fotos-profesionales"], featured: 2, ambassador: false },
  },
  {
    title: "Tiempo completo",
    who: "Tercer mes, ya Embajador",
    detail: "30 anuncios, 2 Hasta que se alquile y 1 Más visitas, 2 sesiones de fotos y 4 jornadas hechas por ti, 6 destacados activos.",
    input: { approved: 30, firstMonth: false, packages: [{ slug: "hasta-que-se-alquile", count: 2 }, { slug: "mas-visitas", count: 1 }], fieldPhotos: 2, fieldVisits: 4, featured: 6, ambassador: true },
  },
];

export function formatBs(amount: number) {
  const whole = Math.round(amount * 100) % 100 === 0;
  return `Bs ${amount.toLocaleString("es-BO", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}
