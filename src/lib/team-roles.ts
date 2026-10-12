// Zentro's own people. Each person has a title on the team page (embajador or colaborador) and,
// for each home they work on, a role in that home: the embajador is the one person in charge of
// the home and can take its visits; colaboradores help with photos, the listing and sharing it.

export const teamRoles = ["embajador", "colaborador"] as const;
export type TeamRole = (typeof teamRoles)[number];

export const teamRoleLabels: Record<TeamRole, string> = { embajador: "Embajador", colaborador: "Colaborador" };
export const teamRoleDescriptions: Record<TeamRole, string> = {
  embajador: "Es la persona de Zentro a cargo de la vivienda: muestra la casa en las visitas y responde tus dudas.",
  colaborador: "Ayuda con las fotos, el anuncio y la difusión de la vivienda.",
};

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && (teamRoles as readonly string[]).includes(value);
}

export type PublicTeamMember = {
  id: string;
  slug: string;
  name: string;
  level: TeamRole;
  // Department slug (src/lib/regions.ts): the team page shows only the visitor's department.
  department: string;
  zone: string | null;
  bio: string | null;
  photoUrl: string | null;
};

export type PropertyTeamEntry = {
  member: PublicTeamMember;
  role: TeamRole;
  handlesVisits: boolean;
};

export const teamLimits = { name: 120, zone: 120, bio: 300 } as const;

export function teamMemberSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "persona";
}

export function teamPhotoUrl(id: string, version: number) {
  return version > 0 ? `/media/equipo/${id}/${version}.webp` : null;
}

export function teamInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("es") || "ZU";
}
