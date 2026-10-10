"use client";

import { Megaphone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Small house ad that slides in from the right edge; closing it hides it for the rest of the visit.
const dismissedKey = "zu-push-ad-closed";
const showDelayMs = 4000;
const hiddenPathPrefixes = ["/admin", "/cliente", "/login", "/auth", "/publicar", "/publicidad", "/servicios", "/lista", "/equipo", "/privacidad", "/terminos"];

export function PushAd() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hiddenOnPath = hiddenPathPrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (dismissed || hiddenOnPath) return;
    const timer = window.setTimeout(() => {
      let closedThisVisit = false;
      try {
        closedThisVisit = window.sessionStorage.getItem(dismissedKey) === "1";
      } catch {}
      if (closedThisVisit) setDismissed(true);
      else setVisible(true);
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
      <Link href="/publicidad" className="push-ad-body" tabIndex={visible ? 0 : -1}>
        <span className="push-ad-logo"><Megaphone size={26} strokeWidth={1.8} aria-hidden="true" /></span>
        <strong>Publicita aquí</strong>
        <small>Tu logo frente a quienes buscan alquiler en Santa Cruz</small>
      </Link>
    </aside>
  );
}
