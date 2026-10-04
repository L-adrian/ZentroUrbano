import "server-only";
import { ownerCorrectableRequest } from "@/lib/database-publications";
import { getListingOwner } from "@/lib/mysql-auth";
import { hasDatabaseConfig, queryOne } from "@/lib/mysql";
import { mapPropertyRow, type PropertyRow } from "@/lib/property-data";
import { validPublicationId } from "@/lib/publication-requests";
import {
  correctionFormValues,
  photoCategoriesFromText,
  similarUnitFormValues,
  validPhotoCategory,
  type PublishPrefill,
} from "@/lib/publish-prefill";
import { isDirectRental } from "@/lib/rentals";

const slugPattern = /^[a-z0-9-]{1,140}$/;

// /publicar?corregir=<request> and /publicar?parecida=<listing>. Both are checked against the
// signed-in owner; anything else opens the empty form with a short note.
export async function loadPublishPrefill(
  accountId: string,
  query: { corregir?: string | string[]; parecida?: string | string[] },
): Promise<{ prefill?: PublishPrefill; problem?: string }> {
  const correct = typeof query.corregir === "string" ? query.corregir : "";
  const similar = typeof query.parecida === "string" ? query.parecida : "";
  if (!correct && !similar) return {};
  if (!hasDatabaseConfig()) return { problem: "Esta opción no está disponible en este momento. Puedes completar el formulario desde cero." };

  try {
    if (correct) {
      const found = validPublicationId(correct) ? await ownerCorrectableRequest(accountId, correct) : null;
      if (!found) return { problem: "Esa solicitud ya no espera una corrección. Revisa su estado en Mi cuenta." };
      const { record, details } = found;
      const fromText = photoCategoriesFromText(record.sourceText, record.photos.length);
      return {
        prefill: {
          id: `corregir-${record.id}`,
          kind: "correction",
          sourceTitle: details.title,
          requestId: record.id,
          reason: record.reviewReason ?? null,
          form: correctionFormValues(details, { name: record.contactName, whatsapp: record.whatsapp }),
          photos: record.photos.map((photo, index) => ({
            url: `/api/cliente/solicitudes/${record.id}/fotos/${encodeURIComponent(photo.storedName)}`,
            name: photo.originalName || photo.storedName,
            category: validPhotoCategory(photo.category) || fromText[index] || "",
          })),
        },
      };
    }

    const owner = slugPattern.test(similar) ? await getListingOwner(similar) : null;
    if (!owner || owner.id !== accountId) return { problem: "No encontramos ese anuncio en tu cuenta. Puedes completar el formulario desde cero." };
    const row = await queryOne<PropertyRow>("select * from properties where slug = :slug limit 1", { slug: similar });
    const property = row ? mapPropertyRow(row) : null;
    if (!property || !isDirectRental(property)) return { problem: "No encontramos ese anuncio en tu cuenta. Puedes completar el formulario desde cero." };
    return {
      prefill: {
        id: `parecida-${property.slug}`,
        kind: "similar",
        sourceTitle: property.title,
        form: similarUnitFormValues(property),
        photos: [],
      },
    };
  } catch (error) {
    console.error("publish prefill failed", error);
    return { problem: "No pudimos cargar esos datos. Puedes completar el formulario desde cero o intentar de nuevo." };
  }
}
