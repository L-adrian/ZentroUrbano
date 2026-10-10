import type { MetadataRoute } from "next";
import { getPublishedPropertiesData } from "@/lib/property-data";
import {
  getCitySeoRoutes,
  getDepartmentSeoRoutes,
  getNeedSeoRoutes,
  getOperationSeoRoutes,
} from "@/lib/seo-routes";
import { absoluteUrl } from "@/lib/site";
import { getDirectRentals } from "@/lib/rentals";
import { guides } from "@/lib/guides";
import { servicePackages, services } from "@/lib/services";

export const dynamic = "force-dynamic";

const staticRoutes = [
  "/",
  "/bienvenida",
  "/propiedades",
  "/mapa",
  "/preguntas-frecuentes",
  "/ayuda",
  "/requisitos",
  "/seguridad",
  "/guias",
  "/lista",
  ...guides.map((guide) => `/guias/${guide.slug}`),
  "/publicidad",
  "/servicios",
  "/servicios/individuales",
  "/servicios/inquilinos",
  ...services.filter((service) => !service.comingSoon).map((service) => `/servicios/${service.slug}`),
  ...servicePackages.map((pkg) => `/servicios/paquetes/${pkg.slug}`),
  "/contacto",
  "/terminos",
  "/privacidad",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Demo listings ("Ficha de prueba") are noindex and stay out of the sitemap and zone routes.
  const publishedProperties = getDirectRentals(await getPublishedPropertiesData()).filter(
    (property) => !property.isSeeded,
  );

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: now,
      changeFrequency: route === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "/" ? 1 : 0.7,
    })),
    ...publishedProperties.map((property) => ({
      url: absoluteUrl(`/propiedades/${property.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...getCitySeoRoutes(publishedProperties).map((route) => ({
      url: absoluteUrl(`/${route.operation}/${route.city}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...getOperationSeoRoutes(publishedProperties).map((route) => ({
      url: absoluteUrl(`/${route.operation}/${route.city}/${route.zone}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.78,
    })),
    ...getDepartmentSeoRoutes(publishedProperties).map((route) => ({
      url: absoluteUrl(`/departamentos/${route.zone}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.76,
    })),
    // Need pages ("monoambientes", "con mascotas", "hasta Bs 2.000") only with 3 or more real listings.
    ...getNeedSeoRoutes(publishedProperties).map((route) => ({
      url: absoluteUrl(`/${route.operation}/${route.city}/${route.need}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.74,
    })),
  ];
}
