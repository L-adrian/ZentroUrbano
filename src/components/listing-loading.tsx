import { KeyRound } from "lucide-react";

// Same shape as the listing page: gallery, title, price and the contact card beside it.
export function ListingLoading() {
  return <main id="contenido" className="property-detail listing-loading" aria-busy="true" aria-label="Cargando la vivienda">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p role="status" className="listing-loading-status"><KeyRound size={18} />Abriendo la vivienda...</p>
      <div aria-hidden="true" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="listing-loading-gallery">
            <div className="zu-skeleton" />
            <div className="zu-skeleton" />
            <div className="zu-skeleton" />
          </div>
          <div className="zu-skeleton listing-loading-chip" />
          <div className="zu-skeleton listing-loading-title" />
          <div className="zu-skeleton skeleton-line short" />
          <div className="zu-skeleton listing-loading-price lg:hidden" />
          <div className="zu-skeleton listing-loading-box" />
        </div>
        <div className="zu-skeleton listing-loading-card hidden lg:block" />
      </div>
    </div>
  </main>;
}
