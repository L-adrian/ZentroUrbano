"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  MapPin,
  Plus,
  Save,
  Tags,
  Upload,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Operation, Property } from "@/lib/properties";

type AdminConsoleProps = {
  properties: Property[];
};

type AdminRow = {
  id: string;
  title: string;
  operation: Operation;
  zone: string;
  latitude: string;
  longitude: string;
  published: boolean;
  isSeeded: boolean;
};

export function AdminConsole({ properties }: AdminConsoleProps) {
  const [rows, setRows] = useState<AdminRow[]>(
    properties.map(({ id, title, operation, zone, coordinates, published, isSeeded }) => ({
      id,
      title,
      operation,
      zone,
      latitude: coordinates.lat.toFixed(6),
      longitude: coordinates.lng.toFixed(6),
      published,
      isSeeded,
    })),
  );
  const [title, setTitle] = useState("");
  const [zone, setZone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [price, setPrice] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(["Home office", "Zona tranquila"]);
  const [imageNames, setImageNames] = useState<string[]>([]);

  const publishedCount = useMemo(() => rows.filter((row) => row.published).length, [rows]);

  function addTag() {
    const nextTag = tagInput.trim();
    if (!nextTag || tags.includes(nextTag)) {
      setTagInput("");
      return;
    }
    setTags((current) => [...current, nextTag]);
    setTagInput("");
  }

  function createProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanZone = zone.trim();
    const cleanLatitude = latitude.trim();
    const cleanLongitude = longitude.trim();

    if (!cleanTitle || !cleanZone || !cleanLatitude || !cleanLongitude) {
      return;
    }

    setRows((current) => [
      {
        id: `local-${Date.now()}`,
        title: cleanTitle,
        operation: "Alquiler",
        zone: cleanZone,
        latitude: cleanLatitude,
        longitude: cleanLongitude,
        published: false,
        isSeeded: false,
      },
      ...current,
    ]);
    setTitle("");
    setZone("");
    setLatitude("");
    setLongitude("");
    setPrice("");
    setImageNames([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[32px] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(20,20,20,0.08)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
              Crear propiedad
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              Ficha manual
            </h2>
          </div>
          <span className="rounded-full bg-[#eef7ef] px-3 py-1 text-xs font-semibold text-[#285340]">
            Operación privada
          </span>
        </div>

        <form onSubmit={createProperty} className="mt-6 space-y-5">
          <Field label="Título">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Casa familiar en Sirari"
              className="admin-input"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contrato">
              <p className="py-3 text-sm text-neutral-600">Alquiler directo con el propietario</p>
            </Field>
            <Field label="Precio">
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="$us 680"
                className="admin-input"
              />
            </Field>
          </div>

          <Field label="Zona y ubicación aproximada">
            <div className="relative">
              <MapPin
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                placeholder="Equipetrol, Santa Cruz"
                className="admin-input pl-11"
              />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Latitud">
              <input
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="-17.756000"
                inputMode="decimal"
                className="admin-input"
              />
            </Field>
            <Field label="Longitud">
              <input
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="-63.188000"
                inputMode="decimal"
                className="admin-input"
              />
            </Field>
          </div>

          <Field label="Imágenes">
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-black/20 bg-neutral-50 p-5 text-center transition hover:border-[#58745f] hover:bg-[#f6faf6]">
              <ImagePlus className="h-7 w-7 text-[#58745f]" aria-hidden="true" />
              <span className="mt-3 text-sm font-semibold text-neutral-900">
                Subir imágenes de la propiedad
              </span>
              <span className="mt-1 text-xs text-neutral-500">
                Las imágenes quedan listas para revisión manual antes de publicar.
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  setImageNames(files.map((file) => file.name));
                }}
              />
            </label>
            {imageNames.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {imageNames.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : null}
          </Field>

          <Field label="Etiquetas lifestyle">
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Ideal para mascotas"
                className="admin-input"
              />
              <button
                type="button"
                onClick={addTag}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:bg-neutral-800"
                aria-label="Añadir etiqueta"
                title="Añadir etiqueta"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-[#eef7ef] px-3 text-xs font-semibold text-[#285340]"
                  title="Quitar etiqueta"
                >
                  <Tags className="h-3.5 w-3.5" aria-hidden="true" />
                  {tag}
                </button>
              ))}
            </div>
          </Field>

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Guardar como borrador
          </button>
        </form>
      </section>

      <section className="rounded-[32px] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(20,20,20,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b4b31]">
              Gestión manual
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              Inventario visible
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Metric label="Publicadas" value={publishedCount} />
            <Metric label="Total" value={rows.length} />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-4 rounded-[24px] border border-black/10 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-neutral-950">{row.title}</h3>
                  {row.isSeeded ? (
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-neutral-500 ring-1 ring-black/10">
                      Base inicial
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#fff2ec] px-2 py-1 text-[11px] font-semibold text-[#8b4b31]">
                      En revisión
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {row.operation} · {row.zone}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {row.latitude}, {row.longitude}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRows((current) =>
                    current.map((item) =>
                      item.id === row.id ? { ...item, published: !item.published } : item,
                    ),
                  )
                }
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                  row.published
                    ? "bg-[#eef7ef] text-[#285340] hover:bg-[#dcebdd]"
                    : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                }`}
              >
                {row.published ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
                {row.published ? "Visible" : "Oculta"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[24px] bg-neutral-950 p-5 text-white">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#b8d8bf]" aria-hidden="true" />
            <p className="text-sm font-semibold">Regla operativa</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Se revisan viviendas en alquiler directo con el propietario antes de activarlas.
            Las solicitudes de publicación quedan pendientes de aprobación.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Integración recomendada: conectar storage de archivos y MySQL
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-neutral-800">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3">
      <p className="text-xl font-semibold text-neutral-950">{value}</p>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
    </div>
  );
}
