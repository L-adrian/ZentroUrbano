"use client";

import { Megaphone, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";
import { getSponsoredAdsFor, type SponsoredAd } from "@/lib/sponsored-ads";

// Small ad that slides in from the right edge; closing it hides it for the rest of the visit.
// It shows a paying advertiser when there is one (a different one each visit), otherwise our own "Publicita aquí".
const dismissedKey = "zu-push-ad-closed";
const turnKey = "zu-push-ad-turn";
const showDelayMs = 4000;
const hiddenPathPrefixes = ["/admin", "/cliente", "/login", "/auth", "/publicar", "/publicidad", "/servicios", "/lista", "/equipo", "/privacidad", "/terminos"];

export function PushAd() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ad, setAd] = useState<SponsoredAd | null>(null);
  const hiddenOnPath = hiddenPathPrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (dismissed || hiddenOnPath) return;
    const timer = window.setTimeout(() => {
      let closedThisVisit = false;
      try {
        closedThisVisit = window.sessionStorage.getItem(dismissedKey) === "1";
      } catch {}
      if (closedThisVisit) {
        setDismissed(true);
        return;
      }
      const sponsored = pickAdvertiser();
      setAd(sponsored);
      setVisible(true);
      if (sponsored) trackAnalyticsEvent("ad_impression", { ad_id: sponsored.id, ad_advertiser: sponsored.advertiser, ad_placement: window.location.pathname });
    }, showDelayMs);
    return () => window.clearTimeout(timer);
  }, [dismissed, hiddenOnPath]);

  if (dismissed || hiddenOnPath) return null;

  const close = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(dismissedKey, "1");
    } catch {}
    window.setTimeout(() => setDismissed(true), 500);
  };

  return (
    <aside className={`push-ad${visible ? " is-visible" : ""}`} aria-label="Publicidad" aria-hidden={!visible}>
      <div className="push-ad-top">
        <span>Publicidad</span>
        <button type="button" onClick={close} aria-label="Cerrar publicidad" tabIndex={visible ? 0 : -1}>
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      {ad ? (
        <a href={`/api/ads/${ad.id}/click`} className="push-ad-body" target="_blank" rel="noopener noreferrer sponsored" tabIndex={visible ? 0 : -1}>
          <span className="push-ad-logo is-brand">
            <Image src={ad.logo ?? ad.image} alt={ad.imageAlt} width={150} height={64} sizes="160px" />
          </span>
          <strong>{ad.advertiser}</strong>
          <small>{ad.label}</small>
        </a>
      ) : (
        <Link href="/publicidad" className="push-ad-body" tabIndex={visible ? 0 : -1}>
          <span className="push-ad-logo"><Megaphone size={26} strokeWidth={1.8} aria-hidden="true" /></span>
          <strong>Publicita aquí</strong>
          <small>Tu logo frente a quienes buscan alquiler en Santa Cruz</small>
        </Link>
      )}
    </aside>
  );
}

// Advertisers take turns: each visit shows the next one in the list.
function pickAdvertiser() {
  const ads = getSponsoredAdsFor("global");
  if (ads.length === 0) return null;
  let turn = 0;
  try {
    turn = Number(window.localStorage.getItem(turnKey)) || 0;
    window.localStorage.setItem(turnKey, String(turn + 1));
  } catch {}
  return ads[turn % ads.length];
}
