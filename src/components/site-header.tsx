"use client";

import { House, Search, MapPin, Plus, UserRound, Menu, LogOut, LayoutDashboard, MessageCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CurrencySelector } from "@/components/currency-preference";
import { ThemeToggle } from "@/components/theme-toggle";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const [account, setAccount] = useState<{ authenticated?: boolean; label?: string }>({});
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setAccount(data);
        }
      } catch { /* Navigation remains available offline. */ }
    }
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && menu.current) menu.current.open = false; };
    const closeOutside = (event: Event) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false; };
    void sync();
    window.addEventListener("morada-session", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => { cancelled = true; window.removeEventListener("morada-session", sync); window.removeEventListener("focus", sync); window.removeEventListener("keydown", escape); document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("focusin", closeOutside); };
  }, []);
  const links = [
    { href: "/propiedades", label: "Explorar", icon: Search },
    { href: "/mapa", label: "Mapa", icon: MapPin },
  ];
  const accountHref = account.authenticated ? "/cliente" : "/login";
  async function signout() {
    const response = await fetch("/api/auth/signout", { method: "POST" });
    if (!response.ok) return;
    setAccount({});
    if (menu.current) menu.current.open = false;
    window.dispatchEvent(new Event("morada-session"));
    router.push("/");
  }
  return <>
    <a href="#contenido" className="zu-skip-link">Ir al contenido</a>
    <header className="zu-header">
      <div className="zu-container header-inner">
        <Link href="/" className="zu-logo" aria-label="Zentro Urbano, inicio"><span className="logo-mark"><House size={22} strokeWidth={1.8} /></span><span>Zentro<span className="logo-accent">Urbano</span></span></Link>
        <nav className="header-nav" aria-label="Navegación principal">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={17} />{label}</Link>)}
        </nav>
        <div className="header-actions">
          <CurrencySelector className="header-currency" />
          <ThemeToggle />
          <Link href="/publicar" className="zu-button zu-button-primary header-publish"><Plus size={17} />Publicar alquiler</Link>
          <details ref={menu} className="account-menu">
            <summary className="zu-icon-button" aria-label="Abrir menú de cuenta" title="Menú de cuenta"><Menu size={21} /></summary>
            <div className="account-dropdown" onClick={(event) => { if ((event.target as HTMLElement).closest("a") && menu.current) menu.current.open = false; }}>
              <p>{account.authenticated ? account.label || "Mi cuenta" : "Bienvenido a Zentro Urbano"}</p>
              <Link href={accountHref}><UserRound size={18} />{account.authenticated ? "Mi panel" : "Ingresar o crear cuenta"}<ArrowUpRight size={15} /></Link>
              {account.authenticated && <Link href="/cliente/solicitudes"><LayoutDashboard size={18} />Mis solicitudes</Link>}
              <Link href="/propiedades"><Search size={18} />Explorar alquileres</Link>
              <Link href="/mapa"><MapPin size={18} />Buscar en el mapa</Link>
              <Link href="/publicar"><Plus size={18} />Publicar mi vivienda</Link>
              <Link href="/bienvenida"><House size={18} />Conoce Zentro Urbano</Link>
              <Link href="/ayuda"><MessageCircle size={18} />Centro de ayuda</Link>
              <SupportWhatsAppButton />
              <div className="menu-currency"><span>Moneda</span><CurrencySelector /></div>
              {account.authenticated && <button type="button" onClick={signout}><LogOut size={18} />Cerrar sesión</button>}
            </div>
          </details>
        </div>
      </div>
    </header>
    <nav className="mobile-navigation" aria-label="Navegación móvil">
      {[{ href: "/", label: "Inicio", icon: House }, ...links, { href: "/publicar", label: "Publicar", icon: Plus }, { href: accountHref, label: "Mi cuenta", icon: account.authenticated ? LayoutDashboard : UserRound }].map(({ href, label, icon: Icon }) =>
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={21} strokeWidth={1.7} /><span>{label}</span></Link>)}
    </nav>
  </>;
}
