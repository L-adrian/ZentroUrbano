import type { Metadata } from "next";
import Link from "next/link";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Politica de privacidad",
  description: "Como Zentro Urbano trata datos de contacto, consultas e informacion enviada.",
  path: "/privacidad",
});

const sections = [
  {
    title: "Cuenta y borradores",
    body: "Para publicar necesitas una cuenta. La solicitud se guarda asociada a esa cuenta con sus datos de contacto y fotos. Si ingresas con Google, recibimos los datos de perfil que autorices. Los campos del borrador se guardan en el almacenamiento de este navegador, separados por cuenta; las fotos deben adjuntarse nuevamente al recargar. Puedes borrar esos campos desde el formulario. La sesión y tus preferencias de tema o moneda también utilizan cookies o almacenamiento del navegador.",
  },
  {
    title: "Datos que podemos recibir",
    body: "Podemos recibir nombre, teléfono, correo, mensaje de consulta, datos de una propiedad, imágenes y ubicación aproximada o coordenadas cuando una persona solicita información o pide publicar una ficha.",
  },
  {
    title: "Uso de la información",
    body: "Usamos la información para responder consultas, preparar fichas de viviendas en alquiler, coordinar el contacto directo con propietarios, mejorar la calidad del catálogo y prevenir publicaciones engañosas.",
  },
  {
    title: "Canales externos",
    body: "Zentro Urbano usa enlaces de WhatsApp, mapas y servicios de imágenes o mapas. Al abrir esos servicios, aplican también sus propias políticas de privacidad.",
  },
  {
    title: "Conservación",
    body: "Conservamos datos mientras sean necesarios para gestionar consultas, mantener fichas activas o cumplir obligaciones operativas razonables.",
  },
  {
    title: "Solicitudes",
    body: "Puedes pedir corrección o eliminación de información enviada a Zentro Urbano escribiendo por los canales de contacto publicados.",
  },
];

export default function PrivacyPage() {
  return (
    <main id="contenido" className="info-page bg-white">
      <section className="border-b border-black/10 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
            Privacidad
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
            Política de privacidad.
          </h1>
          <p className="mt-5 text-base leading-8 text-neutral-600">
            Esta política resume cómo tratamos la información que recibimos para operar Zentro Urbano.
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

          <div className="rounded-[28px] bg-white p-6 text-sm leading-7 text-neutral-600 ring-1 ring-black/10">
            Para ejercer una solicitud sobre tus datos, usa la página de{" "}
            <Link href="/contacto" className="font-semibold text-neutral-950">
              contacto
            </Link>
            .
          </div>
        </div>
      </section>
    </main>
  );
}
