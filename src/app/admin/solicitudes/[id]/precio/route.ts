import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { correctApprovedPublicationPrice, PublicationError } from "@/lib/database-publications";
import { validPublicationId } from "@/lib/publication-requests";

export async function PATCH(request:Request,context:RouteContext<"/admin/solicitudes/[id]/precio">) {
  const admin = authenticatedAdmin(request.headers);
  if (!admin || !sameOriginAdminMutation(request)) return NextResponse.json({ok:false,message:"Acceso no permitido."},{status:403});
  const {id} = await context.params;
  if (!validPublicationId(id)) return NextResponse.json({ok:false},{status:404});
  const input = await request.json().catch(()=>null);
  if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ok:false},{status:400});
  try {
    const result = await correctApprovedPublicationPrice(id,admin,input);
    for (const route of ["/","/bienvenida","/propiedades","/mapa","/cliente","/admin","/admin/solicitudes","/sitemap.xml",`/propiedades/${result.slug}`]) revalidatePath(route);
    revalidatePath("/[operation]/[city]/[zone]","page");
    revalidatePath("/departamentos/[zone]","page");
    return NextResponse.json({ok:true,...result});
  } catch (error) {
    return NextResponse.json({ok:false,message:error instanceof PublicationError ? error.message : "No se pudo guardar la corrección."},{status:error instanceof PublicationError ? error.status : 503});
  }
}
