import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedAdmin, configuredAdminPassword } from "@/lib/admin-access";
import { departmentCookieName, departmentParam, findDepartment } from "@/lib/regions";
import { visibleOrigin } from "@/lib/request-origin";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/propiedades/muestra-privada-")) {
    return noIndex(NextResponse.next());
  }

  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/contact-leads")
  ) {
    return handleAdminAccess(request);
  }

  const department = request.nextUrl.searchParams.get(departmentParam);
  if (department !== null) return openInDepartment(request, department);

  return NextResponse.next();
}

// A shared search or an alert link says its department, so it opens with the same listings for
// whoever receives it: the choice is saved like the welcome popup does and the parameter is removed.
function openInDepartment(request: NextRequest, slug: string) {
  const origin = visibleOrigin(request);
  const url = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, origin);
  url.searchParams.delete(departmentParam);
  const response = NextResponse.redirect(url);
  if (findDepartment(slug)) {
    response.cookies.set(departmentCookieName, slug, { path: "/", sameSite: "lax", secure: origin.startsWith("https:") });
  }
  return response;
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
  matcher: ["/admin/:path*", "/api/contact-leads/:path*", "/propiedades/muestra-privada-:path*", "/", "/propiedades", "/mapa"],
};
