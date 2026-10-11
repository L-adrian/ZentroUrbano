// Private recruiter program shown on /equipo (shared by link only, not indexed).
// Prices come from services.ts so the commissions follow the Servicios page.
import { getService, servicePackages } from "@/lib/services";

export const listingPay = { firstMonthFirst: 5, firstMonthAmount: 25, firstMonthDays: 30, regular: 15, photoBonus: 5, photoBonusMin: 8, clawbackDays: 30 };
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

export function goalBonus(approved: number) {
  return goalBonuses.reduce((best, goal) => approved >= goal.listings ? goal.bonus : best, 0);
}

export function listingAmount(approved: number, firstMonth: boolean) {
  if (!firstMonth) return approved * listingPay.regular;
  const early = Math.min(approved, listingPay.firstMonthFirst);
  return early * listingPay.firstMonthAmount + (approved - early) * listingPay.regular;
}

export function formatBs(amount: number) {
  const whole = Math.round(amount * 100) % 100 === 0;
  return `Bs ${amount.toLocaleString("es-BO", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}
