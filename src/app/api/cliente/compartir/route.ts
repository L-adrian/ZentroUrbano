import { createShareLink, listShareLinks, revokeShareLink, validShareToken } from "@/lib/agency-share";
import { agencyRequest, crmReply } from "@/lib/crm-route";

const validSlug = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9-]{1,180}$/.test(value);

// The agency's read-only link of one home for its owner.
export async function GET(request: Request) {
  return agencyRequest(
    request,
    async ({ accountId }) => {
      const slug = new URL(request.url).searchParams.get("propiedad");
      if (!validSlug(slug)) return crmReply(400, { ok: false, message: "Falta la vivienda." });
      return crmReply(200, { ok: true, links: await listShareLinks(accountId, slug) });
    },
    { agencyOnly: true },
  );
}

export async function POST(request: Request) {
  return agencyRequest(
    request,
    async ({ accountId }, body) => {
      if (!validSlug(body.propiedad)) return crmReply(400, { ok: false, message: "Falta la vivienda." });
      const links = await createShareLink(accountId, body.propiedad);
      return links ? crmReply(200, { ok: true, links }) : crmReply(404, { ok: false, message: "Esa vivienda no está en tu cuenta." });
    },
    { agencyOnly: true },
  );
}

export async function DELETE(request: Request) {
  return agencyRequest(
    request,
    async ({ accountId }) => {
      const token = new URL(request.url).searchParams.get("token");
      if (!validShareToken(token)) return crmReply(400, { ok: false, message: "Falta el enlace." });
      const links = await revokeShareLink(accountId, token);
      return links ? crmReply(200, { ok: true, links }) : crmReply(404, { ok: false, message: "Ese enlace ya no está." });
    },
    { agencyOnly: true },
  );
}
