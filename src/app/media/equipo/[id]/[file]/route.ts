import { bufferBody } from "@/lib/binary-response";
import { readTeamMemberPhoto, validTeamId } from "@/lib/team";

// Team photos, stored in MySQL as small WebP files. A new photo gets a new version number, so
// each address can be cached for a long time.
export async function GET(_request: Request, context: RouteContext<"/media/equipo/[id]/[file]">) {
  const { id, file } = await context.params;
  const version = Number(/^(\d{1,6})\.webp$/.exec(file)?.[1]);
  if (!validTeamId(id) || !Number.isInteger(version) || version < 1) return new Response(null, { status: 404 });
  try {
    const photo = await readTeamMemberPhoto(id, version);
    if (!photo) return new Response(null, { status: 404 });
    return new Response(bufferBody(photo), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(photo.length),
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
