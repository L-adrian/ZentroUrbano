import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { PublicationError, reviewDatabaseRequest } from "@/lib/database-publications";
import { validPublicationId } from "@/lib/publication-requests";

export async function POST(request:Request,context:RouteContext<"/admin/solicitudes/[id]/decision">) {
  const admin=authenticatedAdmin(request.headers);
  if (!admin) return NextResponse.json({ok:false,message:"Acceso exclusivo del administrador."},{status:403});
  if (!sameOriginAdminMutation(request)) return NextResponse.json({ok:false,message:"Origen no permitido."},{status:403});
  const {id}=await context.params;
  if (!validPublicationId(id)) return NextResponse.json({ok:false},{status:404});
  const payload=await request.json().catch(()=>null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ok:false},{status:400});
  try {
    const result=await reviewDatabaseRequest(id,admin,payload);
    for (const route of ["/","/bienvenida","/propiedades","/mapa","/cliente","/cliente/solicitudes","/admin/solicitudes","/sitemap.xml"]) revalidatePath(route);
    revalidatePath("/[operation]/[city]/[zone]","page");
    revalidatePath("/departamentos/[zone]","page");
    if (result.slug) revalidatePath(`/propiedades/${result.slug}`);
    return NextResponse.json({ok:true,...result});
  } catch(error) {
    return NextResponse.json({ok:false,message:error instanceof PublicationError ? error.message : "No se pudo guardar la decisión. Actualiza antes de reintentar."},{status:error instanceof PublicationError ? error.status : 503});
  }
}
