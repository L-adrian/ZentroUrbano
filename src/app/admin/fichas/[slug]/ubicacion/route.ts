import { NextResponse } from "next/server";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { PublicationError, revalidateListingPages, updateListingPlace } from "@/lib/database-publications";

// Administrator's fix of a published listing's zone and map point.
export async function POST(request: Request, context: RouteContext<"/admin/fichas/[slug]/ubicacion">) {
  const admin = authenticatedAdmin(request.headers);
  if (!admin) return NextResponse.json({ ok: false, message: "Acceso exclusivo del administrador." }, { status: 403 });
  if (!sameOriginAdminMutation(request)) return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  const { slug } = await context.params;
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return NextResponse.json({ ok: false }, { status: 404 });
  const payload = (await request.json().catch(() => null)) as { zone?: unknown; latitude?: unknown; longitude?: unknown } | null;
  const zone = typeof payload?.zone === "string" ? payload.zone.trim().slice(0, 160) : "";
  const lat = Number(payload?.latitude), lng = Number(payload?.longitude);
  if (!zone) return NextResponse.json({ ok: false, message: "Escribe la zona o el barrio." }, { status: 400 });
  if (payload?.latitude === "" || payload?.longitude === "" || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -23 || lat > -9 || lng < -70 || lng > -57) {
    return NextResponse.json({ ok: false, message: "Indica una latitud y longitud válidas dentro de Bolivia." }, { status: 400 });
  }
  try {
    const result = await updateListingPlace(slug, zone, { lat, lng });
    revalidateListingPages(slug);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof PublicationError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    console.error("admin listing place update failed", error);
    return NextResponse.json({ ok: false, message: "No se pudo guardar el cambio. Actualiza antes de reintentar." }, { status: 503 });
  }
}
