// What a new email account must look like. Bots tend to send links or random strings as the name,
// throwaway inboxes as the email and very common passwords.

// Throwaway inbox services. Not complete, but it covers the ones sign-up bots use most.
const disposableDomains = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "anonbox.net", "burnermail.io",
  "discard.email", "dispostable.com", "dropmail.me", "emailondeck.com", "fakeinbox.com", "fakemail.net",
  "getairmail.com", "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de", "guerrillamail.info",
  "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com", "inboxkitten.com",
  "jetable.org", "mail.tm", "mailcatch.com", "maildrop.cc", "mailinator.com", "mailinator.net", "mailnesia.com",
  "mailpoof.com", "mintemail.com", "moakt.com", "mohmal.com", "mytemp.email", "nada.email", "sharklasers.com",
  "spam4.me", "spambox.us", "spamgourmet.com", "temp-mail.io", "temp-mail.org", "tempail.com", "tempmail.com",
  "tempmail.dev", "tempmail.net", "tempmailo.com", "tempr.email", "throwawaymail.com", "trashmail.com",
  "trashmail.de", "trashmail.net", "yopmail.com", "yopmail.fr", "yopmail.net", "emailfake.com", "fakemailgenerator.com",
]);

const commonPasswords = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "password", "password1",
  "contraseña", "contrasena", "qwertyui", "qwerty123", "asdfghjk", "abcdefgh", "abc12345", "12345abc",
  "iloveyou", "zentrourbano", "bolivia1", "santacruz",
]);

export const signupLimits = { name: 80, email: 190, passwordBytes: 72, passwordMin: 8 } as const;

export function normalizeSignupEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > signupLimits.email) return null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

export function isDisposableEmail(email: string) {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const parts = domain.split(".");
  // "x.mailinator.com" counts as mailinator.com.
  return parts.some((_, index) => disposableDomains.has(parts.slice(index).join(".")));
}

// A person's name: letters, spaces, apostrophes, dots and hyphens; no links, numbers or "@".
export function normalizeSignupName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > signupLimits.name) return null;
  if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(name)) return null;
  if ((name.match(/\p{L}/gu) ?? []).length < 2) return null;
  // "J. Pérez" is a name; "www.sitio.com" is a link.
  if (/\.\p{L}/u.test(name) || /\b(www|http|https)\b/i.test(name)) return null;
  // The same letter 5 times in a row, or a long word with no vowels, is keyboard mashing.
  if (/(\p{L})\1{4,}/u.test(name) || name.split(" ").some((word) => word.length >= 7 && !/[aeiouáéíóúüy]/i.test(word))) return null;
  return name;
}

export type SignupCheck =
  | { ok: true; name: string; email: string }
  | { ok: false; field: "name" | "email" | "password"; message: string };

export function checkSignup(input: { displayName?: unknown; email?: unknown; password?: unknown }): SignupCheck {
  const name = normalizeSignupName(input.displayName);
  if (!name) return { ok: false, field: "name", message: "Escribe tu nombre y apellido, solo con letras." };
  const email = normalizeSignupEmail(input.email);
  if (!email) return { ok: false, field: "email", message: "Revisa tu correo: debe ser como nombre@gmail.com." };
  if (isDisposableEmail(email)) return { ok: false, field: "email", message: "Usa un correo personal; no aceptamos correos temporales." };
  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < signupLimits.passwordMin || new TextEncoder().encode(password).length > signupLimits.passwordBytes) {
    return { ok: false, field: "password", message: "La contraseña debe tener entre 8 y 72 caracteres." };
  }
  if (isWeakPassword(password, email)) {
    return { ok: false, field: "password", message: "Esa contraseña es muy fácil de adivinar. Elige otra." };
  }
  return { ok: true, name, email };
}

// Common passwords, the email itself or one repeated character. Shared by sign-up and Mi cuenta.
export function isWeakPassword(password: string, email: string) {
  const lowered = password.toLowerCase();
  const address = email.toLowerCase();
  return commonPasswords.has(lowered) || lowered === address || lowered === address.split("@")[0] || /^(.)\1+$/.test(password);
}
