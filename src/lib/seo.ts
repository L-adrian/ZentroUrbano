import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const defaultSeoImage = {
  url: absoluteUrl("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: "Zentro Urbano, alquileres directos con propietarios en Santa Cruz",
};

const defaultKeywords = [
  "alquiler directo Santa Cruz",
  "casas en alquiler Santa Cruz",
  "departamentos en alquiler Santa Cruz",
  "monoambientes en alquiler Santa Cruz",
  "alquiler dueño directo sin comisiones",
  "Zentro Urbano",
];

type SeoMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  noIndex?: boolean;
  keywords?: string[];
};

export function withBrand(title: string) {
  return title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;
}

export function buildSeoMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
  noIndex = false,
  keywords = defaultKeywords,
}: SeoMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const imageUrl = image ? absoluteUrl(image) : defaultSeoImage.url;
  const socialTitle = withBrand(title);
  const imageMetadata = {
    url: imageUrl,
    width: defaultSeoImage.width,
    height: defaultSeoImage.height,
    alt: imageAlt ?? defaultSeoImage.alt,
  };

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: "es_BO",
      type,
      images: [imageMetadata],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}
