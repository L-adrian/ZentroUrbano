// Shared by the "Avísame" form (browser) and the alerts route (server).
export const searchAlertConsentText =
  "Acepto que Zentro Urbano guarde mi contacto y esta búsqueda para avisarme cuando se publique una vivienda así. Puedo darme de baja cuando quiera.";

export const searchAlertLimits = { name: 120, email: 190, params: 1000, summary: 400 } as const;

export function normalizeAlertEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  // Plain addresses only: "?", "&", "%" or "#" would let the text rewrite the admin's mailto link.
  return email.length <= searchAlertLimits.email && /^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(email) ? email : null;
}

// Bolivian mobile numbers: 8 digits starting with 6 or 7, with or without +591.
export function normalizeAlertWhatsapp(value: unknown) {
  if (typeof value !== "string") return null;
  // Letters or "@" mean it is not a phone number ("ana.70012345@gmail.com" is an email).
  if (!/^[\d\s+().-]+$/.test(value.trim())) return null;
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("591") ? digits.slice(3) : digits;
  return /^[67]\d{7}$/.test(local) ? `591${local}` : null;
}

export function formatAlertWhatsapp(normalized: string) {
  const local = normalized.startsWith("591") ? normalized.slice(3) : normalized;
  return `+591 ${local.slice(0, 4)} ${local.slice(4)}`;
}

export const searchAlertStatuses = ["active", "removed"] as const;
export type SearchAlertStatus = (typeof searchAlertStatuses)[number];
