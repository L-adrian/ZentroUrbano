import { NextResponse, type NextRequest } from "next/server";
import { loginWithPassword, setSessionCookie } from "@/lib/mysql-auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "JSON invalido." }, { status: 400 });
  }

  const result = await loginWithPassword(
    typeof body.email === "string" ? body.email : "",
    typeof body.password === "string" ? body.password : "",
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  await setSessionCookie(result.session);
  return NextResponse.json({ ok: true, accountId: result.accountId });
}
