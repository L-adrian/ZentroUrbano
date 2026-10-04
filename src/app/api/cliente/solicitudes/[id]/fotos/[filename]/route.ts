import { bufferBody } from "@/lib/binary-response";
import { readOwnerRequestPhoto } from "@/lib/database-publications";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { hasDatabaseConfig } from "@/lib/mysql";
import { validPublicationId } from "@/lib/publication-requests";

// "Corregir y reenviar": the photos of the owner's own request load back into /publicar.
// Only that owner, and only while the request waits for a correction.
export async function GET(_request: Request, context: RouteContext<"/api/cliente/solicitudes/[id]/fotos/[filename]">) {
  const { id, filename } = await context.params;
  if (!validPublicationId(id) || !/^\d{2}\.(jpg|png|webp)$/.test(filename) || !hasDatabaseConfig()) return new Response(null, { status: 404 });
  const account = await getCurrentAccount();
  if (!account || account.kind !== "owner" || account.storage === "local") return new Response(null, { status: 404 });
  try {
    const photo = await readOwnerRequestPhoto(account.id, id, filename);
    if (!photo) return new Response(null, { status: 404 });
    return new Response(bufferBody(photo.bytes), {
      headers: { "Content-Type": photo.content_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
