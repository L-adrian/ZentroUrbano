import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { funnelShare, type ListingFunnelRow } from "@/lib/listing-funnel";

// /admin: per listing, last 30 days, in people. Only totals; nobody is identified.
export function AdminListingFunnel({ rows }: { rows: ListingFunnelRow[] | null }) {
  return (
    <section id="recorrido-de-anuncios" className="listing-funnel rounded-[32px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="admin-funnel-title">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
        <BarChart3 className="h-4 w-4" aria-hidden="true" />
        Últimos 30 días
      </p>
      <h2 id="admin-funnel-title" className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
        Qué hizo la gente en cada anuncio
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
        Personas distintas (un teléfono o computadora cuenta una vez). «Abrieron fotos» y «Llegaron por enlace compartido» empezaron a contarse con esta versión, así que los primeros días se verán bajos.
      </p>
      {rows === null ? (
        <p className="mt-5 rounded-[20px] border border-dashed border-black/15 bg-neutral-50 p-4 text-sm text-neutral-600">No pudimos leer los números ahora. Actualiza la página en unos minutos.</p>
      ) : rows.length === 0 ? (
        <p className="mt-5 rounded-[20px] border border-dashed border-black/15 bg-neutral-50 p-4 text-sm text-neutral-600">Todavía no hay visitas en los últimos 30 días.</p>
      ) : (
        <div className="listing-funnel-scroll mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla por anuncio, se puede desplazar">
          <table className="listing-funnel-table w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr>
                <th scope="col">Anuncio</th>
                <th scope="col" className="num">Vieron</th>
                <th scope="col" className="num">Abrieron fotos</th>
                <th scope="col">Abrieron WhatsApp</th>
                <th scope="col" className="num">Llegaron por enlace compartido</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slug}>
                  <th scope="row">
                    <Link href={`/propiedades/${row.slug}`} className="font-semibold text-neutral-950 underline-offset-4 hover:underline [overflow-wrap:anywhere]">
                      {row.title}
                    </Link>
                  </th>
                  <td className="num">{row.viewed}</td>
                  <td className="num">
                    {row.gallery}
                    {row.viewed > 0 && row.gallery > 0 ? <span className="listing-funnel-share"> {funnelShare(row.gallery, row.viewed)}</span> : null}
                  </td>
                  <td>
                    <span className="font-semibold">{row.whatsapp}</span>
                    {row.viewed > 0 && row.whatsapp > 0 ? <span className="listing-funnel-share"> {funnelShare(row.whatsapp, row.viewed)}</span> : null}
                    {row.whatsappBySource.length > 0 ? (
                      <span className="listing-funnel-sources">
                        {row.whatsappBySource.map((item) => `${item.label} ${item.people}`).join(" · ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="num">{row.shared}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
