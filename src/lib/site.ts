export const siteConfig = {
  name: "Zentro Urbano",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://zentrourbano.com",
  description:
    "Alquileres directos entre propietarios e inquilinos en Bolivia, sin inmobiliarias ni comisiones.",
  whatsapp:
    process.env.NEXT_PUBLIC_ZENTRO_URBANO_WHATSAPP ??
    process.env.NEXT_PUBLIC_JATATA_WHATSAPP ??
    process.env.NEXT_PUBLIC_MORADA_WHATSAPP ??
    "59178504969",
  phoneDisplay: "+591 78504969",
  email:
    process.env.NEXT_PUBLIC_ZENTRO_URBANO_EMAIL ??
    process.env.NEXT_PUBLIC_JATATA_EMAIL ??
    process.env.NEXT_PUBLIC_MORADA_EMAIL ??
    "purplemangoadrian@gmail.com",
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function whatsappUrl(message: string) {
  return `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(message)}`;
}
