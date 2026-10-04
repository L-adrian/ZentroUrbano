import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ReportListingButton } from "@/components/report-listing-button";

// Rental scams ask for money before a visit; the warning sits next to every contact button.
export function SafetyNotice({ slug, className = "" }: { slug: string; className?: string }) {
  return (
    <div className={`safety-notice ${className}`}>
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Nunca pagues ni des adelantos antes de visitar la vivienda y conocer al dueño.{" "}
        <ReportListingButton slug={slug} />
        {" · "}
        <Link href="/seguridad">Consejos de seguridad</Link>
      </span>
    </div>
  );
}
