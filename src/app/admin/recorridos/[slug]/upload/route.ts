import { revalidatePath } from "next/cache";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { importTour } from "@/lib/property-tours";
import { TOUR_FILES, validTourSlug, type TourFile } from "@/lib/property-tour-contract";
import { limitedTourForm } from "@/lib/property-tour-validation";
export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/admin/recorridos/[slug]/upload">) {
  const admin = authenticatedAdmin(request.headers);
  if (!admin || !sameOriginAdminMutation(request, "multipart/form-data")) return Response.json({ message: "Acceso exclusivo del administrador." }, { status: 403 });
  const { slug } = await context.params;
  if (!validTourSlug(slug)) return Response.json({ message: "Ficha inválida." }, { status: 404 });
  try {
    const form = await limitedTourForm(request);
    const manifest = form.get("manifest");
    if (!(manifest instanceof File) || manifest.size > 4096) throw new Error("Adjunta el manifiesto JSON del recorrido (máximo 4 KB).");
    const assets = {} as Record<TourFile, Buffer>;
    for (const name of TOUR_FILES) {
      const file = form.get(name);
      if (!(file instanceof File)) throw new Error(`Falta ${name}.`);
      assets[name] = Buffer.from(await file.arrayBuffer());
    }
    const revision = await importTour(slug, JSON.parse(await manifest.text()), assets, admin, String(form.get("expectedRevision") || ""));
    revalidatePath("/admin/recorridos");
    return Response.json({ ok: true, revision });
  } catch (error) {
    const databaseError = Boolean(error && typeof error === "object" && "code" in error);
    return Response.json({ message: databaseError ? "No se pudo guardar el recorrido. Verifica la migración y la conexión de la base de datos." : error instanceof Error ? error.message : "No se pudo guardar el recorrido." }, { status: databaseError ? 503 : 400 });
  }
}
