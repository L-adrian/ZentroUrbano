import "server-only";
import { randomUUID } from "node:crypto";
import { executeQuery, hasDatabaseConfig, queryOne, queryRows, withTransaction } from "@/lib/mysql";
import { defaultDepartment, findDepartment } from "@/lib/regions";
import { normalizeAlertWhatsapp } from "@/lib/search-alert-input";
import {
  isTeamRole,
  teamLimits,
  teamMemberSlug,
  teamPhotoUrl,
  type PropertyTeamEntry,
  type PublicTeamMember,
  type TeamRole,
} from "@/lib/team-roles";

// Production applies migrations by hand. Until 008_team_and_visits runs, the team is empty and
// the admin page says what is missing.
export function isMissingTable(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === "ER_NO_SUCH_TABLE" || (error as { errno?: number } | null)?.errno === 1146;
}

// The department column comes with 009_team_department. Until it runs, everyone is in Santa Cruz.
function isMissingDepartment(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === "ER_BAD_FIELD_ERROR" || (error as { errno?: number } | null)?.errno === 1054;
}

async function withDepartmentColumn<T>(run: (columns: string) => Promise<T>) {
  try {
    return await run(`${memberColumns}, department`);
  } catch (error) {
    if (!isMissingDepartment(error)) throw error;
    return run(memberColumns);
  }
}

type MemberRow = {
  id: string;
  slug: string;
  full_name: string;
  level: string;
  whatsapp_normalized: string | null;
  zone: string | null;
  bio: string | null;
  photo_version: number;
  status: string;
  department?: string | null;
};

export type TeamMember = PublicTeamMember & { whatsapp: string | null; status: "active" | "inactive" };
export type TeamAssignment = { propertySlug: string; memberId: string; role: TeamRole; handlesVisits: boolean };

const memberColumns = "id, slug, full_name, level, whatsapp_normalized, zone, bio, photo_version, status";

function toMember(row: MemberRow): TeamMember {
  return {
    id: row.id,
    slug: row.slug,
    name: row.full_name,
    level: isTeamRole(row.level) ? row.level : "colaborador",
    department: findDepartment(row.department)?.slug ?? defaultDepartment.slug,
    zone: row.zone,
    bio: row.bio,
    photoUrl: teamPhotoUrl(row.id, Number(row.photo_version)),
    whatsapp: row.whatsapp_normalized,
    status: row.status === "active" ? "active" : "inactive",
  };
}

export function publicMember(member: TeamMember): PublicTeamMember {
  return { id: member.id, slug: member.slug, name: member.name, level: member.level, department: member.department, zone: member.zone, bio: member.bio, photoUrl: member.photoUrl };
}

// Everyone (admin) or only active people (public page). null while the tables do not exist.
export async function listTeam(onlyActive: boolean): Promise<{ members: TeamMember[]; assignments: TeamAssignment[] } | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    const members = (await withDepartmentColumn((columns) => queryRows<MemberRow>(
      `select ${columns} from team_members ${onlyActive ? "where status = 'active'" : ""}
        order by status = 'active' desc, level = 'embajador' desc, full_name`,
    ))) ?? [];
    const assignments = (await queryRows<{ property_slug: string; member_id: string; role: string; handles_visits: number }>(
      "select property_slug, member_id, role, handles_visits from property_team order by role = 'embajador' desc, created_at",
    )) ?? [];
    const ids = new Set(members.map((member) => member.id));
    return {
      members: members.map(toMember),
      assignments: assignments
        .filter((row) => ids.has(row.member_id) && isTeamRole(row.role))
        .map((row) => ({ propertySlug: row.property_slug, memberId: row.member_id, role: row.role as TeamRole, handlesVisits: Boolean(row.handles_visits) })),
    };
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}

// The people working on one home: the embajador first. Empty when nobody is assigned or the
// tables are missing.
export async function getPropertyTeam(propertySlug: string): Promise<(PropertyTeamEntry & { whatsapp: string | null })[]> {
  if (!hasDatabaseConfig()) return [];
  try {
    const rows = (await withDepartmentColumn((columns) => queryRows<MemberRow & { role: string; handles_visits: number }>(
      `select ${columns.split(", ").map((column) => `m.${column}`).join(", ")},
              pt.role, pt.handles_visits
         from property_team pt join team_members m on m.id = pt.member_id
        where pt.property_slug = :propertySlug and m.status = 'active'
        order by pt.role = 'embajador' desc, pt.created_at`,
      { propertySlug },
    ))) ?? [];
    return rows
      .filter((row) => isTeamRole(row.role))
      .map((row) => {
        const member = toMember(row);
        return { member: publicMember(member), whatsapp: member.whatsapp, role: row.role as TeamRole, handlesVisits: row.role === "embajador" && Boolean(row.handles_visits) };
      });
  } catch (error) {
    if (isMissingTable(error)) return [];
    console.error("property team failed", error);
    return [];
  }
}

