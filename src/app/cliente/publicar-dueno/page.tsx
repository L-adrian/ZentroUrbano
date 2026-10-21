import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { PublishWizard } from "@/components/publish-wizard";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { getSelectedDepartment } from "@/lib/region-server";
import { buildSeoMetadata } from "@/lib/seo";
import { getTeamMemberByAccount } from "@/lib/team";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Publicar la vivienda de un dueño",
  description: "Panel de aliado: carga la vivienda de un dueño y crea su cuenta para que la maneje.",
  path: "/cliente/publicar-dueno",
  noIndex: true,
});

// An Aliado Zentro sits with an owner and loads their home with the same form owners use. The
// owner's account is created when it is sent, so the owner can sign in later and manage it.
export default async function AliadoPublishPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login?next=%2Fcliente%2Fpublicar-dueno");
  if (account.kind === "owner") redirect("/publicar");
  if (account.kind !== "aliado" || account.storage !== "mysql") redirect("/propiedades");
  const team = await getTeamMemberByAccount(account.id).catch(() => null);
  const department = await getSelectedDepartment();
  const aliadoName = team?.member.name ?? account.display_name;
  return (
    <main id="contenido" className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link href="/cliente#anuncios" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-950">
          <ArrowLeft size={16} aria-hidden="true" />Volver a mi panel
        </Link>
        <div className="mb-6">
          <p className="zu-eyebrow">PANEL DE ALIADO</p>
          <h1 className="mt-3 text-3xl font-semibold">Publica la vivienda de un dueño.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Hazlo junto al dueño. Al enviar, se crea su cuenta en Zentro (sin Google) para que después entre y maneje su anuncio. Publicar es gratis y nadie cobra comisión.
          </p>
        </div>
        {!team ? (
          <div className="rounded-[22px] border border-dashed border-black/15 bg-white p-5">
            <p className="text-base font-semibold">Tu cuenta todavía no está unida a tu ficha del equipo</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">Avísale a Zentro Urbano. Cuando la unamos, podrás publicar viviendas de dueños desde aquí.</p>
          </div>
        ) : (
          <>
            <div className="publication-account-bar"><span>{account.role_label}: <strong>{aliadoName}</strong>. El anuncio queda a nombre del dueño.</span></div>
            <Link href="/requisitos" target="_blank" rel="noopener noreferrer" className="zu-button zu-button-secondary mb-5"><ClipboardCheck size={16} aria-hidden="true" />Qué necesita el dueño para publicar</Link>
            <PublishWizard key={account.id} account={{ id: `aliado:${account.id}`, name: "", phone: "" }} department={department.slug} forOwner={{ aliadoName, roleLabel: account.role_label }} />
          </>
        )}
      </div>
    </main>
  );
}
