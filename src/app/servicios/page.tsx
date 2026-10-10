import type { Metadata } from "next";
import Link from "next/link";
import { buildSeoMetadata } from "@/lib/seo";
import { packageGoals, servicePackages } from "@/lib/services";
import { CompareAgency, FilterTabs, HeroPackage, OwnerHeading, PackageGrid } from "./components";

export const metadata: Metadata = buildSeoMetadata({
  title: "Servicios para propietarios",
  description: "Lo que hace una inmobiliaria, sin comisión: fotos, anuncio destacado, visitas, contrato e inventario con precio fijo. O paga solo si se alquila.",
  path: "/servicios",
});

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ objetivo?: string | string[] }> }) {
  const { objetivo } = await searchParams;
  const goal = typeof objetivo === "string" && packageGoals.includes(objetivo) ? objetivo : "Todos";
  const owner = servicePackages.filter(pkg => pkg.audience === "owner");
  const hero = owner.find(pkg => pkg.hero);
  const shown = owner.filter(pkg => goal === "Todos" ? !pkg.hero : pkg.goal === goal);
  return <>
    <OwnerHeading view="packages" />
    {goal === "Todos" && hero && <HeroPackage pkg={hero} />}
    <FilterTabs options={packageGoals} active={goal} param="objetivo" path="/servicios" />
    <PackageGrid packages={shown} />
    <p className="pk-note">¿Prefieres armarlo a tu manera? <Link href="/servicios/individuales">Mira los servicios individuales</Link>.</p>
    <CompareAgency />
  </>;
}
