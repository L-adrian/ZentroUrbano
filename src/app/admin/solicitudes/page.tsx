import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listPublicationRequests } from "@/lib/publication-requests";
import { PublicationRequestList } from "@/components/publication-request-list";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = buildSeoMetadata({ title: "Solicitudes recibidas", description: "Revision privada de solicitudes y fotografias.", path: "/admin/solicitudes", noIndex: true });

export default async function AdminRequestsPage() {
  return <main id="contenido" className="requests-page zu-container">
    <Link href="/admin" className="request-back-link"><ArrowLeft size={17} />Administración</Link>
    <header className="requests-heading"><div><h1>Solicitudes recibidas</h1><p>Revisa los datos y las fotos. Aprobar publica la ficha; rechazar mantiene el anuncio fuera del catálogo e informa el motivo al propietario.</p></div></header>
    <PublicationRequestList requests={await listPublicationRequests()} admin />
  </main>;
}
