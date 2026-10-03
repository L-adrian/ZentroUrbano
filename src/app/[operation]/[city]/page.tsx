import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectRentalExplorer } from "@/components/direct-rental-explorer";
import { getPublishedPropertiesData } from "@/lib/property-data";
import { getRentalZones, withoutContactEmail } from "@/lib/rentals";
import { filterPropertiesByCity, slugifyForRoute } from "@/lib/seo-routes";
import { buildSeoMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

type Params = Promise<{ operation: string; city: string }>;

async function getCityProperties(operation: string, city: string) {
  return filterPropertiesByCity({
    operationSlugParam: operation,
    citySlugParam: city,
    properties: await getPublishedPropertiesData(),
  });
}

function cityLabel(city: string) {
  return city === "Santa Cruz" ? "Santa Cruz de la Sierra" : city;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { operation, city } = await params;
  const properties = await getCityProperties(operation, city);

  if (properties.length === 0) {
    return { title: "Alquileres no encontrados", robots: { index: false, follow: false } };
  }

  const name = cityLabel(properties[0].city);
  return buildSeoMetadata({
    title: `Alquiler en ${name}, directo con el dueño`,
    description: `Casas, departamentos y monoambientes en alquiler en ${name}. Habla directo con el dueño por WhatsApp, sin inmobiliarias ni comisiones.`,
    path: `/${operation}/${city}`,
    noIndex: properties.every((property) => property.isSeeded),
    keywords: [
      `alquiler ${name}`,
      `alquiler dueño directo ${name}`,
      `alquiler directo ${properties[0].city}`,
      `casas en alquiler ${properties[0].city}`,
      `departamentos en alquiler ${properties[0].city}`,
      "alquiler sin comisión",
    ],
  });
}

export default async function OperationCityPage({ params }: { params: Params }) {
  const { operation, city } = await params;
  const properties = await getCityProperties(operation, city);

  if (operation !== "alquiler" || properties.length === 0) {
    notFound();
  }

  const name = cityLabel(properties[0].city);
  const zones = getRentalZones(properties);
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: `Alquiler en ${name}`, path: `/${operation}/${city}` },
  ]);

  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbs)} />
      <div className="mx-auto max-w-[1500px] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Alquiler en {name}, directo con el dueño</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Casas, departamentos y monoambientes en alquiler publicados por sus propios dueños. Escribes directo al propietario por WhatsApp, sin inmobiliarias ni comisiones de intermediación.
        </p>
      </div>
      <DirectRentalExplorer properties={withoutContactEmail(properties)} />
      <section className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="zonas-title">
        <h2 id="zonas-title" className="text-xl font-semibold tracking-tight">Alquileres por zona en {name}</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {zones.map((zone) => (
            <li key={zone}>
              <Link href={`/${operation}/${city}/${slugifyForRoute(zone)}`} className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-950">
                Alquiler en {zone}
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="mt-10 text-xl font-semibold tracking-tight">¿Cómo funciona alquilar directo con el dueño?</h2>
        <div className="mt-3 grid max-w-3xl gap-3 text-sm leading-6 text-neutral-600">
          <p>Cada anuncio lo publica el propietario y lo revisa el equipo de Zentro Urbano antes de mostrarse. Ves el precio en bolivianos, las expensas, la garantía y lo que cuesta entrar antes de escribir.</p>
          <p>Cuando una vivienda te interesa, hablas por WhatsApp con el dueño y coordinan la visita. Zentro Urbano no cobra comisión al inquilino ni al propietario por el alquiler.</p>
          <p>Nunca pagues ni des adelantos antes de visitar la vivienda y conocer al dueño. <Link href="/seguridad" className="font-medium text-neutral-900 underline">Consejos de seguridad</Link></p>
        </div>
      </section>
    </main>
  );
}
