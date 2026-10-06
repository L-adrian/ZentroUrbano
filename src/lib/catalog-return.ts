// The last search this tab saw (sessionStorage), so "Volver al catálogo" brings back the same filters.
// sessionStorage clears itself when the tab closes, so nobody finds days-old filters later.
// Storage can be blocked (private mode, blocked site data), so every access is wrapped in try/catch.

const lastSearchKey = "zu-ultima-busqueda";
const openedFromKey = "zu-abierto-desde-catalogo";

export const catalogFallbackHref = "/propiedades";

export function rememberCatalogSearch(href: string) {
  try {
    window.sessionStorage.setItem(lastSearchKey, href);
  } catch {}
}

export function readCatalogSearch(): string | null {
  try {
    const href = window.sessionStorage.getItem(lastSearchKey);
    // Only paths inside this site, never a full URL someone could plant.
    return href && href.startsWith("/") && !href.startsWith("//") ? href : null;
  } catch {
    return null;
  }
}

// Marks that the listing at this path was opened from the catalog, so going back is one history step.
export function rememberListingOpened(pathname: string) {
  try {
    window.sessionStorage.setItem(openedFromKey, pathname);
  } catch {}
}

export function wasListingOpenedFromCatalog(pathname: string): boolean {
  try {
    return window.sessionStorage.getItem(openedFromKey) === pathname;
  } catch {
    return false;
  }
}
