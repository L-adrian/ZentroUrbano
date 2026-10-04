import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Mail, MessageCircle } from "lucide-react";
import { AdminSearchAlertActions } from "@/components/admin-search-alert-actions";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { readRentalSearchParams, searchRentals } from "@/lib/property-search";
import { getDirectRentals } from "@/lib/rentals";
import { formatAlertWhatsapp, normalizeAlertEmail } from "@/lib/search-alert-input";
import { listSearchAlerts, type SearchAlert } from "@/lib/search-alerts";
import { buildSeoMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = buildSeoMetadata({
  title: "Alertas de búsqueda",
  description: "Personas que pidieron un aviso cuando se publique una vivienda como la que buscan.",
  path: "/admin/alertas",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/La_Paz" });

function noticeText(alert: SearchAlert, matches: { title: string; slug: string }[]) {
  const greeting = alert.name ? `Hola ${alert.name}` : "Hola";
  const lines = matches.slice(0, 5).map((match) => `• ${match.title}: ${absoluteUrl(`/propiedades/${match.slug}`)}`);
  return [
    `${greeting}, te escribe Zentro Urbano por tu alerta: ${alert.summary}.`,
    matches.length === 1 ? "Hay una vivienda que coincide:" : `Hay ${matches.length} viviendas que coinciden:`,
    ...lines,
    `Ver la búsqueda completa: ${absoluteUrl(`/propiedades?${alert.params}`)}`,
    `Si ya no quieres estos avisos: ${absoluteUrl(`/alertas/baja/${alert.id}`)}`,
  ].join("\n");
}

export default async function AdminAlertsPage() {
  const [alerts, properties] = await Promise.all([listSearchAlerts(), getPublishedPropertiesData()]);
  const rentals = getDirectRentals(properties);
  const rows = (alerts ?? []).map((alert) => {
    const search = new URLSearchParams(alert.params);
    const filters = readRentalSearchParams(search);
    // A price typed in the search text is read in the currency the person was using.
    const currency = search.get("currency") === "USD" ? "USD" : "BOB";
    const results = searchRentals(rentals, filters, filters.priceCurrency ?? currency);
    const toLink = ({ property }: (typeof results)[number]) => ({ title: property.title, slug: property.slug });
    // Homes that may fit but did not say (pets "a consultar"...) are listed apart and never sent as matches.
    const matches = results.filter((match) => match.pending.length === 0).map(toLink);
    const toAsk = results.filter((match) => match.pending.length > 0).map(toLink);
    const email = alert.email && normalizeAlertEmail(alert.email) === alert.email ? alert.email : null;
    return { alert, matches, toAsk, email, text: noticeText(alert, matches) };
  });
  rows.sort((first, second) => Number(second.matches.length > 0) - Number(first.matches.length > 0));

  return (
    <main className="zu-container admin-alerts">
      <p className="zu-eyebrow"><BellRing size={16} /> ALERTAS</p>
      <h1>Personas esperando una vivienda</h1>
      <p className="admin-alerts-intro">
        Cada alerta guarda una búsqueda y un contacto con permiso. Cuando haya viviendas que coincidan, escríbele a la persona con el botón y marca la alerta como avisada. Nada se envía solo.
      </p>
      <p><Link href="/admin">Volver al panel</Link></p>
      {alerts === null ? (
        <p className="guide-note">Las alertas todavía no están activas: falta aplicar la migración 007_search_alerts en la base de datos. Mientras tanto, el botón &quot;Avísame&quot; ofrece enviar la búsqueda por WhatsApp.</p>
      ) : rows.length === 0 ? (
        <p className="guide-note">Todavía no hay alertas activas.</p>
      ) : (
        <ul className="admin-alert-list">
          {rows.map(({ alert, matches, toAsk, email, text }) => (
            <li key={alert.id}>
              <div className="admin-alert-head">
                <strong>{alert.name ?? "Sin nombre"}</strong>
                <span>{alert.whatsapp ? formatAlertWhatsapp(alert.whatsapp) : alert.email}</span>
              </div>
              <p>{alert.summary}</p>
              <p className="admin-alert-meta">
                Creada el {dateFormat.format(new Date(alert.createdAt))}
                {alert.lastNotifiedAt ? ` · Avisada por última vez el ${dateFormat.format(new Date(alert.lastNotifiedAt))}` : " · Nunca avisada"}
                {" · "}
                <Link href={`/propiedades?${alert.params}`}>Abrir la búsqueda</Link>
              </p>
              <p className={matches.length ? "admin-alert-matches has-matches" : "admin-alert-matches"}>
                {matches.length === 0 ? "Ninguna vivienda coincide por ahora." : `${matches.length} ${matches.length === 1 ? "vivienda coincide" : "viviendas coinciden"}: ${matches.slice(0, 3).map((match) => match.title).join(" · ")}${matches.length > 3 ? "…" : ""}`}
              </p>
              {toAsk.length > 0 ? (
                <p className="admin-alert-meta">
                  {`${toAsk.length} a consultar con el dueño (no dijo si cumple): ${toAsk.slice(0, 3).map((match) => match.title).join(" · ")}${toAsk.length > 3 ? "…" : ""}`}
                </p>
              ) : null}
              <div className="admin-alert-contact">
                {matches.length > 0 && alert.whatsapp ? (
                  <a href={`https://wa.me/${alert.whatsapp}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true" /> Escribir por WhatsApp</a>
                ) : null}
                {matches.length > 0 && email ? (
                  <a href={`mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${encodeURIComponent("Zentro Urbano: viviendas para tu alerta")}&body=${encodeURIComponent(text)}`}><Mail size={16} aria-hidden="true" /> Escribir por correo</a>
                ) : null}
                <AdminSearchAlertActions id={alert.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
