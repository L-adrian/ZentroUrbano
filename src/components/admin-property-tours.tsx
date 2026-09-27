"use client";
import { useRouter } from "next/navigation";
import { Check, EyeOff, LoaderCircle, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PropertyTourButton } from "@/components/property-tour";
import type { AdminTour, PublicTour } from "@/lib/property-tour-contract";

type Tour = AdminTour & { preview: PublicTour | null };
function Review({ tour }: { tour: Tour }) {
  const router = useRouter();
  const [reviewed, setReviewed] = useState(false), [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function decide(action: "publish" | "hide") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/admin/recorridos/${tour.slug}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: tour.revision, action, reviewed, ownerApproved: approved }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage(action === "publish" ? "Recorrido publicado." : "Recorrido retirado de la ficha.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar la decisión."); }
    finally { setBusy(false); }
  }
  return <article className="admin-tour-row">
    <div><h2>{tour.title}</h2><p>{tour.scope} · {tour.status === "published" ? "Publicado" : tour.status === "hidden" ? "Retirado" : "Pendiente de revisión"}</p></div>
    <dl className="admin-tour-metrics"><div><dt>Aperturas · 30 días</dt><dd>{tour.opens}</dd></div><div><dt>Errores · 30 días</dt><dd>{tour.errors}</dd></div><div><dt>Clics WhatsApp tras ver 3D · 30 días</dt><dd>{tour.contacts}</dd></div></dl>
    <div className="admin-tour-actions">{tour.preview && <PropertyTourButton tour={tour.preview} preview />}{tour.status === "published" ? <button className="zu-button zu-button-secondary" disabled={busy} onClick={() => void decide("hide")}><EyeOff size={17} />Retirar recorrido</button> : <>
      <label><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />Revisé el recorrido y las fotos originales.</label>
      <label><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />El propietario autorizó publicar esta recreación.</label>
      <button className="zu-button zu-button-primary" disabled={busy || !reviewed || !approved || !tour.preview} onClick={() => void decide("publish")}>{busy ? <LoaderCircle size={17} className="tour-spin" /> : <Check size={17} />}Publicar recorrido</button>
    </>}</div>
    {message && <p role="status">{message}</p>}
  </article>;
}

export function AdminPropertyTours({ tours, properties }: { tours: Tour[]; properties: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState(properties[0]?.slug || ""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const existing = tours.find(t => t.slug === slug);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("expectedRevision", existing?.revision || "");
    try {
      const response = await fetch(`/admin/recorridos/${slug}/upload`, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMessage("Archivos guardados. Revisa el recorrido antes de publicarlo."); form.reset(); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar. Comprueba la conexión."); }
    finally { setBusy(false); }
  }
  return <>
    <section aria-label="Recorridos guardados">{tours.length ? tours.map(tour => <Review key={tour.slug + tour.revision + tour.status} tour={tour} />) : <p className="admin-tour-row">Todavía no hay recorridos cargados.</p>}</section>
    <details className="admin-tour-upload"><summary>Importar un recorrido generado</summary><form onSubmit={upload}>
      <label>Ficha<select required value={slug} onChange={event => setSlug(event.target.value)}>{properties.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}</select></label>
      <label>Manifiesto del recorrido (.json)<input required name="manifest" type="file" accept=".json,application/json" disabled={busy} /></label>
      <label>Escena de escritorio (.spz)<input required name="world.spz" type="file" accept=".spz" disabled={busy} /></label>
      <label>Escena ligera para móviles (.spz)<input required name="mobile.spz" type="file" accept=".spz" disabled={busy} /></label>
      <p>Máximo 10 MB por escena. Importar no genera contenido ni consume créditos de Marble.</p>
      {existing?.status === "published" && <p>Retira el recorrido actual antes de reemplazarlo.</p>}
      <button className="zu-button zu-button-primary" disabled={busy || !slug || existing?.status === "published"}>{busy ? <LoaderCircle className="tour-spin" size={17} /> : <Upload size={17} />}Guardar para revisión</button>
      {message && <p role="status">{message}</p>}
    </form></details>
  </>;
}
