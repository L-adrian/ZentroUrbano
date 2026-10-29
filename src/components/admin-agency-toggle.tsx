"use client";

import { Building2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Admin: turn an owner account into an agency (inmobiliaria), which adds Clientes to its Mi cuenta.
export function AdminAgencyToggle({ accountId, defaultName, agency }: { accountId: string; defaultName: string; agency: { name: string; active: boolean } | null }) {
  const router = useRouter();
  const [name, setName] = useState(agency?.name ?? defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = Boolean(agency?.active);

  async function save(nextActive: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/admin/cuentas/${encodeURIComponent(accountId)}/inmobiliaria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive, name }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.message || "No se pudo guardar el cambio.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el cambio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-[16px] border border-black/10 bg-neutral-50 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-neutral-900">
        <Building2 className="h-4 w-4 text-[#58745f]" aria-hidden="true" />
        {active ? "Es agente inmobiliario: ve Clientes y Panel" : "Agente inmobiliario"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`agency-${accountId}`}>Nombre que verán sus clientes</label>
        <input
          id={`agency-${accountId}`}
          value={name}
          maxLength={160}
          onChange={(event) => setName(event.target.value)}
          placeholder="Su nombre, o el de su inmobiliaria"
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-black/15 bg-white px-3"
        />
        <button type="button" className="zu-button zu-button-secondary" disabled={busy} onClick={() => save(!active || name.trim() !== agency?.name)}>
          {busy ? <LoaderCircle size={16} className="zu-spin" aria-hidden="true" /> : null}
          {active ? (name.trim() !== agency?.name ? "Guardar nombre" : "Quitar modo agente") : "Activar como agente inmobiliario"}
        </button>
      </div>
      {active ? <p className="mt-2 text-xs text-neutral-500">Si después trabaja con otras personas, las suma desde Clientes. Al quitarlo no se borra nada: sus clientes vuelven si lo activas otra vez.</p> : null}
      {error ? <p className="mt-2 text-xs font-semibold text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
