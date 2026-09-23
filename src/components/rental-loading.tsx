import { KeyRound } from "lucide-react";

export function RentalLoading() {
  return <main id="contenido" className="zu-container zu-loading" aria-busy="true" aria-label="Cargando alquileres">
    <p role="status"><KeyRound size={18} />Buscando tu próximo lugar...</p>
    <div aria-hidden="true"><div className="zu-skeleton skeleton-title" /><div className="rental-grid">{Array.from({ length: 4 }, (_, index) => <div key={index}><div className="zu-skeleton skeleton-image" /><div className="zu-skeleton skeleton-line" /><div className="zu-skeleton skeleton-line short" /></div>)}</div></div>
  </main>;
}
