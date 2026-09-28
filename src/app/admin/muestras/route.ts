import { revalidatePath } from "next/cache";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import {
  importPrivateTourShowcase,
  PRIVATE_SHOWCASE_FILES,
  type PrivateShowcaseFile,
} from "@/lib/private-tour-showcase";
import { validTourSlug } from "@/lib/property-tour-contract";
import { limitedTourForm, validateTourAsset } from "@/lib/property-tour-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = authenticatedAdmin(request.headers);
  if (!admin || !sameOriginAdminMutation(request, "multipart/form-data")) {
    return Response.json({ message: "Acceso exclusivo del administrador." }, { status: 403 });
  }
  try {
    const form = await limitedTourForm(request);
    const slug = String(form.get("slug") || "");
    if (!validTourSlug(slug) || slug.length < 36) throw new Error("El enlace privado no es válido.");
    const manifest = form.get("manifest");
    if (!(manifest instanceof File) || manifest.size > 8192) throw new Error("Adjunta un manifiesto JSON válido.");
    const assets = {} as Record<PrivateShowcaseFile, Buffer>;
    for (const filename of PRIVATE_SHOWCASE_FILES) {
      const file = form.get(filename);
      if (!(file instanceof File)) throw new Error(`Falta ${filename}.`);
      const bytes = Buffer.from(await file.arrayBuffer());
      validateTourAsset("world.spz", bytes);
      assets[filename] = bytes;
    }
    const revision = await importPrivateTourShowcase(slug, JSON.parse(await manifest.text()), assets, admin);
    revalidatePath(`/propiedades/${slug}`);
    return Response.json({ ok: true, slug, revision, url: `/propiedades/${slug}` });
  } catch (error) {
    const databaseError = Boolean(error && typeof error === "object" && "code" in error);
    return Response.json(
      { message: databaseError ? "No se pudo guardar la muestra en la base de datos." : error instanceof Error ? error.message : "No se pudo guardar la muestra." },
      { status: databaseError ? 503 : 400 },
    );
  }
}
