import type { MetadataRoute } from "next";
import { getPublishedPropertiesData } from "@/lib/property-data";
import {
  getDepartmentSeoRoutes,
  getOperationSeoRoutes,
} from "@/lib/seo-routes";
import { absoluteUrl } from "@/lib/site";
import { getDirectRentals } from "@/lib/rentals";

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
  "/publicidad",
  "/contacto",
  "/terminos",
  "/privacidad",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const publishedProperties = getDirectRentals(await getPublishedPropertiesData());

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
  ];
}
