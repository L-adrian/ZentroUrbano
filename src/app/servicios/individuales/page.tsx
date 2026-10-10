import type { Metadata } from "next";
import Link from "next/link";
import { buildSeoMetadata } from "@/lib/seo";
import { ownerCategories, services } from "@/lib/services";
import { CompareAgency, FilterTabs, OwnerHeading, ServiceCard } from "../components";

export const metadata: Metadata = buildSeoMetadata({
  title: "Servicios individuales para propietarios",
  description: "Fotos profesionales, anuncio listo, recorrido 3D, promoción en redes, visitas, verificación de inquilino, contrato e inventario. Cada uno con precio fijo, sin comisión.",
  path: "/servicios/individuales",
});

export default async function SingleServicesPage({ searchParams }: { searchParams: Promise<{ categoria?: string | string[] }> }) {
  const { categoria } = await searchParams;
  const category = typeof categoria === "string" && ownerCategories.includes(categoria) ? categoria : "Todos";
  const shown = services.filter(service => service.audience === "owner" && (category === "Todos" || service.category === category));
  return <>
    <OwnerHeading view="services" />
    <FilterTabs options={ownerCategories} active={category} param="categoria" path="/servicios/individuales" />
    <div className="grid">{shown.map(service => <ServiceCard key={service.slug} service={service} />)}</div>
    <p className="pk-note">Combinando servicios ahorras. <Link href="/servicios">Mira los paquetes</Link>.</p>
    <CompareAgency />
  </>;
}
