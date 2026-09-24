"use client";
import { ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SupportWhatsAppButton } from "@/components/support-whatsapp-button";
import { googleAuthMessages, safeAuthNext } from "@/lib/auth-navigation";

export function LoginPanel({ authEnabled }: { authEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(() => params.get("mode") === "signup" ? "signup" : "login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = params.get("next");
  const nextPath = safeAuthNext(next);
  const publishing = nextPath === "/publicar";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authEnabled || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(mode === "signup" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No pudimos completar el acceso.");
      window.dispatchEvent(new Event("morada-session"));
      router.push(nextPath); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Revisa tu conexión e intenta nuevamente."); }
    finally { setBusy(false); }
  }
  return <div className="auth-panel">
    <span className="auth-icon"><KeyRound size={25} /></span>
    <h1>{publishing ? "Primero, tu cuenta." : mode === "login" ? "Qué bueno verte de nuevo." : "Tu vivienda, en buenas manos."}</h1>
    <p>{publishing ? "Regístrate o inicia sesión para publicar tu alquiler. Después continuarás con las fotos y los datos de tu vivienda." : mode === "login" ? "Ingresa a tu cuenta de Zentro Urbano." : "Crea tu cuenta personal para publicar alquileres directos."}</p>
    <div className="auth-tabs" role="group" aria-label="Tipo de acceso">
      <button type="button" disabled={busy} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Ingresar</button>
      <button type="button" disabled={busy} aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>Crear cuenta</button>
    </div>
    <a className="zu-button zu-button-secondary auth-google" href={`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`}><GoogleLogo />Continuar con Google</a>
    <div className="auth-divider"><span />{mode === "signup" ? "o con tu correo" : "o con tu correo o usuario"}<span /></div>
    <form onSubmit={submit}>
      {mode === "signup" && <label><span><UserRound size={15} />Tu nombre</span><input value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" required placeholder="Nombre y apellido" /></label>}
      <label><span><Mail size={15} />{mode === "signup" ? "Correo electrónico" : "Correo o usuario"}</span><input type={mode === "signup" ? "email" : "text"} value={email} onChange={event => setEmail(event.target.value)} autoComplete={mode === "signup" ? "email" : "username"} autoCapitalize="none" spellCheck={false} required placeholder={mode === "signup" ? "tu@correo.com" : "Correo o nombre de usuario"} /></label>
      <label><span><LockKeyhole size={15} />Contraseña</span><div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} required placeholder={mode === "signup" ? "Al menos 8 caracteres" : "Tu contraseña"} /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
      {(error || params.get("google_error")) && <p role="alert" className="auth-error">{error || googleAuthMessages[params.get("google_error") || ""] || "No se pudo completar el acceso con Google. Intenta con tu correo."}</p>}
      <button type="submit" className="zu-button zu-button-primary" disabled={busy || !authEnabled}>{busy ? <LoaderCircle size={18} className="zu-spin" /> : <ArrowRight size={18} />}{busy ? "Un momento..." : mode === "signup" ? "Crear mi cuenta" : "Ingresar"}</button>
    </form>
    <p className="auth-legal">Al continuar aceptas los <Link href="/terminos">términos</Link> y la <Link href="/privacidad">política de privacidad</Link>.</p>
    {publishing && <div className="auth-support"><SupportWhatsAppButton /></div>}
  </div>;
}
function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
