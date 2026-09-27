import { revalidatePath } from "next/cache";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { reviewTour } from "@/lib/property-tours";
import { validTourSlug } from "@/lib/property-tour-contract";

export async function POST(request: Request, context: RouteContext<"/admin/recorridos/[slug]/decision">) {
  const admin = authenticatedAdmin(request.headers);
  if (!admin || !sameOriginAdminMutation(request)) return Response.json({ message: "Acceso exclusivo del administrador." }, { status: 403 });
  const { slug } = await context.params;
  if (!validTourSlug(slug)) return Response.json({ message: "Ficha inválida." }, { status: 404 });
  if (Number(request.headers.get("content-length") || 0) > 4096) return Response.json({ message: "Solicitud demasiado grande." }, { status: 413 });
  try {
    await reviewTour(slug, await request.json(), admin);
    revalidatePath(`/propiedades/${slug}`);
    revalidatePath("/admin/recorridos");
    return Response.json({ ok: true });
  } catch (error) {
    const databaseError = Boolean(error && typeof error === "object" && "code" in error);
    return Response.json({ message: databaseError ? "No se pudo guardar la decisión. Actualiza antes de reintentar." : error instanceof Error ? error.message : "No se pudo guardar la decisión." }, { status: databaseError ? 503 : 400 });
  }
}
