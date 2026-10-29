"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AgencyClients } from "@/components/agency-clients";
import { GoogleCalendarCard } from "@/components/google-calendar-card";

// Same event the header listens to (see aliado-dashboard).
const sessionEventName = "morada-session";
const button =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 text-sm font-semibold text-neutral-800 transition hover:border-[#176b4d] disabled:opacity-50";

// Mi cuenta of an agent of an inmobiliaria: only their own clients, with the agency's homes to
// link them to, and their own Google Calendar.
export function AgentDashboard({ agentName, agencyName, color, homes }: { agentName: string; agencyName: string; color: string; homes: Array<{ slug: string; title: string }> }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logout() {
    setLeaving(true);
    setFailed(false);
    const response = await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    if (!response?.ok) {
      setLeaving(false);
      setFailed(true);
      return;
    }
    window.dispatchEvent(new Event(sessionEventName));
    router.push("/login");
  }

  return (
    <div className="min-h-[70svh] bg-neutral-50">
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-semibold text-white" style={{ background: color }} aria-hidden="true">
            {agentName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
          </span>
          <div className="min-w-0 flex-1 basis-48">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#58745f]">Agente · {agencyName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere] sm:text-3xl">Hola, {agentName}</h1>
          </div>
          <button type="button" onClick={logout} disabled={leaving} className={button}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </button>
          {failed ? <p className="w-full text-sm text-red-700" role="alert">No se pudo cerrar la sesión. Intenta otra vez.</p> : null}
        </div>
      </section>
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <AgencyClients agentMode agencyName={agencyName} homes={homes} />
        <GoogleCalendarCard subject="Los próximos pasos de tus clientes" />
      </main>
    </div>
  );
}
