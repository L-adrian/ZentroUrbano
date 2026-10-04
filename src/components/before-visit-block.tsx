import { beforeVisitRows } from "@/lib/before-visit";
import type { Property } from "@/lib/properties";

// Listing page, under "Costos": when the home is free, the minimum contract, the advance and the
// services included. Left out entirely when the owner gave none of them.
export function BeforeVisitBlock({ property }: { property: Pick<Property, "rentalDetails"> }) {
  const rows = beforeVisitRows(property.rentalDetails);
  if (!rows) return null;
  return (
    <section className="entry-cost before-visit mt-3" aria-labelledby="before-visit-title">
      <h2 id="before-visit-title">Antes de visitar</h2>
      <dl>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value ?? <span className="entry-cost-pending">Pendiente de consulta</span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
