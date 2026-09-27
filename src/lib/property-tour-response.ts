import { tourAsset } from "@/lib/property-tours";
import { validTourFile, validTourRevision, validTourSlug } from "@/lib/property-tour-contract";

export async function tourAssetResponse(request: Request, { slug, revision, filename }: { slug: string; revision: string; filename: string }, preview = false) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  if (!validTourSlug(slug) || !validTourRevision(revision) || !validTourFile(filename)) return new Response(null, { status: 404, headers });
  try {
    const asset = await tourAsset(slug, revision, filename, preview);
    if (!asset) return new Response(null, { status: 404, headers });
    const etag = `"${asset.sha256}"`;
    const cache = preview ? headers["Cache-Control"] : "public, max-age=0, must-revalidate";
    if (!preview && request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ...headers, "Cache-Control": cache, ETag: etag } });
    return new Response(new Uint8Array(asset.data), { headers: { ...headers, "Cache-Control": cache, ETag: etag, "Content-Type": "application/octet-stream", "Content-Length": String(asset.data.length) } });
  } catch { return new Response(null, { status: 503, headers }); }
}
