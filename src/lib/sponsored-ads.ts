export type SponsoredAdPlacement = "global" | "home" | "property" | "map" | "search";

export type SponsoredAd = {
  id: string;
  advertiser: string;
  label: string;
  // Logo shown in the corner box (about 150x64); falls back to the photo.
  logo?: string;
  image: string;
  imageAlt: string;
  targetUrl: string;
  placement: SponsoredAdPlacement[];
  active: boolean;
};

export const sponsoredAdFrequencyMinutes = 5;

// Paying advertisers. To add one: put their logo in public/images/anunciantes/, add an entry with
// targetUrl set to their WhatsApp (https://wa.me/591...) and active: true. Clicks go through
// /api/ads/[id]/click, and /admin/publicidad shows views and clicks per advertiser.
export const sponsoredAds: SponsoredAd[] = [
  {
    id: "mudanzas-santa-cruz-demo",
    advertiser: "Mudanzas Prime Santa Cruz",
    label: "Mudanza residencial",
    image: "/images/ad-mudanzas-prime.jpg",
    imageAlt: "Servicio de mudanza residencial con cajas organizadas",
    targetUrl: "/publicidad?utm_source=zentro_ad&utm_medium=banner&utm_campaign=mudanzas_prime",
    placement: ["global", "property", "search"],
    active: false,
  },
  {
    id: "inmobiliaria-destacada-demo",
    advertiser: "Nova Urbana Inmobiliaria",
    label: "Inmobiliaria destacada",
    image: "/images/ad-nova-urbana.jpg",
    imageAlt: "Agente inmobiliario entregando llaves en una propiedad moderna",
    targetUrl: "/publicidad?utm_source=zentro_ad&utm_medium=banner&utm_campaign=inmobiliaria_destacada",
    placement: ["global", "home", "map"],
    active: false,
  },
];

export function getActiveSponsoredAds() {
  return sponsoredAds.filter((ad) => ad.active);
}

export function getSponsoredAdsFor(placement: SponsoredAdPlacement) {
  return getActiveSponsoredAds().filter((ad) => ad.placement.includes(placement));
}

export function getSponsoredAdById(id: string) {
  return sponsoredAds.find((ad) => ad.id === id && ad.active);
}
