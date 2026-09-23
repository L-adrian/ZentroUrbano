import { redirect } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Alquileres directos",
  description: "Viviendas en alquiler con contrato directo con el propietario.",
  path: "/propiedades",
  noIndex: true,
});

export default function AgenciesPage() {
  redirect("/propiedades");
}
