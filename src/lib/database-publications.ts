import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { RowDataPacket } from "mysql2/promise";
import { queryOne, queryRows, withTransaction } from "@/lib/mysql";
import { parsePublicationDetails, type PublicationDetails } from "@/lib/publication-input";
import type { PublicationRequest } from "@/lib/publication-requests";
import { parseCurrencyAmount } from "@/lib/currency";
import { replaceDemoForPublication } from "@/lib/demo-replacements";

export class PublicationError extends Error {
  constructor(public status:number,message:string) { super(message); }
}
export function parseDbJson<T>(value:unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

type RequestRow = {id:string;account_id:string;status:string;payload:unknown;property_slug:string|null;review_reason:string|null;reviewed_by:string|null;reviewed_at:Date|null;created_at:Date};
function mapRequest(row:RequestRow): PublicationRequest {
  return {...parseDbJson<PublicationRequest>(row.payload),id:row.id,accountId:row.account_id,status:row.status,propertySlug:row.property_slug,reviewReason:row.review_reason,reviewedBy:row.reviewed_by,createdAt:row.created_at.toISOString()};
}
export async function databaseRequest(id:string) {
  const row=await queryOne<RequestRow>("SELECT * FROM publication_requests WHERE id=:id",{id});
  return row ? mapRequest(row) : null;
}
export async function databaseRequests(accountId?:string) {
  const rows=await queryRows<RequestRow>(`SELECT * FROM publication_requests ${accountId ? "WHERE account_id=:accountId" : ""} ORDER BY created_at DESC LIMIT 200`,accountId ? {accountId} : {});
  return (rows || []).map(mapRequest);
}
export async function storeDatabaseRequest(record:{id:string;accountId:string;accountEmail:string;contactName:string;whatsapp:string;sourceText:string;details:PublicationDetails;price:number;currency:string;exchangeRate:number|null},photos:File[],key:string) {
  return withTransaction(async connection=>{
    // Serializing each owner's submissions makes retries idempotent, even across processes.
    const [accounts]=await connection.execute<RowDataPacket[]>("SELECT id FROM client_accounts WHERE id=? AND kind='owner' AND status='active' FOR UPDATE",[record.accountId]);
    if (!accounts.length) throw new PublicationError(403,"Tu cuenta no puede publicar.");
    const [existing]=await connection.execute<RowDataPacket[]>("SELECT id,status,payload FROM publication_requests WHERE account_id=? AND idempotency_key=?",[record.accountId,key]);
    if (existing.length) {
      const payload=parseDbJson<{photos:unknown[]}>(existing[0].payload);
      return {requestId:existing[0].id as string,status:existing[0].status as string,photosStored:payload.photos.length};
    }
    const storedPhotos=photos.map((photo,index)=>({originalName:photo.name.slice(0,255),storedName:`${String(index+1).padStart(2,"0")}.${photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg"}`,size:photo.size,type:photo.type}));
    await connection.execute("INSERT INTO publication_requests (id,account_id,idempotency_key,payload) VALUES (?,?,?,?)",[record.id,record.accountId,key,JSON.stringify({...record,photos:storedPhotos})]);
    for (const [index,photo] of photos.entries()) {
      const stored=storedPhotos[index];
      await connection.execute("INSERT INTO publication_photos (request_id,filename,original_name,content_type,byte_size,original_data) VALUES (?,?,?,?,?,?)",[record.id,stored.storedName,stored.originalName,photo.type,photo.size,Buffer.from(await photo.arrayBuffer())]);
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
  if (!["approve","reject"].includes(String(decision)) || reason.length > 1000 || (decision === "reject" && reason.length < 5)) throw new PublicationError(400,"Indica una decisión válida y un motivo para rechazar.");
  const lat=Number(input.latitude),lng=Number(input.longitude);
  if (decision === "approve" && (input.confirmed !== true || input.latitude === "" || input.longitude === "" || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -23 || lat > -9 || lng < -70 || lng > -57)) throw new PublicationError(400,"Confirma la revisión y una ubicación válida dentro de Bolivia.");
  return withTransaction(async connection=>{
    const [rows]=await connection.execute<RowDataPacket[]>("SELECT * FROM publication_requests WHERE id=? FOR UPDATE",[id]);
    if (!rows.length) throw new PublicationError(404,"Solicitud no encontrada.");
    if (rows[0].status !== "pending_review") throw new PublicationError(409,"Esta solicitud ya fue revisada. Actualiza la página.");
    const record=mapRequest(rows[0] as RequestRow);
    let slug:string|null=null;
    if (decision === "approve") {
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
    const status=decision === "approve" ? "approved" : "rejected";
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

function publicationRequirements(details:PublicationDetails) {
  const label=details.currency === "BOB" ? "Bs" : "USD";
  return ["1 mes adelantado",details.guarantee === "Otro monto" ? `Garantía: ${label} ${details.guaranteeAmount}` : details.guarantee.replace("de alquiler", "de garantía"),
    details.commonExpenses ? `Expensas: ${label} ${details.commonExpenses}` : "Expensas incluidas", "Sin comisión de intermediación"];
}