export type MemberInput = { name: string; level: TeamRole; department: string; whatsapp: string | null; zone: string | null; bio: string | null };

export function readMemberInput(body: Record<string, unknown>): MemberInput | string {
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 3 || name.length > teamLimits.name) return "Escribe el nombre completo de la persona.";
  if (!isTeamRole(body.level)) return "Elige si es embajador o colaborador.";
  const department = findDepartment(typeof body.department === "string" ? body.department : null);
  if (!department) return "Elige el departamento donde trabaja.";
  const whatsappText = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
  const whatsapp = whatsappText ? normalizeAlertWhatsapp(whatsappText) : null;
  if (whatsappText && !whatsapp) return "El WhatsApp debe ser un celular de Bolivia de 8 dígitos (6xxxxxxx o 7xxxxxxx).";
  const clip = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim().slice(0, max) : null);
  return { name, level: body.level, department: department.slug, whatsapp, zone: clip(body.zone, teamLimits.zone), bio: clip(body.bio, teamLimits.bio) };
}

export async function createTeamMember(input: MemberInput) {
  const id = randomUUID();
  const base = teamMemberSlug(input.name);
  const taken = (await queryRows<{ slug: string }>("select slug from team_members where slug like :pattern", { pattern: `${base}%` })) ?? [];
  let slug = base;
  for (let suffix = 2; taken.some((row) => row.slug === slug); suffix += 1) slug = `${base}-${suffix}`;
  await writeWithDepartment(
    input,
    (department) => `insert into team_members (id, slug, full_name, level, whatsapp_normalized, zone, bio${department ? ", department" : ""})
     values (:id, :slug, :name, :level, :whatsapp, :zone, :bio${department ? ", :department" : ""})`,
    { id, slug },
  );
  return id;
}

export async function updateTeamMember(id: string, input: MemberInput) {
  await writeWithDepartment(
    input,
    (department) => `update team_members set full_name = :name, level = :level, whatsapp_normalized = :whatsapp, zone = :zone, bio = :bio${department ? ", department = :department" : ""}
      where id = :id`,
    { id },
  );
}

export class MissingDepartmentColumnError extends Error {}

// Without the department column only Santa Cruz can be saved; anyone else needs 009 first.
async function writeWithDepartment(input: MemberInput, sql: (department: boolean) => string, extra: Record<string, string>) {
  const params = { ...extra, name: input.name, level: input.level, department: input.department, whatsapp: input.whatsapp, zone: input.zone, bio: input.bio };
  try {
    await executeQuery(sql(true), params);
  } catch (error) {
    if (!isMissingDepartment(error)) throw error;
    if (input.department !== defaultDepartment.slug) {
      throw new MissingDepartmentColumnError("Para guardar personas fuera de Santa Cruz primero hay que correr migracion-009.sql en phpMyAdmin.");
    }
    await executeQuery(sql(false), params);
  }
}

export async function setTeamMemberStatus(id: string, status: "active" | "inactive") {
  await executeQuery("update team_members set status = :status where id = :id", { id, status });
}

export async function setTeamMemberPhoto(id: string, photo: Buffer | null) {
  await withTransaction((connection) => connection.execute(
    photo
      ? "update team_members set photo = ?, photo_version = photo_version + 1 where id = ?"
      : "update team_members set photo = null, photo_version = 0 where id = ?",
    photo ? [photo, id] : [id],
  ));
}

export async function readTeamMemberPhoto(id: string, version: number) {
  const row = await queryOne<{ photo: Buffer | null }>(
    "select photo from team_members where id = :id and photo_version = :version and status = 'active'",
    { id, version },
  );
  return row?.photo ?? null;
}

// A home has one embajador: naming a new one makes the previous one a colaborador.
export async function assignTeamMember(input: TeamAssignment) {
  return withTransaction(async (connection) => {
    let demoted: string | null = null;
    if (input.role === "embajador") {
      const [rows] = await connection.execute(
        `select m.full_name from property_team pt join team_members m on m.id = pt.member_id
          where pt.property_slug = ? and pt.role = 'embajador' and pt.member_id <> ? for update`,
        [input.propertySlug, input.memberId],
      );
      demoted = (rows as { full_name: string }[])[0]?.full_name ?? null;
      await connection.execute(
        "update property_team set role = 'colaborador', handles_visits = 0 where property_slug = ? and role = 'embajador' and member_id <> ?",
        [input.propertySlug, input.memberId],
      );
    }
    await connection.execute(
      `insert into property_team (property_slug, member_id, role, handles_visits) values (?, ?, ?, ?)
       on duplicate key update role = values(role), handles_visits = values(handles_visits)`,
      [input.propertySlug, input.memberId, input.role, input.role === "embajador" && input.handlesVisits ? 1 : 0],
    );
    return { demoted };
  });
}

export async function unassignTeamMember(propertySlug: string, memberId: string) {
  await executeQuery("delete from property_team where property_slug = :propertySlug and member_id = :memberId", { propertySlug, memberId });
}

export const validTeamId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
