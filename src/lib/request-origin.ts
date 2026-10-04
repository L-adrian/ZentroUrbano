// Next builds request.url from the server's own address (0.0.0.0:PORT on Hostinger), so the
// address people actually use comes from the proxy headers, as in admin-access.ts.
export function visibleHost(request: Request) {
  return (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host)
    .split(",")[0]
    .trim()
    .toLowerCase();
}

export function visibleOrigin(request: Request) {
  const protocol = (request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", ""))
    .split(",")[0]
    .trim();
  return `${protocol}://${visibleHost(request)}`;
}

// Browser posts from other sites are refused. Requests without an Origin header (curl, old
// browsers) pass, since they cannot carry another site's visitor.
export function isSameSiteRequest(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === visibleHost(request);
  } catch {
    return false;
  }
}
