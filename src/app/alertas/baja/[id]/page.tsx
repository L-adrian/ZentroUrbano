import Link from "next/link";
import { notFound } from "next/navigation";
import { BellOff } from "lucide-react";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { validAlertId } from "@/lib/search-alerts";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({ title: "Dejar de recibir avisos", description: "Date de baja de una alerta de búsqueda de Zentro Urbano.", path: "/alertas/baja", noIndex: true });

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ listo?: string; error?: string }> }) {
  const { id } = await params;
  const { listo, error } = await searchParams;
  if (!validAlertId(id)) notFound();
  return <main id="contenido" className="zu-container help-page">
    <p className="zu-eyebrow"><BellOff size={16} /> ALERTAS</p>
    {listo ? <>
      <h1>Listo, ya no te avisaremos.</h1>
      <p>Dejamos de usar tu contacto para esta alerta. Si cambias de idea, puedes crear otra desde el catálogo.</p>
      <p><Link className="zu-button zu-button-primary" href="/propiedades">Ver alquileres</Link></p>
    </> : <>
      <h1>¿Dejar de recibir avisos?</h1>
      <p>Ya no te escribiremos por esta búsqueda.</p>
      {error ? <p className="guide-note">No pudimos darte de baja. Inténtalo de nuevo o escríbenos por WhatsApp.</p> : null}
      <form method="post" action={`/api/alertas/${id}/baja`}><button type="submit" className="zu-button zu-button-primary">Dejar de recibir avisos</button></form>
    </>}
    <SupportWhatsAppButton />
  </main>;
}
