import { ShieldCheck } from "lucide-react";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({ title: "Seguridad y reportes", description: "Precauciones al buscar alquiler y canales para reportar publicaciones en Zentro Urbano.", path: "/seguridad" });
export default function SafetyPage() {
  return <main id="contenido" className="zu-container help-page"><p className="zu-eyebrow"><ShieldCheck size={16} /> SEGURIDAD</p><h1>Antes de dar el siguiente paso.</h1><p>Una ficha publicada no reemplaza la comprobación de los datos de la vivienda y de quien la ofrece.</p><div className="safety-sections">
    <section><h2>Confirma antes de pagar</h2><p>Coordina una visita, confirma la identidad del propietario y revisa precio, garantía, gastos y condiciones del contrato. Desconfía de la presión para transferir dinero sin conocer la vivienda.</p></section>
    <section><h2>Protege tu cuenta</h2><p>No compartas tu contraseña ni códigos de acceso. El equipo de ayuda no necesita esos datos para revisar un problema. Comprueba que estás en zentrourbano.com antes de ingresar tus credenciales.</p></section>
    <section><h2>Coordina la ubicación</h2><p>Algunos marcadores son aproximados. Confirma la dirección exacta y la hora con el propietario antes de desplazarte.</p></section>
    <section><h2>Reporta información incorrecta</h2><p>Envíanos el enlace de la ficha y el motivo del reporte: no disponible, datos incorrectos, suplantación o comportamiento sospechoso. Revisaremos el caso para corregir o retirar el anuncio cuando corresponda.</p></section>
  </div><SupportWhatsAppButton /></main>;
}
