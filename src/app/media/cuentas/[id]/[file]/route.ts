import { bufferBody } from "@/lib/binary-response";
import { readAccountPhoto, validAccountId } from "@/lib/account-profile";

// Account profile photos, stored in MySQL as small WebP files. A new photo gets a new version
// number, so each address can be cached for a long time.
export async function GET(_request: Request, context: RouteContext<"/media/cuentas/[id]/[file]">) {
  const { id, file } = await context.params;
  const version = Number(/^(\d{1,6})\.webp$/.exec(file)?.[1]);
  if (!validAccountId(id) || !Number.isInteger(version) || version < 1) return new Response(null, { status: 404 });
  try {
    const photo = await readAccountPhoto(id, version);
    if (!photo) return new Response(null, { status: 404 });
    return new Response(bufferBody(photo), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(photo.length),
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("account photo read failed", error);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
