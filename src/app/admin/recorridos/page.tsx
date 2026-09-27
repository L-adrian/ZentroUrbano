import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPropertyTours } from "@/components/admin-property-tours";
import { listTours, readTour } from "@/lib/property-tours";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { isDirectRental } from "@/lib/rentals";
import { buildSeoMetadata } from "@/lib/seo";
import "./tours.css";

export const dynamic = "force-dynamic";
export const metadata = buildSeoMetadata({ title: "Recorridos 3D", description: "Revisión privada de recorridos experimentales.", path: "/admin/recorridos", noIndex: true });
export default async function AdminToursPage() {
  let data;
  try {
    const tours = await listTours();
    const previews = await Promise.all(tours.map(async tour => ({ ...tour, preview: await readTour(tour.slug, true) })));
    const properties = (await getPublishedPropertiesData()).filter(isDirectRental).map(({ slug, title }) => ({ slug, title }));
    data = { previews, properties };
  } catch {
    data = null;
  }
  return <main className="zu-container admin-tours-page"><Link className="request-back-link" href="/admin"><ArrowLeft size={17} />Administración</Link><header><h1>Recorridos 3D</h1><p>Recreaciones experimentales. Revisión manual y autorización del propietario antes de publicar.</p></header>{data ? <AdminPropertyTours tours={data.previews} properties={data.properties} /> : <p role="alert">No se pudo abrir el registro. Verifica la conexión y que la migración 006 esté aplicada. Las fichas siguen disponibles sin recorridos.</p>}</main>;
}
