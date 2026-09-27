import { authenticatedAdmin } from "@/lib/admin-access";
import { tourAssetResponse } from "@/lib/property-tour-response";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: RouteContext<"/admin/recorridos/[slug]/[revision]/[filename]">) {
  if (!authenticatedAdmin(request.headers)) return new Response(null, { status: 403 });
  return tourAssetResponse(request, await context.params, true);
}
