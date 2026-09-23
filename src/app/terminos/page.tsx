import type { Metadata } from "next";
import Link from "next/link";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Terminos y condiciones",
  description: "Condiciones de uso de Zentro Urbano para explorar y publicar propiedades.",
  path: "/terminos",
});

const sections = [
  {
    title: "Cuenta y publicación",
    body: "Para enviar una vivienda debes crear una cuenta o iniciar sesión. Solo se aceptan alquileres residenciales publicados por su propietario, sin comisión de intermediación. Eres responsable de la información y de contar con autorización para utilizar las imágenes enviadas. La solicitud queda vinculada a tu cuenta y pendiente de revisión manual; no se publica automáticamente.",
  },
  {
    title: "Naturaleza del servicio",
    body: "Zentro Urbano conecta a propietarios e inquilinos para el alquiler de viviendas con contrato directo. Organizamos fotos, ubicación, precio y condiciones para facilitar la búsqueda y el contacto sin intermediarios.",
  },
  {
    title: "Información de propiedades",
    body: "Los precios, disponibilidad, requisitos, características, superficies y documentación pueden cambiar. Antes de tomar una decisión, el usuario debe confirmar los datos directamente con el propietario, administrador o responsable de la publicación.",
  },
  {
    title: "Curaduría y revisión",
    body: "Zentro Urbano puede revisar visualmente una ficha antes de publicarla, pero esa revisión no sustituye una verificación legal, técnica, registral o financiera de la propiedad.",
  },
  {
    title: "Contacto y operaciones",
    body: "Zentro Urbano facilita el contacto inicial. El contrato de alquiler, la reserva y los pagos se acuerdan directamente entre propietario e inquilino, con asesoría profesional cuando sea necesario.",
  },
  {
    title: "Uso permitido",
    body: "No se permite usar Zentro Urbano para publicar información falsa, suplantar identidades, promover estafas, ocultar condiciones relevantes o vulnerar derechos de terceros.",
  },
];

export default function TermsPage() {
  return (
    <main id="contenido" className="info-page bg-white">
      <section className="border-b border-black/10 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
            Términos y condiciones.
          </h1>
          <p className="mt-5 text-base leading-8 text-neutral-600">
            Estos términos explican cómo debe utilizarse Zentro Urbano y qué alcance tiene la información
            publicada en la plataforma.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-4 px-4 sm:px-6 lg:px-8">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[28px] border border-black/10 bg-white p-6">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-600">{section.body}</p>
            </article>
          ))}

          <div className="rounded-[28px] bg-neutral-950 p-6 text-white">
            <h2 className="text-xl font-semibold tracking-tight">Contacto</h2>
            <p className="mt-3 text-sm leading-7 text-white/72">
              Para consultas sobre estos términos, escribe desde la página de{" "}
              <Link href="/contacto" className="font-semibold text-white">
                contacto
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
