import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/mysql-auth";

export async function GET() {
  const account = await getCurrentAccount();

  if (account) {
    return NextResponse.json({
      authenticated: true,
      provider: account.storage ?? "mysql",
      accountId: account.id,
      label: account.company_name ?? account.display_name ?? account.email ?? "Cuenta Zentro Urbano",
      avatarUrl: account.avatar_url,
    });
  }

  return NextResponse.json({
    authenticated: false,
    provider: null,
    accountId: null,
    label: null,
    avatarUrl: null,
  });
}
