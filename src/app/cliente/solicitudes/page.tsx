import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { listPublicationRequests } from "@/lib/publication-requests";
import { PublicationRequestList } from "@/components/publication-request-list";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = buildSeoMetadata({ title: "Mis solicitudes", description: "Seguimiento privado de solicitudes de publicacion.", path: "/cliente/solicitudes", noIndex: true });

export default async function RequestsPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login?next=/cliente/solicitudes");
  const requests = await listPublicationRequests(account.id);
  return <main id="contenido" className="requests-page zu-container">
    <Link href="/cliente" className="request-back-link"><ArrowLeft size={17} />Mi cuenta</Link>
    <header className="requests-heading"><div><h1>Mis solicitudes</h1><p>Recibir una solicitud no significa que la vivienda ya este publicada.</p></div><Link href="/publicar" className="zu-button zu-button-primary"><Plus size={17} />Nuevo alquiler</Link></header>
    <PublicationRequestList requests={requests} />
  </main>;
}
