import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { PublishWizard } from "@/components/publish-wizard";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Publicar una vivienda en alquiler",
  description:
    "Publica tu casa o departamento en alquiler directo. Completa fotos, información, precio y contacto en menos de 5 minutos.",
  path: "/publicar",
  noIndex: true,
});

export default async function PublishPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login?next=%2Fpublicar&mode=signup");
  if (account.kind !== "owner") redirect("/propiedades");
  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6">
          <p className="zu-eyebrow">PARA PROPIETARIOS</p>
          <h1 className="mt-3 text-3xl font-semibold">Dale un nuevo comienzo a tu vivienda.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Contrato directo con el propietario, sin comisiones de intermediación. Revisamos la ficha antes de publicarla.
          </p>
        </div>
        <div className="publication-account-bar"><span>Publicando como <strong>{account.display_name}</strong></span><SupportWhatsAppButton /></div>
        <Link href="/requisitos" target="_blank" rel="noopener noreferrer" className="zu-button zu-button-secondary mb-5"><ClipboardCheck size={16} aria-hidden="true" />Qué necesito para publicar</Link>
        <PublishWizard key={account.id} account={{ id: account.id, name: account.display_name, phone: account.phone ?? "" }} />
      </div>
    </main>
  );
}
