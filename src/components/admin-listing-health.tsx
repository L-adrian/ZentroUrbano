"use client";

import { CheckCircle2, ClockAlert, ExternalLink, LoaderCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import type { AdminListingCheck, AdminReportedListing } from "@/lib/admin-accounts";
import { formatBoliviaDay, ownerWhatsappLink } from "@/lib/listing-moderation";
import { availabilityFreshDays, availabilityReportLimit } from "@/lib/listing-summary";
import { reportReasonPriority, reportReasons, supportHoursLabel } from "@/lib/property-reports";
import { absoluteUrl } from "@/lib/site";
import "./listing-tones.css";

export function AdminListingHealth({ checks, reported }: { checks: AdminListingCheck[]; reported: AdminReportedListing[] }) {
  return (
    <div className="zu-tones grid gap-6">
      <section id="anuncios-con-avisos" className="rounded-[32px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="admin-reports-title">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8b4b31]">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Reportes de inquilinos
        </p>
        <h2 id="admin-reports-title" className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          Anuncios con avisos
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Últimos 60 días, una vez por persona y motivo. Primero los que dicen que pidieron dinero antes de la visita.
          Soporte atiende {supportHoursLabel}.
        </p>
        {reported.length === 0 ? (
          <p className="mt-5 rounded-[20px] border border-dashed border-black/15 bg-neutral-50 p-4 text-sm text-neutral-600">No hay avisos.</p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {reported.map((item) => (
              <li key={item.slug} className={`rounded-[22px] border p-4 ${item.reasons.pidio_dinero ? "border-red-300 bg-red-50" : "border-black/10 bg-neutral-50"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <ListingTitle slug={item.slug} title={item.title} published={item.published} />
                    <p className="mt-1 text-xs text-neutral-500">
                      {item.total} {item.total === 1 ? "aviso" : "avisos"} · último el {formatBoliviaDay(item.lastAt)}
                      {item.published ? "" : " · no está publicado"}
                    </p>
                  </div>
                  <OwnerContact whatsapp={item.ownerWhatsapp} message={`Hola, te escribimos de Zentro Urbano por tu anuncio «${item.title}».`} />
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {reportReasonPriority.filter((reason) => item.reasons[reason]).map((reason) => (
                    <li key={reason} className={`rounded-full px-3 py-1 text-xs font-semibold ${reason === "pidio_dinero" ? "bg-red-600 text-white" : "bg-white text-neutral-700 ring-1 ring-black/10"}`}>
                      {reportReasons[reason]}: {item.reasons[reason]}
                    </li>
                  ))}
                </ul>
                {item.notes.length > 0 ? (
                  <ul className="mt-3 grid gap-1 text-sm leading-6 text-neutral-700">
                    {item.notes.slice(0, 3).map((note, index) => <li key={`${note}-${index}`}>«{note}»</li>)}
                  </ul>
                ) : null}
                <ListingActions slug={item.slug} canConfirm={item.canConfirm} canHide={item.canHide} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="disponibilidad-por-confirmar" className="rounded-[32px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="admin-stale-title">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
          <ClockAlert className="h-4 w-4" aria-hidden="true" />
          Disponibilidad
        </p>
        <h2 id="admin-stale-title" className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          Anuncios por confirmar
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Anuncios publicados sin confirmación en {availabilityFreshDays} días, con {availabilityReportLimit} o más avisos de
          que ya no está disponible, o a punto de vencer. Puedes escribir al dueño o actualizar el anuncio aquí.
        </p>
        {checks.length === 0 ? (
          <p className="mt-5 rounded-[20px] border border-dashed border-black/15 bg-neutral-50 p-4 text-sm text-neutral-600">Todos los anuncios publicados están al día.</p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {checks.map((item) => (
              <li key={item.slug} className={`rounded-[22px] border p-4 ${item.fresh ? "border-black/10 bg-neutral-50" : "border-amber-300 bg-amber-50"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <ListingTitle slug={item.slug} title={item.title} published />
                    <p className="mt-1 text-sm text-neutral-600">{item.zone} · {item.ownerName}</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">{item.fresh ? `Vence pronto · ${item.detail.toLowerCase()}` : item.label}</p>
                    {!item.fresh ? <p className="text-sm text-neutral-600">{item.detail}</p> : null}
                    {item.reports > 0 ? <p className="text-xs text-neutral-500">{item.reports} {item.reports === 1 ? "persona avisó" : "personas avisaron"} que ya no estaría disponible.</p> : null}
                  </div>
                  <OwnerContact
                    whatsapp={item.ownerWhatsapp}
                    message={`Hola, te escribimos de Zentro Urbano. ¿Tu anuncio «${item.title}» sigue disponible? Puedes confirmarlo o marcarlo como alquilado en Mi cuenta: ${absoluteUrl("/cliente")}`}
                  />
                </div>
                <ListingActions slug={item.slug} canConfirm={item.canConfirm} canHide={item.canHide} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ListingTitle({ slug, title, published }: { slug: string; title: string; published: boolean }) {
  return published ? (
    <Link href={`/propiedades/${slug}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-neutral-950 underline-offset-4 hover:underline [overflow-wrap:anywhere]">
      {title}
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </Link>
  ) : (
    <p className="font-semibold text-neutral-950 [overflow-wrap:anywhere]">{title}</p>
  );
}

function OwnerContact({ whatsapp, message }: { whatsapp: string | null; message: string }) {
  const href = ownerWhatsappLink(whatsapp, message);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="zu-button support-whatsapp">
      <WhatsAppIcon />
      <span>Escribir al dueño</span>
    </a>
  );
}

function ListingActions({ slug, canConfirm, canHide }: { slug: string; canConfirm: boolean; canHide: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"confirm" | "rented" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function act(action: "confirm" | "rented") {
    if (busy) return;
    if (action === "rented" && !window.confirm("¿Ocultar este anuncio como alquilado? No se borra nada y el dueño puede pedir volver a publicarlo.")) return;
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/admin/fichas/${encodeURIComponent(slug)}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudo guardar el cambio.");
      setMessage(action === "confirm" ? "Disponibilidad confirmada hoy." : "Anuncio oculto como alquilado.");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo guardar el cambio.");
    } finally {
      setBusy(null);
    }
  }

  if (!canConfirm && !canHide) {
    return <p className="mt-3 text-xs text-neutral-500">No se puede cambiar desde aquí: no está publicado o está escrito en el código del sitio.</p>;
  }
  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap gap-2">
        {canConfirm ? (
          <button type="button" className="zu-button zu-button-primary" disabled={busy !== null} onClick={() => act("confirm")}>
            {busy === "confirm" ? <LoaderCircle size={17} className="zu-spin" aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            Sigue disponible
          </button>
        ) : null}
        {canHide ? (
          <button type="button" className="zu-button zu-button-secondary" disabled={busy !== null} onClick={() => act("rented")}>
            {busy === "rented" ? <LoaderCircle size={17} className="zu-spin" aria-hidden="true" /> : null}
            Ya se alquiló
          </button>
        ) : null}
      </div>
      {message ? <p role="status" className="text-sm font-semibold text-[#176b4d]">{message}</p> : null}
      {error ? <p role="alert" className="auth-error">{error}</p> : null}
    </div>
  );
}
