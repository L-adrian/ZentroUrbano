import { NextResponse } from "next/server";
import { clearCurrentSession } from "@/lib/mysql-auth";

export async function POST() {
  try { await clearCurrentSession(); }
  catch { return NextResponse.json({ok:false,message:"No pudimos revocar la sesión. Intenta nuevamente."},{status:503}); }

  return NextResponse.json({ ok: true });
}
