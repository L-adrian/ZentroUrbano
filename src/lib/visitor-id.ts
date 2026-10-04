import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

// Anonymous device id, so public view counts count people instead of page loads.
// It holds no personal data and is only set from route handlers.
export const visitorCookieName = "zu_vid";
const visitorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const oneYearSeconds = 60 * 60 * 24 * 365;

export async function getOrCreateVisitorId() {
  const store = await cookies();
  const current = store.get(visitorCookieName)?.value;
  if (current && visitorIdPattern.test(current)) return current;
  const visitorId = randomUUID();
  store.set(visitorCookieName, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: oneYearSeconds,
    path: "/",
  });
  return visitorId;
}
