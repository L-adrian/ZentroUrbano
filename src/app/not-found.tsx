import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { RentalMotion } from "@/components/rental-motion";

export default function NotFound() {
  return <main id="contenido" className="zu-empty">
    <RentalMotion /><span className="empty-code">404 · DIRECCIÓN NO ENCONTRADA</span>
    <h1>Este lugar ya no está aquí.</h1><p>El enlace puede haber cambiado o la publicación ya no está disponible. Tu próximo alquiler todavía te espera.</p>
    <div className="empty-actions"><Link href="/propiedades" className="zu-button zu-button-primary"><Search size={17} />Buscar alquileres</Link><Link href="/" className="zu-button zu-button-secondary"><ArrowLeft size={17} />Ir al inicio</Link></div>
  </main>;
}
