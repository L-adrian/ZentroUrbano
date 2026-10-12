import { NextResponse } from "next/server";
import { authenticatedAdmin, sameOriginAdminMutation } from "@/lib/admin-access";
import { getPropertyBySlugData } from "@/lib/property-data";
import {
  assignTeamMember,
  createTeamMember,
  isMissingTable,
  MissingDepartmentColumnError,
  readMemberInput,
  setTeamMemberPhoto,
  setTeamMemberStatus,
  unassignTeamMember,
  updateTeamMember,
  validTeamId,
} from "@/lib/team";
import { isTeamRole } from "@/lib/team-roles";
import { normalizeVisitSettings } from "@/lib/visit-slots";
import { cancelBooking, saveVisitSettings } from "@/lib/visits";

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status });

// Admin actions on /admin/equipo: people, who works on each home, visit hours and bookings.
export async function POST(request: Request) {
  if (!authenticatedAdmin(request.headers)) return reply(403, { ok: false, message: "Acceso exclusivo del administrador." });
  if (!sameOriginAdminMutation(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return reply(400, { ok: false, message: "No se pudo leer el pedido." });

  const homeExists = async (slug: unknown) => typeof slug === "string" && slug.length <= 180 && Boolean(await getPropertyBySlugData(slug));

  try {
    switch (body.action) {
      case "create": {
        const input = readMemberInput(body);
        if (typeof input === "string") return reply(400, { ok: false, message: input });
        return reply(200, { ok: true, id: await createTeamMember(input) });
      }
      case "update": {
        if (!validTeamId(body.id)) return reply(404, { ok: false });
        const input = readMemberInput(body);
        if (typeof input === "string") return reply(400, { ok: false, message: input });
        await updateTeamMember(body.id, input);
        return reply(200, { ok: true });
      }
      case "status": {
        if (!validTeamId(body.id) || (body.status !== "active" && body.status !== "inactive")) return reply(400, { ok: false });
        await setTeamMemberStatus(body.id, body.status);
        return reply(200, { ok: true });
      }
      case "remove-photo": {
        if (!validTeamId(body.id)) return reply(404, { ok: false });
        await setTeamMemberPhoto(body.id, null);
        return reply(200, { ok: true });
      }
      case "assign": {
        if (!validTeamId(body.memberId) || !isTeamRole(body.role)) return reply(400, { ok: false, message: "Elige la persona y su rol." });
        if (!(await homeExists(body.propertySlug))) return reply(400, { ok: false, message: "Elige una vivienda publicada." });
        const result = await assignTeamMember({
          propertySlug: body.propertySlug as string,
          memberId: body.memberId,
          role: body.role,
          handlesVisits: body.handlesVisits === true,
        });
        return reply(200, { ok: true, demoted: result.demoted });
      }
      case "unassign": {
        if (!validTeamId(body.memberId) || typeof body.propertySlug !== "string") return reply(400, { ok: false });
        await unassignTeamMember(body.propertySlug, body.memberId);
        return reply(200, { ok: true });
      }
      case "visit-settings": {
        const settings = normalizeVisitSettings(body.settings);
        if (!settings) return reply(400, { ok: false, message: "Revisa los días y el horario: debe haber al menos una hora entre el inicio y el fin." });
        if (!(await homeExists(body.propertySlug))) return reply(400, { ok: false, message: "Elige una vivienda publicada." });
        await saveVisitSettings(body.propertySlug as string, settings);
        return reply(200, { ok: true });
      }
      case "cancel-booking": {
        if (!validTeamId(body.id)) return reply(404, { ok: false });
        return reply(200, { ok: await cancelBooking(body.id, "admin") });
      }
      default:
        return reply(400, { ok: false });
    }
  } catch (error) {
    if (error instanceof MissingDepartmentColumnError) return reply(503, { ok: false, message: error.message });
    if (isMissingTable(error)) return reply(503, { ok: false, message: "Falta aplicar la migración 008 (equipo y visitas) en la base de datos." });
    console.error("team admin action failed", error);
    return reply(503, { ok: false, message: "No se pudo guardar. Actualiza la página y reintenta." });
  }
}
