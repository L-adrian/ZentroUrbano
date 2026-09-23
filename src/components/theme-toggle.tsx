"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function applyTheme(dark: boolean) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", dark);
  window.dispatchEvent(new Event("zu-theme"));
}

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("zu-theme"); } catch { /* Storage may be disabled. */ }
    applyTheme(saved ? saved === "dark" : media.matches);
  };
  window.addEventListener("zu-theme", callback);
  window.addEventListener("storage", sync);
  if (media.addEventListener) media.addEventListener("change", sync);
  else media.addListener(sync);
  return () => {
    window.removeEventListener("zu-theme", callback);
    window.removeEventListener("storage", sync);
    if (media.removeEventListener) media.removeEventListener("change", sync);
    else media.removeListener(sync);
  };
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "dark", () => false);
  const label = dark ? "Activar modo claro" : "Activar modo nocturno";
  return (
    <button type="button" className="zu-icon-button" aria-label={label} title={label}
      onClick={() => {
        try { localStorage.setItem("zu-theme", dark ? "light" : "dark"); } catch { /* Keep the choice for this page. */ }
        applyTheme(!dark);
      }}>
      {dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  );
}
