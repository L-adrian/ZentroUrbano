import { NextResponse } from "next/server";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { PublicationError, revalidateListingPages, updateListingAvailability } from "@/lib/database-publications";
import { trackServerEvent } from "@/lib/tracking";

// Admin version of "Sigue disponible" and "Ya se alquiló". Nothing is deleted.
export async function POST(request: Request, context: RouteContext<"/admin/fichas/[slug]/estado">) {
  const admin = authenticatedAdmin(request.headers);
  if (!admin) return NextResponse.json({ ok: false, message: "Acceso exclusivo del administrador." }, { status: 403 });
  if (!sameOriginAdminMutation(request)) return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  const { slug } = await context.params;
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return NextResponse.json({ ok: false }, { status: 404 });
  const payload = (await request.json().catch(() => null)) as { action?: unknown } | null;
  const action = payload?.action === "confirm" || payload?.action === "rented" ? payload.action : null;
  if (!action) return NextResponse.json({ ok: false, message: "Acción no válida." }, { status: 400 });

  try {
    await updateListingAvailability(slug, action, null);
    await trackServerEvent({
      eventType: action === "confirm" ? "property_availability_confirmed" : "property_marked_rented",
      propertySlug: slug,
      path: "/admin",
      metadata: { by: "admin", admin },
    });
    revalidateListingPages(slug);
    return NextResponse.json({ ok: true, action });
  } catch (error) {
    if (error instanceof PublicationError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    console.error("admin listing action failed", error);
    return NextResponse.json({ ok: false, message: "No se pudo guardar el cambio. Actualiza antes de reintentar." }, { status: 503 });
  }
}
