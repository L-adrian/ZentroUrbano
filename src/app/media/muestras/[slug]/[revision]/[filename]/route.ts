import { getPrivateShowcaseAsset } from "@/lib/private-tour-showcase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseHeaders = {
  "Cache-Control": "private, max-age=86400, immutable",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; revision: string; filename: string }> },
) {
  try {
    const { slug, revision, filename } = await context.params;
    const asset = await getPrivateShowcaseAsset(slug, revision, filename);
    if (!asset) return new Response(null, { status: 404, headers: baseHeaders });
    const etag = `"${asset.sha256}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ...baseHeaders, ETag: etag } });
    }
    return new Response(new Uint8Array(asset.data), {
      headers: {
        ...baseHeaders,
        ETag: etag,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(asset.data.length),
      },
    });
  } catch {
    return new Response(null, { status: 503, headers: { ...baseHeaders, "Cache-Control": "private, no-store" } });
  }
}
