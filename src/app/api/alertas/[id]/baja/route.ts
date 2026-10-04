import { NextResponse, type NextRequest } from "next/server";
import { isSameSiteRequest, visibleOrigin } from "@/lib/request-origin";
import { updateSearchAlert, validAlertId } from "@/lib/search-alerts";

// Unsubscribe link sent with each manual notice. A form POST (not a GET), so link previews
// in WhatsApp cannot unsubscribe anyone by opening the link.
export async function POST(request: NextRequest, context: RouteContext<"/api/alertas/[id]/baja">) {
  if (!isSameSiteRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const { id } = await context.params;
  if (!validAlertId(id)) return NextResponse.redirect(new URL("/", visibleOrigin(request)), 303);
  try {
    await updateSearchAlert(id, "remove");
  } catch (error) {
    console.error("search alert unsubscribe failed", error);
    return NextResponse.redirect(new URL(`/alertas/baja/${id}?error=1`, visibleOrigin(request)), 303);
  }
  return NextResponse.redirect(new URL(`/alertas/baja/${id}?listo=1`, visibleOrigin(request)), 303);
}
