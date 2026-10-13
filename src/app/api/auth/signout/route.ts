import { NextResponse } from "next/server";
import { clearCurrentSession } from "@/lib/mysql-auth";
import { isSameSiteRequest } from "@/lib/request-origin";

export async function POST(request: Request) {
  // Another site cannot sign a visitor out.
  if (!isSameSiteRequest(request)) return NextResponse.json({ ok: false, message: "Origen no permitido." }, { status: 403 });
  try { await clearCurrentSession(); }
  catch { return NextResponse.json({ok:false,message:"No pudimos revocar la sesión. Intenta nuevamente."},{status:503}); }

  return NextResponse.json({ ok: true });
}
