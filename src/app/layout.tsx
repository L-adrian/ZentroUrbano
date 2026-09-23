import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";


import type { ReactNode } from "react";
import { GoogleAnalytics } from "@/components/google-analytics";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { themeScript } from "@/lib/theme";
import { absoluteUrl, siteConfig } from "@/lib/site";
import "./globals.css";
import "./redesign.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Zentro Urbano | Alquiler directo en Bolivia",
    template: "%s | Zentro Urbano",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "alquiler directo Bolivia",
    "alquiler sin inmobiliaria",
    "casas en alquiler Santa Cruz",
    "departamentos en alquiler Santa Cruz",
    "alquiler SCZ",
    "Zentro Urbano",
  ],
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "Zentro Urbano | Alquiler directo en Bolivia",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "es_BO",
    type: "website",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "Zentro Urbano, alquiler directo con propietarios en Bolivia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zentro Urbano | Alquiler directo en Bolivia",
    description: siteConfig.description,
    images: [absoluteUrl("/opengraph-image")],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#151918" }],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        <SiteFooter />
      </body>
    </html>
  );
}
