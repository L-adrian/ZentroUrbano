import sharp from "sharp";
import { NextResponse } from "next/server";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { isMissingTable, setTeamMemberPhoto, validTeamId } from "@/lib/team";

const maxPhotoBytes = 10 * 1024 * 1024;

// A team photo is cut to a 320 px square WebP (about 20 KB) before it is stored.
export async function POST(request: Request) {
  if (!authenticatedAdmin(request.headers)) return NextResponse.json({ ok: false, message: "Acceso exclusivo del administrador." }, { status: 403 });
  if (!sameOriginAdminMutation(request, "multipart/form-data")) return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const id = form?.get("id");
  const photo = form?.get("photo");
  if (!validTeamId(id) || !(photo instanceof File)) return NextResponse.json({ ok: false, message: "Elige una foto." }, { status: 400 });
  if (!photo.size || photo.size > maxPhotoBytes || !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
    return NextResponse.json({ ok: false, message: "Usa una foto JPG, PNG o WebP de hasta 10 MB." }, { status: 415 });
  }
  let bytes: Buffer;
  try {
    bytes = await sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(320, 320, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ ok: false, message: "No pudimos leer la foto. Exportala de nuevo como JPG." }, { status: 415 });
  }
  try {
    await setTeamMemberPhoto(id, bytes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ ok: false, message: "Falta aplicar la migración 008 (equipo y visitas)." }, { status: 503 });
    console.error("team photo failed", error);
    return NextResponse.json({ ok: false, message: "No se pudo guardar la foto." }, { status: 503 });
  }
}
