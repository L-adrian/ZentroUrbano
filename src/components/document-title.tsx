"use client";

import { useEffect } from "react";

// For pages that cannot export metadata, like not-found.tsx: sets the browser tab title after load.
// Next writes the layout title after hydration, so the title is applied again whenever it changes.
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    const apply = () => { if (document.title !== title) document.title = title; };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
  return null;
}
