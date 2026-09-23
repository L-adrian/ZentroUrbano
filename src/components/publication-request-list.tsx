import { ClipboardList, Images } from "lucide-react";
import type { PublicationRequest } from "@/lib/publication-requests";
import Link from "next/link";
import { PublicationReviewControls } from "@/components/publication-review-controls";

export function PublicationRequestList({ requests, admin = false }: { requests: PublicationRequest[]; admin?: boolean }) {
  return <div className="request-list">
    {!requests.length && <p className="request-empty"><ClipboardList size={22} />Todavía no hay solicitudes enviadas.</p>}
    {requests.map(request => <article className="request-item" key={request.id}>
      <div className="request-item-heading"><h2>{request.details?.title || request.contactName}</h2><span>{request.status === "pending_review" ? "Pendiente de revisión" : request.status === "approved" ? "Aprobada" : request.status === "rejected" ? "Rechazada" : "En seguimiento"}</span></div>
      <p className="request-meta">{new Date(request.createdAt).toLocaleDateString("es-BO", { timeZone: "America/La_Paz" })} · {request.photos.length} {request.photos.length === 1 ? "foto recibida" : "fotos recibidas"}</p>
      <p className="request-reference">Referencia: {request.id}</p>
      {admin && <p className="request-meta">{request.accountEmail}</p>}
      {request.reviewReason && <p>Observación: {request.reviewReason}</p>}
      {request.propertySlug && <Link className="request-back-link" href={`/propiedades/${request.propertySlug}`}>Ver ficha publicada</Link>}
      <details><summary>Ver información enviada</summary><p className="request-description">{request.sourceText}</p></details>
      {admin && <div className="request-photo-links">{request.photos.map((photo, index) => <a key={photo.storedName} href={`/admin/solicitudes/${request.id}/fotos/${encodeURIComponent(photo.storedName)}`} target="_blank" rel="noopener noreferrer"><Images size={16} />Foto {index + 1}</a>)}</div>}
      {admin && request.details && <dl className="review-facts"><div><dt>Alquiler</dt><dd>{request.details.currency} {request.details.price}</dd></div><div><dt>Expensas</dt><dd>{request.details.commonExpenses}</dd></div><div><dt>Garantía</dt><dd>{request.details.guarantee}{request.details.guarantee === "Otro monto" ? `: ${request.details.guaranteeAmount}` : ""}</dd></div><div><dt>Propietario</dt><dd>{request.contactName} / {request.whatsapp}</dd></div><div><dt>Dirección</dt><dd>{request.details.address}, {request.details.zone}</dd></div></dl>}
      {admin && request.details && <dl className="review-facts"><div><dt>Dormitorios / baños / parqueos</dt><dd>{request.details.bedrooms ?? "Consultar"} / {request.details.bathrooms ?? "Consultar"} / {request.details.garage}</dd></div><div><dt>Superficie</dt><dd>{request.details.area === null ? "Consultar" : `${request.details.area} m²`}</dd></div>{request.details.currency === "USD" && <div><dt>Tipo de cambio</dt><dd>{request.details.exchangeRate} Bs/USD</dd></div>}<div><dt>Características</dt><dd>{[["pets","Mascotas"],["furnished","Amoblado"],["security","Seguridad"],["pool","Piscina"],["patio","Patio"],["grill","Churrasquera"],["elevator","Ascensor"]].filter(([key])=>request.details?.[key as keyof typeof request.details] === true).map(([,label])=>label).join(", ") || "Sin extras indicados"}</dd></div></dl>}
      {admin && request.status === "pending_review" && <PublicationReviewControls id={request.id} address={request.details?.address || ""} canApprove={Boolean(request.details)}/>}
    </article>)}
  </div>;
}
