import { readDatabasePhoto } from "@/lib/database-publications";
import { validPublicationId } from "@/lib/publication-requests";
import { bufferBody } from "@/lib/binary-response";

export async function GET(_request:Request,context:RouteContext<"/media/propiedades/[id]/[filename]">) {
  const {id,filename}=await context.params;
  if (!validPublicationId(id) || !/^\d{2}\.(jpg|png|webp)$/.test(filename)) return new Response(null,{status:404});
  try {
    const photo=await readDatabasePhoto(id,filename,true);
    if (!photo) return new Response(null,{status:404});
    // Approved photos are never rewritten under the same name; a day of caching spares MySQL a BLOB read per view.
    return new Response(bufferBody(photo.bytes),{headers:{"Content-Type":"image/webp","Content-Length":String(photo.bytes.length),"Cache-Control":"public, max-age=86400, stale-while-revalidate=604800","X-Content-Type-Options":"nosniff"}});
  } catch { return new Response(null,{status:503,headers:{"Cache-Control":"no-store"}}); }
}
