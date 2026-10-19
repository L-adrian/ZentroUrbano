import type { Metadata } from "next";
import { getSponsoredAdStats } from "@/lib/property-audience";
import { buildSeoMetadata } from "@/lib/seo";
import { sponsoredAds } from "@/lib/sponsored-ads";
import { AdminHeading } from "../admin-heading";
import "@/components/visits-team.css";
import "../aliados/aliados-calendar.css";

export const metadata: Metadata = buildSeoMetadata({ title: "Publicidad", description: "Vistas y clics de cada anunciante.", path: "/admin/publicidad", noIndex: true });
export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const stats = await getSponsoredAdStats().catch((error) => {
    console.error("sponsored ad stats query failed", error);
    return null;
  });
  const byId = new Map((stats ?? []).map((row) => [row.adId, row]));
  // Paused demo ads with no history only add noise.
  const ads = sponsoredAds.filter((ad) => ad.active || byId.has(ad.id));
  return (
    <main className="admin-page">
      <AdminHeading eyebrow="DATOS" title="Publicidad">Lo que logró cada anunciante en el recuadro de publicidad. Son los números para mandarle su resumen del mes.</AdminHeading>
      <section className="admin-team-card aliados-cal-summary">
        <h2>Anunciantes</h2>
        {stats === null ? <p className="admin-team-muted">No se pudieron leer los datos ahora.</p> : null}
        {ads.length === 0 ? (
          <p className="admin-team-muted">Todavía no hay anunciantes activos. Mientras tanto, el recuadro muestra &quot;Publicita aquí&quot;.</p>
        ) : (
          <div className="aliados-cal-table">
            <table>
              <thead>
                <tr><th>Anunciante</th><th>Estado</th><th className="num">Lo vieron este mes</th><th className="num">Clics este mes</th><th className="num">Lo vieron el mes pasado</th><th className="num">Clics el mes pasado</th></tr>
              </thead>
              <tbody>
                {ads.map((ad) => {
                  const row = byId.get(ad.id);
                  return (
                    <tr key={ad.id}>
                      <td><strong>{ad.advertiser}</strong><br /><span className="admin-team-muted">{ad.label}</span></td>
                      <td>{ad.active ? "Activo" : "Pausado"}</td>
                      <td className="num"><strong>{row?.seenThisMonth ?? 0}</strong></td>
                      <td className="num">{row?.clicksThisMonth ?? 0}</td>
                      <td className="num">{row?.seenLastMonth ?? 0}</td>
                      <td className="num">{row?.clicksLastMonth ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="admin-team-muted">&quot;Lo vieron&quot; cuenta personas distintas (un celular o una computadora); los clics son las veces que tocaron el recuadro. Las visitas de robots no cuentan.</p>
      </section>
    </main>
  );
}
