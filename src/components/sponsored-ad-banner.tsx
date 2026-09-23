"use client";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { getActiveSponsoredAds } from "@/lib/sponsored-ads";
import { trackAnalyticsEvent } from "@/lib/analytics-events";

export function SponsoredAdBanner() {
  const element = useRef<HTMLElement>(null);
  const ad = getActiveSponsoredAds()[0];
  useEffect(() => {
    if (!ad || !element.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        trackAnalyticsEvent("ad_impression", { ad_id: ad.id, advertiser: ad.advertiser, placement: "home_inline" });
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [ad]);
  if (!ad) return null;
  return <aside ref={element} className="inline-ad" aria-label="Publicidad">
    <Image src={ad.image} alt={ad.imageAlt} width={120} height={80} sizes="100px" quality={72} />
    <div><span>PUBLICIDAD</span><strong>{ad.advertiser}</strong><p>{ad.label}</p></div>
    <a href={`/api/ads/${ad.id}/click`} className="zu-button zu-button-secondary" rel="sponsored">Ver información <ArrowUpRight size={16} /></a>
  </aside>;
}
