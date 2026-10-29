import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { addDays, boliviaParts, calendarKindLabels, type CalendarEvent } from "@/lib/calendar-input";

// The parts of the Google Calendar sync that need no database: the sealed token and the shape of
// each event. Kept apart so the tests can load them.
export const googleCalendarScope = "https://www.googleapis.com/auth/calendar.events";
export const googleCalendarCallbackPath = "/api/cliente/google-calendar/callback";
export const googleCalendarStateCookie = "zu_gcal_state";

// The refresh token is stored encrypted with a key from the server's settings.
function tokenKey() {
  const secret = process.env.CALENDAR_TOKEN_KEY || process.env.GOOGLE_CLIENT_SECRET;
  return secret ? createHash("sha256").update(`zentro-calendar:${secret}`).digest() : null;
}

export const googleCalendarConfigured = () => Boolean(process.env.GOOGLE_CLIENT_SECRET && tokenKey());

export function sealToken(token: string) {
  const key = tokenKey();
  if (!key) throw new Error("calendar key missing");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function openToken(sealed: string) {
  const key = tokenKey();
  const [version, iv, tag, data] = sealed.split(".");
  if (!key || version !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// Google event ids use the letters a-v and digits; a hash in hex fits.
export const googleEventId = (accountId: string, zentroId: string) => `zu${createHash("sha256").update(`${accountId}|${zentroId}`).digest("hex").slice(0, 40)}`;

export function googleEventBody(event: CalendarEvent, origin: string) {
  const start = new Date(event.startsAt);
  const details = [
    calendarKindLabels[event.kind],
    event.propertyTitle,
    event.personName ? `Con ${event.personName}` : null,
    event.personWhatsapp ? `WhatsApp: https://wa.me/${event.personWhatsapp}` : null,
    event.note,
    `${origin}/cliente#${event.source === "cliente" ? "clientes" : "calendario"}`,
  ].filter(Boolean);
  const when = event.allDay
    ? { start: { date: boliviaParts(start).day }, end: { date: addDays(boliviaParts(start).day, 1) } }
    : {
        start: { dateTime: start.toISOString(), timeZone: "America/La_Paz" },
        end: { dateTime: new Date(start.getTime() + (event.kind === "visita" ? 30 : 60) * 60_000).toISOString(), timeZone: "America/La_Paz" },
      };
  return {
    summary: event.title,
    description: details.join("\n"),
    ...(event.propertyTitle ? { location: event.propertyTitle } : {}),
    ...when,
    status: "confirmed",
    source: { title: "Zentro Urbano", url: `${origin}/cliente` },
    extendedProperties: { private: { zentro: "1" } },
  };
}
