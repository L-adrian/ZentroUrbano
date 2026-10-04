"use client";

import { Heart, Search, X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useCurrencyPreference } from "@/components/currency-preference";
import { PropertyCard } from "@/components/property-card";
import { removeSavedListingFromStorage, useSavedListings } from "@/components/use-local-lists";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import type { Property } from "@/lib/properties";
import { getAvailabilityLine, savedListWhatsappUrl } from "@/lib/saved-list-message";

const noSubscription = () => () => {};

// /guardados: homes saved on this phone, with price, "Para entrar" and availability, and a
// manual wa.me link to send the list to family (WhatsApp opens; the person picks the contact).
export function SavedListings({ properties }: { properties: Property[] }) {
  const saved = useSavedListings();
  const displayCurrency = useCurrencyPreference();
  const isClient = useSyncExternalStore(noSubscription, () => true, () => false);

  if (!isClient) {
    return <p className="saved-listings-loading" role="status">Buscando tus guardados en este teléfono…</p>;
  }

  const available = saved.flatMap((item) => {
    const property = properties.find((candidate) => candidate.slug === item.slug);
    return property ? [property] : [];
  });
  const retired = saved.filter((item) => !properties.some((property) => property.slug === item.slug));

  if (saved.length === 0) {
    return (
      <div className="zu-empty saved-listings-empty">
        <Heart size={30} aria-hidden="true" />
        <h2>Todavía no guardaste viviendas</h2>
        <p>Toca el corazón de un anuncio para guardarlo aquí. Se guarda solo en este teléfono, sin crear una cuenta.</p>
        <Link href="/propiedades" className="zu-button zu-button-primary"><Search size={17} aria-hidden="true" />Ver alquileres</Link>
      </div>
    );
  }

  return (
    <>
      {available.length > 0 ? (
        <div className="saved-listings-share">
          <a
            href={savedListWhatsappUrl(available, displayCurrency)}
            target="_blank"
            rel="noopener noreferrer"
            className="zu-button zu-button-primary"
          >
            <WhatsAppIcon width={18} height={18} />
            Enviar la lista por WhatsApp
          </a>
          <p>Se abre WhatsApp con la lista escrita y eliges a quién enviarla.</p>
        </div>
      ) : null}
      {available.length > 0 ? (
        <div className="rental-grid saved-listings-grid">
          {available.map((property, index) => (
            <PropertyCard
              key={property.slug}
              property={property}
              eagerImage={index < 2}
              notes={[getAvailabilityLine(property)]}
              contactSource="guardados"
            />
          ))}
        </div>
      ) : null}
      {retired.length > 0 ? (
        <section className="saved-listings-retired" aria-labelledby="saved-retired-title">
          <h2 id="saved-retired-title">Ya no están publicadas</h2>
          <p>Se alquilaron o el dueño las pausó.</p>
          <ul>
            {retired.map((item) => (
              <li key={item.slug}>
                <span>{item.title || "Vivienda guardada"}</span>
                <button type="button" onClick={() => removeSavedListingFromStorage(item.slug)} aria-label={`Quitar de guardados: ${item.title || "vivienda"}`}>
                  <X size={16} aria-hidden="true" />Quitar
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
