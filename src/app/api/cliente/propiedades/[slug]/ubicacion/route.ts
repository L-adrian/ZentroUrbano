import { NextResponse } from "next/server";
import { sameOriginAdminMutation } from "@/lib/admin-access";
import { confirmListingLocation, PublicationError, revalidateListingPages } from "@/lib/database-publications";
import { hasDatabaseConfig } from "@/lib/mysql";
import { getListingOwner } from "@/lib/mysql-auth";
import { parseOwnerCoordinates } from "@/lib/owner-location";

// "Verificar ubicación" from Mi cuenta. Only the listing's owner can confirm its point; nothing
// goes back to review, and admins never reach this route.
export async function POST(request: Request, context: RouteContext<"/api/cliente/propiedades/[slug]/ubicacion">) {
  if (!sameOriginAdminMutation(request)) return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  if (!hasDatabaseConfig()) return NextResponse.json({ ok: false, message: "La base de datos no está disponible." }, { status: 503 });
  const { slug } = await context.params;
  const point = parseOwnerCoordinates(await request.json().catch(() => null));
  if (!point) return NextResponse.json({ ok: false, message: "Elige un punto dentro de Bolivia en el mapa." }, { status: 400 });
  const owner = await getListingOwner(slug);
  if (!owner) return NextResponse.json({ ok: false, message: "No tienes permiso para cambiar este anuncio." }, { status: 403 });

  try {
    const result = await confirmListingLocation(owner.id, slug, point);
    revalidateListingPages(slug);
    return NextResponse.json({ ok: true, ...result, coordinates: point });
  } catch (error) {
    if (error instanceof PublicationError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    console.error("owner location confirmation failed", error);
    return NextResponse.json({ ok: false, message: "No se pudo guardar la ubicación. Intenta nuevamente." }, { status: 503 });
  }
}
