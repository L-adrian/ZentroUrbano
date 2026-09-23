import Link from "next/link";
import { ArrowRight, Camera, ChevronDown, CircleDollarSign, ClipboardCheck, House, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { PublicationGuideActions } from "@/components/publication-guide-actions";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { buildSeoMetadata } from "@/lib/seo";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { maxPhotoBytes, maxTotalPhotoBytes, maxUploadPhotos } from "@/lib/upload-photos";
import "./requirements.css";

export const metadata = buildSeoMetadata({
  title: "Qué necesitas para publicar tu alquiler",
  description: "La lista para propietarios: fotos, ubicación, características, precio, garantía y contacto. Consulta los requisitos sin cuenta y comparte la guía de Zentro Urbano.",
  path: "/requisitos",
});

type GuideItem = { id: string; title: string; detail: string; note?: string };
const sections: { id: string; title: string; icon: typeof House; items: GuideItem[] }[] = [
  { id: "cuenta", title: "Tu cuenta y contacto", icon: UserRound, items: [
    { id: "cuenta-propietario", title: "Una cuenta a tu nombre", detail: "Regístrate con tu correo o con Google antes de empezar a subir fotos." },
    { id: "contacto", title: "Nombre y número de WhatsApp", detail: "Nombre del propietario y celular de Bolivia de 8 dígitos, con o sin +591. Las consultas del alquiler llegarán a ese número." },
  ] },
  { id: "fotos", title: "Fotos de la vivienda", icon: Camera, items: [
    { id: "archivos", title: `Entre 1 y ${maxUploadPhotos} fotos reales`, detail: `JPG, PNG o WebP. Hasta ${maxPhotoBytes / 1024 / 1024} MB por foto y ${maxTotalPhotoBytes / 1024 / 1024} MB en total. Máximo 40 megapíxeles. Sin archivos repetidos.`, note: "Obligatorio" },
    { id: "clasificacion", title: "El ambiente de cada foto", detail: "Al subirlas, selecciona qué muestra cada foto: sala, cocina, dormitorio, baño u otro ambiente. La primera será la portada; puedes cambiarla.", note: "Obligatorio" },
    { id: "ambientes", title: "Sala, cocina, dormitorio y baño", detail: "Prepara al menos 5 fotos para mostrar los ambientes. Añade fachada, parqueo, patio o áreas comunes cuando corresponda.", note: "Recomendado" },
    { id: "calidad", title: "Fotos claras y bien iluminadas", detail: "Se recomienda una resolución de 900 × 600 px o mayor. Al cargarlas, verás avisos sobre resolución, iluminación y posible desenfoque.", note: "Recomendado" },
  ] },
  { id: "vivienda", title: "Ubicación y características", icon: MapPin, items: [
    { id: "tipo", title: "Título y tipo de vivienda", detail: "Casa, departamento o monoambiente. Un título descriptivo, por ejemplo: Departamento de 2 dormitorios en Urbari." },
    { id: "ubicacion", title: "Zona y dirección aproximada", detail: "Barrio, avenida, calle, anillo o una referencia que permita ubicar la vivienda." },
    { id: "distribucion", title: "Dormitorios y parqueos", detail: "Cantidad de dormitorios y espacios de parqueo. Indica 0 cuando no tenga." },
    { id: "caracteristicas", title: "Mascotas, equipamiento y comodidades", detail: "Confirma si aceptas mascotas y si tiene muebles, seguridad, piscina, patio o balcón, churrasquera y ascensor." },
    { id: "descripcion", title: "Una descripción del alquiler", detail: "Al menos 30 caracteres. Incluye distribución, estado, servicios y condiciones que deba conocer el inquilino." },
    { id: "banos", title: "Cantidad de baños", detail: "Si no tienes el dato confirmado, puedes dejarlo vacío. La ficha mostrará Consultar.", note: "Opcional" },
    { id: "superficie", title: "Superficie en m²", detail: "Añade la superficie si la conoces. No es necesario inventar ni estimar este dato.", note: "Opcional" },
  ] },
  { id: "costos", title: "Precio y condiciones", icon: CircleDollarSign, items: [
    { id: "alquiler", title: "Alquiler mensual y moneda", detail: "Monto en bolivianos o dólares. Si eliges dólares, también debes indicar tu tipo de cambio en Bs por USD." },
    { id: "expensas", title: "Expensas mensuales", detail: "Monto adicional en la misma moneda del alquiler. Si no hay un cobro adicional o ya están incluidas en el precio, indica 0 y acláralo en la descripción." },
    { id: "garantia", title: "Garantía", detail: "Sin garantía, 1 mes, 2 meses u otro monto. Si eliges otro monto, indica la cantidad exacta." },
    { id: "condiciones", title: "Servicios y otras condiciones", detail: "Aclara en la descripción qué incluye el precio, qué paga el inquilino y cualquier condición adicional.", note: "Recomendado" },
  ] },
  { id: "revision", title: "Antes de enviar", icon: ClipboardCheck, items: [
    { id: "disponibilidad", title: "Información y disponibilidad actualizadas", detail: "Comprueba fotos, ubicación, contacto, precio y condiciones. La vivienda debe seguir disponible." },
    { id: "trato-directo", title: "Confirmación del propietario", detail: "Confirmarás que eres propietario, que el contrato será directo contigo y que no cobras comisión de intermediación." },
  ] },
];

export default function PublicationRequirementsPage() {
  const url = absoluteUrl("/requisitos");
  return <main id="contenido" className="publication-guide zu-container">
    <div className="guide-print-brand"><House size={21} aria-hidden="true" /><strong>Zentro Urbano</strong><span>Alquiler directo con el propietario</span></div>
    <header className="guide-heading">
      <p className="zu-eyebrow"><ClipboardCheck size={15} aria-hidden="true" /> GUÍA PARA PROPIETARIOS</p>
      <h1>Qué necesitas para publicar tu alquiler</h1>
      <p>Fotos, datos y condiciones para preparar tu alquiler. Puedes consultar y compartir esta lista sin crear una cuenta.</p>
      <div className="guide-heading-bottom">
        <span className="guide-direct"><ShieldCheck size={17} aria-hidden="true" />Solo viviendas en alquiler. Trato directo, sin intermediarios.</span>
        <PublicationGuideActions url={url} />
      </div>
    </header>

    <details className="guide-mobile-index guide-screen-only"><summary>Ir a una sección<ChevronDown size={17} aria-hidden="true" /></summary><nav aria-label="Secciones de la guía">{sections.map(({ id, title }, index) => <a key={id} href={`#${id}`}>{index + 1}. {title}</a>)}</nav></details>
    <div className="guide-layout">
      <aside className="guide-sidebar guide-screen-only" aria-label="Contenido de la guía">
        <p>EN ESTA LISTA</p>
        <nav>{sections.map(({ id, title, icon: Icon }, index) => <a key={id} href={`#${id}`}><Icon size={16} aria-hidden="true" /><span>{index + 1}. {title}</span></a>)}</nav>
        <div className="guide-sidebar-action"><Link className="zu-button zu-button-primary" href="/publicar">Publicar mi vivienda<ArrowRight size={16} aria-hidden="true" /></Link><span>Primero accedes a tu cuenta.</span></div>
      </aside>

      <div className="guide-content">
        {sections.map(({ id, title, icon: Icon, items }, index) => <section className="guide-section" id={id} key={id} aria-labelledby={`${id}-titulo`}>
          <div className="guide-section-heading"><span className="guide-section-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h2 id={`${id}-titulo`}>{title}</h2><Icon size={21} aria-hidden="true" /></div>
          <ul className="guide-checklist">{items.map(item => <li key={item.id}>
            <label className="guide-item"><input type="checkbox" name={item.id} aria-label={`Tengo listo: ${item.title}`} /><span><span className="guide-item-title">{item.title}{item.note && <small>{item.note}</small>}</span><span className="guide-item-detail">{item.detail}</span></span></label>
          </li>)}</ul>
        </section>)}

        <section className="guide-review" aria-labelledby="revision-manual"><ClipboardCheck size={23} aria-hidden="true" /><div><h2 id="revision-manual">Enviar no significa publicar automáticamente</h2><p>Tu solicitud queda pendiente de revisión manual. El administrador puede aprobarla, rechazarla o pedir una aclaración. Puedes seguir su estado desde tu cuenta.</p></div></section>
        <div className="guide-closing guide-screen-only"><Link href="/publicar" className="zu-button zu-button-primary">Ya tengo todo, empezar<ArrowRight size={17} aria-hidden="true" /></Link><SupportWhatsAppButton /></div>
        <div className="guide-document-footer"><span>{url.replace(/^https?:\/\//, "")}</span><span>Ayuda: {siteConfig.phoneDisplay}</span><span>{siteConfig.email}</span></div>
      </div>
    </div>
  </main>;
}
