import { timingSafeEqual } from "node:crypto";

export function configuredAdminUser() {
  return process.env.ZENTRO_URBANO_ADMIN_USER || process.env.JATATA_ADMIN_USER || process.env.MORADA_ADMIN_USER || "zentro";
}
export function configuredAdminPassword() {
  return process.env.ZENTRO_URBANO_ADMIN_PASSWORD || process.env.JATATA_ADMIN_PASSWORD || process.env.MORADA_ADMIN_PASSWORD;
}
export function authenticatedAdmin(headers:Headers):string|null {
  const secret=configuredAdminPassword();
  const header=headers.get("authorization");
  if (!secret || !header?.startsWith("Basic ")) return null;
  try {
    const decoded=Buffer.from(header.slice(6),"base64").toString("utf8");
    const colon=decoded.indexOf(":");
    if (colon < 0) return null;
    const supplied=Buffer.from(decoded.slice(colon+1));
    const expected=Buffer.from(secret);
    return decoded.slice(0,colon) === configuredAdminUser() && supplied.length === expected.length && timingSafeEqual(supplied,expected) ? configuredAdminUser() : null;
  } catch { return null; }
}

export function sameOriginAdminMutation(request:Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin=request.headers.get("origin");
  const host=(request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host).split(",")[0].trim();
  const protocol=(request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":","")).split(",")[0].trim();
  return origin === `${protocol}://${host}` && request.headers.get("content-type")?.split(";")[0] === "application/json";
}
