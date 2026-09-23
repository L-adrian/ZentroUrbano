"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bath,
  Check,
  CircleDollarSign,
  Home,
  ImagePlus,
  Images,
  ListChecks,
  Save,
  LoaderCircle,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  X,
} from "lucide-react";
import NextImage from "next/image";
import Link from "next/link";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { getPublicationCosts } from "@/lib/publication-costs";
import { getPublicationStepErrors, normalizePublicationPhone, publicationFieldStep, type PublicationFieldErrors } from "@/lib/publication-input";
import { minUploadPhotos, maxUploadPhotos, maxPhotoBytes, maxTotalPhotoBytes } from "@/lib/photo-upload-limits";
import { currencyExchangeRateBobPerUsd, maxPropertyExchangeRate, parsePropertyExchangeRate } from "@/lib/currency";
import {
  analyzePhotoFile,
  isPhotoTechnicallyValid,
  photoCategories,
  type PhotoAnalysis,
  type PhotoCategory,
} from "@/lib/photo-quality";

const steps = ["Fotos", "Información", "Precio", "Confirmación"] as const;
const stepIcons = [Images, Home, CircleDollarSign, ListChecks];

type PropertyForm = {
  ownerName: string;
  phone: string;
  title: string;
  type: "Casa" | "Departamento" | "Monoambiente";
  zone: string;
  address: string;
  bedrooms: string;
  bathrooms: string;
  garage: string;
  area: string;
  pets: boolean;
  furnished: boolean;
  security: boolean;
  pool: boolean;
  patio: boolean;
  grill: boolean;
  elevator: boolean;
  price: string;
  currency: "BOB" | "USD";
  exchangeRate: string;
  commonExpenses: string;
  guarantee: string;
  guaranteeAmount: string;
  description: string;
};

type UploadPhoto = {
  id: string;
  file: File;
  url: string;
  category: PhotoCategory;
  analysis: PhotoAnalysis | null;
  analyzing: boolean;
};

const initialForm: PropertyForm = {
  ownerName: "",
  phone: "",
  title: "",
  type: "Departamento",
  zone: "",
  address: "",
  bedrooms: "",
  bathrooms: "",
  garage: "0",
  area: "",
  pets: false,
  furnished: false,
  security: false,
  pool: false,
  patio: false,
  grill: false,
  elevator: false,
  price: "",
  currency: "BOB",
  exchangeRate: String(currencyExchangeRateBobPerUsd),
  commonExpenses: "0",
  guarantee: "",
  guaranteeAmount: "",
  description: "",
};

