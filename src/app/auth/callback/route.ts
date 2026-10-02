import { NextResponse, type NextRequest } from "next/server";
import { safeAuthNext } from "@/lib/auth-navigation";

export async function GET(request: NextRequest) {
  const next = safeAuthNext(new URL(request.url).searchParams.get("next"));

  return NextResponse.redirect(new URL(next, request.url));
}
