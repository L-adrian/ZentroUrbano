import { NextResponse } from "next/server";
import { monthRange, readReportInput } from "@/lib/aliado-report-input";
import {
  createReport,
  deleteReport,
  listMemberReports,
  readLayout,
  readTodos,
  savePanelLayout,
  savePanelTodos,
  updateReport,
} from "@/lib/aliado-reports";
import { getCurrentAccount } from "@/lib/mysql-auth";
import { isSameSiteRequest } from "@/lib/request-origin";
import { getTeamMemberByAccount, isMissingTable, validTeamId } from "@/lib/team";

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// The signed-in aliado's team member id, or null for anyone else.
async function currentMemberId() {
  const account = await getCurrentAccount();
  if (account?.kind !== "aliado" || account.storage !== "mysql") return null;
  return (await getTeamMemberByAccount(account.id).catch(() => null))?.member.id ?? null;
}

// One month of the aliado's own reports (?mes=YYYY-MM), for the calendar in their panel.
export async function GET(request: Request) {
  const memberId = await currentMemberId();
  if (!memberId) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  const month = new URL(request.url).searchParams.get("mes") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return reply(400, { ok: false });
  try {
    const { from, to } = monthRange(month);
    return reply(200, { ok: true, reports: await listMemberReports(memberId, from, to) });
  } catch (error) {
    if (isMissingTable(error)) return reply(503, { ok: false, message: "El registro diario todavía no está activo." });
    console.error("aliado reports failed", error);
    return reply(503, { ok: false, message: "No se pudo cargar. Intenta de nuevo." });
  }
}

// The aliado's daily log (create, edit, delete their own reports) and their panel (card order, to-do list).
export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return reply(403, { ok: false, message: "Origen no permitido." });
  const memberId = await currentMemberId();
  if (!memberId) return reply(401, { ok: false, message: "Vuelve a ingresar a tu cuenta." });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return reply(400, { ok: false, message: "No se pudo leer el pedido." });
  try {
    if (body.action === "create" || body.action === "update") {
      const input = readReportInput(body);
      if (typeof input === "string") return reply(400, { ok: false, message: input });
      if (body.action === "create") return reply(200, { ok: true, report: { id: await createReport(memberId, input), ...input } });
      if (!validTeamId(body.id) || !(await updateReport(memberId, body.id, input))) return reply(404, { ok: false, message: "No encontramos ese reporte en tu cuenta." });
      return reply(200, { ok: true, report: { id: body.id, ...input } });
    }
    if (body.action === "delete") {
      if (!validTeamId(body.id) || !(await deleteReport(memberId, body.id))) return reply(404, { ok: false, message: "No encontramos ese reporte en tu cuenta." });
      return reply(200, { ok: true });
    }
    if (body.action === "layout") {
      const layout = readLayout(body.layout);
      if (!layout) return reply(400, { ok: false });
      await savePanelLayout(memberId, layout);
      return reply(200, { ok: true });
    }
    if (body.action === "todos") {
      const todos = readTodos(body.todos);
      if (!todos) return reply(400, { ok: false });
      await savePanelTodos(memberId, todos);
      return reply(200, { ok: true });
    }
    return reply(400, { ok: false });
  } catch (error) {
    if (isMissingTable(error)) return reply(503, { ok: false, message: "El registro diario todavía no está activo." });
    console.error("aliado report action failed", error);
    return reply(503, { ok: false, message: "No se pudo guardar. Intenta de nuevo." });
  }
}
