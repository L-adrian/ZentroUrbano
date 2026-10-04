import {
  Bath,
  BedDouble,
  Building2,
  Car,
  Clock3,
  CheckCircle2,
  Eye,
  Flame,
  MapPin,
  MessageCircle,
  PawPrint,
  Ruler,
  ShieldCheck,
  Sofa,
  Trees,
  Waves,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AgentContactCard } from "@/components/agent-contact-card";
import { BeforeVisitBlock } from "@/components/before-visit-block";
import { PriceDisplay } from "@/components/currency-preference";
import { MobileStickyContact } from "@/components/mobile-sticky-contact";
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyLocationMap } from "@/components/property-location-map";
import { PropertyCard } from "@/components/property-card";
import { PropertyShareButton } from "@/components/property-share-button";
import { PropertyViewTracker } from "@/components/property-view-tracker";
import { ListingSaveButton } from "@/components/save-listing-button";
import { PublisherBadge } from "@/components/publisher-badge";
import { SafetyNotice } from "@/components/safety-notice";
import { toSafeMobileImageUrl } from "@/components/safe-mobile-image";
import type { Property } from "@/lib/properties";
import {
  getPropertyBySlugData,
  getRetiredPropertyBySlugData,
  getSimilarPropertiesData,
} from "@/lib/property-data";
import { buildSeoMetadata } from "@/lib/seo";
import { citySlug, operationSlug, zoneSlug } from "@/lib/seo-routes";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site";
import { isDirectRental } from "@/lib/rentals";
import { getAvailabilityState, getEntryCost, getGuaranteeLabel } from "@/lib/listing-summary";
import { getPublicViewStats } from "@/lib/property-audience";
import { whatsappContactPath } from "@/lib/property-contact";
import { getPropertyParkingLabel } from "@/lib/property-parking";
import { publishedTour } from "@/lib/property-tours";
import { getPrivateTourShowcase } from "@/lib/private-tour-showcase";
import { PrivateTourShowcaseViewer } from "@/components/private-tour-showcase";

