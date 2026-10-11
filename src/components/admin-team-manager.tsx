"use client";

import { Camera, CalendarX, LoaderCircle, MessageCircle, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { TeamAvatar } from "@/components/team-avatar";
import { VisitSettingsEditor } from "@/components/visit-settings-editor";
import { formatAlertWhatsapp } from "@/lib/search-alert-input";
import { teamRoleLabels, teamRoles, type TeamRole } from "@/lib/team-roles";
import { defaultVisitSettings, visitShortLabel, type VisitSettings } from "@/lib/visit-slots";
import type { TeamAssignment, TeamMember } from "@/lib/team";
import type { VisitBooking } from "@/lib/visits";

type Home = { slug: string; title: string; zone: string; owner: string };

async function post(body: Record<string, unknown>) {
  const response = await fetch("/admin/equipo/acciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.message || "No se pudo guardar.");
  return data as Record<string, unknown>;
}

export function AdminTeamManager({ members, assignments, homes, settings, bookings }: {
  members: TeamMember[];
  assignments: TeamAssignment[];
  homes: Home[];
  settings: Record<string, VisitSettings>;
  bookings: VisitBooking[];
}) {
  const router = useRouter();
  const homeBySlug = useMemo(() => new Map(homes.map((home) => [home.slug, home])), [homes]);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const [settingsSlug, setSettingsSlug] = useState(homes[0]?.slug ?? "");
  const activeMembers = members.filter((member) => member.status === "active");

  return (
    <div className="admin-team-grid">
      <AdminCard title="Agregar persona">
        <MemberForm submitLabel="Agregar al equipo" onSubmit={async (values) => { await post({ action: "create", ...values }); router.refresh(); }} />
      </AdminCard>

      <AdminCard title="Asignar a una vivienda">
        {activeMembers.length === 0 ? <p className="admin-team-muted">Primero agrega a una persona.</p> : (
          <AssignForm homes={homes} members={activeMembers} onAssigned={() => router.refresh()} />
        )}
      </AdminCard>

      <AdminCard title={`Personas (${members.length})`} wide>
        {members.length === 0 ? <p className="admin-team-muted">Todavía no hay nadie registrado.</p> : (
          <ul className="admin-team-people">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                homes={assignments.filter((assignment) => assignment.memberId === member.id).map((assignment) => ({ ...assignment, home: homeBySlug.get(assignment.propertySlug) }))}
                onChanged={() => router.refresh()}
              />
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title="Horario de visitas por vivienda">
        <label className="admin-team-field">
          <span>Vivienda</span>
          <select value={settingsSlug} onChange={(event) => setSettingsSlug(event.target.value)}>
            {homes.map((home) => <option key={home.slug} value={home.slug}>{home.title} · {home.zone}</option>)}
          </select>
        </label>
        {settingsSlug ? (
          <VisitSettingsEditor
            key={settingsSlug}
            initial={settings[settingsSlug] ?? defaultVisitSettings}
            onSave={async (next) => { await post({ action: "visit-settings", propertySlug: settingsSlug, settings: next }); router.refresh(); }}
          />
        ) : null}
      </AdminCard>

      <AdminCard title={`Visitas reservadas (${bookings.filter((booking) => booking.status === "reserved").length})`}>
        {bookings.length === 0 ? <p className="admin-team-muted">Todavía no hay visitas reservadas.</p> : (
          <ul className="admin-team-bookings">
            {bookings.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                home={homeBySlug.get(booking.propertySlug)}
                host={booking.hostMemberId ? memberById.get(booking.hostMemberId)?.name ?? "Embajador" : "Dueño"}
                onCancel={async () => { await post({ action: "cancel-booking", id: booking.id }); router.refresh(); }}
              />
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}

function AdminCard({ title, wide = false, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className={`admin-team-card${wide ? " is-wide" : ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

type MemberValues = { name: string; level: TeamRole; whatsapp: string; zone: string; bio: string };

function MemberForm({ initial, submitLabel, onSubmit, onCancel }: {
  initial?: MemberValues;
  submitLabel: string;
  onSubmit: (values: MemberValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const empty: MemberValues = { name: "", level: "colaborador", whatsapp: "", zone: "", bio: "" };
  const [values, setValues] = useState<MemberValues>(initial ?? empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof MemberValues, value: string) => setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(values);
      if (!initial) setValues(empty);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-team-form" onSubmit={submit}>
      <label className="admin-team-field"><span>Nombre completo</span><input value={values.name} onChange={(event) => set("name", event.target.value)} required maxLength={120} placeholder="Nombre y apellido reales" /></label>
      <fieldset className="admin-team-roles">
        <legend>Título en el equipo</legend>
        {teamRoles.map((role) => (
          <label key={role}><input type="radio" name="level" checked={values.level === role} onChange={() => set("level", role)} />{teamRoleLabels[role]}</label>
        ))}
      </fieldset>
      <label className="admin-team-field"><span>WhatsApp</span><input value={values.whatsapp} onChange={(event) => set("whatsapp", event.target.value)} type="tel" inputMode="tel" maxLength={20} placeholder="7xxxxxxx (para recibir visitas)" /></label>
      <label className="admin-team-field"><span>Zona donde trabaja</span><input value={values.zone} onChange={(event) => set("zone", event.target.value)} maxLength={120} placeholder="Ej.: Equipetrol y zona norte" /></label>
      <label className="admin-team-field"><span>Sobre la persona</span><textarea value={values.bio} onChange={(event) => set("bio", event.target.value)} maxLength={300} rows={3} placeholder="Una o dos frases que se ven en la página del equipo" /></label>
      {error ? <p role="alert" className="visit-error">{error}</p> : null}
      <div className="admin-team-actions">
        <button type="submit" className="zu-button zu-button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="zu-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{submitLabel}</button>
        {onCancel ? <button type="button" className="zu-button zu-button-secondary" onClick={onCancel}>Cancelar</button> : null}
      </div>
    </form>
  );
}

function AssignForm({ homes, members, onAssigned }: { homes: Home[]; members: TeamMember[]; onAssigned: () => void }) {
  const [slug, setSlug] = useState(homes[0]?.slug ?? "");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [role, setRole] = useState<TeamRole>("embajador");
  const [handlesVisits, setHandlesVisits] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const member = members.find((item) => item.id === memberId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const result = await post({ action: "assign", propertySlug: slug, memberId, role, handlesVisits: role === "embajador" && handlesVisits });
      setMessage(result.demoted ? `Listo. ${result.demoted} pasó a colaborador en esa vivienda.` : "Listo.");
      onAssigned();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-team-form" onSubmit={submit}>
      <label className="admin-team-field"><span>Vivienda</span>
        <select value={slug} onChange={(event) => setSlug(event.target.value)}>
          {homes.map((home) => <option key={home.slug} value={home.slug}>{home.title} · {home.zone}</option>)}
        </select>
      </label>
      <label className="admin-team-field"><span>Persona</span>
        <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
          {members.map((item) => <option key={item.id} value={item.id}>{item.name} ({teamRoleLabels[item.level]})</option>)}
        </select>
      </label>
      <fieldset className="admin-team-roles">
        <legend>Rol en esta vivienda</legend>
        {teamRoles.map((item) => (
          <label key={item}><input type="radio" name="assign-role" checked={role === item} onChange={() => setRole(item)} />{teamRoleLabels[item]}</label>
        ))}
      </fieldset>
      {role === "embajador" ? (
        <label className="admin-team-check">
          <input type="checkbox" checked={handlesVisits} onChange={(event) => setHandlesVisits(event.target.checked)} />
          <span>Las visitas se reservan con esta persona{member && !member.whatsapp ? " (falta su WhatsApp: mientras tanto le llegan al dueño)" : ""}</span>
        </label>
      ) : null}
      {message ? <p role={failed ? "alert" : "status"} className={failed ? "visit-error" : "visit-ok"}>{message}</p> : null}
      <button type="submit" className="zu-button zu-button-primary" disabled={busy || !slug || !memberId}>{busy ? <LoaderCircle size={16} className="zu-spin" aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}Asignar</button>
    </form>
  );
}

function MemberRow({ member, homes, onChanged }: { member: TeamMember; homes: (TeamAssignment & { home?: Home })[]; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await work();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set("id", member.id);
    form.set("photo", file);
    await run(async () => {
      const response = await fetch("/admin/equipo/foto", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "No se pudo guardar la foto.");
    });
  }

  return (
    <li className={member.status === "active" ? "" : "is-inactive"}>
      <div className="admin-team-person">
        <TeamAvatar name={member.name} photoUrl={member.photoUrl} size={56} />
        <div>
          <strong>{member.name}</strong>
          <span className={`team-role is-${member.level}`}>{teamRoleLabels[member.level]}{member.status === "active" ? "" : " · inactivo"}</span>
          <small>{[member.whatsapp ? formatAlertWhatsapp(member.whatsapp) : "Sin WhatsApp", member.zone].filter(Boolean).join(" · ")}</small>
        </div>
      </div>
      {editing ? (
        <MemberForm
          initial={{ name: member.name, level: member.level, whatsapp: member.whatsapp ? member.whatsapp.slice(3) : "", zone: member.zone ?? "", bio: member.bio ?? "" }}
          submitLabel="Guardar cambios"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => { await post({ action: "update", id: member.id, ...values }); setEditing(false); onChanged(); }}
        />
      ) : (
        <div className="admin-team-actions">
          <button type="button" className="zu-button zu-button-secondary" onClick={() => setEditing(true)}>Editar</button>
          <label className="zu-button zu-button-secondary admin-team-upload">
            <Camera size={16} aria-hidden="true" />{member.photoUrl ? "Cambiar foto" : "Subir foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
          {member.photoUrl ? <button type="button" className="zu-button zu-button-secondary" disabled={busy} onClick={() => run(() => post({ action: "remove-photo", id: member.id }))}>Quitar foto</button> : null}
          <button
            type="button"
            className="zu-button zu-button-secondary"
            disabled={busy}
            onClick={() => {
              if (member.status === "active" && !window.confirm(`¿Desactivar a ${member.name}? Deja de verse en la página del equipo y en sus viviendas.`)) return;
              void run(() => post({ action: "status", id: member.id, status: member.status === "active" ? "inactive" : "active" }));
            }}
          >
            {member.status === "active" ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
            {member.status === "active" ? "Desactivar" : "Activar"}
          </button>
        </div>
      )}
      {homes.length > 0 ? (
        <ul className="admin-team-homes">
          {homes.map((assignment) => (
            <li key={assignment.propertySlug}>
              <span>
                <strong>{teamRoleLabels[assignment.role]}</strong>{assignment.handlesVisits ? " · toma las visitas" : ""} en {assignment.home ? `${assignment.home.title} (${assignment.home.zone})` : assignment.propertySlug}
              </span>
              <button type="button" aria-label="Quitar de esta vivienda" title="Quitar de esta vivienda" disabled={busy} onClick={() => run(() => post({ action: "unassign", propertySlug: assignment.propertySlug, memberId: member.id }))}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="admin-team-muted">Sin viviendas asignadas.</p>}
      {error ? <p role="alert" className="visit-error">{error}</p> : null}
    </li>
  );
}

function BookingRow({ booking, home, host, onCancel }: { booking: VisitBooking; home?: Home; host: string; onCancel: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const past = booking.past;
  return (
    <li className={booking.status === "cancelled" ? "is-cancelled" : past ? "is-past" : ""}>
      <div>
        <strong>{visitShortLabel(booking.startsAt)}</strong>
        <span>{home ? `${home.title} · ${home.zone}` : booking.propertySlug}</span>
        <small>
          {booking.visitorName} · <a href={`https://wa.me/${booking.visitorWhatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={13} aria-hidden="true" /> {formatAlertWhatsapp(booking.visitorWhatsapp)}</a> · recibe: {host}
          {booking.note ? ` · "${booking.note}"` : ""}
          {booking.status === "cancelled" ? " · cancelada" : ""}
        </small>
      </div>
      {booking.status === "reserved" && !past ? (
        <button
          type="button"
          className="zu-button zu-button-secondary"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("¿Cancelar esta visita? El horario vuelve a quedar libre. Avísale a la persona por WhatsApp.")) return;
            setBusy(true);
            try { await onCancel(); } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo cancelar."); } finally { setBusy(false); }
          }}
        >
          <CalendarX size={16} aria-hidden="true" />Cancelar
        </button>
      ) : null}
    </li>
  );
}
