"use client";

import { ChevronLeft, ChevronRight, ExternalLink, ListTodo, Megaphone, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  boliviaToday,
  channelLabel,
  reportChannels,
  reportLimits,
  shiftDate,
  type AliadoReport,
  type ReportChannel,
} from "@/lib/aliado-report-input";

export const logCard = "rounded-[28px] border border-black/10 bg-white p-5 sm:p-6";
const primaryButton = "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#087c65] px-5 text-sm font-semibold text-white transition hover:bg-[#06624f] disabled:cursor-wait disabled:opacity-60";
const secondaryButton = "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950";
const input = "mt-1.5 w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#087c65] focus:ring-2 focus:ring-[#087c65]/15";

const weekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const dayNumber = (date: string) => Number(date.slice(8));

export function dayLabel(date: string, today = boliviaToday()) {
  if (date === today) return "Hoy";
  if (date === shiftDate(today, -1)) return "Ayer";
  return `${weekdays[weekdayOf(date)]} ${dayNumber(date)}`;
}

function longDayLabel(date: string, today: string) {
  const text = `${weekdays[weekdayOf(date)]} ${dayNumber(date)} de ${months[Number(date.slice(5, 7)) - 1]}`;
  return date === today ? `hoy, ${text}` : date === shiftDate(today, -1) ? `ayer, ${text}` : text;
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/cliente/reportes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; report?: AliadoReport };
  if (!response.ok || !data.ok) throw new Error(data.message || "No se pudo guardar. Intenta de nuevo.");
  return data;
}

export const savePanel = (body: Record<string, unknown>) => post(body).catch(() => null);

type Draft = { channel: ReportChannel | ""; place: string; url: string; people: number; owners: number; note: string; date: string };
const emptyDraft = (date: string): Draft => ({ channel: "", place: "", url: "", people: 0, owners: 0, note: "", date });

