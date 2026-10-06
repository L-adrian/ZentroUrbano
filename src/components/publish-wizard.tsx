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
import type { ChangeEvent, ReactNode } from "react";
import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { BeforeVisitFields, type BeforeVisitFormValue } from "@/components/before-visit-fields";
import { beforeVisitRows, includedServiceOptions, noServicesValue, parseBeforeVisitInput } from "@/lib/before-visit";
import { advanceRentMonths, getPublicationCosts } from "@/lib/publication-costs";
import { expensesModes, getPublicationStepErrors, normalizePublicationPhone, petsPolicies, publicationFieldStep, type ExpensesMode, type PetsPolicy, type PublicationFieldErrors } from "@/lib/publication-input";
import { minUploadPhotos, maxUploadPhotos, maxTotalPhotoBytes } from "@/lib/photo-upload-limits";
import { maxSelectedPhotoBytes, uploadMaxSide } from "@/lib/photo-resize";
import { currencyExchangeRateBobPerUsd, maxPropertyExchangeRate, parseCurrencyAmount, parsePropertyExchangeRate } from "@/lib/currency";
import {
  isPhotoTechnicallyValid,
  photoCategories,
  preparePhotoFile,
  type PhotoAnalysis,
  type PhotoCategory,
} from "@/lib/photo-quality";
import {
  clearDraftPhotos,
  deleteDraftPhotoFiles,
  draftPhotosAvailable,
  loadDraftPhotos,
  saveDraftPhotoFiles,
  saveDraftPhotoList,
} from "@/lib/photo-draft-store";
import { validPhotoCategory, type PrefillPhoto, type PublishPrefill } from "@/lib/publish-prefill";

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
  petsPolicy: PetsPolicy;
  furnished: boolean;
  security: boolean;
  pool: boolean;
  patio: boolean;
  grill: boolean;
  elevator: boolean;
  price: string;
  currency: "BOB" | "USD";
  exchangeRate: string;
  expensesMode: ExpensesMode | "";
  commonExpenses: string;
  guarantee: string;
  guaranteeAmount: string;
  description: string;
} & BeforeVisitFormValue;

type UploadPhoto = {
  id: string;
  // Name, size and date of the file the owner picked, to skip picking it twice.
  sourceKey: string;
  // What is sent: the lighter copy made in the browser, or the original if it could not be made.
  file: File;
  preview: Blob | null;
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
  petsPolicy: "consult",
  furnished: false,
  security: false,
  pool: false,
  patio: false,
  grill: false,
  elevator: false,
  price: "",
  currency: "BOB",
  exchangeRate: String(currencyExchangeRateBobPerUsd),
  expensesMode: "",
  commonExpenses: "",
  guarantee: "",
  guaranteeAmount: "",
  description: "",
  availableFrom: "",
  minContractMonths: "",
  advanceMonths: "",
  includedServices: [],
};

const petsOptions: Array<[PetsPolicy, string]> = [["allowed", "Sí"], ["not_allowed", "No"], ["consult", "A consultar"]];
const petsLabels: Record<PetsPolicy, string> = { allowed: "Sí acepta", not_allowed: "No acepta", consult: "A consultar" };
const expensesLabels: Record<PropertyForm["expensesMode"], string> = { "": "Sin indicar", included: "Incluidas en el alquiler", none: "No se cobran", separate: "Se pagan aparte", consult: "Pendiente de consulta" };
const serviceValues = new Set<string>([...includedServiceOptions.map(([key]) => key), noServicesValue]);

// The server accepts older forms without the expenses question; this form always asks it.
function wizardStepErrors(step: number, form: PropertyForm): PublicationFieldErrors {
  const errors = getPublicationStepErrors(step, form, form.ownerName, form.phone);
  if (step === 2 && !form.expensesMode) return { ...errors, commonExpenses: "Elige si las expensas están incluidas, no se cobran o se pagan aparte." };
  return errors;
}

// A saved draft or data loaded from Mi cuenta: only known fields with the right type are used.
function restoreForm(saved: Record<string, unknown>, base: PropertyForm): PropertyForm {
  const restored = { ...base };
  for (const key of Object.keys(initialForm) as (keyof PropertyForm)[]) {
    if (key === "includedServices") continue;
    if (typeof saved[key] === typeof initialForm[key]) Object.assign(restored, { [key]: saved[key] });
  }
  if (Array.isArray(saved.includedServices)) {
    restored.includedServices = saved.includedServices.filter((item): item is string => typeof item === "string" && serviceValues.has(item));
  }
  if (!["Casa", "Departamento", "Monoambiente"].includes(restored.type)) restored.type = "Departamento";
  if (!["BOB", "USD"].includes(restored.currency)) restored.currency = "BOB";
  // Drafts saved before the pets and expenses questions keep what the owner had answered.
  if (!(petsPolicies as readonly string[]).includes(restored.petsPolicy) || typeof saved.petsPolicy !== "string") restored.petsPolicy = restored.pets ? "allowed" : "consult";
  restored.pets = restored.petsPolicy === "allowed";
  if (!(expensesModes as readonly string[]).includes(restored.expensesMode)) restored.expensesMode = (parseCurrencyAmount(restored.commonExpenses) ?? 0) > 0 ? "separate" : "";
  return restored;
}

