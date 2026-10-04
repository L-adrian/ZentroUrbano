import { ArrowRight, ClipboardList, Images } from "lucide-react";
import { beforeVisitRows } from "@/lib/before-visit";
import type { PublicationRequest } from "@/lib/publication-requests";
import type { PublicationDetails } from "@/lib/publication-input";
import Link from "next/link";
import { PublicationReviewControls } from "@/components/publication-review-controls";

const statusLabels: Record<string, string> = { pending_review: "Pendiente de revisión", approved: "Aprobada", rejected: "Rechazada", changes_requested: "Corrección pedida" };
const correctable = new Set(["changes_requested", "rejected"]);

function expensesLabel(details: PublicationDetails) {
  if (details.expensesMode === "included") return "Incluidas en el alquiler";
  if (details.expensesMode === "none") return "No se cobran";
  return details.commonExpenses > 0 ? `${details.currency} ${details.commonExpenses} por mes` : "0 (formulario anterior: incluidas o no se cobran)";
}

function petsLabel(details: PublicationDetails) {
  if (details.petsPolicy === "allowed" || (!details.petsPolicy && details.pets)) return "Sí";
  if (details.petsPolicy === "not_allowed") return "No";
  return "A consultar";
}

// Public photos of a hidden listing are not served; the admin opens the reviewed originals instead.
function adminPhotoUrl(image: string) {
  const match = /^\/media\/propiedades\/(publication_[a-f0-9]{24})\/(\d{2}\.(?:jpg|png|webp))$/.exec(image);
  return match ? `/admin/solicitudes/${match[1]}/fotos/${match[2]}` : image;
}

export function PublicationRequestList({ requests, admin = false }: { requests: PublicationRequest[]; admin?: boolean }) {
  // A request that already has a corrected copy is not offered for correction again.
  const corrected = new Set(requests.map(request => request.correctionOf).filter(Boolean));
  return <div className="request-list">
    {!requests.length && <p className="request-empty"><ClipboardList size={22} />Todavía no hay solicitudes enviadas.</p>}
    {requests.map(request => {
      const republish = request.kind === "republish";
      const title = republish ? `Volver a publicar: ${request.listing?.title ?? request.propertySlug ?? ""}` : request.details?.title || request.contactName;
      const photoLinks = republish
        ? (request.listing?.images ?? []).map((image, index) => ({ key: `${image}-${index}`, href: adminPhotoUrl(image) }))
        : request.photos.map(photo => ({ key: photo.storedName, href: `/admin/solicitudes/${request.id}/fotos/${encodeURIComponent(photo.storedName)}` }));
      return <article className="request-item" key={request.id}>
        <div className="request-item-heading"><h2>{title}</h2><span>{statusLabels[request.status] ?? "En seguimiento"}</span></div>
        <p className="request-meta">
          {new Date(request.createdAt).toLocaleDateString("es-BO", { timeZone: "America/La_Paz" })} · {republish ? "Anuncio oculto que el propietario quiere mostrar de nuevo" : `${request.photos.length} ${request.photos.length === 1 ? "foto recibida" : "fotos recibidas"}`}
        </p>
        <p className="request-reference">Referencia: {request.id}</p>
        {request.correctionOf && <p className="request-meta">Corrección de la solicitud {request.correctionOf}</p>}
        {admin && <p className="request-meta">{request.accountEmail}</p>}
        {request.reviewReason && <p>{request.status === "changes_requested" ? "Lo que pedimos corregir" : "Observación"}: {request.reviewReason}</p>}
        {!admin && !republish && request.details && correctable.has(request.status) && (corrected.has(request.id)
          ? <p className="request-meta">Ya enviaste la corrección. La revisamos y verás el resultado aquí.</p>
          : <Link className="request-back-link" href={`/publicar?corregir=${request.id}`}>Corregir y reenviar<ArrowRight size={16} /></Link>)}
        {request.status === "approved" && request.propertySlug && <Link className="request-back-link" href={`/propiedades/${request.propertySlug}`}>Ver anuncio</Link>}
        {!republish && <details><summary>Ver información enviada</summary><p className="request-description">{request.sourceText}</p></details>}
        {admin && photoLinks.length > 0 && <div className="request-photo-links">{photoLinks.map((photo, index) => <a key={photo.key} href={photo.href} target="_blank" rel="noopener noreferrer"><Images size={16} />Foto {index + 1}</a>)}</div>}
        {admin && republish && request.listing && <dl className="review-facts"><div><dt>Alquiler</dt><dd>{request.listing.currency} {request.listing.price}</dd></div><div><dt>Zona</dt><dd>{request.listing.zone}</dd></div><div><dt>Estado anterior</dt><dd>{request.listing.previousStatus === "rented" ? "Alquilado" : "Pausado"}</dd></div><div><dt>Última confirmación</dt><dd>{request.listing.availabilityConfirmedAt ? new Date(request.listing.availabilityConfirmedAt).toLocaleDateString("es-BO", { timeZone: "America/La_Paz" }) : "Sin fecha"}</dd></div><div><dt>Propietario</dt><dd>{request.contactName} / {request.whatsapp || "sin WhatsApp"}</dd></div></dl>}
        {admin && request.details && <dl className="review-facts"><div><dt>Alquiler</dt><dd>{request.details.currency} {request.details.price}</dd></div><div><dt>Expensas</dt><dd>{expensesLabel(request.details)}</dd></div><div><dt>Garantía</dt><dd>{request.details.guarantee}{request.details.guarantee === "Otro monto" ? `: ${request.details.guaranteeAmount}` : ""}</dd></div><div><dt>Propietario</dt><dd>{request.contactName} / {request.whatsapp}</dd></div><div><dt>Dirección</dt><dd>{request.details.address}, {request.details.zone}</dd></div></dl>}
        {admin && request.details && <dl className="review-facts"><div><dt>Dormitorios / baños / parqueos</dt><dd>{request.details.bedrooms ?? "Consultar"} / {request.details.bathrooms ?? "Consultar"} / {request.details.garage}</dd></div><div><dt>Superficie</dt><dd>{request.details.area === null ? "Consultar" : `${request.details.area} m²`}</dd></div>{request.details.currency === "USD" && <div><dt>Tipo de cambio</dt><dd>{request.details.exchangeRate} Bs/USD</dd></div>}<div><dt>Mascotas</dt><dd>{petsLabel(request.details)}</dd></div><div><dt>Características</dt><dd>{[["furnished","Amoblado"],["security","Seguridad"],["pool","Piscina"],["patio","Patio"],["grill","Churrasquera"],["elevator","Ascensor"]].filter(([key])=>request.details?.[key as keyof typeof request.details] === true).map(([,label])=>label).join(", ") || "Sin extras indicados"}</dd></div></dl>}
        {admin && request.details && <BeforeVisitFacts details={request.details} />}
        {admin && request.status === "pending_review" && <PublicationReviewControls id={request.id} address={request.details?.address || ""} canApprove={republish || Boolean(request.details)} republish={republish}/>}
      </article>;
    })}
  </div>;
}

// "Antes de visitar": only the answers the owner gave.
function BeforeVisitFacts({ details }: { details: PublicationDetails }) {
  const rows = beforeVisitRows(details)?.filter(row => row.value);
  if (!rows?.length) return null;
  return <dl className="review-facts">{rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>;
}
