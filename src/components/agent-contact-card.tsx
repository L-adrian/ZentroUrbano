import { BadgeCheck, ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import { PropertyShareButton } from "@/components/property-share-button";
import { PublisherBadge } from "@/components/publisher-badge";
import { getPropertyContactCopy, isExternalContactUrl } from "@/lib/property-contact";
import type { Property } from "@/lib/properties";

type AgentContactCardProps = {
  property: Property;
};

export function AgentContactCard({ property }: AgentContactCardProps) {
  const agent = property.agent;
  const contactCopy = getPropertyContactCopy(property);
  const contactUsesReference = isExternalContactUrl(property.whatsapp);
  const agentInitials = agent.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="owner-contact-card border border-neutral-300 bg-white p-5">
      <p className="text-xs font-semibold uppercase text-neutral-500">
        {property.publisher.kind === "owner" ? "Propietario" : "Responsable del anuncio"}
      </p>
      <div className="mt-4">
        <div className="flex gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-neutral-200">
            {contactUsesReference ? (
              <div className="flex h-full w-full items-center justify-center bg-[#21352b] text-sm font-black text-white">
                MP
              </div>
            ) : agent.photo ? (
              <Image
                src={agent.photo}
                alt={agent.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#21352b] text-sm font-black text-white">
                {agentInitials || "ZU"}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold tracking-tight text-neutral-950">
                  {agent.name}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-neutral-600">{agent.role}</p>
              </div>
              {agent.verified ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#285340]">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  Verificado
                </span>
              ) : null}
            </div>

            <PublisherBadge property={property} className="mt-3 max-w-full" />
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

        <p className="mt-4 border-t border-neutral-200 pt-3 text-xs font-medium leading-5 text-neutral-500">
          {agent.responseTime}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <a
          href={`/api/propiedades/${property.slug}/whatsapp`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#176b4d] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#10533b]"
        >
          {contactUsesReference ? (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          )}
          {contactCopy.label}
        </a>
        <PropertyShareButton property={property} />
        <p className="text-center text-xs leading-5 text-neutral-500">
          Confirma disponibilidad, garantía y condiciones directamente antes de visitar.
        </p>
      </div>
    </div>
  );
}
