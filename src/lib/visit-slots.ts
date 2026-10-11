// Visit slots for a listing: one hour each, inside the days and hours the home can be visited,
// from two hours from now up to two weeks ahead. Bolivia is UTC-4 all year (no daylight saving),
// so local times are computed with a fixed offset. A slot is identified by its start as an ISO
// instant ("2026-10-14T13:00:00.000Z" is 09:00 in Santa Cruz).

export const visitSlotMinutes = 60;
export const visitBookingDays = 14;
export const visitMinNoticeMinutes = 120;
const boliviaOffsetMs = -4 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

export type VisitSettings = {
  enabled: boolean;
  // 0 = domingo ... 6 = sábado.
  weekdays: number[];
  startMinute: number;
  endMinute: number;
};

export const defaultVisitSettings: VisitSettings = { enabled: true, weekdays: [1, 2, 3, 4, 5, 6], startMinute: 9 * 60, endMinute: 18 * 60 };
// A home whose host never chose visit hours: bookings stay off so nobody books a time the owner never offered.
// The default hours are only the suggestion shown when they turn bookings on.
export const unsetVisitSettings: VisitSettings = { ...defaultVisitSettings, enabled: false };

export const weekdayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const weekdayShortNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export type VisitSlot = { start: string; label: string; taken: boolean };
export type VisitDay = { key: string; weekday: string; date: string; slots: VisitSlot[] };

function local(date: Date) {
  const shifted = new Date(date.getTime() + boliviaOffsetMs);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function fromLocal(year: number, month: number, day: number, minute: number) {
  return new Date(Date.UTC(year, month, day, 0, minute) - boliviaOffsetMs);
}

const pad = (value: number) => String(value).padStart(2, "0");
export const minuteLabel = (minute: number) => `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;

const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const monthLongNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "sábado 18 de octubre a las 10:00"
export function visitWhenLabel(start: string | Date) {
  const parts = local(typeof start === "string" ? new Date(start) : start);
  return `${weekdayNames[parts.weekday].toLocaleLowerCase("es")} ${parts.day} de ${monthLongNames[parts.month]} a las ${minuteLabel(parts.minute)}`;
}

// "Sáb 18 oct · 10:00"
export function visitShortLabel(start: string | Date) {
  const parts = local(typeof start === "string" ? new Date(start) : start);
  return `${weekdayShortNames[parts.weekday]} ${parts.day} ${monthNames[parts.month]} · ${minuteLabel(parts.minute)}`;
}

export function boliviaDayKey(start: string | Date) {
  const parts = local(typeof start === "string" ? new Date(start) : start);
  return `${parts.year}-${pad(parts.month + 1)}-${pad(parts.day)}`;
}

export function normalizeVisitSettings(value: unknown): VisitSettings | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const weekdays = Array.isArray(input.weekdays)
    ? [...new Set(input.weekdays.map(Number))].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort()
    : null;
  const startMinute = Number(input.startMinute);
  const endMinute = Number(input.endMinute);
  if (!weekdays || typeof input.enabled !== "boolean") return null;
  if (![startMinute, endMinute].every((minute) => Number.isInteger(minute) && minute >= 6 * 60 && minute <= 22 * 60 && minute % 30 === 0)) return null;
  if (endMinute - startMinute < visitSlotMinutes) return null;
  if (input.enabled && weekdays.length === 0) return null;
  return { enabled: input.enabled, weekdays, startMinute, endMinute };
}

function slotStarts(settings: VisitSettings) {
  const starts: number[] = [];
  for (let minute = settings.startMinute; minute + visitSlotMinutes <= settings.endMinute; minute += visitSlotMinutes) starts.push(minute);
  return starts;
}

export function buildVisitDays(settings: VisitSettings, taken: Iterable<string>, now = new Date(), days = visitBookingDays): VisitDay[] {
  if (!settings.enabled) return [];
  const takenSet = new Set([...taken].map((start) => new Date(start).toISOString()));
  const earliest = now.getTime() + visitMinNoticeMinutes * 60_000;
  const today = local(now);
  const result: VisitDay[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const midnight = fromLocal(today.year, today.month, today.day + offset, 0);
    const parts = local(midnight);
    if (!settings.weekdays.includes(parts.weekday)) continue;
    const slots = slotStarts(settings)
      .map((minute) => fromLocal(parts.year, parts.month, parts.day, minute))
      .filter((start) => start.getTime() >= earliest)
      .map((start) => ({ start: start.toISOString(), label: minuteLabel(local(start).minute), taken: takenSet.has(start.toISOString()) }));
    if (!slots.length) continue;
    result.push({
      key: boliviaDayKey(midnight),
      weekday: offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : weekdayNames[parts.weekday],
      date: `${parts.day} ${monthNames[parts.month]}`,
      slots,
    });
  }
  return result;
}

// A start sent by the browser must be one of the slots the page offered.
export function isBookableStart(start: unknown, settings: VisitSettings, now = new Date()): start is string {
  if (typeof start !== "string" || start.length > 40) return false;
  const date = new Date(start);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== start) return false;
  if (date.getTime() < now.getTime() + visitMinNoticeMinutes * 60_000) return false;
  if (date.getTime() > now.getTime() + visitBookingDays * dayMs) return false;
  const parts = local(date);
  return settings.enabled && settings.weekdays.includes(parts.weekday) && slotStarts(settings).includes(parts.minute);
}

export function visitSettingsSummary(settings: VisitSettings) {
  if (!settings.enabled) return "Reservas de visita desactivadas";
  const days = settings.weekdays;
  const sameAsWeek = [1, 2, 3, 4, 5].every((day) => days.includes(day));
  const label = days.length === 7
    ? "Todos los días"
    : sameAsWeek && days.length === 6 && days.includes(6)
      ? "Lunes a sábado"
      : sameAsWeek && days.length === 5
        ? "Lunes a viernes"
        : days.map((day) => weekdayShortNames[day]).join(", ");
  return `${label}, de ${minuteLabel(settings.startMinute)} a ${minuteLabel(settings.endMinute)}`;
}

export const visitLimits = { name: 80, note: 240 } as const;
