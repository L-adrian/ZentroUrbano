"use client";

import {
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Property } from "@/lib/properties";

type AdminContactLeadsProps = {
  properties: Property[];
};

type ContactLeadStatus = "pending" | "contacted" | "authorized" | "rejected";

type ContactLead = {
  id: string;
  propertySlug: string | null;
  contactName: string | null;
  whatsappRaw: string;
  whatsappNormalized: string;
  whatsappDisplay: string;
  sourcePlatform: string;
  sourceUrl: string | null;
  sourceExcerpt: string | null;
  status: ContactLeadStatus;
  usageConsent: boolean;
  lastContactedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusLabels: Record<ContactLeadStatus, string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  authorized: "Autorizado",
  rejected: "Rechazado",
};

const statusStyles: Record<ContactLeadStatus, string> = {
  pending: "bg-[#fff6d8] text-[#755b11]",
  contacted: "bg-[#edf2ff] text-[#243b73]",
  authorized: "bg-[#eef7ef] text-[#285340]",
  rejected: "bg-[#fff2ec] text-[#8b4b31]",
};

export function AdminContactLeads({ properties }: AdminContactLeadsProps) {
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [propertySlug, setPropertySlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const pendingCount = useMemo(
    () => leads.filter((lead) => lead.status === "pending").length,
    [leads],
  );

  useEffect(() => {
    let active = true;

    fetch("/api/contact-leads", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { leads?: ContactLead[]; message?: string }) => {
        if (!active) {
          return;
        }

        if (payload.leads) {
          setLeads(payload.leads);
        } else if (payload.message) {
          setMessage(payload.message);
        }
      })
      .catch(() => {
        if (active) {
          setMessage("No se pudieron cargar los contactos internos.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/contact-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertySlug: propertySlug || null,
        contactName,
        whatsapp,
        sourcePlatform: "facebook_marketplace",
        sourceUrl,
        sourceText,
        notes,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { allLeads?: ContactLead[]; message?: string }
      | null;

    setIsSaving(false);

    if (!response.ok || !payload?.allLeads) {
      setMessage(payload?.message ?? "No se pudo guardar el contacto.");
      return;
    }

    setLeads(payload.allLeads);
    setWhatsapp("");
    setSourceText("");
    setNotes("");
    setMessage("Numero guardado internamente para autorizacion.");
  }

  async function changeStatus(id: string, status: ContactLeadStatus, currentNotes: string | null) {
    const response = await fetch(`/api/contact-leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: currentNotes }),
    });
    const payload = (await response.json().catch(() => null)) as { lead?: ContactLead } | null;

    if (response.ok && payload?.lead) {
      setLeads((current) => current.map((lead) => (lead.id === id ? payload.lead! : lead)));
    }
  }

  async function removeLead(id: string) {
    const response = await fetch(`/api/contact-leads/${id}`, { method: "DELETE" });

    if (response.ok) {
      setLeads((current) => current.filter((lead) => lead.id !== id));
    }
  }

  return (
    <section className="rounded-[32px] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(20,20,20,0.08)] sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
                Autorizacion interna
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                Guardar WhatsApps de publicaciones
              </h2>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              {pendingCount} pendientes
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Pega la descripcion o el enlace de Marketplace. Zentro Urbano detecta numeros
            bolivianos y los guarda solo para seguimiento interno.
          </p>

          <form onSubmit={saveLead} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-neutral-800">
                Ficha asociada
              </span>
              <select
                value={propertySlug}
                onChange={(event) => setPropertySlug(event.target.value)}
                className="admin-input"
              >
                <option value="">Sin ficha todavia</option>
                {properties.map((property) => (
                  <option key={property.slug} value={property.slug}>
                    {property.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-neutral-800">
                  Nombre si aparece
                </span>
                <input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  className="admin-input"
                  placeholder="Ej. Mariana"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-neutral-800">
                  WhatsApp directo
                </span>
                <input
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  className="admin-input"
                  placeholder="+591 7000 0000"
                  inputMode="tel"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-neutral-800">
                Link de origen
              </span>
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                className="admin-input"
                placeholder="https://www.facebook.com/marketplace/item/..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-neutral-800">
                Descripcion pegada
              </span>
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                className="min-h-32 w-full rounded-[24px] border border-black/10 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-neutral-950 focus:bg-white focus:shadow-[0_0_0_4px_rgba(33,53,43,0.08)]"
                placeholder="Pega aqui la descripcion completa. Se extraen numeros moviles 6xxxxxxx o 7xxxxxxx."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-neutral-800">
                Nota interna
              </span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="admin-input"
                placeholder="Ej. Consultar autorizacion antes de publicar"
              />
            </label>

            {message ? (
              <p className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? "Guardando..." : "Guardar numeros detectados"}
            </button>
          </form>
        </div>

        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-black/15 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
              Aun no hay contactos guardados. Cuando pegues una descripcion, los numeros apareceran
              aqui para contacto y autorizacion.
            </div>
          ) : null}

          {leads.map((lead) => (
            <article
              key={lead.id}
              className="rounded-[24px] border border-black/10 bg-neutral-50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-neutral-950">
                      {lead.contactName ?? "Contacto sin nombre"}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[lead.status]}`}
                    >
                      {statusLabels[lead.status]}
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-800">
                    <Phone className="h-4 w-4 text-[#58745f]" aria-hidden="true" />
                    {lead.whatsappDisplay}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {lead.propertySlug ? `Ficha: ${lead.propertySlug}` : "Sin ficha asociada"} ·{" "}
                    {lead.sourcePlatform.replaceAll("_", " ")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildWhatsAppAuthorizationUrl(lead)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => changeStatus(lead.id, "contacted", lead.notes)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#21352b] px-4 text-sm font-semibold text-white transition hover:bg-[#16241d]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Escribir
                  </a>
                  {lead.sourceUrl ? (
                    <a
                      href={lead.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-700 ring-1 ring-black/10 transition hover:bg-neutral-100"
                      aria-label="Abrir origen"
                      title="Abrir origen"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>

              {lead.sourceExcerpt ? (
                <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-neutral-600 ring-1 ring-black/5">
                  {lead.sourceExcerpt}
                </p>
              ) : null}

              {lead.notes ? (
                <p className="mt-3 text-xs font-semibold text-neutral-500">Nota: {lead.notes}</p>
              ) : null}

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => changeStatus(lead.id, "authorized", lead.notes)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#eef7ef] px-4 text-sm font-semibold text-[#285340] transition hover:bg-[#dcebdd]"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Autorizo
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus(lead.id, "rejected", lead.notes)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#fff2ec] px-4 text-sm font-semibold text-[#8b4b31] transition hover:bg-[#ffe3d6]"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Rechazo
                </button>
                <button
                  type="button"
                  onClick={() => removeLead(lead.id)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-neutral-700 ring-1 ring-black/10 transition hover:bg-neutral-100"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Eliminar
                </button>
              </div>

              {lead.usageConsent ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#285340] ring-1 ring-[#cfe2d2]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Uso autorizado
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function buildWhatsAppAuthorizationUrl(lead: ContactLead) {
  const text = [
    "Hola, soy de Zentro Urbano.",
    "Vimos tu inmueble publicado y queremos confirmar si nos autorizas a mostrar la informacion en nuestra plataforma inmobiliaria.",
    "Si prefieres que no usemos la informacion, lo retiramos sin problema.",
  ].join(" ");

  return `https://wa.me/${lead.whatsappNormalized}?text=${encodeURIComponent(text)}`;
}
