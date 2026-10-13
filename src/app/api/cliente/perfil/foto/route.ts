import sharp from "sharp";
import { NextResponse } from "next/server";
import { accountPhotoMaxBytes, accountPhotoTypes, editableOwner, removeAccountPhoto, setAccountPhoto } from "@/lib/account-profile";
import { isSameSiteRequest } from "@/lib/request-origin";
import { isMissingTable } from "@/lib/team";

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const missingMigration = "La foto de perfil todavía no está activa. Falta aplicar la migración 010.";

// The owner's profile photo, cut to a 320 px square WebP (about 20 KB) before it is stored.
export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const account = await editableOwner();
  if (!account) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof File)) return reply(400, { ok: false, message: "Elige una foto." });
  if (!photo.size || photo.size > accountPhotoMaxBytes || !accountPhotoTypes.includes(photo.type)) {
    return reply(415, { ok: false, message: "Usa una foto JPG, PNG o WebP de hasta 10 MB." });
  }
  let bytes: Buffer;
  try {
    bytes = await sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(320, 320, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return reply(415, { ok: false, message: "No pudimos leer la foto. Prueba con otra o sácale captura." });
  }
  try {
    return reply(200, { ok: true, avatarUrl: await setAccountPhoto(account.id, bytes) });
  } catch (error) {
    if (isMissingTable(error)) return reply(503, { ok: false, message: missingMigration });
    console.error("account photo failed", error);
    return reply(503, { ok: false, message: "No se pudo guardar la foto. Intenta de nuevo." });
  }
}

export async function DELETE(request: Request) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const account = await editableOwner();
  if (!account) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  try {
    await removeAccountPhoto(account.id);
    return reply(200, { ok: true });
  } catch (error) {
    if (isMissingTable(error)) return reply(503, { ok: false, message: missingMigration });
    console.error("account photo removal failed", error);
    return reply(503, { ok: false, message: "No se pudo quitar la foto. Intenta de nuevo." });
  }
}
