import { tourAssetResponse } from "@/lib/property-tour-response";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: RouteContext<"/media/recorridos/[slug]/[revision]/[filename]">) {
  return tourAssetResponse(request, await context.params);
}
