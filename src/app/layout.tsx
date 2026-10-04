import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";


import { Suspense, type ReactNode } from "react";
import { CatalogCardClicks } from "@/components/catalog-card-clicks";
import { GoogleAnalytics } from "@/components/google-analytics";
import { PushAd } from "@/components/push-ad";
import { RouteProgress } from "@/components/route-progress";
import { SplashScreen } from "@/components/splash-screen";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { splashScript } from "@/lib/splash";
import { themeScript } from "@/lib/theme";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";
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
    default: "Zentro Urbano | Alquiler directo con dueños en Santa Cruz",
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
    title: "Zentro Urbano | Alquiler directo con dueños en Santa Cruz",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "es_BO",
    type: "website",
    images: [
      {
        url: absoluteUrl("/images/og/zentro-urbano.png"),
        width: 1200,
        height: 630,
        alt: "Zentro Urbano, alquiler directo con propietarios en Bolivia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zentro Urbano | Alquiler directo con dueños en Santa Cruz",
    description: siteConfig.description,
    images: [absoluteUrl("/images/og/zentro-urbano.png")],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Google Search Console ownership check; set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION on the server.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#151918" }],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-BO" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /><script dangerouslySetInnerHTML={{ __html: splashScript }} /><script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript([organizationJsonLd(), websiteJsonLd()])} /></head>
      <body className="flex min-h-full flex-col">
        <SplashScreen />
        <Suspense fallback={null}><RouteProgress /></Suspense>
        <SiteHeader />
        {children}
        <CatalogCardClicks />
        <PushAd />
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        <SiteFooter />
      </body>
    </html>
  );
}
