import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { boliviaToday, channelLabel, monthRange, shiftDate, type AliadoReport } from "@/lib/aliado-report-input";
import { firstReportDate, listAllReports, reportingMemberIds } from "@/lib/aliado-reports";
import { bolivia, findDepartment } from "@/lib/regions";
import { buildSeoMetadata } from "@/lib/seo";
import { isMissingTable, listTeam, type TeamMember } from "@/lib/team";
import "@/components/visits-team.css";
import "./aliados-calendar.css";

export const metadata: Metadata = buildSeoMetadata({
  title: "Calendario de aliados",
  description: "Lo que cada aliado registró: dónde hizo publicidad, cuántas personas trajo y cuántos dueños contactó.",
  path: "/admin/aliados",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const colors = ["#087c65", "#c2410c", "#2563eb", "#9333ea", "#0891b2", "#db2777", "#65a30d", "#b45309", "#4f46e5", "#be123c"];
const weekdayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const weekdayLong = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
// Two letters per person on the calendar: "Rodrigo (Cochabamba)" is RC, "María Rosario" MR, "Paul" PA.
function shortName(name: string) {
  const place = name.match(/\((.+?)\)/)?.[1];
  const words = name.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  const code = place ? words[0][0] + place[0] : words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return code.toUpperCase();
}

type Search = { mes?: string; dia?: string; aliado?: string; dep?: string; tab?: string };

// One thing at a time: the calendar, the month summary or the list of every report.
type AdminTab = "calendario" | "resumen" | "reportes";
const adminTabs: Array<[AdminTab, string]> = [["calendario", "Calendario"], ["resumen", "Resumen del mes"], ["reportes", "Todos los reportes"]];

export default async function AdminAliadosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const today = boliviaToday();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.mes ?? "") ? params.mes! : today.slice(0, 7);
  const { from, to } = monthRange(month);
  // The day open on the right: the one picked, else yesterday in the current month, else the last day.
  const defaultDay = month === today.slice(0, 7) ? (shiftDate(today, -1) >= from ? shiftDate(today, -1) : today) : to;
  const selected = params.dia && /^\d{4}-\d{2}-\d{2}$/.test(params.dia) && params.dia.startsWith(month) && params.dia <= to ? params.dia : defaultDay;

  const team = await listTeam(false);
  let reports: (AliadoReport & { memberId: string })[] | null = null;
  let start: string | null = null;
  let missingTable = false;
  try {
    [reports, start] = await Promise.all([listAllReports(from, to), firstReportDate()]);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    missingTable = true;
  }
  const canLog = await reportingMemberIds();

  const everyone = (team?.members ?? []).filter((member) => member.status === "active");
  const color = new Map(everyone.map((member, index) => [member.id, colors[index % colors.length]]));
  const codes = new Map<string, string>();
  for (const member of everyone) {
    const base = shortName(member.name);
    let code = base;
    for (let suffix = 2; [...codes.values()].includes(code); suffix += 1) code = `${base}${suffix}`;
    codes.set(member.id, code);
  }
  const department = findDepartment(params.dep);
  const members = everyone.filter((member) => (!department || member.department === department.slug) && (!params.aliado || member.slug === params.aliado));
  const shown = new Set(members.map((member) => member.id));
  const monthReports = (reports ?? []).filter((report) => shown.has(report.memberId));

  // A day counts as "not logged" for an aliado who can sign in, from the first day anyone logged,
  // up to yesterday, Monday to Saturday.
  const expected = (member: TeamMember, date: string) =>
    Boolean(start && date >= start && date < today && weekday(date) !== 0 && (canLog?.has(member.id) ?? true));

  const byDay = new Map<string, Map<string, AliadoReport[]>>();
  for (const report of monthReports) {
    const day = byDay.get(report.date) ?? new Map<string, AliadoReport[]>();
    day.set(report.memberId, [...(day.get(report.memberId) ?? []), report]);
    byDay.set(report.date, day);
  }
  const sum = (list: AliadoReport[], key: "people" | "owners") => list.reduce((total, report) => total + report[key], 0);

  const daysInMonth = Number(to.slice(8));
  const offset = (weekday(from) + 6) % 7;
  const shiftMonth = (step: number) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + step, 1)).toISOString().slice(0, 7);
  const tab: AdminTab = adminTabs.some(([id]) => id === params.tab) ? (params.tab as AdminTab) : "calendario";
  const link = (changes: Search) => {
    const query = new URLSearchParams();
    const next = { tab: tab === "calendario" ? undefined : tab, mes: month, dia: selected, aliado: params.aliado, dep: params.dep, ...changes };
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
    return `/admin/aliados?${query.toString()}`;
  };

  const selectedDay = byDay.get(selected);
  const selectedReports = [...(selectedDay?.values() ?? [])].flat();
  const yesterday = shiftDate(today, -1);
  const summary = members
    .map((member) => {
      const own = monthReports.filter((report) => report.memberId === member.id);
      return {
        member,
        days: new Set(own.map((report) => report.date)).size,
        people: sum(own, "people"),
        owners: sum(own, "owners"),
        last: own.reduce<string | null>((last, report) => (!last || report.date > last ? report.date : last), null),
        loggedYesterday: (reports ?? []).some((report) => report.memberId === member.id && report.date === yesterday),
      };
    })
    .sort((a, b) => b.people - a.people || b.days - a.days);

  return (
    <main className="zu-container admin-team aliados-cal">
      <p className="zu-eyebrow"><CalendarDays size={16} aria-hidden="true" /> ALIADOS</p>
      <h1>Calendario de aliados</h1>
      <p className="admin-team-intro">
        Lo que cada aliado registró en su Panel de aliado: dónde hizo publicidad, cuántas personas trajo y cuántos dueños contactó. Toca un día para ver el detalle con los links. Los aliados pueden editar o borrar sus propios reportes.
      </p>
      <p><Link href="/admin">Volver al panel</Link> · <Link href="/admin/equipo">Equipo y visitas</Link></p>

      {team === null || missingTable ? (
        <p className="guide-note">El registro diario todavía no está activo: falta aplicar la migración 012_aliado_reports en la base de datos (guía en guias/migracion-012.sql).</p>
      ) : (
        <>
          <div className="aliados-cal-bar">
            <div className="aliados-cal-nav">
              <Link href={link({ mes: shiftMonth(-1), dia: undefined })} aria-label="Mes anterior"><ChevronLeft size={18} /></Link>
              <h2>{monthNames[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}</h2>
              <Link href={link({ mes: shiftMonth(1), dia: undefined })} aria-label="Mes siguiente" aria-disabled={month >= today.slice(0, 7)} className={month >= today.slice(0, 7) ? "is-off" : ""}><ChevronRight size={18} /></Link>
            </div>
            <form method="get" action="/admin/aliados" className="aliados-cal-filters">
              <input type="hidden" name="mes" value={month} />
              {tab !== "calendario" ? <input type="hidden" name="tab" value={tab} /> : null}
              <select name="aliado" defaultValue={params.aliado ?? ""} aria-label="Aliado">
                <option value="">Todos los aliados</option>
                {everyone.map((member) => <option key={member.id} value={member.slug}>{member.name}</option>)}
              </select>
              <select name="dep" defaultValue={department?.slug ?? ""} aria-label="Departamento">
                <option value="">Todos los departamentos</option>
                {bolivia.departments.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
              <button type="submit">Filtrar</button>
              <a href={`/admin/aliados/csv?mes=${month}`} className="aliados-cal-csv"><Download size={16} aria-hidden="true" /> CSV del mes</a>
            </form>
          </div>

          <nav className="aliados-cal-tabs" aria-label="Secciones">
            {adminTabs.map(([id, label]) => (
              <Link key={id} href={link({ tab: id === "calendario" ? undefined : id })} aria-current={id === tab ? "page" : undefined} className={id === tab ? "is-active" : ""}>
                {label}
                {id === "reportes" ? <span>{monthReports.length}</span> : null}
              </Link>
            ))}
          </nav>

          {members.length === 0 ? (
            <p className="admin-team-muted">No hay aliados activos con ese filtro. Agrégalos en <Link href="/admin/equipo">Equipo y visitas</Link>.</p>
          ) : null}

          {tab === "calendario" && members.length > 0 ? (
          <>
          <ul className="aliados-cal-legend">
            {members.map((member) => (
              <li key={member.id}><i style={{ background: color.get(member.id) }} />{member.name}</li>
            ))}
            <li><i className="is-missing" />No registró</li>
          </ul>

            <div className="aliados-cal-layout">
              <div className="aliados-cal-grid" role="grid" aria-label="Calendario del mes">
                {weekdayNames.map((name) => <div key={name} className="aliados-cal-head"><span className="long">{name}</span><span className="short">{name.slice(0, 2)}</span></div>)}
                {Array.from({ length: offset }, (_, index) => <div key={`e${index}`} className="aliados-cal-day is-empty" />)}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const date = `${month}-${String(index + 1).padStart(2, "0")}`;
                  const day = byDay.get(date);
                  const total = day ? sum([...day.values()].flat(), "people") : 0;
                  const future = date > today;
                  return (
                    <Link key={date} href={link({ dia: date })} className={`aliados-cal-day${date === selected ? " is-selected" : ""}${future ? " is-future" : ""}${date === today ? " is-today" : ""}`} aria-current={date === selected ? "date" : undefined}>
                      <span className="aliados-cal-num">{index + 1}{day ? <em>{total} pers.</em> : null}</span>
                      <span className="aliados-cal-chips">
                        {members.map((member) => {
                          const own = day?.get(member.id);
                          if (own) return <span key={member.id} style={{ background: color.get(member.id) }} title={`${member.name}: ${sum(own, "people")} personas`}>{codes.get(member.id)} {sum(own, "people")}</span>;
                          return expected(member, date) ? <span key={member.id} className="is-missing" title={`${member.name} no registró`}>{codes.get(member.id)}</span> : null;
                        })}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <aside className="admin-team-card aliados-cal-detail" aria-live="polite">
                <h2>{weekdayLong[weekday(selected)].replace(/^./, (letter) => letter.toUpperCase())} {Number(selected.slice(8))} de {monthNames[Number(selected.slice(5, 7)) - 1]}</h2>
                <p className="admin-team-muted">{sum(selectedReports, "people")} personas traídas · {sum(selectedReports, "owners")} dueños contactados</p>
                <ul>
                  {members.map((member) => {
                    const own = selectedDay?.get(member.id);
                    if (!own) {
                      if (!expected(member, selected)) return null;
                      return <li key={member.id} className="is-missing"><p className="who"><i />{member.name}<em>no registró</em></p></li>;
                    }
                    return (
                      <li key={member.id}>
                        <p className="who"><i style={{ background: color.get(member.id) }} />{member.name}<em>{sum(own, "people")} pers. · {sum(own, "owners")} {sum(own, "owners") === 1 ? "dueño" : "dueños"}</em></p>
                        {own.map((report) => (
                          <p key={report.id} className="what">
                            {channelLabel(report.channel)} ·{" "}
                            {report.url ? <a href={report.url} target="_blank" rel="noreferrer">{report.place} <ExternalLink size={12} aria-hidden="true" /></a> : report.place}
                            {own.length > 1 ? ` (${report.people} pers., ${report.owners} ${report.owners === 1 ? "dueño" : "dueños"})` : ""}{report.note ? ` · “${report.note}”` : ""}
                          </p>
                        ))}
                      </li>
                    );
                  })}
                </ul>
                {selectedReports.length === 0 && !members.some((member) => expected(member, selected)) ? <p className="admin-team-muted">Nadie registró este día.</p> : null}
              </aside>
            </div>
          </>
          ) : null}

          {tab === "resumen" && members.length > 0 ? (
          <section className="admin-team-card aliados-cal-summary">
            <h2>Resumen de {monthNames[Number(month.slice(5, 7)) - 1]}</h2>
            <div className="aliados-cal-table">
              <table>
                <thead>
                  <tr><th>Aliado</th><th>Departamento</th><th className="num">Días registrados</th><th className="num">Personas traídas</th><th className="num">Dueños contactados</th><th>Último registro</th><th>Ayer</th></tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.member.id}>
                      <td><Link href={link({ aliado: row.member.slug })}><i style={{ background: color.get(row.member.id) }} />{row.member.name}</Link></td>
                      <td>{findDepartment(row.member.department)?.name ?? ""}</td>
                      <td className="num">{row.days}</td>
                      <td className="num"><strong>{row.people}</strong></td>
                      <td className="num">{row.owners}</td>
                      <td>{row.last ? `${Number(row.last.slice(8))} de ${monthNames[Number(row.last.slice(5, 7)) - 1]}` : "—"}</td>
                      <td>
                        {canLog && !canLog.has(row.member.id) ? <span className="tag">Sin cuenta</span>
                          : weekday(yesterday) === 0 ? <span className="tag">Domingo</span>
                          : row.loggedYesterday ? <span className="tag is-ok">Registró</span>
                          : <span className="tag is-bad">No registró</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          ) : null}

          {tab === "reportes" && members.length > 0 ? (
          <section className="admin-team-card aliados-cal-summary">
            <h2>Todos los reportes de {monthNames[Number(month.slice(5, 7)) - 1]}</h2>
            {monthReports.length === 0 ? <p className="admin-team-muted">Todavía no hay reportes este mes.</p> : (
              <div className="aliados-cal-table">
                <table>
                  <thead>
                    <tr><th>Día</th><th>Aliado</th><th>Dónde</th><th>Página o lugar</th><th className="num">Personas</th><th className="num">Dueños</th><th>Nota</th></tr>
                  </thead>
                  <tbody>
                    {[...monthReports].reverse().map((report) => {
                      const member = members.find((item) => item.id === report.memberId);
                      return (
                        <tr key={report.id}>
                          <td>{Number(report.date.slice(8))} {monthNames[Number(report.date.slice(5, 7)) - 1].slice(0, 3)}</td>
                          <td><i style={{ background: color.get(report.memberId), marginRight: 8 }} />{member?.name ?? ""}</td>
                          <td>{channelLabel(report.channel)}</td>
                          <td className="wrap">{report.url ? <a href={report.url} target="_blank" rel="noreferrer">{report.place} <ExternalLink size={12} aria-hidden="true" /></a> : report.place}</td>
                          <td className="num"><strong>{report.people}</strong></td>
                          <td className="num">{report.owners}</td>
                          <td className="wrap">{report.note ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          ) : null}
        </>
      )}
    </main>
  );
}
