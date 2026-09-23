import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  Coffee,
  Gem,
  GraduationCap,
  Home,
  Leaf,
  PawPrint,
  School,
  ShieldCheck,
  Sparkles,
  Sun,
  Trees,
  Users,
} from "lucide-react";

type LifestyleTagProps = {
  label: string;
  className?: string;
  size?: "sm" | "md";
  tone?: "neutral" | "green";
  truncate?: boolean;
};

export function LifestyleTag({
  label,
  className = "",
  size = "sm",
  tone = "neutral",
  truncate = false,
}: LifestyleTagProps) {
  const icon = getLifestyleTagIcon(label);
  const sizeClass =
    size === "md"
      ? "min-h-9 px-3 text-sm"
      : "min-h-8 px-2.5 text-[11px] leading-none";
  const toneClass =
    tone === "green" ? "bg-[#eef7ef] text-[#285340]" : "bg-neutral-100 text-neutral-700";

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full font-semibold ${sizeClass} ${toneClass} ${className}`}
    >
      {icon}
      <span className={truncate ? "truncate" : ""}>{label}</span>
    </span>
  );
}

function getLifestyleTagIcon(label: string) {
  const normalizedLabel = label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (normalizedLabel.includes("mascota")) {
    return <PawPrint className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("home office") || normalizedLabel.includes("oficina")) {
    return <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("estudiante") || normalizedLabel.includes("universidad")) {
    return <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("colegio")) {
    return <School className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("cafe")) {
    return <Coffee className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("seguridad") || normalizedLabel.includes("condominio")) {
    return <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("iluminacion") || normalizedLabel.includes("luz")) {
    return <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("tranquila") || normalizedLabel.includes("patio")) {
    return <Trees className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("economico") || normalizedLabel.includes("bajo costo")) {
    return <BadgeDollarSign className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("premium") || normalizedLabel.includes("boutique")) {
    return <Gem className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("airbnb") || normalizedLabel.includes("inversion")) {
    return <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("familiar") || normalizedLabel.includes("familia")) {
    return <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("zona") || normalizedLabel.includes("verde")) {
    return <Leaf className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (normalizedLabel.includes("persona") || normalizedLabel.includes("pareja")) {
    return <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  return <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}
