import Image from "next/image";
import { teamInitials } from "@/lib/team-roles";

// Team photo (already stored small, 320 px, so it is served as is) or initials while there is none.
export function TeamAvatar({ name, photoUrl, size }: { name: string; photoUrl: string | null; size: number }) {
  return photoUrl ? (
    <Image className="team-avatar" src={photoUrl} alt={`Foto de ${name}`} width={size} height={size} unoptimized />
  ) : (
    <span className="team-avatar is-initials" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {teamInitials(name)}
    </span>
  );
}
