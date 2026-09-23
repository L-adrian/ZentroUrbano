export function safeAuthNext(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return "/cliente";
  try {
    return new URL(value, "https://zentro.invalid").origin === "https://zentro.invalid" ? value : "/cliente";
  } catch { return "/cliente"; }
}

export const googleAuthMessages: Record<string, string> = {
  config: "Google no está configurado en este entorno. Puedes ingresar con tu correo o contactar a soporte.",
  callback: "La dirección de retorno de Google no coincide con este sitio. Contacta a soporte.",
  state: "La verificación de Google venció o se abrió en otro navegador. Inicia nuevamente desde esta página.",
  cancelled: "Cancelaste el acceso con Google. Puedes intentarlo nuevamente.",
  token: "Google no pudo validar el acceso. Intenta nuevamente; si persiste, contacta a soporte.",
  profile: "Google no devolvió un correo verificado. Prueba con otra cuenta.",
  account: "No pudimos acceder a tu cuenta. Contacta a soporte.",
  network: "No pudimos conectar con Google. Revisa tu conexión e intenta nuevamente.",
};
