"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useState } from "react";
import { minuteLabel, visitSettingsSummary, weekdayShortNames, type VisitSettings } from "@/lib/visit-slots";

// Hours on the half hour, 06:00 to 22:00.
const hourOptions = Array.from({ length: 33 }, (_, index) => 6 * 60 + index * 30);
// Monday first, as people read a week.
const weekOrder = [1, 2, 3, 4, 5, 6, 0];

// Which days and hours a home can be visited. Used by the owner in their account and by the admin.
export function VisitSettingsEditor({ initial, onSave }: { initial: VisitSettings; onSave: (settings: VisitSettings) => Promise<void> }) {
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const changed = JSON.stringify(settings) !== JSON.stringify(initial);

  function toggleDay(day: number) {
    setSettings((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day) ? current.weekdays.filter((item) => item !== day) : [...current.weekdays, day].sort(),
    }));
    setMessage("");
  }

  async function save() {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      await onSave(settings);
      setMessage("Guardado.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="visit-settings">
      <label className="visit-settings-toggle">
        <input type="checkbox" checked={settings.enabled} onChange={(event) => { setSettings({ ...settings, enabled: event.target.checked }); setMessage(""); }} />
        <span>Recibir reservas de visita en el anuncio</span>
      </label>
      <fieldset disabled={!settings.enabled}>
        <legend>Días</legend>
        <div className="visit-settings-days">
          {weekOrder.map((day) => (
            <button key={day} type="button" aria-pressed={settings.weekdays.includes(day)} onClick={() => toggleDay(day)}>
              {weekdayShortNames[day]}
            </button>
          ))}
        </div>
        <div className="visit-settings-hours">
          <label>
            <span>Desde</span>
            <select value={settings.startMinute} onChange={(event) => { setSettings({ ...settings, startMinute: Number(event.target.value) }); setMessage(""); }}>
              {hourOptions.slice(0, -2).map((minute) => <option key={minute} value={minute}>{minuteLabel(minute)}</option>)}
            </select>
          </label>
          <label>
            <span>Hasta</span>
            <select value={settings.endMinute} onChange={(event) => { setSettings({ ...settings, endMinute: Number(event.target.value) }); setMessage(""); }}>
              {hourOptions.slice(2).map((minute) => <option key={minute} value={minute}>{minuteLabel(minute)}</option>)}
            </select>
          </label>
        </div>
      </fieldset>
      <p className="visit-settings-summary">{visitSettingsSummary(settings)}. Cada visita dura una hora.</p>
      <div className="visit-settings-save">
        <button type="button" className="zu-button zu-button-secondary" disabled={busy || !changed} onClick={save}>
          {busy ? <LoaderCircle size={16} className="zu-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          Guardar horario
        </button>
        {message ? <span role={failed ? "alert" : "status"} className={failed ? "visit-error" : "visit-ok"}>{message}</span> : null}
      </div>
    </div>
  );
}
