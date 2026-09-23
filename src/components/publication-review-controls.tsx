"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, LoaderCircle, MapPin } from "lucide-react";

export function PublicationReviewControls({id,address,canApprove}:{id:string;address:string;canApprove:boolean}) {
  const router=useRouter();
  const [latitude,setLatitude]=useState("");
  const [longitude,setLongitude]=useState("");
  const [reason,setReason]=useState("");
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [done,setDone]=useState("");
  async function review(decision:"approve"|"reject") {
    if (busy) return;
    if (decision === "reject" && reason.trim().length < 5) {setError("Escribe el motivo del rechazo (mínimo 5 caracteres).");return;}
    if (decision === "approve" && (!confirmed || !latitude.trim() || !longitude.trim())) {setError("Confirma los datos y completa las coordenadas antes de aprobar.");return;}
    setBusy(true);setError("");
    try {
      const response=await fetch(`/admin/solicitudes/${id}/decision`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,reason,confirmed,latitude,longitude})});
      const data=await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "No pudimos guardar la decisión.");
      setDone(decision === "approve" ? "Ficha aprobada y publicada." : "Solicitud rechazada. El propietario puede consultar el motivo.");
      router.refresh();
    } catch(error) {setError(error instanceof Error ? error.message : "No se pudo conectar. Actualiza antes de reintentar.");}
    finally {setBusy(false);}
  }
  if (done) return <p role="status" className="review-result">{done}</p>;
  return <div className="review-controls">
    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ", Santa Cruz, Bolivia")}`} target="_blank" rel="noopener noreferrer" className="request-back-link"><MapPin size={17}/>Comprobar ubicación</a>
    <div className="review-coordinates">
      <label>Latitud<input type="number" step="any" min="-23" max="-9" value={latitude} onChange={e=>setLatitude(e.target.value)} placeholder="-17.7833" disabled={busy}/></label>
      <label>Longitud<input type="number" step="any" min="-70" max="-57" value={longitude} onChange={e=>setLongitude(e.target.value)} placeholder="-63.1821" disabled={busy}/></label>
    </div>
    <label className="review-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>Revisé propietario directo, fotos, precio, disponibilidad y ubicación.</label>
    <label>Observación / motivo de rechazo<textarea maxLength={1000} rows={3} value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/></label>
    {!canApprove && <p>Solicitud antigua sin datos completos. Pide un nuevo envío antes de aprobar.</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    <div className="review-actions">
      <button type="button" className="zu-button zu-button-primary" disabled={busy || !canApprove} onClick={()=>review("approve")}>{busy ? <LoaderCircle size={17} className="zu-spin"/> : <Check size={17}/>}Aprobar y publicar</button>
      <button type="button" className="zu-button zu-button-secondary" disabled={busy} onClick={()=>review("reject")}><X size={17}/>Rechazar</button>
    </div>
  </div>;
}
