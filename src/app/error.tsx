"use client";
import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main id="contenido" className="zu-empty"><WifiOff size={40} /><h1>No pudimos cargar esta página.</h1><p>Revisa tu conexión y vuelve a intentarlo.</p><div className="empty-actions"><button type="button" onClick={() => retry()} className="zu-button zu-button-primary"><RefreshCw size={17} />Volver a intentar</button><Link href="/" className="zu-button zu-button-secondary">Ir al inicio</Link></div></main>;
}
