"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Admin buttons for one alert: record that the person was told, or stop the alert.
export function AdminSearchAlertActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: "notified" | "remove") {
    if (action === "remove" && !window.confirm("¿Dar de baja esta alerta? Ya no aparecerá en la lista.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/admin/alertas/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-alert-actions">
      <button type="button" disabled={busy} onClick={() => run("notified")}>Marcar como avisado</button>
      <button type="button" disabled={busy} onClick={() => run("remove")}>Dar de baja</button>
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}
