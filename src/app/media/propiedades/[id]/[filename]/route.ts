import { readDatabasePhoto } from "@/lib/database-publications";
import { validPublicationId } from "@/lib/publication-requests";

export async function GET(_request:Request,context:RouteContext<"/media/propiedades/[id]/[filename]">) {
  const {id,filename}=await context.params;
  if (!validPublicationId(id) || !/^\d{2}\.(jpg|png|webp)$/.test(filename)) return new Response(null,{status:404});
  try {
    const photo=await readDatabasePhoto(id,filename,true);
    if (!photo) return new Response(null,{status:404});
    return new Response(new Uint8Array(photo.bytes),{headers:{"Content-Type":"image/webp","Cache-Control":"public, max-age=0, must-revalidate","X-Content-Type-Options":"nosniff"}});
  } catch { return new Response(null,{status:503,headers:{"Cache-Control":"no-store"}}); }
}
