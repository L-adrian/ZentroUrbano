export function RentalMotion({ compact = false, welcome = false }: { compact?: boolean; welcome?: boolean }) {
  return <div className={`rental-motion family-motion ${compact ? "is-compact" : ""} ${welcome ? "is-welcome" : ""}`}>
    <div className="family-scene" role="img" aria-label="Una familia con sus cajas y una planta frente a su nuevo hogar">
      <span className="family-ground" />
      <span className="family-sprite family-apartments" />
      <span className="family-sprite family-house" />
      <span className="family-arrival">
        <span className="family-sprite family-father" />
        <span className="family-sprite family-mother" />
        <span className="family-sprite family-child" />
      </span>
      <span className="family-sprite family-boxes" />
    </div>
  </div>;
}
