import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { siteConfig, whatsappUrl } from "@/lib/site";

export function SupportWhatsAppButton({ showPhone = false, floating = false }: { showPhone?: boolean; floating?: boolean }) {
  return <a className={`zu-button support-whatsapp${floating ? " support-whatsapp-floating" : ""}`} href={whatsappUrl("Hola, necesito ayuda con Zentro Urbano.")} target="_blank" rel="noopener noreferrer" aria-label={`${floating ? "Contáctanos por ayuda" : "Ayuda de Zentro Urbano"} por WhatsApp al ${siteConfig.phoneDisplay}`}><WhatsAppIcon /><span>{showPhone ? siteConfig.phoneDisplay : floating ? "Contáctanos por ayuda" : "Ayuda por WhatsApp"}</span></a>;
}
