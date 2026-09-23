"use client";

import { ExternalLink, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getActiveSponsoredAds,
  sponsoredAdFrequencyMinutes,
  type SponsoredAd,
} from "@/lib/sponsored-ads";
import { trackAnalyticsEvent } from "@/lib/analytics-events";

const storageKey = "morada.sponsoredAd.nextAt";
const initialDelayMs = 15_000;
const rotationDelayMs = sponsoredAdFrequencyMinutes * 60 * 1000;
const hiddenPathPrefixes = ["/admin", "/cliente", "/login", "/publicidad", "/privacidad", "/terminos"];
const mobileScrollThresholdPx = 420;
const compactViewportQuery = "(max-width: 900px), (hover: none), (pointer: coarse)";

export function SponsoredAdPopup() {
  const pathname = usePathname();
  const ads = useMemo(() => getActiveSponsoredAds(), []);
  const [activeAd, setActiveAd] = useState<SponsoredAd | null>(null);
  const [adIndex, setAdIndex] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [hasMobileScrollDepth, setHasMobileScrollDepth] = useState(false);

  const shouldHideOnPath = hiddenPathPrefixes.some((prefix) => pathname.startsWith(prefix));
  const waitingForMobileScroll = isMobileViewport && !hasMobileScrollDepth;

  useEffect(() => {
    const mediaQuery = window.matchMedia(compactViewportQuery);

    function syncViewportState() {
      const isMobile = mediaQuery.matches;
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      setIsMobileViewport(isMobile);
      setHasMobileScrollDepth(!isMobile || scrollY >= mobileScrollThresholdPx);
    }

    syncViewportState();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewportState);
    } else {
      mediaQuery.addListener(syncViewportState);
    }
    window.addEventListener("scroll", syncViewportState, { passive: true });

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", syncViewportState);
      } else {
        mediaQuery.removeListener(syncViewportState);
      }
      window.removeEventListener("scroll", syncViewportState);
    };
  }, []);

  useEffect(() => {
    if (shouldHideOnPath || waitingForMobileScroll || ads.length === 0 || activeAd) {
      return;
    }

    const now = Date.now();
    const nextAt = Number(window.localStorage.getItem(storageKey) ?? "0");
    const delay = Math.max(initialDelayMs, nextAt - now);

    const timer = window.setTimeout(() => {
      const nextAd = ads[adIndex % ads.length];
      setActiveAd(nextAd);
      trackAnalyticsEvent("ad_impression", getAdAnalyticsParams(nextAd, pathname));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeAd, adIndex, ads, pathname, shouldHideOnPath, waitingForMobileScroll]);

  if (isMobileViewport || !activeAd || shouldHideOnPath) {
    return null;
  }

  const closeAd = () => {
    window.localStorage.setItem(storageKey, String(Date.now() + rotationDelayMs));
    setActiveAd(null);
    setAdIndex((current) => current + 1);
  };

  const handleAdClick = () => {
    trackAnalyticsEvent("ad_click", getAdAnalyticsParams(activeAd, pathname));
    closeAd();
  };

  return (
    <aside
      aria-label="Publicidad"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-4 right-4 z-[70] sm:bottom-6 sm:left-auto sm:right-6 sm:w-[360px]"
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(20,20,20,0.22)] ring-1 ring-black/5">
        <button
          type="button"
          onClick={closeAd}
          aria-label="Cerrar publicidad"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/92 text-neutral-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21352b]/15"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <a
          href={`/api/ads/${activeAd.id}/click`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleAdClick}
          className="group block"
        >
          <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100">
            <Image
              src={activeAd.image}
              alt={activeAd.imageAlt}
              fill
              sizes="(max-width: 640px) calc(100vw - 32px), 420px"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.62))]" />
            <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-700 shadow-sm backdrop-blur">
              Publicidad
            </span>
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/72">
                {activeAd.label}
              </p>
              <div className="mt-1 flex items-end justify-between gap-4">
                <h2 className="text-xl font-semibold leading-tight tracking-tight">
                  {activeAd.advertiser}
                </h2>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 transition group-hover:scale-105">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </a>
      </div>
    </aside>
  );
}

function getAdAnalyticsParams(ad: SponsoredAd, pathname: string) {
  return {
    ad_id: ad.id,
    ad_advertiser: ad.advertiser,
    ad_label: ad.label,
    ad_placement: pathname,
  };
}
