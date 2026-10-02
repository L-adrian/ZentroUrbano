import { bufferBody } from "@/lib/binary-response";
import { tourAsset } from "@/lib/property-tours";
import { validTourFile, validTourRevision, validTourSlug } from "@/lib/property-tour-contract";

// Asset URLs carry the tour revision, so a published file never changes under the same URL.
const publicCache = "public, max-age=86400, must-revalidate";

export async function tourAssetResponse(request: Request, { slug, revision, filename }: { slug: string; revision: string; filename: string }, preview = false) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  if (!validTourSlug(slug) || !validTourRevision(revision) || !validTourFile(filename)) return new Response(null, { status: 404, headers });
  try {
    const cache = preview ? headers["Cache-Control"] : publicCache;
    const ifNoneMatch = preview ? null : request.headers.get("if-none-match");
    if (ifNoneMatch) {
      const meta = await tourAsset(slug, revision, filename, preview, false);
      if (!meta) return new Response(null, { status: 404, headers });
      const etag = `"${meta.sha256}"`;
      if (ifNoneMatch === etag) return new Response(null, { status: 304, headers: { ...headers, "Cache-Control": cache, ETag: etag } });
    }
    const asset = await tourAsset(slug, revision, filename, preview);
    if (!asset?.data) return new Response(null, { status: 404, headers });
    const etag = `"${asset.sha256}"`;
    return new Response(bufferBody(asset.data), { headers: { ...headers, "Cache-Control": cache, ETag: etag, "Content-Type": "application/octet-stream", "Content-Length": String(asset.data.length) } });
  } catch { return new Response(null, { status: 503, headers }); }
}
