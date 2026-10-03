import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { absoluteUrl, whatsappUrl } from "@/lib/site";

// Rental scams ask for money before a visit; the warning sits next to every contact button.
export function SafetyNotice({ slug, className = "" }: { slug: string; className?: string }) {
  const reportUrl = whatsappUrl(`Hola, quiero reportar este anuncio de Zentro Urbano: ${absoluteUrl(`/propiedades/${slug}`)}`);
  return (
    <p className={`safety-notice ${className}`}>
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Nunca pagues ni des adelantos antes de visitar la vivienda y conocer al dueño.{" "}
        <a href={reportUrl} target="_blank" rel="noreferrer">Reportar este anuncio</a>
        {" · "}
        <Link href="/seguridad">Consejos de seguridad</Link>
      </span>
    </p>
  );
}
