import { boliviaToday, channelLabel, monthRange } from "@/lib/aliado-report-input";
import { listAllReports } from "@/lib/aliado-reports";
import { isMissingTable, listTeam } from "@/lib/team";

// One month of the aliado log as a spreadsheet (behind the admin password, like all of /admin).
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("mes") ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : boliviaToday().slice(0, 7);
  const { from, to } = monthRange(month);
  try {
    const [reports, team] = await Promise.all([listAllReports(from, to), listTeam(false)]);
    const names = new Map((team?.members ?? []).map((member) => [member.id, member.name]));
    const cell = (value: string | number | null) => {
      const text = String(value ?? "");
      // Quoted, and a leading = + - @ cannot run as a formula in Excel.
      return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
    };
    const rows = [
      ["Día", "Aliado", "Dónde", "Página o lugar", "Link", "Personas traídas", "Dueños contactados", "Nota"],
      ...(reports ?? []).map((report) => [report.date, names.get(report.memberId) ?? "", channelLabel(report.channel), report.place, report.url, report.people, report.owners, report.note]),
    ];
    return new Response(`﻿${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="aliados-${month}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isMissingTable(error)) return new Response("Falta aplicar la migración 012_aliado_reports.", { status: 503 });
    throw error;
  }
}
