import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOwnerReport } from "@/lib/agency-share";
import { clientStageLabels } from "@/lib/crm-input";
import { buildSeoMetadata } from "@/lib/seo";
import { visitWhenLabel } from "@/lib/visit-slots";
import "@/components/agency-clients.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Informe de tu vivienda",
  description: "Cómo le va a tu vivienda en Zentro Urbano: vistas, mensajes, visitas e interesados.",
  path: "/informe",
  noIndex: true,
});

const count = new Intl.NumberFormat("es-BO");
const dateLabel = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "numeric", month: "long", year: "numeric" });

// Read-only report of one home for its owner, from the agency's secret link. No names or phones.
export default async function OwnerReportPage(props: PageProps<"/informe/[token]">) {
  const { token } = await props.params;
  const report = await getOwnerReport(token);
  if (!report) notFound();
  const interested = report.interested.reduce((sum, entry) => sum + entry.count, 0);
  const max = Math.max(1, ...report.interested.map((entry) => entry.count));
  const stat = (label: string, value: number | null, hint: string) => (
    <div className="grid content-start border-b border-r border-black/[0.07] px-4 py-3">
      <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</dt>
      <dd className="crm-num mt-1 text-[24px] font-semibold leading-none text-neutral-950">{value === null ? "—" : count.format(value)}</dd>
      <dd className="mt-1 text-[12px] text-neutral-500">{hint}</dd>
    </div>
  );

  return (
    <main className="bg-neutral-50">
      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-8 sm:px-6">
        <header className="flex items-center gap-3">
          {report.agencyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the agency's own photo, any size
            <img src={report.agencyLogo} alt="" className="h-12 w-12 rounded-[10px] border border-black/10 object-cover" />
          ) : null}
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500">Informe de {report.agencyName}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere]">{report.title}</h1>
          </div>
        </header>

        <section className="grid overflow-hidden rounded-[10px] border border-black/10 bg-white sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-4">
          {report.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- listing photo already sized by the catalog
            <img src={report.image} alt="" className="h-48 w-full object-cover sm:h-52" />
          ) : null}
          <div className="grid content-start gap-1 p-4">
            <p className="text-sm text-neutral-600">{report.published ? "Publicada en Zentro Urbano" : "No está publicada ahora"}</p>
            {report.price ? <p className="crm-num text-lg font-semibold text-neutral-950">{report.price}</p> : null}
            {report.availabilityConfirmedAt ? (
              <p className="text-sm text-neutral-600">Disponibilidad confirmada el {dateLabel.format(new Date(report.availabilityConfirmedAt))}</p>
            ) : null}
            {report.published ? (
              <a className="mt-2 text-sm font-semibold text-[#176b4d] underline" href={`/propiedades/${report.slug}`}>Ver el anuncio</a>
            ) : null}
          </div>
        </section>

        <dl className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-black/10 bg-white sm:grid-cols-3">
          {stat("Vistas · 7 días", report.views7, "Personas distintas")}
          {stat("Vistas · 30 días", report.views30, `${report.viewsTotal === null ? "—" : count.format(report.viewsTotal)} desde que se publicó`)}
          {stat("WhatsApp · 30 días", report.contacts30, `${report.contactsTotal === null ? "—" : count.format(report.contactsTotal)} en total`)}
          {stat("Visitas hechas", report.visitsPast, "Reservadas desde el anuncio")}
          {stat("Visitas por venir", report.visitsNext.length, "Ya tienen día y hora")}
          {stat("Interesados", interested, "Anotados por la inmobiliaria")}
        </dl>

        {report.visitsNext.length ? (
          <section className="rounded-[10px] border border-black/10 bg-white p-4">
            <h2 className="text-[14.5px] font-semibold text-neutral-950">Próximas visitas</h2>
            <ul className="mt-2 grid gap-1 text-sm text-neutral-700">
              {report.visitsNext.map((startsAt) => (
                <li key={startsAt} className="first-letter:uppercase">{visitWhenLabel(startsAt)}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-[10px] border border-black/10 bg-white p-4">
          <h2 className="text-[14.5px] font-semibold text-neutral-950">En qué van los interesados</h2>
          <p className="text-[12px] text-neutral-500">Cuántas personas hay en cada etapa. No mostramos nombres ni teléfonos.</p>
          <ul className="mt-3 grid gap-2.5">
            {report.interested.map((entry) => (
              <li key={entry.stage} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_40px] items-center gap-3 text-[13px]">
                <span className={`crm-s-${entry.stage} flex items-center gap-2 text-neutral-800`}>
                  <i className="crm-dot h-2 w-2 rounded-full" />
                  {clientStageLabels[entry.stage]}
                </span>
                <span className="h-3 overflow-hidden rounded-[3px] bg-[#eef2ef]">
                  <span className={`block h-full rounded-r-[4px] ${entry.stage === "perdido" ? "bg-[#64748b]" : "bg-[#176b4d]"}`} style={{ width: `${(entry.count / max) * 100}%`, minWidth: entry.count ? 4 : 0 }} />
                </span>
                <span className="crm-num text-right font-semibold text-neutral-800">{entry.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[12px] text-neutral-500">
          Las vistas y mensajes cuentan personas distintas, una vez por teléfono o computadora. Este informe se actualiza solo.
          {report.agencyPhone ? ` ¿Dudas? Escribe a ${report.agencyName} al ${report.agencyPhone}.` : ""}
        </p>
      </div>
    </main>
  );
}
