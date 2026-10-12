import { findDepartment } from "@/lib/regions";

// Animated pixel-art scene in the chibi style: a Santa Cruz street from day to night as new tenants move in
// (a dad with his son, a couple with their dog, a moving truck); the owner shows the key, they go inside and the
// sign turns green. It is a GIF drawn at 200x96 and scaled up with crisp pixels; with prefers-reduced-motion it
// shows a still frame instead.
// `scene` drops the card look so the drawing can blend into the home header.
// Each department has its own version (public/images/pixel/departamentos/<slug>.gif): the chibis wear a typical
// costume of that department and the house takes its flag colors. Without a department it shows the original scene.
export function PixelNeighborhood({ hero = false, scene = false, department }: { hero?: boolean; scene?: boolean; department?: string }) {
  const chosen = findDepartment(department);
  const base = chosen ? `/images/pixel/departamentos/${chosen.slug}` : "/images/pixel/barrio-chibi";
  const place = chosen?.name ?? "Santa Cruz";
  return <div className={`pixel-neighborhood ${hero ? "is-hero" : ""} ${scene ? "is-scene" : ""}`}>
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={`${base}.png`} />
      <img
        src={`${base}.gif`}
        alt={`Un barrio de ${place} del día a la noche: llegan un papá con su hijo, una pareja con su perrito y una mudanza en camioneta, y el propietario les entrega la llave`}
        width={200}
        height={96}
        loading="eager"
        decoding="async"
      />
    </picture>
  </div>;
}
