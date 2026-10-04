// Shared by the report form (browser) and the report route (server).
export const reportReasons = {
  ya_alquilada: "Ya se alquiló o no está disponible",
  no_responde: "El dueño no responde",
  pidio_dinero: "Pidió dinero antes de la visita",
  datos_distintos: "Fotos, precio o datos distintos a la realidad",
  otro: "Otro motivo",
} as const;

export type ReportReason = keyof typeof reportReasons;

export const reportNoteMaxLength = 200;

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && Object.hasOwn(reportReasons, value);
}

// Admin reviews reports in this order: possible scams first.
export const reportReasonPriority: ReportReason[] = ["pidio_dinero", "datos_distintos", "ya_alquilada", "no_responde", "otro"];

export const supportHoursLabel = "todos los días de 08:00 a 00:00";

// A new confirmation from the owner or the admin clears earlier reports.
export function countReportsSince(times: number[] | undefined, confirmedAt: string | undefined) {
  if (!times?.length) return 0;
  const since = confirmedAt ? new Date(confirmedAt).getTime() : Number.NEGATIVE_INFINITY;
  return times.filter((at) => at > (Number.isFinite(since) ? since : Number.NEGATIVE_INFINITY)).length;
}
