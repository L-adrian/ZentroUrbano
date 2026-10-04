import { splashHousePixels } from "@/lib/splash";

// First visit of the session: a pixel house builds itself while the page loads, with the real
// progress (document and images) counted up to 100%. The script in <head> (splashScript) decides
// whether it shows and drives it through classes and a CSS variable on <html>, so React never
// sees this markup change. Without JavaScript, or with reduced motion, it never appears.
export function SplashScreen() {
  return <div id="zu-splash" aria-hidden="true">
    <div className="zu-splash-house">
      {splashHousePixels.map(({ x, y, kind, order }) => <span key={`${x}-${y}`} className={`is-${kind}`} style={{ gridColumn: x + 1, gridRow: y + 1, animationDelay: `${order * 10}ms` }} />)}
    </div>
    <p className="zu-splash-name">Zentro<span>Urbano</span></p>
    <p className="zu-splash-tagline">Tu próximo hogar, directo con el dueño</p>
    <div className="zu-splash-progress"><span /></div>
    <p className="zu-splash-pct" />
  </div>;
}