type SendResult = { status: number; data: { ok?: boolean; code?: string; message?: string; fieldErrors?: PublicationFieldErrors; requestId?: string; photosStored?: number } };

// XMLHttpRequest instead of fetch: it reports how much of the upload has been sent.
function sendPublication(body: FormData, key: string, onProgress: (fraction: number) => void) {
  return new Promise<SendResult>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/publication-requests");
    request.setRequestHeader("Idempotency-Key", key);
    request.timeout = 120_000;
    request.upload.onprogress = (event) => { if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total); };
    request.onload = () => {
      let data: SendResult["data"] = {};
      try { data = JSON.parse(request.responseText); } catch { /* An empty or HTML answer is handled as an error below. */ }
      resolve({ status: request.status, data });
    };
    request.onerror = () => reject(new Error("No se pudo conectar. Conservamos tus datos y fotos; revisa tu conexión e intenta nuevamente."));
    request.ontimeout = () => { const error = new Error("timeout"); error.name = "TimeoutError"; reject(error); };
    request.send(body);
  });
}

export function PublishWizard({ account, prefill }: { account: { id: string; name: string; phone: string }; prefill?: PublishPrefill }) {
  // A form opened from Mi cuenta has its own draft, so it never overwrites the regular one.
  const draftKey = `zu-publication-draft-v2:${account.id}${prefill ? `:${prefill.id}` : ""}`;
  const [step, setStep] = useState(0);
  // The furthest step the owner has opened, so they can jump back to it after fixing an earlier one.
  const [furthestStep, setFurthestStep] = useState(0);
  const [form, setForm] = useState<PropertyForm>(() => ({ ...initialForm, ownerName: account.name, phone: account.phone }));
  const [sessionExpired, setSessionExpired] = useState(false);
  const [photos, setPhotos] = useState<UploadPhoto[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{ requestId: string; photosStored: number } | null>(null);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [photosReady, setPhotosReady] = useState(false);
  const [photoStorage, setPhotoStorage] = useState(false);
  const objectUrls = useRef(new Set<string>());
  const persistedPhotos = useRef(new Set<string>());
  const mounted = useRef(true);
  const wizardRef = useRef<HTMLFormElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  const submissionKey = useRef("");
  const restoreRun = useRef(0);

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

  // Photos saved in this browser come back first; a correction without them loads what was sent.
  const restorePhotos = useEffectEvent(async (run: number) => {
    const stored = await loadDraftPhotos(draftKey);
    // Only the latest run restores, so photos are never added twice.
    if (!mounted.current || restoreRun.current !== run) return;
    if (stored.length > 0) {
      const restored = stored.slice(0, maxUploadPhotos).map((photo): UploadPhoto => {
        const url = URL.createObjectURL(photo.preview ?? photo.file);
        objectUrls.current.add(url);
        persistedPhotos.current.add(photo.id);
        const file = photo.file instanceof File ? photo.file : new File([photo.file], photo.name, { type: photo.type });
        const analyzed = Boolean(photo.analysis);
        return { id: photo.id, sourceKey: photo.sourceKey, file, preview: photo.preview, url, category: validPhotoCategory(photo.category) as PhotoCategory, analysis: photo.analysis, analyzing: !analyzed };
      });
      setPhotos(restored);
      setPhotosReady(true);
      // A photo saved before its check finished is checked again.
      const unchecked = restored.filter((photo) => photo.analyzing);
      for (const photo of unchecked) await finishPhoto(photo, photo.file);
      return;
    }
    setPhotosReady(true);
    if (prefill?.photos.length) await loadPrefillPhotos(prefill.photos);
  });

  useEffect(() => {
    mounted.current = true;
    submissionKey.current = crypto.randomUUID();
    let restoredDraft = false;
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (saved && typeof saved === "object") {
        if (typeof saved.requestKey === "string" && /^[a-zA-Z0-9_-]{32,64}$/.test(saved.requestKey)) submissionKey.current = saved.requestKey;
        const restored = restoreForm(saved, initialForm);
        restoredDraft = true;
        startTransition(() => { setForm(restored); setDraftSaved(true); });
      }
    } catch { /* A stale draft must not block publication. */ }
    if (!restoredDraft && prefill) {
      const restored = restoreForm(prefill.form, { ...initialForm, ownerName: account.name, phone: account.phone });
      startTransition(() => setForm(restored));
    }
    startTransition(() => setDraftReady(true));
    void draftPhotosAvailable().then((available) => { if (mounted.current) setPhotoStorage(available); });
    void restorePhotos(++restoreRun.current);
    const urls = objectUrls.current;
    return () => { mounted.current = false; urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, [draftKey, prefill, account.name, account.phone]);

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

  // Each photo's bytes are stored once; the list with order and room labels on every change.
  useEffect(() => {
    if (!photosReady || !photoStorage || status === "success") return;
    const timer = window.setTimeout(() => {
      const ready = photos.filter((photo) => !photo.analyzing);
      const added = ready.filter((photo) => !persistedPhotos.current.has(photo.id));
      const removed = Array.from(persistedPhotos.current).filter((id) => !photos.some((photo) => photo.id === id));
      void (async () => {
        if (await saveDraftPhotoFiles(draftKey, added.map((photo) => ({ id: photo.id, file: photo.file, preview: photo.preview })))) {
          added.forEach((photo) => persistedPhotos.current.add(photo.id));
        }
        await saveDraftPhotoList(draftKey, ready.filter((photo) => persistedPhotos.current.has(photo.id)).map((photo) => ({
          id: photo.id,
          sourceKey: photo.sourceKey,
          name: photo.file.name,
          type: photo.file.type,
          category: photo.category,
          analysis: photo.analysis ? { ...photo.analysis, previewUrl: undefined } : null,
        })));
        await deleteDraftPhotoFiles(draftKey, removed);
        removed.forEach((id) => persistedPhotos.current.delete(id));
      })();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [photos, photosReady, photoStorage, status, draftKey]);

  const quality = useMemo(() => calculateQuality(form, photos), [form, photos]);
  const canContinue = canAdvanceStep(step, form, photos);
  // A step can be opened when every step before it is complete; nothing typed is lost on the way.
  const firstIncompleteStep = [0, 1, 2].find((index) => !canAdvanceStep(index, form, photos)) ?? steps.length - 1;
  const canOpenStep = (index: number) => index <= firstIncompleteStep;

  function goToStep(index: number) {
    if (index === step || status === "sending" || !canOpenStep(index)) return;
    setStep(index);
    setFurthestStep((current) => Math.max(current, index));
  }
  const stepErrors = step === 1 || step === 2 ? wizardStepErrors(step, form) : {};

  function updateField<TKey extends keyof PropertyForm>(key: TKey, value: PropertyForm[TKey]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (status === "error") { setStatus("idle"); setMessage(""); }
  }

  // Checks one photo and swaps in its lighter copy and thumbnail.
  async function finishPhoto(photo: UploadPhoto, source: File) {
    const prepared = await preparePhotoFile(source);
    if (!mounted.current || !objectUrls.current.has(photo.url)) return;
    const previewUrl = prepared.preview ? URL.createObjectURL(prepared.preview) : photo.url;
    if (previewUrl !== photo.url) {
      objectUrls.current.add(previewUrl);
      URL.revokeObjectURL(photo.url);
      objectUrls.current.delete(photo.url);
    }
    setPhotos((current) =>
      current.map((item) =>
        item.id === photo.id ? { ...item, file: prepared.file, preview: prepared.preview, url: previewUrl, analysis: prepared.analysis, analyzing: false } : item,
      ),
    );
  }

  async function addFiles(selectedFiles: File[], categories: string[] = [], label = "Preparando fotos") {
    const availableSlots = Math.max(0, maxUploadPhotos - photos.length);
    const seen = new Set(photos.map(photo => photo.sourceKey));
    const accepted = selectedFiles.flatMap((file, index) => {
      const sourceKey = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(sourceKey) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > maxSelectedPhotoBytes) return [];
      seen.add(sourceKey);
      return [{ file, sourceKey, category: validPhotoCategory(categories[index]) as PhotoCategory }];
    }).slice(0, availableSlots);
    if (accepted.length !== selectedFiles.length) { setMessage(`Se omitieron archivos repetidos o no compatibles. Máximo ${maxUploadPhotos} fotos JPG, PNG o WebP de hasta 30 MB cada una.`); setStatus("error"); }
    else { setMessage(""); setStatus("idle"); }
    if (!accepted.length) return;
    setProcessingPhotos(true);
    setPhotoProgress({ done: 0, total: accepted.length, label });

    const pending = accepted.map(({ file, sourceKey, category }): UploadPhoto => ({
      id: createUploadId(file),
      sourceKey,
      file,
      preview: null,
      url: URL.createObjectURL(file),
      category,
      analysis: null,
      analyzing: true,
    }));

    setPhotos((current) => [...current, ...pending]);
    pending.forEach(photo => objectUrls.current.add(photo.url));
    // One photo at a time limits peak memory on older phones.
    for (const [index, photo] of pending.entries()) {
      await finishPhoto(photo, photo.file);
      if (!mounted.current) return;
      setPhotoProgress({ done: index + 1, total: pending.length, label });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    setProcessingPhotos(false);
    setPhotoProgress(null);
  }

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    if (processingPhotos) return;
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    await addFiles(selectedFiles);
  }

  // "Corregir y reenviar": the photos already sent come back from the server with their rooms.
  async function loadPrefillPhotos(list: PrefillPhoto[]) {
    setProcessingPhotos(true);
    setPhotoProgress({ done: 0, total: list.length, label: "Cargando las fotos que enviaste" });
    const files: File[] = [];
    const categories: string[] = [];
    for (const [index, photo] of list.entries()) {
      try {
        const response = await fetch(photo.url, { credentials: "same-origin" });
        if (!response.ok) continue;
        const blob = await response.blob();
        files.push(new File([blob], photo.name, { type: blob.type || "image/jpeg", lastModified: index + 1 }));
        categories.push(photo.category);
      } catch { /* A photo that cannot be read is chosen again by the owner. */ }
      if (!mounted.current) return;
      setPhotoProgress({ done: index + 1, total: list.length, label: "Cargando las fotos que enviaste" });
    }
    setProcessingPhotos(false);
    setPhotoProgress(null);
    await addFiles(files, categories, "Revisando las fotos");
    // After addFiles, which clears the message when every photo it got is fine.
    if (mounted.current && files.length < list.length) { setMessage("Algunas fotos no se pudieron cargar. Agrégalas de nuevo."); setStatus("error"); }
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

  function clearDraft() {
    if (!window.confirm("¿Borrar los datos y las fotos de este borrador?")) return;
    try { localStorage.removeItem(draftKey); } catch {}
    void clearDraftPhotos(draftKey);
    persistedPhotos.current.clear();
    photos.forEach((photo) => { URL.revokeObjectURL(photo.url); objectUrls.current.delete(photo.url); });
    setPhotos([]);
    setForm({ ...initialForm, ownerName: account.name, phone: account.phone });
    setDraftSaved(false);
    setAcceptedTerms(false);
    setStep(0);
    setFurthestStep(0);
  }

  // Sent only by the "Enviar" button on the last step. The form never submits on its own (Enter
  // in a field, or a button that changes under the pointer), so nothing is sent by accident.
  async function sendRequest() {
    if (step !== steps.length - 1 || !acceptedTerms || status === "sending") {
      return;
    }
    const invalidStep = [0, 1, 2].find(index => !canAdvanceStep(index, form, photos));
    if (invalidStep !== undefined) {
      setStep(invalidStep); setStatus("error");
      setMessage(Object.values(wizardStepErrors(invalidStep, form)).join(" ") || "Revisa las fotos y sus categorías antes de enviar.");
      return;
    }
    if (photos.reduce((sum, photo) => sum + photo.file.size, 0) > maxTotalPhotoBytes) {
      setStatus("error");
      setMessage("Las fotos pesan más de 60 MB en total. Quita alguna o elige fotos más livianas.");
      return;
    }

    setStatus("sending");
    setMessage("");
    setUploadProgress(0);

    try {
      const payload = {
        details: form,
        operation: "Alquiler",
        propertyType: form.type === "Monoambiente" ? "Departamento" : form.type,
        publisherKind: "owner",
        ownerConfirmed: acceptedTerms,
        contactName: form.ownerName,
        whatsapp: form.phone,
        price: parseCurrencyAmount(form.price),
        currency: form.currency,
        exchangeRate: form.currency === "USD" ? parsePropertyExchangeRate(form.exchangeRate) : null,
        sourcePlatform: "owner_wizard",
        sourceText: buildSubmissionText(form, photos),
        notes: `Solicitud de publicación directa. Calidad ${quality.score}%.`,
        website: "",
        ...(prefill?.kind === "correction" && prefill.requestId ? { correctionOf: prefill.requestId } : {}),
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

      const { status: responseStatus, data } = await sendPublication(body, submissionKey.current, (fraction) => setUploadProgress(Math.round(fraction * 100)));

      if (responseStatus === 401) setSessionExpired(true);

      if (responseStatus < 200 || responseStatus >= 300 || !data.ok || !data.requestId || data.photosStored !== photos.length) {
        const invalidField = Object.keys(data.fieldErrors ?? {})[0];
        if (invalidField) setStep(publicationFieldStep(invalidField));
        if (data.code === "INVALID_REQUEST_KEY") submissionKey.current = crypto.randomUUID();
        throw new Error(data.message ?? "No se pudo guardar la solicitud.");
      }

      setReceipt({ requestId: data.requestId, photosStored: data.photosStored });
      setStatus("success");
      try { localStorage.removeItem(draftKey); } catch { /* Submission already succeeded. */ }
      void clearDraftPhotos(draftKey);
      setMessage(prefill?.kind === "correction"
        ? "Recibimos tu corrección. La revisaremos antes de publicar la vivienda."
        : "Solicitud recibida. Revisaremos los datos antes de publicar la vivienda.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.name === "TimeoutError" ? "El envío tardó demasiado. Conservamos tus datos y fotos. Antes de reenviar, consulta a soporte si recibimos la solicitud." : error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setUploadProgress(null);
    }
  }

  if (status === "success") {
    return (
      <div ref={receiptRef} tabIndex={-1} className="publication-receipt mx-auto max-w-2xl border border-neutral-300 bg-white p-6 sm:p-8" role="status">
        <span className="flex h-10 w-10 items-center justify-center bg-[#edf7f2] text-[#176b4d]">
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">{prefill?.kind === "correction" ? "Recibimos tu corrección" : "Recibimos tu propiedad"}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{message}</p>
        {receipt && <p className="mt-3 text-sm text-neutral-600">{receipt.photosStored} {receipt.photosStored === 1 ? "foto guardada" : "fotos guardadas"}. Referencia: <strong className="break-all">{receipt.requestId}</strong></p>}
        <div className="mt-6 border-t border-neutral-200 pt-5 text-sm text-neutral-600">
          <p className="font-semibold text-neutral-900">Siguiente paso</p>
          <p className="mt-1">Una persona del equipo revisará las fotos, el precio y los datos antes de publicarla. Por ahora no verificamos identidad. Verás el estado en Mi cuenta.</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cliente" className="zu-button zu-button-primary">Ir a Mi cuenta<ArrowRight size={17} /></Link>
          <Link href="/cliente/solicitudes" className="zu-button zu-button-secondary">Ver mis solicitudes</Link>
        </div>
      </div>
    );
  }

  return (
    <form ref={wizardRef} tabIndex={-1} onSubmit={(event) => event.preventDefault()} noValidate className="publish-wizard grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="border border-neutral-300 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
          <ol className="publish-steps" aria-label="Pasos de la publicación">
            {steps.map((label, index) => {
              const Icon = index < step || (index < steps.length - 1 && index < furthestStep && canAdvanceStep(index, form, photos)) ? Check : stepIcons[index];
              const open = canOpenStep(index);
              return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  disabled={!open || status === "sending"}
                  aria-current={index === step ? "step" : undefined}
                  data-state={index === step ? "current" : open ? "open" : "locked"}
                  title={open ? undefined : "Completa los pasos anteriores"}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              </li>
            ); })}
          </ol>
        </div>

        <div className="p-4 sm:p-6">
          {prefill ? <PrefillNotice prefill={prefill} /> : null}
          {sessionExpired && <div role="alert" className="publish-draft-notice"><span>{photoStorage ? "Tu sesión venció. Tus datos y fotos quedan guardados en este dispositivo." : "Tu sesión venció. Los datos quedan guardados; tendrás que adjuntar las fotos nuevamente."}</span><Link href={`/login?next=${encodeURIComponent(currentPublishPath(prefill))}`}>Volver a iniciar sesión</Link></div>}
          {(draftSaved || (photoStorage && photos.length > 0)) && <div className="publish-draft-notice"><span className="flex items-center gap-2"><Save size={14} />{photoStorage ? "Datos y fotos guardados en este dispositivo." : "Datos guardados en este dispositivo. Las fotos deben volver a adjuntarse al recargar."}</span><button type="button" onClick={clearDraft} disabled={processingPhotos || status === "sending"}>Borrar datos</button></div>}
          {step === 0 ? (
            <PhotoStep
              photos={photos}
              onPhotos={handlePhotos}
              onRemove={removePhoto}
              onCategoryChange={updatePhotoCategory}
              processing={processingPhotos}
              progress={photoProgress}
              onCover={(id) => setPhotos(current => [...current.filter(photo => photo.id === id), ...current.filter(photo => photo.id !== id)])}
            />
          ) : null}


          {step === 1 ? <InformationStep form={form} updateField={updateField} /> : null}
          {step === 2 ? <PriceStep form={form} updateField={updateField} errors={stepErrors} /> : null}
          {step === 3 ? (
            <ConfirmationStep
              form={form}
              photos={photos}
              onEdit={goToStep}
              acceptedTerms={acceptedTerms}
              onAcceptedTermsChange={setAcceptedTerms}
            />
          ) : null}

          {message && status === "error" ? (
            <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {message}
            </p>
          ) : null}

          {uploadProgress !== null ? (
            <div className="publish-upload-progress mt-5" role="status">
              <span>{uploadProgress >= 100 ? "Fotos enviadas. Guardando tu solicitud…" : `Enviando fotos: ${uploadProgress}%`}</span>
              <div role="progressbar" aria-label="Envío de fotos" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${uploadProgress}%` }} /></div>
            </div>
          ) : null}

          {step < steps.length - 1 && !canContinue ? (
            <div className="mt-5 text-sm font-medium text-neutral-600" aria-live="polite">
              {Object.keys(stepErrors).length ? (
                <ul className="list-disc space-y-1 pl-5">{Object.entries(stepErrors).map(([field, error]) => <li key={field}>{error}</li>)}</ul>
              ) : <p>Completa las fotos y sus categorías para continuar.</p>}
            </div>
          ) : null}

          <div className="publish-nav">
            <button
              key="back"
              type="button"
              onClick={() => goToStep(step - 1)}
              disabled={step === 0 || status === "sending"}
              className="inline-flex h-11 cursor-pointer items-center gap-2 px-2 text-sm font-semibold text-neutral-700 disabled:cursor-default disabled:opacity-0"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </button>

            {step < steps.length - 1 && furthestStep === steps.length - 1 && step < steps.length - 2 ? (
              <button
                key="review"
                type="button"
                onClick={() => goToStep(steps.length - 1)}
                disabled={!canOpenStep(steps.length - 1)}
                className="publish-nav-review"
              >
                Ir a la revisión
              </button>
            ) : null}

            {step < steps.length - 1 ? (
              <button
                key="next"
                type="button"
                onClick={() => goToStep(step + 1)}
                disabled={!canContinue}
                className="inline-flex h-11 cursor-pointer items-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-[#176b4d] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Continuar
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="send"
                type="button"
                onClick={() => void sendRequest()}
                disabled={!acceptedTerms || status === "sending"}
                className="inline-flex h-11 cursor-pointer items-center gap-2 bg-[#176b4d] px-5 text-sm font-semibold text-white hover:bg-[#10533b] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {status === "sending" ? "Enviando..." : prefill?.kind === "correction" ? "Enviar corrección" : "Enviar para revisión"}
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

function currentPublishPath(prefill?: PublishPrefill) {
  if (prefill?.kind === "correction" && prefill.requestId) return `/publicar?corregir=${prefill.requestId}`;
  if (prefill?.kind === "similar") return `/publicar?parecida=${prefill.id.replace(/^parecida-/, "")}`;
  return "/publicar";
}

function PrefillNotice({ prefill }: { prefill: PublishPrefill }) {
  if (prefill.kind === "correction") {
    return (
      <div className="publish-prefill-notice" role="note">
        <p className="font-semibold">Estás corrigiendo «{prefill.sourceTitle}».</p>
        {prefill.reason ? <p><span className="font-semibold">Lo que te pedimos:</span> {prefill.reason}</p> : null}
        <p>Tus datos y fotos ya están cargados. Cambia lo necesario y vuelve a enviarlo.</p>
      </div>
    );
  }
  return (
    <div className="publish-prefill-notice" role="note">
      <p className="font-semibold">Otra unidad parecida a «{prefill.sourceTitle}».</p>
      <p>Copiamos la zona, la dirección, las expensas, la garantía, las comodidades y las mascotas. Agrega el título, el precio y las fotos de esta unidad, y revisa lo copiado.</p>
    </div>
  );
}

function PhotoStep({
  photos,
  onPhotos,
  onRemove,
  onCategoryChange,
  processing,
  progress,
  onCover,
}: {
  photos: UploadPhoto[];
  onPhotos: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onCategoryChange: (id: string, category: PhotoCategory) => void;
  processing: boolean;
  progress: { done: number; total: number; label: string } | null;
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
        <span className="mt-1 text-xs text-neutral-500">Mínimo {minUploadPhotos} y máximo {maxUploadPhotos} fotos. JPG, PNG o WebP. Las achicamos a {uploadMaxSide} px antes de enviarlas para que suban rápido.</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={processing || photos.length >= maxUploadPhotos} onChange={onPhotos} className="sr-only" />
      </label>

      {progress ? (
        <div className="publish-upload-progress mt-3" role="status">
          <span>{progress.label}: {progress.done} de {progress.total}</span>
          <div role="progressbar" aria-label={progress.label} aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total}><div style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} /></div>
        </div>
      ) : null}

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
          <span>{formatMegabytes(photos.reduce((sum, photo) => sum + (photo.analyzing ? 0 : photo.file.size), 0))} para enviar</span>
        </div>
      ) : null}
    </section>
  );
}

function formatMegabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toLocaleString("es-BO", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
}

function PhotoAnalysisStatus({ photo }: { photo: UploadPhoto }) {
  if (photo.analyzing || !photo.analysis) {
    return (
      <p className="mt-2 flex items-center gap-2 text-xs font-medium text-neutral-500">
        <LoaderCircle className="h-3.5 w-3.5 zu-spin" aria-hidden="true" />
        Revisando y achicando la foto...
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
        <fieldset className="grid gap-2 sm:col-span-2">
          <legend className="text-sm font-semibold text-neutral-800">¿Acepta mascotas?</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {petsOptions.map(([value, label]) => (
              <label key={value} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
                <input type="radio" name="petsPolicy" value={value} checked={form.petsPolicy === value} onChange={() => { updateField("petsPolicy", value); updateField("pets", value === "allowed"); }} className="h-4 w-4 accent-[#176b4d]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-x-5 gap-y-3 border-y border-neutral-200 py-4 sm:col-span-2">
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
          <input value={form.price} onChange={(event) => updateField("price", event.target.value)} type="text" inputMode="decimal" placeholder="Ej. 3.400" aria-describedby="publication-price-help" className={inputClassName} />
          <span id="publication-price-help" className="text-xs text-neutral-600">Puedes escribir 3400 o 3.400. Para centavos: 3.400,50.</span>
        </Field>
        <Field label="Moneda">
          <select value={form.currency} onChange={(event) => updateField("currency", event.target.value as PropertyForm["currency"])} className={inputClassName}>
            <option value="BOB">Bolivianos (Bs)</option>
            <option value="USD">Dólares ($us)</option>
          </select>
        </Field>
        <Field label="Expensas">
          <select value={form.expensesMode} onChange={(event) => updateField("expensesMode", event.target.value as PropertyForm["expensesMode"])} required aria-invalid={Boolean(errors.commonExpenses)} className={inputClassName}>
            <option value="">Seleccionar</option>
            <option value="included">Incluidas en el alquiler</option>
            <option value="none">No se cobran</option>
            <option value="separate">Se pagan aparte</option>
          </select>
        </Field>
        {form.expensesMode === "separate" && <Field label="Expensas por mes">
          <input value={form.commonExpenses} onChange={(event) => updateField("commonExpenses", event.target.value)} type="text" inputMode="decimal" required aria-invalid={Boolean(errors.commonExpenses)} aria-describedby="publication-expenses-help" placeholder="Ej. 300" className={inputClassName} />
          <span id="publication-expenses-help" className="text-xs text-neutral-600">En la misma moneda del alquiler.</span>
        </Field>}
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
        {form.guarantee === "Otro monto" && <Field label="Monto de la garantía"><input type="text" inputMode="decimal" value={form.guaranteeAmount} onChange={event => updateField("guaranteeAmount", event.target.value)} className={inputClassName} /></Field>}
        <div className="border-y border-neutral-200 py-4 sm:col-span-2">
          <BeforeVisitFields value={form} onChange={(field, next) => updateField(field, next as PropertyForm[typeof field])} idPrefix="publication" inputClassName={inputClassName} />
        </div>
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
  photos,
  onEdit,
  acceptedTerms,
  onAcceptedTermsChange,
}: {
  form: PropertyForm;
  photos: UploadPhoto[];
  onEdit: (step: number) => void;
  acceptedTerms: boolean;
  onAcceptedTermsChange: (value: boolean) => void;
}) {
  const symbol = form.currency === "BOB" ? "Bs" : "$us";
  const beforeVisit = beforeVisitRows(parseBeforeVisitInput(form).values) ?? [];
  const extras = ([["furnished", "Amoblado"], ["security", "Seguridad"], ["pool", "Piscina"], ["patio", "Patio o balcón"], ["grill", "Churrasquera"], ["elevator", "Ascensor"]] as const)
    .filter(([key]) => form[key]).map(([, label]) => label);
  return (
    <section>
      <StepHeading title="Revisa antes de enviar" copy="Así llega tu anuncio al equipo. Una persona revisa fotos, precio y datos antes de publicarlo. Por ahora no verificamos identidad." />

      <ReviewSection title={`Fotos (${photos.length})`} onEdit={() => onEdit(0)}>
        <ul className="review-photos">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <div className="review-photo-frame">
                <NextImage src={photo.url} alt={`Foto ${index + 1}: ${photoCategoryLabel(photo.category)}`} fill unoptimized sizes="160px" className="object-cover" />
                {index === 0 ? <span>Portada</span> : null}
              </div>
              <p>{photoCategoryLabel(photo.category)}</p>
            </li>
          ))}
        </ul>
      </ReviewSection>

      <ReviewSection title="La vivienda" onEdit={() => onEdit(1)}>
        <dl className="review-summary">
          <SummaryRow label="Título" value={form.title || "Sin título"} />
          <SummaryRow label="Tipo" value={form.type} />
          <SummaryRow label="Ubicación" value={[form.zone, form.address].filter(Boolean).join(" · ") || "Sin ubicación"} />
          <SummaryRow label="Ambientes" value={`${form.bedrooms || 0} dorm. · ${form.bathrooms || "?"} baños · ${form.garage || 0} parqueos`} />
          <SummaryRow label="Superficie" value={form.area ? `${form.area} m²` : "Sin indicar"} />
          <SummaryRow label="Mascotas" value={petsLabels[form.petsPolicy]} />
          <SummaryRow label="Comodidades" value={extras.join(", ") || "Ninguna marcada"} />
          {form.description.trim() ? <SummaryRow label="Descripción" value={form.description.trim()} /> : null}
        </dl>
      </ReviewSection>

      <ReviewSection title="Precio y contacto" onEdit={() => onEdit(2)}>
        <dl className="review-summary">
          <SummaryRow label="Contrato" value="Alquiler directo con el propietario" />
          <SummaryRow label="Alquiler" value={form.price ? `${symbol} ${form.price}/mes` : "Sin precio"} />
          {form.currency === "USD" && <SummaryRow label="Tipo de cambio" value={`1 USD = ${form.exchangeRate} Bs`} />}
          <SummaryRow label="Expensas" value={form.expensesMode === "separate" ? `${symbol} ${form.commonExpenses}/mes` : expensesLabels[form.expensesMode]} />
          <SummaryRow label="Garantía" value={form.guarantee === "Otro monto" ? `${symbol} ${form.guaranteeAmount}` : form.guarantee || "No indicada"} />
          {beforeVisit.map((row) => <SummaryRow key={row.label} label={row.label} value={row.value ?? "Sin indicar"} />)}
          <SummaryRow label="Propietario" value={form.ownerName || "Sin nombre"} />
          <SummaryRow label="WhatsApp" value={form.phone || "Sin WhatsApp"} />
        </dl>
        <CostSummary form={form} />
      </ReviewSection>

      <label className="mt-6 flex cursor-pointer items-start gap-3 border border-neutral-300 p-4">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => onAcceptedTermsChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#176b4d]" />
        <span className="text-sm leading-6 text-neutral-700">
          Confirmo que soy propietario, que el contrato de alquiler será directo conmigo y que no cobro comisión de intermediación. La información es correcta.
        </span>
      </label>
    </section>
  );
}

function photoCategoryLabel(category: PhotoCategory) {
  return photoCategories.find((item) => item.value === category)?.label ?? "Sin clasificar";
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="review-section">
      <div className="review-section-heading">
        <h3>{title}</h3>
        <button type="button" onClick={onEdit}>Editar</button>
      </div>
      {children}
    </div>
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
    <label className={`grid min-w-0 content-start gap-1.5 ${className}`}>
      <span className="inline-flex min-h-5 items-center gap-1.5 text-sm font-semibold leading-5 text-neutral-800">
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
    <div className="review-summary-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
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
    { complete: (parseCurrencyAmount(form.price) ?? 0) > 0, points: 10, missing: "Indicar precio mensual" },
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
    return Object.keys(wizardStepErrors(step, form)).length === 0;
  }

  return true;
}

function buildSubmissionText(form: PropertyForm, photos: UploadPhoto[]) {
  const beforeVisit = beforeVisitRows(parseBeforeVisitInput(form).values) ?? [];
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
    `Mascotas: ${petsLabels[form.petsPolicy]}`,
    `Amoblado: ${form.furnished ? "Sí" : "No"}`,
    `Seguridad: ${form.security ? "Sí" : "No"}`,
    `Piscina: ${form.pool ? "Sí" : "No"}`,
    `Patio o balcón: ${form.patio ? "Sí" : "No"}`,
    `Churrasquera: ${form.grill ? "Sí" : "No"}`,
    `Ascensor: ${form.elevator ? "Sí" : "No"}`,
    `Precio: ${form.currency} ${form.price}`,
    ...(form.currency === "USD" ? [`Tipo de cambio del propietario: 1 USD = ${form.exchangeRate} Bs`] : []),
    `Expensas: ${form.expensesMode === "separate" ? `${form.currency} ${form.commonExpenses} por mes` : expensesLabels[form.expensesMode]}`,
    `Garantía: ${form.guarantee === "Otro monto" ? `${form.currency} ${form.guaranteeAmount}` : form.guarantee}`,
    ...beforeVisit.map((row) => `${row.label}: ${row.value ?? "sin indicar"}`),
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
  const costs = getPublicationCosts({ ...form, commonExpenses: form.expensesMode === "separate" ? form.commonExpenses : "0" });
  const months = advanceRentMonths(form.advanceMonths);
  const format = (value: number | null) => value === null ? "Por definir" : `${form.currency === "BOB" ? "Bs" : "$us"} ${value.toLocaleString("es-BO")}`;
  return <div className="monthly-summary" aria-live="polite"><div><span>Mensual, incluidas expensas</span><strong>{format(costs.monthly)}</strong></div><div><span>{months > 1 ? `Ingreso: ${months} meses de adelanto + expensas + garantía` : "Ingreso: primer mes + expensas + garantía"}</span><strong>{format(costs.entry)}</strong></div><div><span>Comisión de intermediación</span><strong>Sin comisión</strong></div></div>;
}
