"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BarChart3, BellRing, Box, CalendarDays, ClipboardList, Contact, House, MapPinned, Megaphone, UsersRound, type LucideIcon } from "lucide-react";

type AdminNavItem = { href: string; label: string; icon: LucideIcon; badge?: "requests" };

const groups: { title: string; items: AdminNavItem[] }[] = [
  { title: "Inicio", items: [{ href: "/admin", label: "Resumen", icon: House }] },
  {
    title: "Anuncios",
    items: [
      { href: "/admin/solicitudes", label: "Solicitudes", icon: ClipboardList, badge: "requests" },
      { href: "/admin/anuncios", label: "Avisos y ubicación", icon: MapPinned },
      { href: "/admin/recorridos", label: "Recorridos 3D", icon: Box },
    ],
  },
  {
    title: "Personas",
    items: [
      { href: "/admin/cuentas", label: "Cuentas y contactos", icon: Contact },
      { href: "/admin/alertas", label: "Alertas de búsqueda", icon: BellRing },
      { href: "/admin/equipo", label: "Equipo y visitas", icon: UsersRound },
      { href: "/admin/aliados", label: "Calendario de aliados", icon: CalendarDays },
    ],
  },
  {
    title: "Datos",
    items: [
      { href: "/admin/estadisticas", label: "Qué hizo la gente", icon: BarChart3 },
      { href: "/admin/publicidad", label: "Publicidad", icon: Megaphone },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ pendingRequests }: { pendingRequests: number }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  // On phones the menu scrolls sideways, so the current section is brought into view.
  useEffect(() => {
    nav.current?.querySelector<HTMLElement>("[aria-current='page']")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav ref={nav} className="admin-nav" aria-label="Secciones del admin">
      <p className="admin-nav-title">Administración</p>
      {groups.map((group) => (
        <div key={group.title} className="admin-nav-group">
          <p className="admin-nav-group-title">{group.title}</p>
          {group.items.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(pathname, href);
            const count = badge === "requests" ? pendingRequests : 0;
            return (
              <Link key={href} href={href} className={`admin-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
                {count > 0 && <b className="admin-nav-badge" aria-label={`${count} por revisar`}>{count}</b>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
