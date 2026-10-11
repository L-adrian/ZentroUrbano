// Animated pixel-art scene in the chibi style: a Santa Cruz house "SE ALQUILA", a young couple with their dog
// talks with the owner, the sign turns to "ALQUILADO" and they go inside. It is a GIF drawn at 200x96 and scaled
// up with crisp pixels; with prefers-reduced-motion it shows a still frame instead.
// `scene` drops the card look so the drawing can blend into the home header.
export function PixelNeighborhood({ hero = false, scene = false }: { hero?: boolean; scene?: boolean }) {
  return <div className={`pixel-neighborhood ${hero ? "is-hero" : ""} ${scene ? "is-scene" : ""}`}>
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet="/images/pixel/barrio-chibi.png" />
      <img
        src="/images/pixel/barrio-chibi.gif"
        alt="Una casa en alquiler en Santa Cruz: una pareja con su perrito habla con el propietario, el letrero cambia a alquilado y entran a su nueva casa"
        width={200}
        height={96}
        loading="eager"
        decoding="async"
      />
    </picture>
  </div>;
}
