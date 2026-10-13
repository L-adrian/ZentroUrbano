"use client";

import { Camera, Check, KeyRound, LoaderCircle, LogOut, Save, Trash2, UserRound } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useState } from "react";

export type AccountProfile = { displayName: string; phone: string; avatarUrl: string | null; avatarInitials: string };
// What the signed-in login can do with its password. Google-only accounts can create one.
export type AccountLogin = { hasPassword: boolean };

const inputClassName =
  "h-11 w-full rounded-[16px] border border-black/10 bg-white px-4 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 disabled:opacity-60";
const buttonClassName =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 disabled:cursor-wait disabled:opacity-60";
const darkButtonClassName =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-[#21352b] disabled:cursor-wait disabled:opacity-60";

export function AccountAvatar({ account, size, onClick }: { account: AccountProfile; size: "lg" | "xl"; onClick?: () => void }) {
  const box = size === "xl" ? "h-24 w-24 rounded-[30px] text-2xl" : "h-16 w-16 rounded-[22px] text-lg";
  const face = account.avatarUrl ? (
    <Image
      src={account.avatarUrl}
      alt={`Foto de ${account.displayName}`}
      width={size === "xl" ? 96 : 64}
      height={size === "xl" ? 96 : 64}
      unoptimized={account.avatarUrl.startsWith("/media/")}
      className={`${box} border border-black/10 object-cover`}
    />
  ) : (
    <span className={`${box} flex items-center justify-center bg-neutral-950 font-semibold text-white`}>{account.avatarInitials}</span>
  );
  if (!onClick) return face;
  return (
    <button type="button" onClick={onClick} className="relative shrink-0 cursor-pointer" aria-label={account.avatarUrl ? "Cambiar tu foto de perfil" : "Subir tu foto de perfil"}>
      {face}
      <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border border-black/10 bg-white text-neutral-800">
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </button>
  );
}

async function send(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.message || "No se pudo guardar. Intenta de nuevo.");
  return data as Record<string, unknown>;
}

