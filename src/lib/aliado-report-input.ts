// Shared by the aliado panel, its API and the admin calendar: the places an aliado can log and
// how a report is read from a form. No server imports here.

export const reportChannels = [
  { key: "facebook", label: "Facebook (grupo)", short: "Facebook" },
  { key: "marketplace", label: "Marketplace", short: "Marketplace" },
  { key: "instagram", label: "Instagram", short: "Instagram" },
  { key: "tiktok", label: "TikTok", short: "TikTok" },
  { key: "whatsapp", label: "WhatsApp", short: "WhatsApp" },
  { key: "calle", label: "Calle", short: "Calle" },
  { key: "otro", label: "Otro", short: "Otro" },
] as const;

export type ReportChannel = (typeof reportChannels)[number]["key"];

export const channelLabel = (key: string) => reportChannels.find((channel) => channel.key === key)?.short ?? "Otro";

export type AliadoReport = {
  id: string;
  date: string; // YYYY-MM-DD, Bolivia time
  channel: ReportChannel;
  place: string;
  url: string | null;
  people: number;
  owners: number;
  note: string | null;
};

export type ReportInput = Omit<AliadoReport, "id">;

export const reportLimits = { place: 160, url: 300, note: 300, count: 9999 } as const;

// Today in Bolivia (UTC-4, no daylight saving), as YYYY-MM-DD.
export function boliviaToday(now = new Date()) {
  return new Date(now.getTime() - 4 * 3600_000).toISOString().slice(0, 10);
}

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));

function readCount(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : 0;
  return Number.isInteger(number) && number >= 0 && number <= reportLimits.count ? number : null;
}

// A report can be for any day from the start of the program up to today; never the future.
export function readReportInput(body: Record<string, unknown>, today = boliviaToday()): ReportInput | string {
  if (!isDate(body.date) || body.date > today || body.date < "2026-01-01") return "Elige un día de hoy o anterior.";
  const channel = reportChannels.find((item) => item.key === body.channel)?.key;
  if (!channel) return "Elige dónde hiciste publicidad.";
  const clip = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim().slice(0, max) : null);
  let place = clip(body.place, reportLimits.place);
  let url = clip(body.url, reportLimits.url);
  // A link pasted in the name field becomes the link.
  if (!url && place && /^https?:\/\/\S+$/i.test(place)) url = place;
  if (url && !/^https?:\/\//i.test(url)) url = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(url) ? `https://${url}` : null;
  if (!place && url) place = url.replace(/^https?:\/\/(www\.)?/i, "").slice(0, reportLimits.place);
  if (!place) return "Escribe el nombre de la página, grupo o lugar.";
  const people = readCount(body.people);
  const owners = readCount(body.owners);
  if (people === null || owners === null) return "Las cantidades deben ser números enteros de 0 o más.";
  return { date: body.date, channel, place, url, people, owners, note: clip(body.note, reportLimits.note) };
}

// First and last day of a YYYY-MM month.
export function monthRange(month: string) {
  const [year, index] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
