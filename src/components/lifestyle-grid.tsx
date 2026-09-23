import {
  BriefcaseBusiness,
  GraduationCap,
  Heart,
  Home,
  Leaf,
  PawPrint,
  Sparkles,
  Trees,
  Users,
} from "lucide-react";
import Link from "next/link";
import { lifestyleCategories } from "@/lib/properties";

const icons = [
  Home,
  Heart,
  Users,
  PawPrint,
  BriefcaseBusiness,
  GraduationCap,
  Trees,
  Sparkles,
  Leaf,
];

export function LifestyleGrid() {
  return (
    <section id="lifestyle" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
              Lifestyle primero
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
              Busca por la vida que quieres tener, no solo por metros cuadrados.
            </h2>
          </div>
          <Link
            href="/propiedades"
            className="inline-flex h-11 w-fit items-center rounded-full border border-black/10 px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Ver catálogo
          </Link>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lifestyleCategories.map((category, index) => {
            const Icon = icons[index];

            return (
              <Link
                key={category.name}
                href={`/propiedades?lifestyle=${encodeURIComponent(category.name)}`}
                className="group rounded-[24px] border border-black/10 bg-white p-5 transition hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_24px_70px_rgba(20,20,20,0.08)]"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-[#58745f]" aria-hidden="true" />
                  <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
                    {category.name}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{category.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
