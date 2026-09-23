import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedAdmin, configuredAdminPassword } from "@/lib/admin-access";

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/contact-leads")
  ) {
    return handleAdminAccess(request);
  }

  return NextResponse.next();
}

function handleAdminAccess(request: NextRequest) {
  const adminPassword = configuredAdminPassword();

  if (!adminPassword) {
    return noIndex(
      new NextResponse("Admin no configurado. Define ZENTRO_URBANO_ADMIN_PASSWORD.", {
        status: 503,
      }),
    );
  }

  const isAuthorized = authenticatedAdmin(request.headers);

  if (!isAuthorized) {
    return noIndex(
      new NextResponse("Acceso privado de Zentro Urbano.", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Zentro Urbano Admin", charset="UTF-8"',
        },
      }),
    );
  }

  return noIndex(NextResponse.next());
}

function noIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/contact-leads/:path*"],
};
