import {
  BadgeDollarSign,
  Bath,
  BedDouble,
  Building2,
  Car,
  Clock3,
  CheckCircle2,
  Flame,
  MapPin,
  MessageCircle,
  PawPrint,
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
import { PriceDisplay } from "@/components/currency-preference";
import { MobileStickyContact } from "@/components/mobile-sticky-contact";
import { PropertyGallery } from "@/components/property-gallery";
import { PropertyLocationMap } from "@/components/property-location-map";
import { PropertyCard } from "@/components/property-card";
import { PropertyShareButton } from "@/components/property-share-button";
import { PropertyViewTracker } from "@/components/property-view-tracker";
import { PublisherBadge } from "@/components/publisher-badge";
import { toSafeMobileImageUrl } from "@/components/safe-mobile-image";
import type { Property } from "@/lib/properties";
import {
  getPropertyBySlugData,
  getPublishedPropertiesData,
  getSimilarPropertiesData,
} from "@/lib/property-data";
import { buildSeoMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { isDirectRental } from "@/lib/rentals";
import { getPublicationCosts } from "@/lib/publication-costs";

export async function generateStaticParams() {
  const properties = await getPublishedPropertiesData();

  return properties.filter(isDirectRental).map((property) => ({
    slug: property.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlugData(slug);

  if (!property || !isDirectRental(property)) {
    return {
      title: "Propiedad no encontrada | Zentro Urbano",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return buildSeoMetadata({
    title: property.title,
    description: property.shortDescription,
    path: `/propiedades/${property.slug}`,
    image: `/propiedades/${property.slug}/opengraph-image`,
    imageAlt: `${property.title} en ${property.zone}, ${property.city}`,
    type: "article",
    keywords: [
      property.title,
      `${property.type} en ${property.zone}`,
      `${property.operation} en ${property.city}`,
      "propiedades Bolivia",
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
  const property = await getPropertyBySlugData(slug);

  if (!property || !isDirectRental(property)) {
    notFound();
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

  const similarProperties = await getSimilarPropertiesData(property);

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
      <section className="bg-neutral-50 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/propiedades"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-950"
            >
              Volver al catálogo
            </Link>
            <div className="flex items-center gap-2">
              <PropertyShareButton
                property={property}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
                label="Compartir"
              />
              <span className="rounded-full bg-[#eef7ef] px-4 py-2 text-sm font-semibold text-[#285340]">
                {property.isSeeded
                  ? "Ficha de prueba"
                  : property.listingPlan === "featured"
                    ? "Ficha destacada"
                    : "Ficha curada"}
              </span>
            </div>
          </div>

          <PropertyGallery property={property} />
        </div>
      </section>

      <section className="py-8 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
          <div className="min-w-0 space-y-10">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
                  {property.operation}
                </span>
                <span className="rounded-full bg-[#eef7ef] px-3 py-1 text-sm font-semibold text-[#285340]">
                  {property.type}
                </span>
                {property.listingPlan === "featured" ? (
                  <span className="rounded-full bg-[#fff2d6] px-3 py-1 text-sm font-semibold text-[#8b4b31]">
                    Destacada
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

              <div className="mt-6 flex flex-col gap-4 border-y border-neutral-200 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-neutral-500">Alquiler mensual</p>
                  <PriceDisplay
                    property={property}
                    className="mt-1 block text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl"
                  />
                  {property.currency === "USD" && property.exchangeRate != null && <p className="exchange-rate-note">T/C del propietario: 1 USD = {property.exchangeRate.toLocaleString("es-BO", { maximumFractionDigits: 4 })} Bs</p>}
                </div>
                <a
                  href={`/api/propiedades/${property.slug}/whatsapp`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 bg-[#176b4d] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#10533b]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Contactar por WhatsApp
                </a>
              </div>

              <div className="mt-4 flex flex-col gap-2 border border-[#bddfce] bg-[#f1f8f4] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2 font-semibold text-[#10533b]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Disponible
                </span>
                <span className="inline-flex items-center gap-2 text-neutral-600">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  {getAvailabilityLabel(property)}
                </span>
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
                    highlighted={fact.highlighted}
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
              <PropertyLocationMap property={property} />
            </ContentSection>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <AgentContactCard property={property} />
          </aside>
        </div>
      </section>

      {similarProperties.length > 0 ? (
        <section className="bg-neutral-50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
              Propiedades similares
            </h2>
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
    <div className="flex min-w-0 items-center gap-3 border border-neutral-200 bg-white px-3 py-2.5">
      <div className={`shrink-0 ${highlighted ? "text-[#21352b]" : "text-[#58745f]"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-5 text-neutral-950">{value}</p>
        <p className="truncate text-xs font-medium leading-4 text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function propertyQuickFacts(property: Property) {
  const guarantee = getGuaranteeLabel(property);
  const entryMultiplier = getEntryCostMultiplier(property);
  const details = property.rentalDetails;
  const costs = details ? getPublicationCosts({price:String(property.price),commonExpenses:String(details.commonExpenses),guarantee:details.guarantee,guaranteeAmount:details.guaranteeAmount === null ? "" : String(details.guaranteeAmount)}) : null;
  const facts = [
    {
      label: "Dormitorios",
      value: property.bedrooms > 0 ? property.bedrooms : "N/A",
      icon: <BedDouble className="h-4 w-4" />,
    },
    hasKnownBathrooms(property)
      ? {
          label: "Baños",
          value: property.bathrooms,
          icon: <Bath className="h-4 w-4" />,
        }
      : getBathroomReplacementFact(property),
    {
      label: "Parqueo",
      value: property.garage > 0 ? property.garage : "Sin garaje",
      icon: <Car className="h-4 w-4" />,
    },
    {
      label: "Mascotas",
      value: property.pets ? "Permitidas" : "Consultar",
      icon: <PawPrint className="h-4 w-4" />,
    },
    {
      label: "Garantía",
      value: guarantee,
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      label: costs ? "Costo de ingreso" : "Ingreso sin expensas",
      value:
        costs ? (costs.entry === null ? "Consultar" : <PriceDisplay property={{...property,price:costs.entry}} showPeriod={false}/>) : entryMultiplier === null ? (
          "Consultar"
        ) : (
          <PriceDisplay property={{ ...property, price: property.price * entryMultiplier }} showPeriod={false} />
        ),
      icon: <BadgeDollarSign className="h-4 w-4" />,
      highlighted: true,
    },
  ];
  if (costs) facts.push({label:"Mensual con expensas",value:<PriceDisplay property={{...property,price:costs.monthly}}/>,icon:<BadgeDollarSign className="h-4 w-4"/>,highlighted:true});

  const usedLabels = new Set<string>();

  return facts.filter((fact) => {
    if (usedLabels.has(fact.label)) {
      return false;
    }

    usedLabels.add(fact.label);
    return true;
  });
}

function getGuaranteeLabel(property: Property) {
  const requirement = property.requirements.find((item) => /garant[ií]a/i.test(item));

  if (!requirement) {
    return "Consultar";
  }

  if (/sin garant[ií]a/i.test(requirement)) {
    return "Sin garantía";
  }

  if (/2\s*mes/i.test(requirement)) {
    return "2 meses";
  }

  if (/1\s*mes|un mes|equivalente a un mes/i.test(requirement)) {
    return "1 mes";
  }

  return "Consultar";
}

function getEntryCostMultiplier(property: Property) {
  const guarantee = getGuaranteeLabel(property);

  if (guarantee === "Sin garantía") {
    return 1;
  }

  if (guarantee === "1 mes") {
    return 2;
  }

  if (guarantee === "2 meses") {
    return 3;
  }

  return null;
}

function getAvailabilityLabel(property: Property) {
  if (!property.availabilityConfirmedAt) {
    return "Confirma disponibilidad antes de visitar";
  }

  const confirmedAt = new Date(property.availabilityConfirmedAt);
  const days = Math.max(0, Math.floor((Date.now() - confirmedAt.getTime()) / 86_400_000));

  if (days === 0) {
    return "Confirmado hoy";
  }

  return `Confirmado hace ${days} ${days === 1 ? "día" : "días"}`;
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
