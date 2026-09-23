import { BadgeCheck, MapPinned, MessageCircle, Search, Sparkles } from "lucide-react";

const helpItems = [
  {
    title: "Fichas listas para comparar",
    copy: "Precio, zona, fotos, requisitos y contacto aparecen ordenados para decidir sin ruido.",
    icon: BadgeCheck,
  },
  {
    title: "Búsqueda por estilo de vida",
    copy: "Filtra por mascotas, home office, zonas tranquilas o perfil familiar, no solo por metros.",
    icon: Search,
  },
  {
    title: "Mapa con puntos reales",
    copy: "Las ubicaciones usan latitud y longitud para que el mapa y Google Maps coincidan.",
    icon: MapPinned,
  },
  {
    title: "Contacto directo",
    copy: "Cuando una propiedad encaja, puedes hablar por WhatsApp sin crear una cuenta.",
    icon: MessageCircle,
  },
  {
    title: "Inventario curado",
    copy: "Menos propiedades repetidas y más catálogo cuidado para que Zentro Urbano se sienta confiable.",
    icon: Sparkles,
  },
];

export function ZentroUrbanoHelpCarousel() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58745f]">
              Cómo ayuda Zentro Urbano
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
              Menos vueltas para encontrar una propiedad que tenga sentido.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-neutral-600">
            Una experiencia pensada para revisar opciones rápido, entenderlas mejor y contactar sin
            fricción.
          </p>
        </div>

        <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
          {helpItems.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="min-w-[78%] snap-start rounded-[26px] border border-black/10 bg-neutral-50 p-5 sm:min-w-0"
              >
                <Icon className="h-5 w-5 text-[#58745f]" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-neutral-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{item.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
