// /admin: what happened with each listing in the last 30 days, counted in people (one device = one
// person, see property-audience). Pure, so the table and its tests share it.

export const funnelWhatsappSources = [
  ["ficha", "Ficha"],
  ["barra", "Barra inferior"],
  ["galeria", "Galería"],
  ["tarjeta", "Tarjeta"],
  ["mapa", "Mapa"],
  ["recorrido", "Recorrido 3D"],
  ["otro", "Otro"],
] as const;

export type FunnelCountsRow = { slug: string; viewed: number; gallery: number; shared: number; whatsapp: number };
export type FunnelSourceRow = { slug: string; source: string; people: number };
export type ListingFunnelRow = FunnelCountsRow & {
  title: string;
  hidden: boolean;
  whatsappBySource: { source: string; label: string; people: number }[];
};

const sourceLabels = new Map<string, string>(funnelWhatsappSources);

export function buildListingFunnel(
  counts: FunnelCountsRow[],
  sources: FunnelSourceRow[],
  titles: Map<string, string>,
  limit = 60,
  hidden: ReadonlySet<string> = new Set(),
): ListingFunnelRow[] {
  const bySlug = new Map<string, Map<string, number>>();
  for (const row of sources) {
    const source = sourceLabels.has(row.source) ? row.source : "otro";
    const map = bySlug.get(row.slug) ?? new Map<string, number>();
    map.set(source, (map.get(source) ?? 0) + row.people);
    bySlug.set(row.slug, map);
  }
  return counts
    .filter((row) => row.viewed + row.gallery + row.shared + row.whatsapp > 0)
    .map((row) => {
      const found = bySlug.get(row.slug);
      return {
        ...row,
        title: titles.get(row.slug) ?? row.slug,
        hidden: hidden.has(row.slug),
        whatsappBySource: funnelWhatsappSources
          .map(([source, label]) => ({ source, label, people: found?.get(source) ?? 0 }))
          .filter((item) => item.people > 0),
      };
    })
    .sort((a, b) => b.viewed - a.viewed || b.whatsapp - a.whatsapp || a.title.localeCompare(b.title, "es"))
    .slice(0, limit);
}

// "12 de 40" style share, without decimals; empty when there is nothing to compare with.
export function funnelShare(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "";
}
