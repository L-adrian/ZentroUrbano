import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPublicationRequest } from "@/lib/publication-requests";
import { persistentStorageRoot } from "@/lib/storage";
import { authenticatedAdmin } from "@/lib/admin-access";
import { hasDatabaseConfig } from "@/lib/mysql";
import { readDatabasePhoto } from "@/lib/database-publications";

// /admin/:path* is protected by the existing administrative authentication proxy.
export async function GET(_request: Request, context: RouteContext<"/admin/solicitudes/[id]/fotos/[filename]">) {
  if (!authenticatedAdmin(_request.headers)) return new Response(null,{status:403});
  const { id, filename } = await context.params;
  if (!/^\d{2}\.(jpg|png|webp)$/.test(filename)) return new Response(null, { status: 404 });
  const record = await getPublicationRequest(id);
  const photo = record?.photos.find(item => item.storedName === filename);
  if (!photo) return new Response(null, { status: 404 });
  try {
    if (hasDatabaseConfig()) {
      const photo=await readDatabasePhoto(id,filename);
      if (!photo) return new Response(null,{status:404});
      return new Response(new Uint8Array(photo.bytes),{headers:{"Content-Type":photo.content_type,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
    }
    const bytes = await readFile(path.join(persistentStorageRoot, "publication-requests", id, filename));
    const contentType = filename.endsWith(".png") ? "image/png" : filename.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(bytes, { headers: { "Content-Type": contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": `inline; filename="${filename}"` } });
  } catch { return new Response(null, { status: 404 }); }
}
