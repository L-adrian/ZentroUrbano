import { useId } from "react";

// Simplified flags (no coats of arms, unreadable at this size), drawn on a 30×20 grid.
const red = "#d52b1e";
const green = "#007934";
const white = "#ffffff";

function stripes(colors: string[]) {
  const height = 20 / colors.length;
  return colors.map((fill, index) => <rect key={index} y={index * height} width="30" height={height + 0.1} fill={fill} />);
}

const flags: Record<string, React.ReactNode> = {
  BO: stripes([red, "#f9e300", green]),
  "santa-cruz": stripes([green, white, green]),
  "la-paz": stripes([red, green]),
  cochabamba: stripes(["#5bc2e7"]),
  chuquisaca: <>{stripes([white])}<path d="M0 0 30 20M30 0 0 20" stroke={red} strokeWidth="3.2" /></>,
  tarija: stripes([red, white]),
  oruro: stripes([red]),
  potosi: <>{stripes([white])}<rect width="15" height="10" fill={red} /><rect x="15" y="10" width="15" height="10" fill={red} /></>,
  beni: <>{stripes(["#00843d"])}{Array.from({ length: 8 }, (_, index) => <circle key={index} cx={15 + 5.2 * Math.cos(index * Math.PI / 4)} cy={10 + 5.2 * Math.sin(index * Math.PI / 4)} r="1.2" fill="#f9e300" />)}</>,
  pando: stripes([white, green]),
};

export function RegionFlag({ code, className = "region-flag" }: { code: string; className?: string }) {
  const clip = useId();
  return <svg className={className} viewBox="0 0 30 20" aria-hidden="true">
    <clipPath id={clip}><rect width="30" height="20" rx="2.5" /></clipPath>
    <g clipPath={`url(#${clip})`}>{flags[code]}</g>
    <rect width="30" height="20" rx="2.5" fill="none" stroke="rgb(0 0 0 / .15)" />
  </svg>;
}
