"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Thin bar at the top while moving between pages: it starts on a click on an internal link (or a
// search form), creeps forward while the next page loads and fills up when it arrives.
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const safety = useRef<number | undefined>(undefined);

  useEffect(() => {
    function start() {
      window.clearInterval(timer.current);
      window.clearTimeout(safety.current);
      setProgress(8);
      // A click that ends up not navigating must not leave the bar stuck.
      safety.current = window.setTimeout(() => {
        window.clearInterval(timer.current);
        setProgress(null);
      }, 12000);
      timer.current = window.setInterval(() => setProgress((value) => (value === null ? null : value + (90 - value) * 0.08)), 200);
    }
    // Capture phase: next/link cancels the native click before it would bubble up here.
    function onClick(event: MouseEvent) {
      if ( event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement;
      if (event.defaultPrevented || form.method.toLowerCase() !== "get") return;
      if (new URL(form.action, window.location.href).origin === window.location.origin) start();
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      window.clearInterval(timer.current);
      window.clearTimeout(safety.current);
    };
  }, []);

  useEffect(() => {
    window.clearInterval(timer.current);
    window.clearTimeout(safety.current);
    const finish = window.setTimeout(() => setProgress((value) => (value === null ? null : 100)), 0);
    const hide = window.setTimeout(() => setProgress(null), 450);
    return () => {
      window.clearTimeout(finish);
      window.clearTimeout(hide);
    };
  }, [pathname, searchParams]);

  return <div className={`zu-route-progress${progress === null ? "" : " is-active"}`} aria-hidden="true">
    <span style={{ transform: `scaleX(${(progress ?? 0) / 100})` }} />
  </div>;
}
