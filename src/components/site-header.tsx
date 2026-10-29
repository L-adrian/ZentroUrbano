"use client";

import { House, Search, MapPin, Plus, UserRound, Menu, LogOut, LayoutDashboard, MessageCircle, ArrowUpRight, BookOpen, Sparkles, UsersRound, KeyRound, Truck, ChevronDown, ArrowRight, Building2, LifeBuoy, Megaphone, ClipboardList } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { CurrencySelector } from "@/components/currency-preference";
import { RegionPicker } from "@/components/region-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";

type HeaderAccount = { authenticated?: boolean; label?: string | null; avatarUrl?: string | null; initials?: string | null; kind?: string | null };

// Two letters for the circle shown when the person has no photo (or it fails to load).
function initialsOf(account: HeaderAccount) {
  const saved = account.initials?.trim();
  if (saved) return Array.from(saved).slice(0, 2).join("").toUpperCase();
  const words = (account.label ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [Array.from(words[0])[0], Array.from(words[1])[0]] : Array.from(words[0] ?? "Z").slice(0, 2);
  return letters.join("").toUpperCase();
}

function AccountFace({ account, size, onBroken }: { account: HeaderAccount; size: number; onBroken: () => void }) {
  if (account.avatarUrl) {
    return <Image src={account.avatarUrl} alt="" width={size} height={size} unoptimized className="account-face" onError={onBroken} />;
  }
  return <span className="account-face account-initials" aria-hidden="true">{initialsOf(account)}</span>;
}

// "Servicios" opens on hover (or keyboard focus) a small panel that separates Zentro's own services
// for owners from the directory of other businesses. The panel is position: fixed because the nav
// clips its overflow. A click on "Servicios" still goes straight to /servicios.
function ServicesMenu({ pathname }: { pathname: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const width = 420;
  function open() {
    window.clearTimeout(closeTimer.current);
    const link = trigger.current?.getBoundingClientRect();
    if (!link) return;
    const left = Math.min(Math.max(16, link.left + link.width / 2 - width / 2), window.innerWidth - width - 16);
    setPosition({ top: link.bottom + 8, left, width });
  }
  function close(delay = 150) {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPosition(null), delay);
  }
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const active = pathname.startsWith("/servicios") || pathname.startsWith("/mudanza-y-hogar");
  return <div ref={wrapper} className={`header-services${position ? " is-open" : ""}`} onMouseEnter={open} onMouseLeave={() => close()} onFocus={open}
    onClick={(event) => { if ((event.target as HTMLElement).closest("a")) close(0); }}
    onBlur={(event) => { if (!wrapper.current?.contains(event.relatedTarget as Node)) close(0); }}
    onKeyDown={(event) => { if (event.key === "Escape") { close(0); trigger.current?.focus(); } }}>
    <Link ref={trigger} href="/servicios" aria-current={active ? "page" : undefined}><Sparkles size={17} />Servicios<ChevronDown size={13} strokeWidth={2.4} className="header-services-chevron" aria-hidden="true" /></Link>
    <div className="services-panel" style={position ?? undefined} hidden={!position}>
      <Link href="/servicios" className="services-option">
        <span className="services-option-icon"><KeyRound size={22} strokeWidth={1.8} /></span>
        <span><strong>Servicios Zentro</strong><small>Para dueños: fotos, anuncio destacado y paquetes hasta que se alquile.</small></span>
        <ArrowRight size={16} className="services-option-arrow" aria-hidden="true" />
      </Link>
      <Link href="/mudanza-y-hogar" className="services-option">
        <span className="services-option-icon services-option-truck"><Truck size={22} strokeWidth={1.8} /></span>
        <span><strong>Mudanza y hogar <em className="zu-new-badge">Nuevo</em></strong><small>Mudanzas, muebles, limpieza y más. Negocios de tu ciudad, contacto directo por WhatsApp.</small></span>
        <ArrowRight size={16} className="services-option-arrow" aria-hidden="true" />
      </Link>
      <p className="services-panel-foot"><span>¿Tienes un negocio?</span><Link href="/publicidad" className="services-panel-cta">Aparece aquí <ArrowRight size={14} aria-hidden="true" /></Link></p>
    </div>
  </div>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const [account, setAccount] = useState<HeaderAccount>({});
  const [brokenAvatar, setBrokenAvatar] = useState<string | null>(null);
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
  const isAliado = account.kind === "aliado";
  // An agency's agent has their own panel with only their clients.
  const isAgent = account.kind === "agente";
  const isOwner = account.authenticated && !isAliado && !isAgent;
  // A photo that fails to load (deleted file, expired Google link) falls back to the initials.
  const face: HeaderAccount = account.avatarUrl && account.avatarUrl === brokenAvatar ? { ...account, avatarUrl: null } : account;
  const markBroken = () => setBrokenAvatar(account.avatarUrl ?? null);
  const name = account.label || "Mi cuenta";
  // /cliente keeps its tab in the address hash. On that page a client-side link would only change
  // the hash without firing hashchange, so the tab would stay the same; the tab is switched
  // directly instead (null = the panel's first tab). Ctrl/Cmd/Shift-clicks keep opening a new tab.
  function accountTab(hash: string | null) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (pathname !== "/cliente" || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (menu.current) menu.current.open = false;
      if (hash) window.location.hash = hash;
      else if (window.location.hash) {
        window.history.pushState(null, "", window.location.pathname + window.location.search);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    };
  }
  const profileHash = isAliado ? "cuenta" : "perfil";
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
        <RegionPicker />
        <nav className="header-nav" aria-label="Navegación principal">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={17} />{label}</Link>)}
          <Link href="/bienvenida" aria-current={pathname === "/bienvenida" ? "page" : undefined}><BookOpen size={17} />Cómo funciona</Link>
          <ServicesMenu pathname={pathname} />
          <Link href="/nuestro-equipo" aria-current={pathname === "/nuestro-equipo" ? "page" : undefined}><UsersRound size={17} />Equipo</Link>
        </nav>
        <div className="header-actions">
          <Link href="/contacto" className="header-contact" aria-label="Contáctanos" title="Contáctanos" aria-current={pathname === "/contacto" ? "page" : undefined}><MessageCircle size={17} aria-hidden="true" /><span>Contáctanos</span></Link>
          <CurrencySelector className="header-currency" />
          <div className="header-theme"><ThemeToggle /></div>
          <Link href="/publicar" className="zu-button zu-button-primary header-publish"><Plus size={17} />Publicar alquiler</Link>
          <details ref={menu} className="account-menu">
            {account.authenticated
              ? <summary className="zu-icon-button account-trigger-avatar" aria-label={`Abrir menú de ${name}`} title="Tu cuenta y menú"><AccountFace account={face} size={36} onBroken={markBroken} /><span className="account-trigger-badge" aria-hidden="true"><Menu size={11} strokeWidth={2.4} /></span></summary>
              : <summary className="zu-icon-button" aria-label="Abrir menú de cuenta" title="Menú de cuenta"><Menu size={21} /></summary>}
            <div className="account-dropdown" onClick={(event) => { if ((event.target as HTMLElement).closest("a") && menu.current) menu.current.open = false; }}>
              {account.authenticated
                ? <Link href={`/cliente#${profileHash}`} className="menu-profile" onClick={accountTab(profileHash)}><AccountFace account={face} size={48} onBroken={markBroken} /><span><strong>{name}</strong><small>Ver mi perfil</small></span></Link>
                : <p>Bienvenido a Zentro Urbano</p>}
              <div className="menu-section" role="group" aria-labelledby="menu-title-perfil">
                <span className="menu-section-title" id="menu-title-perfil"><UserRound size={13} aria-hidden="true" />Tu perfil</span>
                <Link href={accountHref} onClick={account.authenticated ? accountTab(null) : undefined}><LayoutDashboard size={18} />{account.authenticated ? (isAliado ? "Panel de aliado" : isAgent ? "Mis clientes" : "Mi panel") : "Ingresar o crear cuenta"}<ArrowUpRight size={15} /></Link>
                {isOwner && <Link href="/cliente#anuncios" onClick={accountTab("anuncios")}><Megaphone size={18} />Mis anuncios</Link>}
                {isOwner && <Link href="/cliente/solicitudes"><ClipboardList size={18} />Mis solicitudes</Link>}
              </div>
              <div className="menu-section" role="group" aria-labelledby="menu-title-viviendas">
                <span className="menu-section-title" id="menu-title-viviendas"><Building2 size={13} aria-hidden="true" />Viviendas</span>
                <Link href="/propiedades"><Search size={18} />Explorar alquileres</Link>
                <Link href="/mapa"><MapPin size={18} />Buscar en el mapa</Link>
                <Link href="/publicar"><Plus size={18} />Publicar mi vivienda</Link>
                <Link href="/servicios"><KeyRound size={18} />Servicios Zentro</Link>
                <Link href="/mudanza-y-hogar" className="menu-new-link"><Truck size={18} />Mudanza y hogar<em className="zu-new-badge">Nuevo</em></Link>
              </div>
              <div className="menu-section" role="group" aria-labelledby="menu-title-ayuda">
                <span className="menu-section-title" id="menu-title-ayuda"><LifeBuoy size={13} aria-hidden="true" />Ayuda y soporte</span>
                <Link href="/bienvenida" aria-current={pathname === "/bienvenida" ? "page" : undefined}><BookOpen size={18} />Cómo funciona</Link>
                <Link href="/ayuda"><MessageCircle size={18} />Centro de ayuda</Link>
                <Link href="/nuestro-equipo" aria-current={pathname === "/nuestro-equipo" ? "page" : undefined}><UsersRound size={18} />Nuestro equipo</Link>
                <SupportWhatsAppButton />
              </div>
              <div className="menu-section menu-preferences" role="group" aria-labelledby="menu-title-preferencias">
                <span className="menu-section-title" id="menu-title-preferencias">Preferencias</span>
                <div className="menu-preferences-row">
                  <div className="menu-currency"><span>Moneda</span><CurrencySelector /></div>
                  <div className="menu-theme"><span>Tema</span><ThemeToggle /></div>
                </div>
              </div>
              {account.authenticated && <div className="menu-section menu-signout"><button type="button" onClick={signout}><LogOut size={18} />Cerrar sesión</button></div>}
            </div>
          </details>
        </div>
      </div>
    </header>
    <nav className="mobile-navigation" aria-label="Navegación móvil">
      {[{ href: "/", label: "Inicio", icon: House }, ...links, { href: "/publicar", label: "Publicar", icon: Plus }, { href: accountHref, label: "Mi cuenta", icon: account.authenticated ? LayoutDashboard : UserRound }].map(({ href, label, icon: Icon }) =>
        href === accountHref && account.authenticated
          ? <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={accountTab(null)}><span className="mobile-nav-face"><AccountFace account={face} size={21} onBroken={markBroken} /></span><span>{label}</span></Link>
          : <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={21} strokeWidth={1.7} /><span>{label}</span></Link>)}
    </nav>
  </>;
}