// Prices and availability must not survive edits in an external CDN cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const privateShowcase = await getPrivateTourShowcase(slug);

  if (privateShowcase) {
    return {
      title: privateShowcase.title,
      description: "Muestra privada de un recorrido 3D experimental.",
      robots: { index: false, follow: false, noarchive: true },
    };
  }
  const property = await getPropertyBySlugData(slug);

  if (!property || !isDirectRental(property)) {
    const retired = property ? undefined : await getRetiredPropertyBySlugData(slug);
    return {
      title: retired ? `Ya no está disponible: ${retired.title}` : "Vivienda no encontrada",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const seoTitle = /alquiler/i.test(property.title) ? property.title : `Alquiler: ${property.title}`;
  const seoDescription = `Alquiler directo con el dueño en ${property.zone}, ${property.city}. ${property.shortDescription}`.slice(0, 300);
  return buildSeoMetadata({
    title: seoTitle,
    description: seoDescription,
    path: `/propiedades/${property.slug}`,
    image: `/propiedades/${property.slug}/opengraph-image`,
    imageAlt: `${property.title} en ${property.zone}, ${property.city}`,
    type: "article",
    noIndex: property.isSeeded,
    keywords: [
      property.title,
      `${property.type} en ${property.zone}`,
      `${property.operation} en ${property.city}`,
      `alquiler en ${property.zone}`,
      "alquiler dueño directo Santa Cruz",
      "Zentro Urbano",
    ],
  });
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const privateShowcase = await getPrivateTourShowcase(slug);

  if (privateShowcase) {
    return <PrivateTourShowcaseViewer showcase={privateShowcase} />;
  }
  const property = await getPropertyBySlugData(slug);

  if (!property || !isDirectRental(property)) {
    const retired = property ? undefined : await getRetiredPropertyBySlugData(slug);
    if (!retired) notFound();
    return <RetiredListing property={retired} similar={await getSimilarPropertiesData(retired, 3)} />;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: property.title,
    description: property.shortDescription,
    image: property.images.map((image) => toSafeMobileImageUrl(image, 960)),
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city,
      streetAddress: property.address,
      addressCountry: "BO",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: property.coordinates.lat,
      longitude: property.coordinates.lng,
    },
    url: absoluteUrl(`/propiedades/${property.slug}`),
  };
  const cityPath = `/${operationSlug(property.operation)}/${citySlug(property)}`;
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: `Alquiler en ${property.city}`, path: cityPath },
    { name: property.zone, path: `${cityPath}/${zoneSlug(property)}` },
    { name: property.title, path: `/propiedades/${property.slug}` },
  ]);

  const [similarProperties, tour, viewStats] = await Promise.all([
    getSimilarPropertiesData(property),
    publishedTour(property.slug),
    getPublicViewStats(property.slug),
  ]);
  const availability = getAvailabilityState(property);

  return (
    <main id="contenido" className="property-detail bg-white pb-24 lg:pb-0">
      <PropertyViewTracker
        propertySlug={property.slug}
        operation={property.operation}
        city={property.city}
        zone={property.zone}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbs)} />
      <section className="listing-layout py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/propiedades"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-950"
            >
              Volver al catálogo
            </Link>
            <div className="flex items-center gap-2">
              <ListingSaveButton slug={property.slug} title={property.title} />
              <PropertyShareButton
                property={property}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
                label="Compartir"
              />
            </div>
          </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-10">
            <PropertyGallery property={property} tour={tour} />
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
                  {property.operation}
                </span>
                <span className="rounded-full bg-[#eef7ef] px-3 py-1 text-sm font-semibold text-[#285340]">
                  {property.type}
                </span>
                {property.listingPlan === "featured" ? (
                  <span className="listing-featured-chip rounded-full px-3 py-1 text-sm font-semibold">
                    Destacada · servicio pagado
                  </span>
                ) : null}
              </div>
              <h1 className="mt-5 max-w-4xl text-[2rem] font-semibold leading-[1.05] tracking-tight text-neutral-950 sm:text-6xl sm:leading-none">
                {property.title}
              </h1>
              <PublisherBadge property={property} className="mt-4 max-w-full" />
              <p className="mt-4 flex items-center gap-2 text-base font-medium text-neutral-600">
                <MapPin className="h-5 w-5 text-[#58745f]" aria-hidden="true" />
                {property.address}
              </p>

              <div className="mt-6 flex flex-col gap-4 border-y border-neutral-200 py-5 sm:flex-row sm:items-center sm:justify-between lg:hidden">
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Alquiler mensual</p>
                  <PriceDisplay
                    property={property}
                    className="mt-1 block text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl"
                  />
                </div>
                <a
                  href={whatsappContactPath(property.slug, "ficha")}
                  target="_blank"
                  rel="noreferrer"
                  className="zu-whatsapp-cta inline-flex h-12 items-center justify-center gap-2 bg-[#176b4d] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#10533b]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Contactar por WhatsApp
                </a>
              </div>

              <div className={`availability-box ${availability.fresh ? "is-fresh" : "is-unconfirmed"} mt-4 flex flex-col gap-2 border p-3 text-sm sm:flex-row sm:items-center sm:justify-between`}>
                <span className="availability-box-label inline-flex items-center gap-2 font-semibold">
                  {availability.fresh ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {availability.label}
                </span>
                <span className="inline-flex items-center gap-2 text-neutral-600">
                  {availability.detail}
                </span>
              </div>
              {viewStats && viewStats.total > 0 ? (
                <p className="listing-views mt-3">
                  <Eye className="h-4 w-4 text-[#58745f]" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-neutral-900">{viewStats.total}</strong>{" "}
                    {viewStats.total === 1 ? "persona vio" : "personas vieron"} este anuncio
                    {viewStats.last7 > 0 ? ` · ${viewStats.last7} en los últimos 7 días` : ""}
                    <small>Contamos cada teléfono o computadora una sola vez.</small>
                  </span>
                </p>
              ) : null}
              <CostsBlock property={property} />
              <BeforeVisitBlock property={property} />
              {/* On desktop the same notice sits in the contact card beside the gallery. */}
              <div className="lg:hidden">
                <SafetyNotice slug={property.slug} className="mt-4" />
              </div>
            </div>

            <div className="quick-facts border-y border-neutral-200 py-3 sm:py-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {propertyQuickFacts(property).map((fact) => (
                  <QuickFact
                    key={fact.label}
                    icon={fact.icon}
                    label={fact.label}
                    value={fact.value}
                  />
                ))}
              </div>
              {!hasKnownBathrooms(property) ? (
                <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-neutral-600">
                  Baños: consultar con el dueño.
                </p>
              ) : null}
            </div>

            <ContentSection title="Descripción">
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{property.longDescription}</p>
            </ContentSection>

            <ContentSection title="Características">
              <ul className="property-features" aria-label="Características de la vivienda">
                {featureList(property).map((feature) => (
                  <li
                    key={feature.label}
                    className="property-feature"
                  >
                    <div className="property-feature-icon" aria-hidden="true">
                      {feature.icon}
                    </div>
                    <span>{feature.label}</span>
                  </li>
                ))}
              </ul>
              {featureList(property).length === 0 && <p>Consulta las características con el propietario.</p>}
            </ContentSection>

            <ContentSection title="Requisitos">
              <ul className="space-y-3">
                {property.requirements.map((requirement) => (
                  <li key={requirement} className="flex gap-3 text-neutral-700">
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#58745f]"
                      aria-hidden="true"
                    />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </ContentSection>

            <ContentSection title="Ubicación">
              {property.neighborhoodHighlights.length > 0 ? (
                <p className="listing-nearby">
                  <strong>Cerca de:</strong> {property.neighborhoodHighlights.join(" · ")}
                </p>
              ) : null}
              <PropertyLocationMap property={property} />
            </ContentSection>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <AgentContactCard property={property} availability={availability} />
          </aside>
        </div>
        </div>
      </section>

      {similarProperties.length > 0 ? (
        <section className="bg-neutral-50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                Otras opciones parecidas
              </h2>
              <Link href={`${cityPath}/${zoneSlug(property)}`} className="text-sm font-semibold text-[#176b4d] hover:underline">
                Ver alquileres en {property.zone}
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {similarProperties.map((similar) => (
                <PropertyCard key={similar.slug} property={similar} compact />
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <MobileStickyContact property={property} />
    </main>
  );
}

function QuickFact({
  icon,
  label,
  value,
  highlighted = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div className="quick-fact flex min-w-0 items-center gap-3 border border-neutral-200 bg-white px-3 py-2.5">
      <div className={`shrink-0 ${highlighted ? "text-[#21352b]" : "text-[#58745f]"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold leading-5 text-neutral-950 [overflow-wrap:anywhere] ${value === "Consultar" ? "quick-fact-unknown" : ""}`}>{value}</p>
        <p className="text-xs font-medium leading-4 text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function propertyQuickFacts(property: Property) {
  const details = property.rentalDetails;
  const facts = [
    {
      label: details?.type === "Monoambiente" ? "Distribución" : "Dormitorios",
      value: details?.type === "Monoambiente" ? "Monoambiente" : property.bedrooms > 0 ? property.bedrooms : "Consultar",
      icon: <BedDouble className="h-4 w-4" />,
    },
    hasKnownBathrooms(property)
      ? {
          label: "Baños",
          value: property.bathrooms,
          icon: <Bath className="h-4 w-4" />,
        }
      : getBathroomReplacementFact(property),
    ...(property.area > 0
      ? [{ label: "Superficie", value: `${property.area} m²`, icon: <Ruler className="h-4 w-4" /> }]
      : []),
    {
      label: "Parqueo",
      value: getPropertyParkingLabel(property),
      icon: <Car className="h-4 w-4" />,
    },
    {
      label: "Mascotas",
      value: property.pets ? "Permitidas" : details?.petsPolicy === "not_allowed" ? "No acepta" : "Consultar",
      icon: <PawPrint className="h-4 w-4" />,
    },
  ];

  const usedLabels = new Set<string>();

  return facts.filter((fact) => {
    if (usedLabels.has(fact.label)) {
      return false;
    }

    usedLabels.add(fact.label);
    return true;
  });
}

function hasKnownBathrooms(property: Property) {
  return property.bathrooms > 0;
}

function getBathroomReplacementFact(property: Property) {
  if (property.security) {
    return {
      label: "Seguridad",
      value: "Sí",
      icon: <ShieldCheck className="h-4 w-4" />,
    };
  }

  if (property.pool) {
    return {
      label: "Piscina",
      value: "Sí",
      icon: <Waves className="h-4 w-4" />,
    };
  }

  if (property.patio) {
    return {
      label: "Patio",
      value: "Sí",
      icon: <Trees className="h-4 w-4" />,
    };
  }

  if (property.grill) {
    return {
      label: "Churrasquera",
      value: "Sí",
      icon: <Flame className="h-4 w-4" />,
    };
  }

  if (property.garage > 0) {
    return {
      label: "Garaje",
      value: property.garage,
      icon: <Car className="h-4 w-4" />,
    };
  }

  return {
    label: "Zona",
    value: property.zone,
    icon: <MapPin className="h-4 w-4" />,
  };
}

function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-black/10 pt-8">
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{title}</h2>
      <div className="mt-4 text-base leading-8 text-neutral-700">{children}</div>
    </section>
  );
}

function featureList(property: Property) {
  const features = [
    { label: "Mascotas", enabled: property.pets, icon: <PawPrint className="h-5 w-5" /> },
    { label: "Amoblado", enabled: property.furnished, icon: <Sofa className="h-5 w-5" /> },
    { label: "Seguridad", enabled: property.security, icon: <ShieldCheck className="h-5 w-5" /> },
    { label: "Piscina", enabled: property.pool, icon: <Waves className="h-5 w-5" /> },
    { label: "Patio", enabled: property.patio, icon: <Trees className="h-5 w-5" /> },
    { label: "Churrasquera", enabled: property.grill, icon: <Flame className="h-5 w-5" /> },
    { label: "Ascensor", enabled: property.elevator, icon: <Building2 className="h-5 w-5" /> },
  ];

  return features.filter((feature) => feature.enabled);
}

// One cost summary with the same names as the cards; anything the owner didn't give stays pending.
function CostsBlock({ property }: { property: Property }) {
  const details = property.rentalDetails;
  const entry = getEntryCost(property);
  const guarantee = getGuaranteeLabel(property);
  const price = (amount: number) => <PriceDisplay property={{ ...property, price: amount }} showPeriod={false} showExchangeRate={false} />;
  const pending = <span className="entry-cost-pending">Pendiente de consulta</span>;
  const expenses = details ? (details.commonExpenses > 0 ? price(details.commonExpenses) : "No se cobran aparte") : pending;
  const deposit = entry ? (entry.deposit > 0 ? price(entry.deposit) : "Sin garantía") : guarantee === "Consultar" ? pending : guarantee;
  return (
    <section className="entry-cost mt-4" aria-labelledby="entry-cost-title">
      <h2 id="entry-cost-title">Costos</h2>
      <dl>
        <div><dt>Alquiler mensual</dt><dd>{price(property.price)}</dd></div>
        <div><dt>Expensas al mes</dt><dd>{expenses}</dd></div>
        <div><dt>Garantía</dt><dd>{deposit}</dd></div>
        <div className="total"><dt>Para entrar</dt><dd>{entry ? price(entry.total) : pending}</dd></div>
      </dl>
      {entry ? (
        <p className="entry-cost-note">
          {details
            ? `${entry.advanceMonths ? `${entry.advanceMonths} meses de adelanto` : "Primer mes"}${details.commonExpenses > 0 ? ", expensas" : ""} y garantía.`
            : "Primer mes y garantía. Las expensas, si hay, se consultan con el dueño."}
        </p>
      ) : null}
    </section>
  );
}

function RetiredListing({ property, similar }: { property: Property; similar: Property[] }) {
  const kind = (property.rentalDetails?.type ?? property.type).toLocaleLowerCase("es");
  const cityPath = `/${operationSlug(property.operation)}/${citySlug(property)}`;
  return (
    <main id="contenido" className="property-detail bg-white py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">Anuncio retirado</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
          {`${kind === "casa" ? "Esta" : "Este"} ${kind} en ${property.zone} ya no está disponible`}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
          El dueño lo retiró, normalmente porque ya se alquiló. Estas opciones se le parecen.
        </p>
        {similar.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {similar.map((item) => (
              <PropertyCard key={item.slug} property={item} compact />
            ))}
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`${cityPath}/${zoneSlug(property)}`} className="zu-button zu-button-primary">
            Ver alquileres en {property.zone}
          </Link>
          <Link href="/propiedades" className="zu-button zu-button-secondary">
            Ver todos los alquileres
          </Link>
        </div>
      </div>
    </main>
  );
}
