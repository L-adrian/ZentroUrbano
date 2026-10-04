import { NextResponse } from "next/server";
import { sameOriginAdminMutation } from "@/lib/admin-access";
import { PublicationError, requestListingRepublish, revalidateListingPages, updateListingAvailability } from "@/lib/database-publications";
import { hasDatabaseConfig } from "@/lib/mysql";
import { getListingOwner } from "@/lib/mysql-auth";
import { trackServerEvent } from "@/lib/tracking";

const actions = ["confirm", "rented", "republish"] as const;

// Owner actions from Mi cuenta: "Sigue disponible", "Ya se alquiló" and "Volver a publicar".
export async function POST(request: Request, context: RouteContext<"/api/cliente/propiedades/[slug]/estado">) {
  // Same-origin JSON only, like the admin mutations; the session cookie alone is not enough.
  if (!sameOriginAdminMutation(request)) return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  if (!hasDatabaseConfig()) return NextResponse.json({ ok: false, message: "La base de datos no está disponible." }, { status: 503 });
  const { slug } = await context.params;
  const payload = (await request.json().catch(() => null)) as { action?: unknown } | null;
  const action = actions.find((item) => item === payload?.action);
  if (!action) return NextResponse.json({ ok: false, message: "Acción no válida." }, { status: 400 });
  const owner = await getListingOwner(slug);
  if (!owner) return NextResponse.json({ ok: false, message: "No tienes permiso para cambiar este anuncio." }, { status: 403 });

  try {
    if (action === "republish") {
      const result = await requestListingRepublish(owner.id, slug);
      revalidateListingPages(null);
      return NextResponse.json({ ok: true, ...result });
    }
    await updateListingAvailability(slug, action, owner.id);
    await trackServerEvent({
      eventType: action === "confirm" ? "property_availability_confirmed" : "property_marked_rented",
      propertySlug: slug,
      path: "/cliente",
      metadata: { by: "owner" },
    });
    revalidateListingPages(slug);
    return NextResponse.json({ ok: true, action });
  } catch (error) {
    if (error instanceof PublicationError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    console.error("owner listing action failed", error);
    return NextResponse.json({ ok: false, message: "No se pudo guardar el cambio. Intenta nuevamente." }, { status: 503 });
  }
}
