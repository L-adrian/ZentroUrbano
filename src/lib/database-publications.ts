import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { queryOne, queryRows, withTransaction } from "@/lib/mysql";
import { parsePublicationDetails, publicationRequirements, type PublicationDetails } from "@/lib/publication-input";
import type { PublicationRequest } from "@/lib/publication-requests";
import { parseCurrencyAmount } from "@/lib/currency";
import { replaceDemoForPublication } from "@/lib/demo-replacements";
import { getCuratedRentalBySlug } from "@/lib/curated-rentals";
import { generatedMapUrl, isGeneratedMapUrl } from "@/lib/owner-location";
import type { StoredUploadPhoto } from "@/lib/upload-photos";

// "Pedir corrección" (P8): the request stays out of the catalog and the owner fixes it from Mi cuenta.
export const correctableRequestStatuses = ["changes_requested", "rejected"];
export type UploadedPhoto = StoredUploadPhoto & { originalName: string; category: string };

export class PublicationError extends Error {
  constructor(public status:number,message:string) { super(message); }
}
export function parseDbJson<T>(value:unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

type RequestRow = {id:string;account_id:string;status:string;payload:unknown;property_slug:string|null;review_reason:string|null;reviewed_by:string|null;reviewed_at:Date|null;created_at:Date};
function mapRequest(row:RequestRow): PublicationRequest {
  return {...parseDbJson<PublicationRequest>(row.payload),id:row.id,accountId:row.account_id,status:row.status,propertySlug:row.property_slug,reviewReason:row.review_reason,reviewedBy:row.reviewed_by,reviewedAt:row.reviewed_at ? row.reviewed_at.toISOString() : null,createdAt:row.created_at.toISOString()};
}
export async function databaseRequest(id:string) {
  const row=await queryOne<RequestRow>("SELECT * FROM publication_requests WHERE id=:id",{id});
  return row ? mapRequest(row) : null;
}
export async function databaseRequests(accountId?:string) {
  const rows=await queryRows<RequestRow>(`SELECT * FROM publication_requests ${accountId ? "WHERE account_id=:accountId" : ""} ORDER BY created_at DESC LIMIT 200`,accountId ? {accountId} : {});
  return (rows || []).map(mapRequest);
}
export async function storeDatabaseRequest(record:{id:string;accountId:string;accountEmail:string;contactName:string;whatsapp:string;sourceText:string;details:PublicationDetails;price:number;currency:string;exchangeRate:number|null;correctionOf?:string},photos:UploadedPhoto[],key:string) {
  return withTransaction(async connection=>{
    // Serializing each owner's submissions makes retries idempotent, even across processes.
    const [accounts]=await connection.execute<RowDataPacket[]>("SELECT id FROM client_accounts WHERE id=? AND kind='owner' AND status='active' FOR UPDATE",[record.accountId]);
    if (!accounts.length) throw new PublicationError(403,"Tu cuenta no puede publicar.");
    const [existing]=await connection.execute<RowDataPacket[]>("SELECT id,status,payload FROM publication_requests WHERE account_id=? AND idempotency_key=?",[record.accountId,key]);
    if (existing.length) {
      const payload=parseDbJson<{photos:unknown[]}>(existing[0].payload);
      return {requestId:existing[0].id as string,status:existing[0].status as string,photosStored:payload.photos.length};
    }
    // Photos arrive already shrunk (shrinkUploadPhoto); the room label travels with each one.
    const storedPhotos=photos.map((photo,index)=>({originalName:photo.originalName.slice(0,255),storedName:`${String(index+1).padStart(2,"0")}.${photo.extension}`,size:photo.size,type:photo.type,...(photo.category ? {category:photo.category} : {})}));
    await connection.execute("INSERT INTO publication_requests (id,account_id,idempotency_key,payload) VALUES (?,?,?,?)",[record.id,record.accountId,key,JSON.stringify({...record,photos:storedPhotos})]);
    for (const [index,photo] of photos.entries()) {
      const stored=storedPhotos[index];
      await connection.execute("INSERT INTO publication_photos (request_id,filename,original_name,content_type,byte_size,original_data) VALUES (?,?,?,?,?,?)",[record.id,stored.storedName,stored.originalName,photo.type,photo.size,photo.bytes]);
    }
    return {requestId:record.id as string,status:"pending_review",photosStored:photos.length};
  });
}

export async function readDatabasePhoto(id:string,filename:string,publicOnly=false) {
  return queryOne<{bytes:Buffer;content_type:string}>(publicOnly
    ? "SELECT f.public_data AS bytes, 'image/webp' AS content_type FROM publication_photos f JOIN publication_requests r ON r.id=f.request_id JOIN properties p ON p.slug=r.property_slug WHERE f.request_id=:id AND f.filename=:filename AND r.status='approved' AND p.published=1 AND f.public_data IS NOT NULL"
    : "SELECT original_data AS bytes,content_type FROM publication_photos WHERE request_id=:id AND filename=:filename",{id,filename});
}

export async function reviewDatabaseRequest(id:string,admin:string,input:Record<string,unknown>) {
  const decision=input.decision;
  const reason=typeof input.reason === "string" ? input.reason.trim() : "";
  if (!["approve","reject","changes"].includes(String(decision)) || reason.length > 1000 || (decision !== "approve" && reason.length < 5)) {
    throw new PublicationError(400,decision === "changes" ? "Escribe qué debe corregir el propietario (mínimo 5 caracteres)." : "Indica una decisión válida y un motivo para rechazar.");
  }
  const lat=Number(input.latitude),lng=Number(input.longitude);
  return withTransaction(async connection=>{
    const [rows]=await connection.execute<RowDataPacket[]>("SELECT * FROM publication_requests WHERE id=? FOR UPDATE",[id]);
    if (!rows.length) throw new PublicationError(404,"Solicitud no encontrada.");
    if (rows[0].status !== "pending_review") throw new PublicationError(409,"Esta solicitud ya fue revisada. Actualiza la página.");
    const record=mapRequest(rows[0] as RequestRow);
    let slug:string|null=null;
    if (decision === "changes" && record.kind === "republish") throw new PublicationError(400,"Para «Volver a publicar», aprueba o mantén oculto el anuncio.");
    if (decision === "changes") {
      // Nothing is published or changed: the owner sees the message and sends a corrected request.
    } else if (record.kind === "republish") {
      if (decision === "approve" && input.confirmed !== true) throw new PublicationError(400,"Confirma que revisaste el anuncio antes de aprobar.");
      slug=await reviewRepublish(connection,record,decision === "approve");
    } else if (decision === "approve" && (input.confirmed !== true || input.latitude === "" || input.longitude === "" || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -23 || lat > -9 || lng < -70 || lng > -57)) {
      throw new PublicationError(400,"Confirma la revisión y una ubicación válida dentro de Bolivia.");
    } else if (decision === "approve") {
      const details=parsePublicationDetails(record.details);
      if (!details) throw new PublicationError(400,"Faltan datos estructurados. Solicita al propietario un nuevo envío completo.");
      const [owners]=await connection.execute<RowDataPacket[]>("SELECT * FROM client_accounts WHERE id=? AND kind='owner' AND status='active'",[record.accountId]);
      if (!owners.length) throw new PublicationError(409,"El propietario ya no tiene una cuenta activa.");
      const [photos]=await connection.execute<RowDataPacket[]>("SELECT filename,original_data FROM publication_photos WHERE request_id=? ORDER BY filename",[id]);
      if (!photos.length) throw new PublicationError(400,"La solicitud no tiene fotos.");
      // Publish re-encoded derivatives without EXIF/GPS; originals stay admin-only.
      for (const photo of photos) {
        const bytes=await sharp(photo.original_data).rotate().resize({width:1920,height:1920,fit:"inside",withoutEnlargement:true}).webp({quality:85}).toBuffer();
        await connection.execute("UPDATE publication_photos SET public_data=? WHERE request_id=? AND filename=?",[bytes,id,photo.filename]);
      }
      slug=`${details.title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,100) || "alquiler"}-${id.slice(-12)}`;
      const owner=owners[0];
      const profile={name:record.contactName,email:record.accountEmail,phone:record.whatsapp,avatar:owner.avatar_url || "",verified:false};
      const images=photos.map(photo=>`/media/propiedades/${id}/${photo.filename}`);
      const requirements=publicationRequirements(details);
      const columns=["id","slug","title","type","operation","price","currency","exchange_rate","city","zone","address","bedrooms","bathrooms","garage","area","pets","furnished","security","pool","patio","grill","elevator","short_description","long_description","requirements","images","whatsapp","ideal_for","tags","coordinates","neighborhood_highlights","published","availability_confirmed_at","owner_profile","rental_details"];
      const values=[`prop_${randomUUID().replaceAll("-","")}`,slug,details.title,details.type === "Casa" ? "Casa" : "Departamento","Alquiler",details.price,details.currency,details.exchangeRate,"Santa Cruz de la Sierra",details.zone,details.address,details.bedrooms ?? 0,details.bathrooms ?? 0,details.garage,details.area ?? 0,details.pets,details.furnished,details.security,details.pool,details.patio,details.grill,details.elevator,details.description.slice(0,240),details.description,JSON.stringify(requirements),JSON.stringify(images),record.whatsapp,"[]",JSON.stringify(details.type === "Monoambiente" ? ["Monoambiente"] : []),JSON.stringify({lat,lng}),"[]",true,new Date(),JSON.stringify(profile),JSON.stringify(details)];
      await connection.execute(`INSERT INTO properties (${columns.join(",")}) VALUES (${columns.map(()=>"?").join(",")})`,values);
      await connection.execute("INSERT INTO client_account_properties (id,account_id,property_slug,status) VALUES (?,?,?,'active')",[`cap_${randomUUID().replaceAll("-","")}`,record.accountId,slug]);
      await replaceDemoForPublication(connection, slug);
    }
    const status=decision === "approve" ? "approved" : decision === "changes" ? "changes_requested" : "rejected";
    await connection.execute("UPDATE publication_requests SET status=?,property_slug=?,reviewed_by=?,review_reason=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?",[status,slug,admin,reason,id]);
    await connection.execute("INSERT INTO publication_review_audit (request_id,admin_user,decision,reason) VALUES (?,?,?,?)",[id,admin,status,reason]);
    return {status,slug};
  });
}

export async function correctApprovedPublicationPrice(id:string,admin:string,input:Record<string,unknown>) {
  const price = parseCurrencyAmount(input.price);
  const expectedPrice = typeof input.expectedPrice === "number" ? input.expectedPrice : NaN;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (price === null || price <= 0 || price > 100_000_000 || !Number.isFinite(expectedPrice) || expectedPrice < 0 ||
    !["BOB","USD"].includes(String(input.currency)) || reason.length < 10 || reason.length > 700) {
    throw new PublicationError(400,"Indica el precio correcto, la moneda, el precio anterior y el motivo de la corrección.");
  }
  return withTransaction(async connection => {
    const [requests] = await connection.execute<RowDataPacket[]>("SELECT property_slug,status FROM publication_requests WHERE id=? FOR UPDATE",[id]);
    if (!requests.length) throw new PublicationError(404,"Solicitud no encontrada.");
    if (requests[0].status !== "approved" || !requests[0].property_slug) throw new PublicationError(409,"La ficha debe estar aprobada antes de corregir su precio.");
    const slug = String(requests[0].property_slug);
    const [rows] = await connection.execute<RowDataPacket[]>("SELECT price,currency,rental_details FROM properties WHERE slug=? FOR UPDATE",[slug]);
    if (!rows.length) throw new PublicationError(404,"Ficha no encontrada.");
    const current = rows[0];
    const previousPrice = Number(current.price);
    if (current.currency !== input.currency) throw new PublicationError(409,"La moneda no coincide; no se modificó la ficha.");
    if (previousPrice === price) return {slug,price,currency:current.currency,changed:false};
    if (previousPrice !== expectedPrice) throw new PublicationError(409,`El precio cambió desde la revisión. Precio actual: ${previousPrice} ${current.currency}.`);
    const details = parseDbJson<PublicationDetails>(current.rental_details);
    if (!details || typeof details !== "object") throw new PublicationError(409,"La ficha no tiene condiciones estructuradas para corregir su precio.");
    await connection.execute("UPDATE properties SET price=?,rental_details=?,updated_at=CURRENT_TIMESTAMP WHERE slug=?",[price,JSON.stringify({...details,price}),slug]);
    // Keep the original submission intact; the audit records the correction separately.
    await connection.execute("INSERT INTO publication_review_audit (request_id,admin_user,decision,reason) VALUES (?,?,'price_corrected',?)",[id,admin,JSON.stringify({previousPrice,price,currency:current.currency,reason})]);
    return {slug,price,currency:current.currency,previousPrice,changed:true};
  });
}

// A hidden listing goes live again only here, after an admin approves it; nothing else is touched.
async function reviewRepublish(connection:PoolConnection,record:PublicationRequest,approve:boolean) {
  const slug=record.propertySlug;
  if (!slug) throw new PublicationError(409,"La solicitud no indica qué anuncio volver a publicar.");
  const [links]=await connection.execute<RowDataPacket[]>("SELECT id,status FROM client_account_properties WHERE account_id=? AND property_slug=? FOR UPDATE",[record.accountId,slug]);
  const [properties]=await connection.execute<RowDataPacket[]>("SELECT published FROM properties WHERE slug=? FOR UPDATE",[slug]);
  if (!links.length || !properties.length || links[0].status === "closed") throw new PublicationError(409,"Este anuncio ya no está vinculado a la cuenta del propietario.");
  if (approve) {
    const [owners]=await connection.execute<RowDataPacket[]>("SELECT id FROM client_accounts WHERE id=? AND kind='owner' AND status='active'",[record.accountId]);
    if (!owners.length) throw new PublicationError(409,"El propietario ya no tiene una cuenta activa.");
    await connection.execute("UPDATE properties SET published=1,availability_confirmed_at=CURRENT_TIMESTAMP WHERE slug=?",[slug]);
    await connection.execute("UPDATE client_account_properties SET status='active' WHERE id=?",[links[0].id]);
  } else {
    const previous=record.listing?.previousStatus === "rented" ? "rented" : "paused";
    await connection.execute("UPDATE client_account_properties SET status=? WHERE id=? AND status='review'",[previous,links[0].id]);
  }
  return slug;
}

export type ListingAction = "confirm" | "rented";

// Every page that can show a listing or its availability.
export function revalidateListingPages(slug:string|null) {
  for (const route of ["/","/bienvenida","/propiedades","/mapa","/cliente","/cliente/solicitudes","/admin","/admin/solicitudes","/sitemap.xml"]) revalidatePath(route);
  revalidatePath("/[operation]/[city]/[zone]","page");
  revalidatePath("/departamentos/[zone]","page");
  if (slug) revalidatePath(`/propiedades/${slug}`);
}

// "Sigue disponible" renews the confirmation date; "Ya se alquiló" hides the listing without deleting it.
// accountId limits the change to that owner's listing; null is the administrator.
export async function updateListingAvailability(slug:string,action:ListingAction,accountId:string|null) {
  return withTransaction(async connection=>{
    if (accountId) {
      const [links]=await connection.execute<RowDataPacket[]>("SELECT id FROM client_account_properties WHERE account_id=? AND property_slug=? AND status<>'closed' FOR UPDATE",[accountId,slug]);
      if (!links.length) throw new PublicationError(403,"No tienes permiso para cambiar este anuncio.");
    }
    const [rows]=await connection.execute<RowDataPacket[]>("SELECT published FROM properties WHERE slug=? FOR UPDATE",[slug]);
    if (!rows.length) throw new PublicationError(409,"Esta ficha no está guardada en la base de datos; no se puede cambiar desde aquí.");
    if (!rows[0].published) throw new PublicationError(409,"Este anuncio ya está oculto. Actualiza la página.");
    if (action === "confirm") {
      // Confirming is not an edit of the listing, so its update date stays as it was.
      await connection.execute("UPDATE properties SET availability_confirmed_at=CURRENT_TIMESTAMP,updated_at=updated_at WHERE slug=?",[slug]);
    } else {
      // Listings written in the site's code would keep showing from there; a developer retires them.
      if (getCuratedRentalBySlug(slug)) throw new PublicationError(409,"Esta ficha está cargada en el código del sitio. Pide a desarrollo que la retire.");
      await connection.execute("UPDATE properties SET published=0 WHERE slug=?",[slug]);
      await connection.execute(`UPDATE client_account_properties SET status='rented' WHERE property_slug=? AND status<>'closed'${accountId ? " AND account_id=?" : ""}`,accountId ? [slug,accountId] : [slug]);
    }
    return {slug,action};
  });
}

// "Volver a publicar": the listing stays hidden until an admin approves this request.
export async function requestListingRepublish(accountId:string,slug:string) {
  return withTransaction(async connection=>{
    const [rows]=await connection.execute<RowDataPacket[]>(
      `SELECT cap.id AS link_id,cap.status,p.published,p.title,p.zone,p.price,p.currency,p.images,p.whatsapp,p.availability_confirmed_at,ca.display_name,ca.email
         FROM client_account_properties cap
         JOIN properties p ON p.slug=cap.property_slug
         JOIN client_accounts ca ON ca.id=cap.account_id AND ca.kind='owner' AND ca.status='active'
        WHERE cap.account_id=? AND cap.property_slug=? AND cap.status<>'closed' FOR UPDATE`,[accountId,slug]);
    if (!rows.length) throw new PublicationError(403,"No tienes permiso para cambiar este anuncio.");
    const row=rows[0];
    if (row.status === "review") {
      const [pending]=await connection.execute<RowDataPacket[]>("SELECT id FROM publication_requests WHERE account_id=? AND property_slug=? AND status='pending_review' ORDER BY created_at DESC LIMIT 1",[accountId,slug]);
      return {requestId:(pending[0]?.id as string|undefined) ?? null,status:"pending_review"};
    }
    if (row.published) throw new PublicationError(409,"Tu anuncio ya está publicado.");
    const id=`publication_${randomUUID().replaceAll("-","").slice(0,24)}`;
    const images=parseDbJson<unknown>(row.images);
    const payload:Omit<PublicationRequest,"id"|"accountId"|"status"|"createdAt">={
      kind:"republish",accountEmail:row.email ?? "",contactName:row.display_name,whatsapp:row.whatsapp ?? "",
      sourceText:`El propietario pidió volver a publicar «${row.title}».`,photos:[],
      listing:{title:row.title,zone:row.zone,price:Number(row.price),currency:row.currency,
        images:Array.isArray(images) ? images.filter((image):image is string=>typeof image === "string").slice(0,15) : [],
        previousStatus:row.status,availabilityConfirmedAt:row.availability_confirmed_at ? new Date(row.availability_confirmed_at).toISOString() : null},
    };
    await connection.execute("INSERT INTO publication_requests (id,account_id,idempotency_key,payload,property_slug) VALUES (?,?,?,?,?)",[id,accountId,`republish_${id.slice(12)}`,JSON.stringify(payload),slug]);
    await connection.execute("UPDATE client_account_properties SET status='review' WHERE id=?",[row.link_id]);
    return {requestId:id,status:"pending_review"};
  });
}

// "Verificar ubicación": the owner's own point replaces the approximate one and the listing says
// "Ubicación confirmada por el dueño". No new review; the update date stays as it was.
// Only listings with reviewed conditions (rental_details) can store the confirmation.
export async function confirmListingLocation(accountId:string,slug:string,point:{lat:number;lng:number}) {
  return withTransaction(async connection=>{
    const [links]=await connection.execute<RowDataPacket[]>("SELECT id FROM client_account_properties WHERE account_id=? AND property_slug=? AND status<>'closed' FOR UPDATE",[accountId,slug]);
    if (!links.length) throw new PublicationError(403,"No tienes permiso para cambiar este anuncio.");
    const [rows]=await connection.execute<RowDataPacket[]>("SELECT rental_details,map_url FROM properties WHERE slug=? FOR UPDATE",[slug]);
    if (!rows.length) throw new PublicationError(404,"Anuncio no encontrado.");
    if (!rows[0].rental_details) throw new PublicationError(409,"Este anuncio todavía no puede confirmar su ubicación desde aquí. Escríbenos por WhatsApp y lo hacemos contigo.");
    const confirmedAt=new Date().toISOString();
    const mapUrl=isGeneratedMapUrl(rows[0].map_url) ? (rows[0].map_url ? generatedMapUrl(point) : null) : rows[0].map_url;
    await connection.execute(
      "UPDATE properties SET coordinates=?,map_url=?,rental_details=JSON_SET(rental_details,'$.locationConfirmedAt',?),updated_at=updated_at WHERE slug=?",
      [JSON.stringify(point),mapUrl,confirmedAt,slug],
    );
    return {slug,locationConfirmedAt:confirmedAt};
  });
}

// A request its owner can open in /publicar to fix and send again ("Corregir y reenviar").
export async function ownerCorrectableRequest(accountId:string,id:string) {
  const record=await databaseRequest(id);
  if (!record || record.accountId !== accountId || record.kind === "republish" || !correctableRequestStatuses.includes(record.status)) return null;
  const details=parsePublicationDetails(record.details);
  return details ? {record,details} : null;
}

// Photos of the owner's own request while it waits for a correction. Same bytes the admin reviewed.
export async function readOwnerRequestPhoto(accountId:string,id:string,filename:string) {
  return queryOne<{bytes:Buffer;content_type:string}>(
    `SELECT f.original_data AS bytes,f.content_type FROM publication_photos f
       JOIN publication_requests r ON r.id=f.request_id AND r.account_id=:accountId AND r.status IN ('changes_requested','rejected')
      WHERE f.request_id=:id AND f.filename=:filename LIMIT 1`,{accountId,id,filename});
}

// Photos of an owner's own listing, also while it is hidden from the public.
export async function readOwnerPhoto(accountId:string,id:string,filename:string) {
  return queryOne<{bytes:Buffer}>(
    `SELECT f.public_data AS bytes FROM publication_photos f
       JOIN publication_requests r ON r.id=f.request_id AND r.status='approved'
       JOIN client_account_properties cap ON cap.property_slug=r.property_slug AND cap.account_id=:accountId AND cap.status<>'closed'
      WHERE f.request_id=:id AND f.filename=:filename AND f.public_data IS NOT NULL LIMIT 1`,{accountId,id,filename});
}