function Stepper({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 px-3.5 py-2.5">
      <p className="text-sm font-medium leading-5 text-neutral-800">
        {label}
        {hint ? <span className="block text-xs font-normal text-neutral-500">{hint}</span> : null}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-black/15 text-neutral-700 hover:border-neutral-950" aria-label={`Restar uno a ${label.toLowerCase()}`}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(Math.min(reportLimits.count, Number(event.target.value.replace(/\D/g, "") || 0)))}
          className="w-12 rounded-lg bg-transparent text-center text-xl font-bold text-neutral-950 outline-none focus:bg-neutral-50"
          aria-label={label}
        />
        <button type="button" onClick={() => onChange(Math.min(reportLimits.count, value + 1))} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-black/15 text-neutral-700 hover:border-neutral-950" aria-label={`Sumar uno a ${label.toLowerCase()}`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// "Tu registro del día": where the aliado advertised and how many people and owners it brought.
// Reports of any day can be edited or deleted; the admin sees them in /admin/aliados.
export function ReportCard({
  reports,
  setReports,
  selectedDate,
  setSelectedDate,
}: {
  reports: AliadoReport[];
  setReports: (update: (reports: AliadoReport[]) => AliadoReport[]) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}) {
  const today = boliviaToday();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(selectedDate));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const lastDays = Array.from({ length: 7 }, (_, index) => shiftDate(today, -index));
  const days = lastDays.includes(selectedDate) ? lastDays : [selectedDate, ...lastDays.slice(0, 6)];
  const reportedDays = new Set(reports.map((report) => report.date));
  const dayReports = reports.filter((report) => report.date === selectedDate);
  const totals = dayReports.reduce((sum, report) => ({ people: sum.people + report.people, owners: sum.owners + report.owners }), { people: 0, owners: 0 });

  function chooseDay(date: string) {
    setSelectedDate(date);
    if (!editingId) setDraft((current) => ({ ...current, date }));
    setMessage(null);
  }

  function startEdit(report: AliadoReport) {
    setEditingId(report.id);
    setDraft({ channel: report.channel, place: report.place, url: report.url ?? "", people: report.people, owners: report.owners, note: report.note ?? "", date: report.date });
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft(selectedDate));
    setMessage(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.channel) { setMessage({ tone: "error", text: "Elige dónde hiciste publicidad." }); return; }
    setBusy(true);
    setMessage(null);
    try {
      const data = await post({ action: editingId ? "update" : "create", id: editingId, ...draft, date: editingId ? draft.date : selectedDate });
      const saved = data.report!;
      setReports((current) => (editingId ? current.map((report) => (report.id === editingId ? saved : report)) : [...current, saved]));
      setMessage({ tone: "ok", text: editingId ? "Cambios guardados." : "Guardado. ¿Publicaste en otro lugar? Agrégalo también." });
      if (editingId && saved.date !== selectedDate) setSelectedDate(saved.date);
      setEditingId(null);
      setDraft(emptyDraft(saved.date));
    } catch (error) {
      setMessage({ tone: "error", text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(report: AliadoReport) {
    if (!window.confirm(`¿Borrar el reporte de ${channelLabel(report.channel)} · ${report.place}?`)) return;
    setBusy(true);
    try {
      await post({ action: "delete", id: report.id });
      setReports((current) => current.filter((item) => item.id !== report.id));
      if (editingId === report.id) cancelEdit();
      setMessage({ tone: "ok", text: "Reporte borrado." });
    } catch (error) {
      setMessage({ tone: "error", text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={logCard} aria-labelledby="aliado-registro">
      <h2 id="aliado-registro" className="flex items-center gap-2 pr-10 text-xl font-semibold tracking-tight text-neutral-950">
        <Megaphone className="h-5 w-5 text-[#087c65]" aria-hidden="true" />
        Tu registro del día
      </h2>
      <p className="mt-1 text-sm text-neutral-600">Anota dónde hiciste publicidad y a cuántas personas trajiste. Toma menos de un minuto.</p>

      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Elige el día">
        {days.map((date) => (
          <button
            key={date}
            type="button"
            onClick={() => chooseDay(date)}
            aria-pressed={date === selectedDate}
            className={`inline-flex h-9 flex-none cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition ${date === selectedDate ? "border-[#087c65] bg-[#087c65] text-white" : "border-black/10 bg-white text-neutral-700 hover:border-neutral-950"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${reportedDays.has(date) ? (date === selectedDate ? "bg-[#bbf7d0]" : "bg-[#16a34a]") : "bg-neutral-200"}`} aria-hidden="true" />
            {dayLabel(date, today)}
          </button>
        ))}
      </div>

      {dayReports.length > 0 ? (
        <>
          <p className="mt-4 text-sm font-semibold text-neutral-800 first-letter:uppercase">
            {longDayLabel(selectedDate, today)}: {totals.people} {totals.people === 1 ? "persona" : "personas"} · {totals.owners} {totals.owners === 1 ? "dueño" : "dueños"}
          </p>
          <ul className="mt-2 grid gap-2">
            {dayReports.map((report) => (
              <li key={report.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3.5 py-3 text-sm ${editingId === report.id ? "bg-[#eef7ef] ring-1 ring-[#087c65]/40" : "bg-neutral-50"}`}>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-semibold text-neutral-950">{channelLabel(report.channel)}</p>
                  <p className="text-xs text-neutral-600 [overflow-wrap:anywhere]">
                    {report.url ? (
                      <a href={report.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">{report.place}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a>
                    ) : report.place}
                    {report.note ? ` · “${report.note}”` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-[#eef7ef] px-2.5 py-1 text-xs font-semibold text-[#285340]">{report.people} {report.people === 1 ? "persona" : "personas"}</span>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">{report.owners} {report.owners === 1 ? "dueño" : "dueños"}</span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => startEdit(report)} disabled={busy} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-600 hover:bg-white hover:text-neutral-950" aria-label="Editar este reporte" title="Editar">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => remove(report)} disabled={busy} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-600 hover:bg-white hover:text-[#be123c]" aria-label="Borrar este reporte" title="Borrar">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          Sin reportes {selectedDate === today ? "hoy" : `el ${longDayLabel(selectedDate, today)}`}. Anota abajo dónde publicaste.
        </p>
      )}

      <form onSubmit={save} className="mt-4 rounded-[20px] border border-black/10 p-4">
        <p className="text-sm font-semibold text-neutral-900">{editingId ? "Editando reporte" : "¿Dónde hiciste publicidad?"}</p>
        {editingId ? <p className="mt-0.5 text-xs text-neutral-500">Elige el lugar y corrige lo que haga falta.</p> : null}
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Dónde hiciste publicidad">
          {reportChannels.map((channel) => (
            <button
              key={channel.key}
              type="button"
              role="radio"
              aria-checked={draft.channel === channel.key}
              onClick={() => setDraft({ ...draft, channel: channel.key })}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${draft.channel === channel.key ? "border-[#087c65] bg-[#eef7ef] font-semibold text-[#085c4a]" : "border-black/15 bg-white font-medium text-neutral-700 hover:border-neutral-950"}`}
            >
              {channel.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-neutral-700">
            Nombre de la página, grupo o lugar
            <input className={input} value={draft.place} maxLength={reportLimits.place} onChange={(event) => setDraft({ ...draft, place: event.target.value })} placeholder="Ej.: Alquileres Santa Cruz de la Sierra" />
          </label>
          <label className="block text-xs font-semibold text-neutral-700">
            Link (opcional)
            <input className={input} value={draft.url} maxLength={reportLimits.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="facebook.com/groups/…" inputMode="url" />
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Stepper label="Personas que trajiste" hint="te escribieron o entraron" value={draft.people} onChange={(people) => setDraft({ ...draft, people })} />
          <Stepper label="Dueños que contactaste" value={draft.owners} onChange={(owners) => setDraft({ ...draft, owners })} />
        </div>
        <div className={`mt-3 grid gap-3 ${editingId ? "sm:grid-cols-[1fr_180px]" : ""}`}>
          <label className="block text-xs font-semibold text-neutral-700">
            Nota (opcional)
            <input className={input} value={draft.note} maxLength={reportLimits.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Qué funcionó, qué te preguntaron…" />
          </label>
          {editingId ? (
            <label className="block text-xs font-semibold text-neutral-700">
              Día
              <input type="date" className={input} value={draft.date} max={today} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
            </label>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy} className={primaryButton}>{editingId ? "Guardar cambios" : "Guardar"}</button>
          {editingId ? (
            <button type="button" onClick={cancelEdit} className={secondaryButton}>
              <X className="h-4 w-4" aria-hidden="true" />
              Cancelar
            </button>
          ) : null}
          {message ? <p className={`text-sm ${message.tone === "ok" ? "text-[#087c65]" : "text-[#be123c]"}`} role="status">{message.text}</p> : null}
        </div>
      </form>
      <p className="mt-3 text-xs text-neutral-500">Puedes editar o borrar cualquier reporte tuyo. Para un día anterior, tócalo en tu calendario. Zentro ve tu registro en su calendario.</p>
    </section>
  );
}

// The aliado's month: which days they logged and their totals. Tapping a day opens it in the log.
export function MonthCard({
  reports,
  month,
  setMonth,
  loading,
  selectedDate,
  setSelectedDate,
}: {
  reports: AliadoReport[];
  month: string;
  setMonth: (month: string) => void;
  loading: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}) {
  const today = boliviaToday();
  const [year, index] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const offset = (weekdayOf(`${month}-01`) + 6) % 7;
  const monthReports = reports.filter((report) => report.date.startsWith(month));
  const people = new Map<string, number>();
  for (const report of monthReports) people.set(report.date, (people.get(report.date) ?? 0) + report.people);
  const shift = (step: number) => {
    const date = new Date(Date.UTC(year, index - 1 + step, 1));
    setMonth(date.toISOString().slice(0, 7));
  };
  const totals = { days: people.size, people: monthReports.reduce((sum, report) => sum + report.people, 0), owners: monthReports.reduce((sum, report) => sum + report.owners, 0) };

  return (
    <section className={logCard} aria-labelledby="aliado-mes">
      <div className="flex items-center gap-1 pr-10">
        <h2 id="aliado-mes" className="flex-1 text-lg font-semibold tracking-tight text-neutral-950 first-letter:uppercase">Tu {months[index - 1]}{year !== Number(today.slice(0, 4)) ? ` ${year}` : ""}</h2>
        <button type="button" onClick={() => shift(-1)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-black/10 hover:border-neutral-950" aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" onClick={() => shift(1)} disabled={month >= today.slice(0, 7)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-black/10 hover:border-neutral-950 disabled:cursor-default disabled:opacity-30" aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <p className="mt-1 text-sm text-neutral-600">{loading ? "Cargando…" : "En verde, los días que registraste. Toca un día para verlo o editarlo."}</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => <span key={day} className="text-[11px] font-semibold text-neutral-400">{day}</span>)}
        {Array.from({ length: offset }, (_, cell) => <span key={`empty-${cell}`} />)}
        {Array.from({ length: daysInMonth }, (_, cell) => {
          const date = `${month}-${String(cell + 1).padStart(2, "0")}`;
          const count = people.get(date);
          const future = date > today;
          return (
            <button
              key={date}
              type="button"
              disabled={future}
              onClick={() => setSelectedDate(date)}
              aria-label={`${cell + 1}${count !== undefined ? `, ${count} personas` : ""}`}
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl text-xs transition disabled:cursor-default ${count !== undefined ? "bg-[#eef7ef] font-semibold text-[#085c4a] hover:bg-[#dff0e3]" : future ? "text-neutral-300" : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"} ${date === selectedDate ? "ring-2 ring-[#087c65]" : ""}`}
            >
              {cell + 1}
              {count !== undefined ? <span className="text-[10px] leading-3 text-[#087c65]">{count}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[[totals.days, "días"], [totals.people, "personas"], [totals.owners, "dueños"]].map(([value, label]) => (
          <div key={label} className="rounded-2xl bg-neutral-50 px-2 py-2.5">
            <p className="text-xl font-bold text-neutral-950">{value}</p>
            <p className="text-[11px] text-neutral-500">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export type Todo = { id: string; text: string; done: boolean };

// "Mis pendientes": the aliado's own short list (owners to call back, groups to post in...).
export function TodoCard({ initial }: { initial: Todo[] }) {
  const [todos, setTodos] = useState(initial);
  const [text, setText] = useState("");

  function change(next: Todo[]) {
    setTodos(next);
    void savePanel({ action: "todos", todos: next });
  }

  function add(event: React.FormEvent) {
    event.preventDefault();
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || todos.length >= 30) return;
    change([...todos, { id: `t${Date.now().toString(36)}`, text: clean.slice(0, 140), done: false }]);
    setText("");
  }

  const pending = todos.filter((todo) => !todo.done).length;

  return (
    <section className={logCard} aria-labelledby="aliado-pendientes">
      <h2 id="aliado-pendientes" className="flex items-center gap-2 pr-10 text-lg font-semibold tracking-tight text-neutral-950">
        <ListTodo className="h-5 w-5 text-[#087c65]" aria-hidden="true" />
        Mis pendientes
      </h2>
      <p className="mt-1 text-sm text-neutral-600">{todos.length === 0 ? "Tu lista: dueños a llamar, grupos donde publicar…" : `${pending} ${pending === 1 ? "pendiente" : "pendientes"}. Solo tú ves esta lista.`}</p>
      {todos.length > 0 ? (
        <ul className="mt-3 grid gap-1">
          {todos.map((todo) => (
            <li key={todo.id} className="group flex items-start gap-2.5 rounded-xl px-1 py-1.5 hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => change(todos.map((item) => (item.id === todo.id ? { ...item, done: !item.done } : item)))}
                className="mt-0.5 h-4 w-4 flex-none cursor-pointer accent-[#087c65]"
                aria-label={todo.text}
              />
              <span className={`min-w-0 flex-1 text-sm leading-5 [overflow-wrap:anywhere] ${todo.done ? "text-neutral-400 line-through" : "text-neutral-800"}`}>{todo.text}</span>
              <button type="button" onClick={() => change(todos.filter((item) => item.id !== todo.id))} className="inline-flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full text-neutral-400 hover:bg-white hover:text-[#be123c]" aria-label={`Quitar “${todo.text}”`}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input className={`${input} mt-0`} value={text} maxLength={140} onChange={(event) => setText(event.target.value)} placeholder="Agregar pendiente" aria-label="Nuevo pendiente" />
        <button type="submit" className="inline-flex h-10 w-10 flex-none cursor-pointer items-center justify-center self-center rounded-full bg-[#087c65] text-white hover:bg-[#06624f]" aria-label="Agregar pendiente">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
