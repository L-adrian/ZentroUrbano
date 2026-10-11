// Animated pixel-art scene in the chibi style: a Santa Cruz street from day to night as new tenants move in
// (a dad with his son, a couple with their dog, a moving truck); the owner shows the key, they go inside and the
// sign turns green. It is a GIF drawn at 200x96 and scaled up with crisp pixels; with prefers-reduced-motion it
// shows a still frame instead.
// `scene` drops the card look so the drawing can blend into the home header.
export function PixelNeighborhood({ hero = false, scene = false }: { hero?: boolean; scene?: boolean }) {
  return <div className={`pixel-neighborhood ${hero ? "is-hero" : ""} ${scene ? "is-scene" : ""}`}>
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet="/images/pixel/barrio-chibi.png" />
      <img
        src="/images/pixel/barrio-chibi.gif"
        alt="Un barrio de Santa Cruz del día a la noche: llegan un papá con su hijo, una pareja con su perrito y una mudanza en camioneta, y el propietario les entrega la llave"
        width={200}
        height={96}
        loading="eager"
        decoding="async"
      />
    </picture>
  </div>;
}
