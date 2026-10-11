import { NextResponse, type NextRequest } from "next/server";
import { issueFormTicket, turnstileSiteKey, type FormPurpose } from "@/lib/form-guard";

// A fresh signed ticket for the sign-up or visit form, asked for when the form opens.
export async function GET(request: NextRequest) {
  const purpose: FormPurpose | null = ({ registro: "signup", visita: "visit" } as const)[request.nextUrl.searchParams.get("para") ?? ""] ?? null;
  if (!purpose) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json(
    { ok: true, ticket: issueFormTicket(purpose), turnstileSiteKey: turnstileSiteKey() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
