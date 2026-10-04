import { bufferBody } from "@/lib/binary-response";
import { readOwnerPhoto } from "@/lib/database-publications";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { validPublicationId } from "@/lib/publication-requests";

// Photos of a hidden listing (rented, paused or in review) for its owner only.
export async function GET(_request: Request, context: RouteContext<"/api/cliente/fotos/[id]/[filename]">) {
  const { id, filename } = await context.params;
  if (!validPublicationId(id) || !/^\d{2}\.(jpg|png|webp)$/.test(filename)) return new Response(null, { status: 404 });
  const account = await getCurrentAccount();
  if (!account || account.kind !== "owner" || account.storage === "local") return new Response(null, { status: 404 });
  try {
    const photo = await readOwnerPhoto(account.id, id, filename);
    if (!photo) return new Response(null, { status: 404 });
    return new Response(bufferBody(photo.bytes), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
