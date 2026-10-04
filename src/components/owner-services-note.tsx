import { Camera, FileText, UserRound } from "lucide-react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { supportHoursLabel } from "@/lib/property-reports";
import { whatsappUrl } from "@/lib/site";

// Owner decision (2026-10): publishing is free. Optional monthly packages have no fixed price yet,
// so they are offered through WhatsApp only.
export function OwnerServicesNote({ className = "rounded-[10px]" }: { className?: string }) {
  return (
    <section aria-label="Publicar es gratis" className={`owner-services-note border border-[var(--line)] bg-[var(--surface)] p-5 text-[var(--foreground)] ${className}`}>
      <p className="text-lg font-semibold">Publicar es gratis</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        No cobramos por publicar tu vivienda. Si quieres ayuda, también ofrecemos paquetes mensuales opcionales:
      </p>
      <ul className="mt-3 grid gap-2 text-sm leading-6">
        <li className="flex items-start gap-2"><Camera size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />Fotos profesionales de tu vivienda</li>
        <li className="flex items-start gap-2"><FileText size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />Ayuda con el contrato</li>
        <li className="flex items-start gap-2"><UserRound size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />Una persona que muestra tu vivienda 1 vez al mes</li>
      </ul>
      <a
        className="zu-button support-whatsapp mt-4"
        href={whatsappUrl("Hola, quiero saber de los paquetes mensuales para propietarios de Zentro Urbano.")}
        target="_blank"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon />
        <span>Consúltanos por WhatsApp</span>
      </a>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Atendemos {supportHoursLabel}.</p>
    </section>
  );
}