export function PublishWizard({ account }: { account: { id: string; name: string; phone: string } }) {
  const draftKey = `zu-publication-draft-v2:${account.id}`;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PropertyForm>(() => ({ ...initialForm, ownerName: account.name, phone: account.phone }));
  const [sessionExpired, setSessionExpired] = useState(false);
  const [photos, setPhotos] = useState<UploadPhoto[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{ requestId: string; photosStored: number } | null>(null);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const objectUrls = useRef(new Set<string>());
  const mounted = useRef(true);
  const wizardRef = useRef<HTMLFormElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  const submissionKey = useRef("");

  useEffect(() => {
    if (status === "success") {
      receiptRef.current?.focus({ preventScroll: true });
      receiptRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    } else if (previousStep.current !== step) {
      wizardRef.current?.focus({ preventScroll: true });
      wizardRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
    previousStep.current = step;
  }, [step, status]);

  useEffect(() => {
    mounted.current = true;
    submissionKey.current = crypto.randomUUID();
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (saved && typeof saved === "object") {
        if (typeof saved.requestKey === "string" && /^[a-zA-Z0-9_-]{32,64}$/.test(saved.requestKey)) submissionKey.current = saved.requestKey;
        const restored = { ...initialForm };
        for (const key of Object.keys(initialForm) as (keyof PropertyForm)[]) {
          if (typeof saved[key] === typeof initialForm[key]) Object.assign(restored, { [key]: saved[key] });
        }
        if (!["Casa", "Departamento", "Monoambiente"].includes(restored.type)) restored.type = "Departamento";
        if (!["BOB", "USD"].includes(restored.currency)) restored.currency = "BOB";
        startTransition(() => { setForm(restored); setDraftSaved(true); });
      }
    } catch { /* A stale draft must not block publication. */ }
    startTransition(() => setDraftReady(true));
    const urls = objectUrls.current;
    return () => { mounted.current = false; urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady || status === "success") return;
    const timer = window.setTimeout(() => {
      try {
        if (JSON.stringify(form) === JSON.stringify(initialForm)) return;
        localStorage.setItem(draftKey, JSON.stringify({...form,requestKey:submissionKey.current}));
        setDraftSaved(true);
      } catch { setDraftSaved(false); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [form, draftReady, status, draftKey]);

  const quality = useMemo(() => calculateQuality(form, photos), [form, photos]);
  const canContinue = canAdvanceStep(step, form, photos);
  const stepErrors = step === 1 || step === 2 ? getPublicationStepErrors(step, form, form.ownerName, form.phone) : {};

  function updateField<TKey extends keyof PropertyForm>(key: TKey, value: PropertyForm[TKey]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (status === "error") { setStatus("idle"); setMessage(""); }
  }

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    if (processingPhotos) return;
    const availableSlots = Math.max(0, maxUploadPhotos - photos.length);
    const selectedFiles = Array.from(event.target.files ?? []);
    const seen = new Set(photos.map(photo => `${photo.file.name}:${photo.file.size}:${photo.file.lastModified}`));
    const files = selectedFiles.filter(file => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > maxPhotoBytes) return false;
      seen.add(key); return true;
    }).slice(0, availableSlots);
    event.target.value = "";
    if (files.reduce((sum, file) => sum + file.size, photos.reduce((sum, photo) => sum + photo.file.size, 0)) > maxTotalPhotoBytes) {
      setMessage("El total de fotos no puede superar 60 MB."); setStatus("error"); return;
    }
    if (files.length !== selectedFiles.length) { setMessage("Se omitieron archivos repetidos o no compatibles. Máximo 15 fotos JPG, PNG o WebP de 10 MB cada una."); setStatus("error"); }
    else { setMessage(""); setStatus("idle"); }
    setProcessingPhotos(true);

    const pending = files.map((file) => ({
      id: createUploadId(file),
      file,
      url: URL.createObjectURL(file),
      category: "" as PhotoCategory,
      analysis: null,
      analyzing: true,
    }));

    setPhotos((current) => [...current, ...pending]);
    pending.forEach(photo => objectUrls.current.add(photo.url));
    // Decode one photo at a time to limit peak memory on older phones.
    for (const photo of pending) {
        const analysis = await analyzePhotoFile(photo.file, photo.url);
        if (!mounted.current || !objectUrls.current.has(photo.url)) {
          if (analysis.previewUrl) URL.revokeObjectURL(analysis.previewUrl);
          if (!mounted.current) return;
          continue;
        }
        const previewUrl = analysis.previewUrl || photo.url;
        if (previewUrl !== photo.url) {
          objectUrls.current.add(previewUrl);
          URL.revokeObjectURL(photo.url);
          objectUrls.current.delete(photo.url);
        }
        setPhotos((current) =>
          current.map((item) =>
            item.id === photo.id ? { ...item, url: previewUrl, analysis, analyzing: false } : item,
          ),
        );
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    setProcessingPhotos(false);
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const removed = current[index];
      if (removed) {
        URL.revokeObjectURL(removed.url);
        objectUrls.current.delete(removed.url);
      }
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  }

  function updatePhotoCategory(id: string, category: PhotoCategory) {
    setPhotos((current) =>
      current.map((photo) => (photo.id === id ? { ...photo, category } : photo)),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!acceptedTerms || status === "sending") {
      return;
    }
    const invalidStep = [0, 1, 2].find(index => !canAdvanceStep(index, form, photos));
    if (invalidStep !== undefined) {
      setStep(invalidStep); setStatus("error");
      setMessage(Object.values(getPublicationStepErrors(invalidStep, form, form.ownerName, form.phone)).join(" ") || "Revisa las fotos y sus categorías antes de enviar.");
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const payload = {
        details: form,
        operation: "Alquiler",
        propertyType: form.type === "Monoambiente" ? "Departamento" : form.type,
        publisherKind: "owner",
        ownerConfirmed: acceptedTerms,
        contactName: form.ownerName,
        whatsapp: form.phone,
        price: Number(form.price),
        currency: form.currency,
        exchangeRate: form.currency === "USD" ? parsePropertyExchangeRate(form.exchangeRate) : null,
        sourcePlatform: "owner_wizard",
        sourceText: buildSubmissionText(form, photos),
        notes: `Solicitud de publicación directa. Calidad ${quality.score}%.`,
        website: "",
        photoReport: photos.map((photo) => ({
          fileName: photo.file.name,
          category: photo.category,
          width: photo.analysis?.width ?? 0,
          height: photo.analysis?.height ?? 0,
          issues: [...(photo.analysis?.blockingIssues ?? []), ...(photo.analysis?.issues ?? [])],
        })),
      };
      const body = new FormData();
      body.append("payload", JSON.stringify(payload));
      photos.forEach((photo) => body.append("photos", photo.file, photo.file.name));
      if (!/^[a-zA-Z0-9_-]{32,64}$/.test(submissionKey.current)) submissionKey.current = crypto.randomUUID();

      const response = await fetch("/api/publication-requests", {
        method: "POST",
        headers: {"Idempotency-Key": submissionKey.current},
        body,
        signal: AbortSignal.timeout(120_000),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string; message?: string; fieldErrors?: PublicationFieldErrors; requestId?: string; photosStored?: number };

      if (response.status === 401) setSessionExpired(true);

      if (!response.ok || !data.ok || !data.requestId || data.photosStored !== photos.length) {
        const invalidField = Object.keys(data.fieldErrors ?? {})[0];
        if (invalidField) setStep(publicationFieldStep(invalidField));
        if (data.code === "INVALID_REQUEST_KEY") submissionKey.current = crypto.randomUUID();
        throw new Error(data.message ?? "No se pudo guardar la solicitud.");
      }

      setReceipt({ requestId: data.requestId, photosStored: data.photosStored });
      setStatus("success");
      try { localStorage.removeItem(draftKey); } catch { /* Submission already succeeded. */ }
      setMessage("Solicitud recibida. Revisaremos los datos antes de publicar la vivienda.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.name === "TimeoutError" ? "El envio tardo demasiado. Conservamos tus datos. Antes de reenviar, consulta a soporte si recibimos la solicitud." : error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    }
  }

  if (status === "success") {
    return (
      <div ref={receiptRef} tabIndex={-1} className="publication-receipt mx-auto max-w-2xl border border-neutral-300 bg-white p-6 sm:p-8" role="status">
        <span className="flex h-10 w-10 items-center justify-center bg-[#edf7f2] text-[#176b4d]">
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">Recibimos tu propiedad</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{message}</p>
        {receipt && <p className="mt-3 text-sm text-neutral-600">{receipt.photosStored} {receipt.photosStored === 1 ? "foto guardada" : "fotos guardadas"}. Referencia: <strong className="break-all">{receipt.requestId}</strong></p>}
        <div className="mt-6 border-t border-neutral-200 pt-5 text-sm text-neutral-600">
          <p className="font-semibold text-neutral-900">Siguiente paso</p>
          <p className="mt-1">Confirmaremos identidad, disponibilidad y fotos antes de activar la ficha.</p>
        </div>
        <Link href="/cliente/solicitudes" className="zu-button zu-button-primary mt-6">Ver mis solicitudes<ArrowRight size={17} /></Link>
      </div>
    );
  }

  return (
    <form ref={wizardRef} tabIndex={-1} onSubmit={submit} className="publish-wizard grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="border border-neutral-300 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
          <ol className="grid grid-cols-4 gap-2" aria-label="Progreso de publicación">
            {steps.map((label, index) => {
              const Icon = stepIcons[index];
              return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => index <= step && setStep(index)}
                  disabled={index > step}
                  aria-current={index === step ? "step" : undefined}
                  className={`w-full border-t-2 pt-2 text-left text-xs font-semibold ${
                    index <= step
                      ? "cursor-pointer border-[#176b4d] text-neutral-950"
                      : "cursor-default border-neutral-200 text-neutral-400"
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />{label}
                </button>
              </li>
            ); })}
          </ol>
        </div>

        <div className="p-4 sm:p-6">
          {sessionExpired && <div role="alert" className="publish-draft-notice"><span>Tu sesión venció. Los datos quedan guardados; tendrás que adjuntar las fotos nuevamente.</span><Link href="/login?next=%2Fpublicar">Volver a iniciar sesión</Link></div>}
          {draftSaved && <div className="publish-draft-notice"><span className="flex items-center gap-2"><Save size={14} />Datos guardados en este dispositivo. Las fotos deben volver a adjuntarse al recargar.</span><button type="button" onClick={() => { if (!window.confirm("¿Borrar los campos del borrador?")) return; try { localStorage.removeItem(draftKey); } catch {} setForm({ ...initialForm, ownerName: account.name, phone: account.phone }); setDraftSaved(false); setStep(0); }}>Borrar datos</button></div>}
          {step === 0 ? (
            <PhotoStep
              photos={photos}
              onPhotos={handlePhotos}
              onRemove={removePhoto}
              onCategoryChange={updatePhotoCategory}
              processing={processingPhotos}
              onCover={(id) => setPhotos(current => [...current.filter(photo => photo.id === id), ...current.filter(photo => photo.id !== id)])}
            />
          ) : null}

          {step === 1 ? <InformationStep form={form} updateField={updateField} /> : null}
          {step === 2 ? <PriceStep form={form} updateField={updateField} errors={stepErrors} /> : null}
          {step === 3 ? (
            <ConfirmationStep
              form={form}
              photosCount={photos.length}
              acceptedTerms={acceptedTerms}
              onAcceptedTermsChange={setAcceptedTerms}
            />
          ) : null}

          {message && status === "error" ? (
            <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {message}
            </p>
          ) : null}

          {step < steps.length - 1 && !canContinue ? (
            <div className="mt-5 text-sm font-medium text-neutral-600" aria-live="polite">
              {Object.keys(stepErrors).length ? (
                <ul className="list-disc space-y-1 pl-5">{Object.entries(stepErrors).map(([field, error]) => <li key={field}>{error}</li>)}</ul>
              ) : <p>Completa las fotos y sus categorías para continuar.</p>}
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-5">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || status === "sending"}
              className="inline-flex h-11 cursor-pointer items-center gap-2 px-2 text-sm font-semibold text-neutral-700 disabled:cursor-default disabled:opacity-0"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                disabled={!canContinue}
                className="inline-flex h-11 cursor-pointer items-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-[#176b4d] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Continuar
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!acceptedTerms || status === "sending"}
                className="inline-flex h-11 cursor-pointer items-center gap-2 bg-[#176b4d] px-5 text-sm font-semibold text-white hover:bg-[#10533b] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {status === "sending" ? "Enviando..." : "Enviar para revisión"}
                {status === "sending" ? <LoaderCircle className="zu-spin h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <QualityPanel quality={quality} />
    </form>
  );
}

function PhotoStep({
  photos,
  onPhotos,
  onRemove,
  onCategoryChange,
  processing,
  onCover,
}: {
  photos: UploadPhoto[];
  onPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onCategoryChange: (id: string, category: PhotoCategory) => void;
  processing: boolean;
  onCover: (id: string) => void;
}) {
  const analyzingCount = photos.filter((photo) => photo.analyzing).length;
  const warningCount = photos.filter(
    (photo) =>
      photo.analysis &&
      (photo.analysis.blockingIssues.length > 0 || photo.analysis.issues.length > 0),
  ).length;

  return (
    <section>
      <StepHeading
        title="Agrega fotos claras"
        copy="Muestra los ambientes principales. Elige una foto de portada y clasifica cada ambiente."
      />

      <label className="mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-neutral-400 bg-neutral-50 p-5 text-center hover:border-[#176b4d]">
        <ImagePlus className="h-6 w-6 text-[#176b4d]" aria-hidden="true" />
        <span className="mt-3 text-sm font-semibold text-neutral-900">Seleccionar fotos</span>
        <span className="mt-1 text-xs text-neutral-500">Mínimo {minUploadPhotos} y máximo {maxUploadPhotos} fotos. JPG, PNG o WebP, hasta {maxPhotoBytes / 1024 / 1024} MB por foto.</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={processing || photos.length >= maxUploadPhotos} onChange={onPhotos} className="sr-only" />
      </label>

      <p role="status" className="mt-3 text-sm text-neutral-600">
        {photos.length < minUploadPhotos
          ? `Falta${minUploadPhotos - photos.length === 1 ? "" : "n"} ${minUploadPhotos - photos.length} foto${minUploadPhotos - photos.length === 1 ? "" : "s"} para completar el mínimo obligatorio.`
          : `${photos.length} de ${maxUploadPhotos} fotos. Mínimo obligatorio completo.`}
      </p>

      {photos.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <div key={photo.id} className="border border-neutral-200 bg-white p-2">
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                {photo.analyzing ? <div className="zu-skeleton absolute inset-0" /> : <NextImage src={photo.url} alt={`Foto ${index + 1}`} fill unoptimized className="object-cover" />}
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center bg-white text-neutral-950"
                  aria-label={`Eliminar foto ${index + 1}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                {index === 0 ? (
                  <span className="absolute bottom-2 left-2 bg-white px-2 py-1 text-[11px] font-semibold">Portada</span>
                ) : <button type="button" className="photo-cover-button" onClick={() => onCover(photo.id)}>Usar como portada</button>}
              </div>
              <select
                value={photo.category}
                onChange={(event) => onCategoryChange(photo.id, event.target.value as PhotoCategory)}
                className="mt-2 h-10 w-full cursor-pointer border border-neutral-300 bg-white px-2 text-xs font-semibold text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus:border-[#176b4d]"
                aria-label={`Ambiente de la foto ${index + 1}`}
              >
                <option value="">¿Qué ambiente muestra?</option>
                {photoCategories.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
              <PhotoAnalysisStatus photo={photo} />
            </div>
          ))}
        </div>
      ) : null}

      {photos.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border border-neutral-200 bg-neutral-50 p-3 text-xs font-semibold text-neutral-700">
          <span>{photos.length}/{maxUploadPhotos} fotos</span>
          <span>{photos.filter((photo) => photo.category).length} clasificadas</span>
          {analyzingCount > 0 ? <span>{analyzingCount} analizando</span> : null}
          {warningCount > 0 ? <span className="text-amber-700">{warningCount} con observaciones</span> : null}
        </div>
      ) : null}
    </section>
  );
}

function PhotoAnalysisStatus({ photo }: { photo: UploadPhoto }) {
  if (photo.analyzing || !photo.analysis) {
    return (
      <p className="mt-2 flex items-center gap-2 text-xs font-medium text-neutral-500">
        <LoaderCircle className="h-3.5 w-3.5 zu-spin" aria-hidden="true" />
        Revisando resolución, luz y nitidez...
      </p>
    );
  }

  const issues = [...photo.analysis.blockingIssues, ...photo.analysis.issues];

  if (issues.length === 0) {
    return (
      <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#176b4d]">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Foto apta · {photo.analysis.width} × {photo.analysis.height}px
      </p>
    );
  }

  return (
    <div className="mt-2 text-xs text-amber-800">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Revisar foto
      </p>
      <p className="mt-1 leading-5">{issues[0]}</p>
    </div>
  );
}

function InformationStep({
  form,
  updateField,
}: {
  form: PropertyForm;
  updateField: <TKey extends keyof PropertyForm>(key: TKey, value: PropertyForm[TKey]) => void;
}) {
  return (
    <section>
      <StepHeading title="Describe la vivienda" copy="Solo pedimos los datos necesarios para filtrar y decidir." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Título" className="sm:col-span-2" icon={<Home className="h-4 w-4" />}>
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Ej. Departamento de 2 dormitorios en Urbari" className={inputClassName} />
        </Field>
        <Field label="Tipo de vivienda">
          <select
            value={form.type}
            onChange={(event) => {
              const value = event.target.value as PropertyForm["type"];
              updateField("type", value);
              if (value === "Monoambiente") {
                updateField("bedrooms", "1");
              }
            }}
            className={inputClassName}
          >
            <option value="Departamento">Departamento</option>
            <option value="Monoambiente">Monoambiente</option>
            <option value="Casa">Casa</option>
          </select>
        </Field>
        <Field label="Zona" icon={<MapPin className="h-4 w-4" />}>
          <input value={form.zone} onChange={(event) => updateField("zone", event.target.value)} placeholder="Ej. Urbari" className={inputClassName} />
        </Field>
        <Field label="Dirección aproximada" className="sm:col-span-2">
          <input value={form.address} onChange={(event) => updateField("address", event.target.value)} placeholder="Avenida, calle o referencia" className={inputClassName} />
        </Field>
        <Field label="Dormitorios">
          <input value={form.bedrooms} onChange={(event) => updateField("bedrooms", event.target.value)} type="number" min="0" inputMode="numeric" className={inputClassName} />
        </Field>
        <Field label="Baños (opcional)" icon={<Bath className="h-4 w-4" />}>
          <input value={form.bathrooms} onChange={(event) => updateField("bathrooms", event.target.value)} type="number" min="0" inputMode="numeric" placeholder="Consultar" className={inputClassName} />
        </Field>
        <Field label="Parqueos">
          <input value={form.garage} onChange={(event) => updateField("garage", event.target.value)} type="number" min="0" inputMode="numeric" className={inputClassName} />
        </Field>
        <Field label="Superficie (m², opcional)" icon={<Ruler className="h-4 w-4" />}>
          <input value={form.area} onChange={(event) => updateField("area", event.target.value)} type="number" min="0" inputMode="numeric" className={inputClassName} />
        </Field>
        <div className="flex flex-wrap gap-x-5 gap-y-3 border-y border-neutral-200 py-4 sm:col-span-2">
          <SimpleCheckbox checked={form.pets} onChange={(value) => updateField("pets", value)} label="Acepta mascotas" />
          <SimpleCheckbox checked={form.furnished} onChange={(value) => updateField("furnished", value)} label="Amoblado" />
          <SimpleCheckbox checked={form.security} onChange={(value) => updateField("security", value)} label="Seguridad" />
          <SimpleCheckbox checked={form.pool} onChange={(value) => updateField("pool", value)} label="Piscina" />
          <SimpleCheckbox checked={form.patio} onChange={(value) => updateField("patio", value)} label="Patio o balcón" />
          <SimpleCheckbox checked={form.grill} onChange={(value) => updateField("grill", value)} label="Churrasquera" />
          <SimpleCheckbox checked={form.elevator} onChange={(value) => updateField("elevator", value)} label="Ascensor" />
        </div>
        <Field label="Descripción" className="sm:col-span-2">
          <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={5} placeholder="Distribución, estado, servicios y condiciones relevantes." className={`${inputClassName} h-auto resize-y py-3`} />
        </Field>
      </div>
    </section>
  );
}

function PriceStep({
  form,
  updateField,
  errors,
}: {
  form: PropertyForm;
  updateField: <TKey extends keyof PropertyForm>(key: TKey, value: PropertyForm[TKey]) => void;
  errors: PublicationFieldErrors;
}) {
  return (
    <section>
      <StepHeading title="Define el costo real" copy="El inquilino verá el alquiler mensual y cuánto necesita para ingresar." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Alquiler mensual" icon={<CircleDollarSign className="h-4 w-4" />}>
          <input value={form.price} onChange={(event) => updateField("price", event.target.value)} type="number" min="0" inputMode="numeric" placeholder="0" className={inputClassName} />
        </Field>
        <Field label="Moneda">
          <select value={form.currency} onChange={(event) => updateField("currency", event.target.value as PropertyForm["currency"])} className={inputClassName}>
            <option value="BOB">Bolivianos (Bs)</option>
            <option value="USD">Dólares ($us)</option>
          </select>
        </Field>
        <Field label="Expensas mensuales">
          <input value={form.commonExpenses} onChange={(event) => updateField("commonExpenses", event.target.value)} type="number" min="0" max="1000000" step="any" inputMode="decimal" required aria-invalid={Boolean(errors.commonExpenses)} aria-describedby="publication-expenses-help" className={inputClassName} />
          <span id="publication-expenses-help" className="text-xs text-neutral-600">Escribe 0 si están incluidas o no se cobran.</span>
        </Field>
        {form.currency === "USD" && <Field label="Tipo de cambio (Bs por USD)">
          <input value={form.exchangeRate} onChange={event => updateField("exchangeRate", event.target.value)} type="number" min="0.0001" max={maxPropertyExchangeRate} step="0.0001" inputMode="decimal" required className={inputClassName} />
          <span className="exchange-rate-note">1 USD = {form.exchangeRate || "..."} Bs para este alquiler.</span>
        </Field>}
        <Field label="Garantía">
          <select value={form.guarantee} onChange={(event) => updateField("guarantee", event.target.value)} className={inputClassName}>
            <option value="">Seleccionar</option>
            <option value="Sin garantía">Sin garantía</option>
            <option value="1 mes de alquiler">1 mes de alquiler</option>
            <option value="2 meses de alquiler">2 meses de alquiler</option>
            <option value="Otro monto">Otro monto</option>
          </select>
        </Field>
        {form.guarantee === "Otro monto" && <Field label="Monto de la garantía"><input type="number" min="0" inputMode="decimal" value={form.guaranteeAmount} onChange={event => updateField("guaranteeAmount", event.target.value)} className={inputClassName} /></Field>}
        <Field label="Nombre del propietario" icon={<ShieldCheck className="h-4 w-4" />}>
          <input value={form.ownerName} onChange={(event) => updateField("ownerName", event.target.value)} autoComplete="name" placeholder="Nombre completo" className={inputClassName} />
        </Field>
        <Field label="WhatsApp" icon={<Phone className="h-4 w-4" />}>
          <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="Ej. 78504969" required aria-invalid={Boolean(errors.whatsapp)} aria-describedby="publication-phone-help" className={inputClassName} />
          <span id="publication-phone-help" className="text-xs text-neutral-600">8 dígitos que empiecen por 6 o 7. Puedes agregar +591.</span>
        </Field>
      </div>
      <CostSummary form={form} />
    </section>
  );
}

function ConfirmationStep({
  form,
  photosCount,
  acceptedTerms,
  onAcceptedTermsChange,
}: {
  form: PropertyForm;
  photosCount: number;
  acceptedTerms: boolean;
  onAcceptedTermsChange: (value: boolean) => void;
}) {
  const symbol = form.currency === "BOB" ? "Bs" : "$us";
  return (
    <section>
      <StepHeading title="Revisa antes de enviar" copy="Zentro Urbano verificará identidad y disponibilidad antes de publicar." />
      <dl className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
        <SummaryRow label="Contrato" value="Alquiler directo con el propietario" />
        <SummaryRow label="Propiedad" value={form.title || "Sin título"} />
        <SummaryRow label="Ubicación" value={[form.zone, form.address].filter(Boolean).join(" · ") || "Sin ubicación"} />
        <SummaryRow label="Alquiler" value={form.price ? `${symbol} ${form.price}/mes` : "Sin precio"} />
        {form.currency === "USD" && <SummaryRow label="Tipo de cambio" value={`1 USD = ${form.exchangeRate} Bs`} />}
        <SummaryRow label="Garantía" value={form.guarantee === "Otro monto" ? `${symbol} ${form.guaranteeAmount}` : form.guarantee || "No indicada"} />
        <SummaryRow label="Fotos" value={`${photosCount} cargadas`} />
        <SummaryRow label="Contacto" value={form.phone || "Sin WhatsApp"} />
      </dl>
      <CostSummary form={form} />
      <label className="mt-6 flex cursor-pointer items-start gap-3 border border-neutral-300 p-4">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => onAcceptedTermsChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#176b4d]" />
        <span className="text-sm leading-6 text-neutral-700">
          Confirmo que soy propietario, que el contrato de alquiler será directo conmigo y que no cobro comisión de intermediación. La información es correcta.
        </span>
      </label>
    </section>
  );
}

function QualityPanel({ quality }: { quality: ReturnType<typeof calculateQuality> }) {
  return (
    <aside className="border border-neutral-300 bg-white p-5 lg:sticky lg:top-24">
      <p className="text-sm font-semibold text-neutral-950">Calidad del anuncio</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className="text-3xl font-semibold tracking-tight">{quality.score}%</strong>
        <span className="text-xs font-semibold text-neutral-500">{quality.score >= 80 ? "Buena" : "Incompleta"}</span>
      </div>
      <div className="mt-3 h-2 bg-neutral-100" role="progressbar" aria-label="Calidad del anuncio" aria-valuenow={quality.score} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-[#176b4d] transition-[width]" style={{ width: `${quality.score}%` }} />
      </div>
      {quality.missing.length > 0 ? (
        <div className="mt-5 border-t border-neutral-200 pt-4">
          <p className="text-xs font-semibold uppercase text-neutral-500">Falta</p>
          <ul className="mt-3 grid gap-2">
            {quality.missing.slice(0, 5).map((item) => (
              <li key={item} className="flex gap-2 text-sm text-neutral-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 border-t border-neutral-200 pt-4 text-sm text-[#176b4d]">El anuncio tiene la información principal completa.</p>
      )}
    </aside>
  );
}

function StepHeading({ title, copy }: { title: string; copy: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-neutral-600">{copy}</p>
    </div>
  );
}

function Field({ label, icon, children, className = "" }: { label: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
        {icon ? <span className="text-neutral-400" aria-hidden="true">{icon}</span> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

function SimpleCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#176b4d]" />
      {label}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-4 py-3 text-sm">
      <dt className="font-medium text-neutral-500">{label}</dt>
      <dd className="font-semibold text-neutral-900">{value}</dd>
    </div>
  );
}

function calculateQuality(form: PropertyForm, photos: UploadPhoto[]) {
  const categorizedPhotos = photos.filter((photo) => photo.category);
  const technicallyValidPhotos = photos.filter(
    (photo) => photo.analysis && isPhotoTechnicallyValid(photo.analysis),
  );
  const hasBathroomPhoto = photos.some((photo) => photo.category === "bathroom");
  const hasBedroomPhoto =
    form.type === "Monoambiente" || photos.some((photo) => photo.category === "bedroom");
  const rules = [
    { complete: photos.length >= minUploadPhotos, points: 15, missing: `Agregar al menos ${minUploadPhotos} fotos` },
    { complete: photos.length > 0 && categorizedPhotos.length === photos.length, points: 10, missing: "Clasificar todas las fotos" },
    { complete: hasBathroomPhoto, points: 8, missing: "Agregar y clasificar una foto del baño" },
    { complete: hasBedroomPhoto, points: 5, missing: "Agregar una foto de dormitorio" },
    { complete: photos.length > 0 && technicallyValidPhotos.length / photos.length >= 0.8, points: 7, missing: "Reemplazar fotos oscuras, borrosas o pequeñas" },
    { complete: form.title.trim().length >= 15, points: 7, missing: "Escribir un título claro" },
    { complete: Boolean(form.zone.trim() && form.address.trim()), points: 8, missing: "Completar zona y referencia" },
    { complete: Number(form.bedrooms) > 0 && Number(form.bathrooms) > 0, points: 8, missing: "Indicar dormitorios y baños" },
    { complete: Number(form.area) > 0, points: 5, missing: "Agregar superficie" },
    { complete: form.description.trim().length >= 60, points: 7, missing: "Describir distribución y servicios" },
    { complete: Number(form.price) > 0, points: 10, missing: "Indicar precio mensual" },
    { complete: Boolean(form.guarantee), points: 5, missing: "Indicar garantía" },
    { complete: Boolean(form.ownerName.trim() && normalizePublicationPhone(form.phone)), points: 5, missing: "Completar propietario y WhatsApp" },
  ];

  return {
    score: rules.reduce((total, rule) => total + (rule.complete ? rule.points : 0), 0),
    missing: rules.filter((rule) => !rule.complete).map((rule) => rule.missing),
  };
}

function canAdvanceStep(step: number, form: PropertyForm, photos: UploadPhoto[]) {
  if (step === 0) {
    return (
      photos.length >= minUploadPhotos && photos.length <= maxUploadPhotos &&
      photos.every((photo) => !photo.analyzing && photo.category) &&
      photos.every((photo) => (photo.analysis?.blockingIssues.length ?? 1) === 0)
    );
  }

  if (step === 1 || step === 2) {
    return Object.keys(getPublicationStepErrors(step, form, form.ownerName, form.phone)).length === 0;
  }

  return true;
}

function buildSubmissionText(form: PropertyForm, photos: UploadPhoto[]) {
  return [
    "Solicitud de publicación directa en Zentro Urbano",
    `Propietario: ${form.ownerName}`,
    `WhatsApp: ${form.phone}`,
    `Título: ${form.title}`,
    `Tipo: ${form.type}`,
    `Zona: ${form.zone}`,
    `Dirección: ${form.address}`,
    `Dormitorios: ${form.bedrooms}`,
    `Baños: ${form.bathrooms || "Consultar"}`,
    `Parqueos: ${form.garage}`,
    `Superficie: ${form.area} m2`,
    `Mascotas: ${form.pets ? "Sí" : "No"}`,
    `Amoblado: ${form.furnished ? "Sí" : "No"}`,
    `Seguridad: ${form.security ? "Sí" : "No"}`,
    `Piscina: ${form.pool ? "Sí" : "No"}`,
    `Patio o balcón: ${form.patio ? "Sí" : "No"}`,
    `Churrasquera: ${form.grill ? "Sí" : "No"}`,
    `Ascensor: ${form.elevator ? "Sí" : "No"}`,
    `Precio: ${form.currency} ${form.price}`,
    ...(form.currency === "USD" ? [`Tipo de cambio del propietario: 1 USD = ${form.exchangeRate} Bs`] : []),
    `Expensas: ${form.currency} ${form.commonExpenses}`,
    `Garantía: ${form.guarantee === "Otro monto" ? `${form.currency} ${form.guaranteeAmount}` : form.guarantee}`,
    `Descripción: ${form.description}`,
    `Fotos seleccionadas: ${photos.map((photo) => `${photo.file.name} [${photo.category || "sin clasificar"}]`).join(", ") || "Ninguna"}`,
  ].join("\n");
}

const inputClassName =
  "h-11 w-full border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 placeholder:text-neutral-400 focus:border-[#176b4d]";

function createUploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function CostSummary({ form }: { form: PropertyForm }) {
  const costs = getPublicationCosts(form);
  const format = (value: number | null) => value === null ? "Por definir" : `${form.currency === "BOB" ? "Bs" : "$us"} ${value.toLocaleString("es-BO")}`;
  return <div className="monthly-summary" aria-live="polite"><div><span>Mensual, incluidas expensas</span><strong>{format(costs.monthly)}</strong></div><div><span>Ingreso: primer mes + expensas + garantía</span><strong>{format(costs.entry)}</strong></div><div><span>Comisión de intermediación</span><strong>Sin comisión</strong></div></div>;
}
