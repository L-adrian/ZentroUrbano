import { KeyRound } from "lucide-react";

// The catalog skeleton includes the filter bar and, beside the list, the map.
export function RentalLoading({ withMap = false }: { withMap?: boolean }) {
  return <main id="contenido" className="zu-container zu-loading" aria-busy="true" aria-label="Cargando alquileres">
    <p role="status"><KeyRound size={18} />Buscando tu próximo lugar...</p>
    <div aria-hidden="true"><div className="zu-skeleton skeleton-title" /><div className="skeleton-filters">{Array.from({ length: 4 }, (_, index) => <div key={index} className="zu-skeleton" />)}</div><div className={withMap ? "skeleton-with-map" : undefined}><div className="rental-grid">{Array.from({ length: 4 }, (_, index) => <div key={index}><div className="zu-skeleton skeleton-image" /><div className="zu-skeleton skeleton-line" /><div className="zu-skeleton skeleton-line short" /></div>)}</div>{withMap ? <div className="zu-skeleton skeleton-map" /> : null}</div></div>
  </main>;
}