export function OwnerProfilePanel({
  profile,
  email,
  login,
  hasListing,
  hoursOn,
  onProfileChange,
  onLogout,
}: {
  profile: AccountProfile;
  email: string;
  login: AccountLogin | null;
  hasListing: boolean;
  hoursOn: boolean;
  onProfileChange: (next: Partial<AccountProfile>) => void;
  onLogout: () => void;
}) {
  const steps: Array<[string, boolean]> = [
    ["Crea tu cuenta", true],
    ["Sube tu foto de perfil", Boolean(profile.avatarUrl)],
    ["Agrega tu WhatsApp", Boolean(profile.phone)],
    ["Publica tu vivienda", hasListing],
    ["Elige días y horas para visitar", hoursOn],
  ];
  return (
    <>
      <div className="grid min-w-0 content-start gap-6">
        <PhotoSection profile={profile} onChange={onProfileChange} />
        <DetailsSection profile={profile} email={email} onChange={onProfileChange} />
        {login ? <PasswordSection hasPassword={login.hasPassword} /> : null}
      </div>
      <aside className="grid content-start gap-6 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-[28px] border border-black/10 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#58745f]">Tus primeros pasos</p>
          <ol className="mt-3 grid gap-2.5">
            {steps.map(([label, done], index) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-neutral-800">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-[#087c65] text-white" : "bg-neutral-100 text-neutral-700"}`}>
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className={done ? "text-neutral-500 line-through decoration-neutral-300" : ""}>{label}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-[28px] border border-black/10 bg-white p-5">
          <p className="text-lg font-semibold text-neutral-950">Cuenta</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Closes this session first: the login page alone would keep the current account signed in. */}
            <button type="button" onClick={onLogout} className={buttonClassName}>Cambiar de cuenta</button>
            <button type="button" onClick={onLogout} className={buttonClassName}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </button>
          </div>
        </section>
      </aside>
    </>
  );
}

function PhotoSection({ profile, onChange }: { profile: AccountProfile; onChange: (next: Partial<AccountProfile>) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.append("photo", file);
      const data = await send("/api/cliente/perfil/foto", { method: "POST", body: form });
      onChange({ avatarUrl: String(data.avatarUrl) });
      setNotice("Listo. Tu foto ya se ve en tu cuenta.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo guardar la foto.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !window.confirm("¿Quitar tu foto de perfil?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await send("/api/cliente/perfil/foto", { method: "DELETE" });
      onChange({ avatarUrl: null });
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "No se pudo quitar la foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="profile-photo-title">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#58745f]">Mi perfil</p>
      <h2 id="profile-photo-title" className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">Tu foto de perfil</h2>
      <p className="mt-1 text-sm leading-6 text-neutral-600">Una foto de tu cara da confianza: los inquilinos saben con quién van a hablar.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <AccountAvatar account={profile} size="xl" />
        <div className="flex flex-wrap gap-2">
          <label className={`${darkButtonClassName} ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {busy ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
            {profile.avatarUrl ? "Cambiar foto" : "Subir foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }}
            />
          </label>
          {profile.avatarUrl ? (
            <button type="button" onClick={remove} disabled={busy} className={buttonClassName}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Quitar
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">JPG, PNG o WebP de hasta 10 MB. La recortamos en cuadrado.</p>
      {notice ? <p role="status" className="mt-2 text-sm font-semibold text-[#176b4d]">{notice}</p> : null}
      {error ? <p role="alert" className="auth-error mt-2">{error}</p> : null}
    </section>
  );
}

function DetailsSection({ profile, email, onChange }: { profile: AccountProfile; email: string; onChange: (next: Partial<AccountProfile>) => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [phone, setPhone] = useState(profile.phone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await send("/api/cliente/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", displayName, phone }),
      });
      setDisplayName(String(data.displayName));
      setPhone(String(data.phone));
      onChange({ displayName: String(data.displayName), phone: String(data.phone) });
      setNotice("Listo. Guardamos tus datos.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="profile-details-title">
      <h2 id="profile-details-title" className="text-xl font-semibold tracking-tight text-neutral-950">Tus datos</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800"><UserRound className="h-4 w-4" aria-hidden="true" />Nombre y apellido</span>
          <input className={inputClassName} value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required maxLength={80} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-neutral-800">WhatsApp</span>
          <input className={inputClassName} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="70012345" maxLength={20} />
        </label>
        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-neutral-800">Correo</span>
          <input className={inputClassName} value={email} disabled readOnly />
        </label>
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        El correo es tu usuario para ingresar y no se puede cambiar aquí. Tus anuncios ya publicados siguen con el nombre con que se publicaron; su WhatsApp se cambia en «Editar» de cada anuncio.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={darkButtonClassName}>
          {busy ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          Guardar cambios
        </button>
        {notice ? <p role="status" className="text-sm font-semibold text-[#176b4d]">{notice}</p> : null}
      </div>
      {error ? <p role="alert" className="auth-error mt-3">{error}</p> : null}
    </form>
  );
}

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await send("/api/cliente/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", current, next }),
      });
      setCurrent("");
      setNext("");
      setOpen(false);
      setNotice(hasPassword ? "Listo. Cambiamos tu contraseña." : "Listo. Ya puedes ingresar también con tu correo y esta contraseña.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 sm:p-6" aria-labelledby="profile-password-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="profile-password-title" className="text-xl font-semibold tracking-tight text-neutral-950">Contraseña</h2>
          <p className="mt-1 text-sm text-neutral-600">{hasPassword ? "Cámbiala si alguien más la conoce." : "Ingresas con Google. Si quieres, crea una contraseña."}</p>
        </div>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
          </button>
        ) : null}
      </div>
      {notice ? <p role="status" className="mt-3 text-sm font-semibold text-[#176b4d]">{notice}</p> : null}
      {open ? (
        <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2">
          {hasPassword ? (
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-neutral-800">Contraseña actual</span>
              <input className={inputClassName} type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" required />
            </label>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-neutral-800">Contraseña nueva</span>
            <input className={inputClassName} type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" minLength={8} required placeholder="Al menos 8 caracteres" />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="submit" disabled={busy} className={darkButtonClassName}>
              {busy ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              Guardar contraseña
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(""); }} className={buttonClassName}>Cancelar</button>
          </div>
          {error ? <p role="alert" className="auth-error md:col-span-2">{error}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
