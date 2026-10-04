import { CheckCircle2, Clock3, ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import { PriceDisplay } from "@/components/currency-preference";
import { PropertyShareButton } from "@/components/property-share-button";
import { ReportListingButton } from "@/components/report-listing-button";
import { SafetyNotice } from "@/components/safety-notice";
import type { AvailabilityState } from "@/lib/listing-summary";
import { getEntryCost } from "@/lib/listing-summary";
import { getPropertyContactCopy, isExternalContactUrl, whatsappContactPath } from "@/lib/property-contact";
import type { Property } from "@/lib/properties";

type AgentContactCardProps = {
  property: Property;
  availability: AvailabilityState;
};

// Desktop keeps price, cost to move in and WhatsApp next to the gallery, once.
export function AgentContactCard({ property, availability }: AgentContactCardProps) {
  const agent = property.agent;
  const contactCopy = getPropertyContactCopy(property);
  const contactUsesReference = isExternalContactUrl(property.whatsapp);
  const entry = getEntryCost(property);
  const agentInitials = agent.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="owner-contact-card border border-neutral-300 bg-white p-5">
      <div className="hidden lg:block">
        <p className="text-xs font-semibold uppercase text-neutral-500">Alquiler mensual</p>
        <PriceDisplay property={property} className="mt-1 block text-3xl font-bold tracking-tight text-neutral-950" />
        <p className="mt-1 text-sm text-neutral-600">
          Para entrar:{" "}
          {entry ? (
            <strong className="font-semibold text-neutral-900">
              <PriceDisplay property={{ ...property, price: entry.total }} showPeriod={false} showExchangeRate={false} />
            </strong>
          ) : (
            "pendiente de consulta"
          )}
        </p>
        <p className={`owner-card-availability ${availability.fresh ? "is-fresh" : "is-unconfirmed"}`}>
          {availability.fresh ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Clock3 className="h-4 w-4" aria-hidden="true" />}
          <span>{availability.fresh ? `Disponible · ${availability.detail.toLocaleLowerCase("es")}` : availability.label}</span>
        </p>
        <a
          href={whatsappContactPath(property.slug, "ficha")}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#176b4d] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#10533b]"
        >
          {contactUsesReference ? (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          )}
          {contactCopy.label}
        </a>
      </div>

      <div className="owner-card-person mt-0 lg:mt-5 lg:border-t lg:border-neutral-200 lg:pt-4">
        <div className="flex gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-neutral-200">
            {agent.photo && !contactUsesReference ? (
              <Image src={agent.photo} alt={agent.name} fill sizes="64px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#21352b] text-sm font-black text-white">
                {agentInitials || "ZU"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-neutral-950">{agent.name}</h2>
            <p className="mt-0.5 text-sm font-medium text-neutral-600">{agent.role}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">{agent.responseTime}</p>
          </div>
        </div>

        {contactUsesReference ? (
          <div className="mt-4 grid gap-2 text-sm text-neutral-600">
            <a
              href={property.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-2 border border-neutral-200 bg-white px-3 py-2 transition-colors hover:border-neutral-400 hover:text-neutral-950"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-[#58745f]" aria-hidden="true" />
              <span className="truncate">Abrir referencia original</span>
            </a>
          </div>
        ) : (
          <div className="mt-4 grid gap-2 text-sm text-neutral-600">
            {agent.email && <a
              href={`mailto:${agent.email}`}
              className="flex min-w-0 items-center gap-2 border border-neutral-200 bg-white px-3 py-2 transition-colors hover:border-neutral-400 hover:text-neutral-950"
            >
              <Mail className="h-4 w-4 shrink-0 text-[#58745f]" aria-hidden="true" />
              <span className="truncate">{agent.email}</span>
            </a>}
            <a
              href={`tel:${agent.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 transition-colors hover:border-neutral-400 hover:text-neutral-950"
            >
              <Phone className="h-4 w-4 shrink-0 text-[#58745f]" aria-hidden="true" />
              <span>{agent.phone}</span>
            </a>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <a
          href={whatsappContactPath(property.slug, "ficha")}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#176b4d] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#10533b] lg:hidden"
        >
          {contactUsesReference ? (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          )}
          {contactCopy.label}
        </a>
        <PropertyShareButton property={property} />
        <div className="hidden lg:block">
          <SafetyNotice slug={property.slug} />
        </div>
        <p className="owner-card-no-reply">
          Si no te responde en 48 horas,{" "}
          <ReportListingButton slug={property.slug} label="avísanos" initialReason="no_responde" />.
        </p>
      </div>
    </div>
  );
}
