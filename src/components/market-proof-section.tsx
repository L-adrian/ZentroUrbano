import { ArrowRight, BarChart3, Link2, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";

const proofStats = [
  {
    value: "+100",
    label: "vistas medibles como objetivo inicial por campaña",
    helper: "Cada ficha registra vistas, clicks y WhatsApp para reportes.",
  },
  {
    value: "1 link",
    label: "por inmueble para compartir en redes y chats",
    helper: "Ideal para propietarios, asesores e inmobiliarias.",
  },
  {
    value: "Mapa real",
    label: "con coordenadas y ubicación verificable",
    helper: "La ficha no depende solo de una descripción larga.",
  },
];

const proofItems = [
  {
    icon: <Link2 className="h-5 w-5" aria-hidden="true" />,
    title: "Ficha compartible",
    copy: "Cada propiedad puede enviarse por WhatsApp, Facebook o grupos de clientes con un link propio.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
    title: "Reportes semanales",
    copy: "El propietario puede ver vistas, clicks, interacción con mapa y contactos por WhatsApp.",
  },
  {
    icon: <MapPin className="h-5 w-5" aria-hidden="true" />,
    title: "Mapa + ubicación",
    copy: "La experiencia permite entender dónde está el inmueble antes de escribir al contacto.",
  },
  {
    icon: <MessageCircle className="h-5 w-5" aria-hidden="true" />,
    title: "Contacto directo",
    copy: "Menos fricción: quien está interesado puede pasar directo a WhatsApp o referencia original.",
  },
];

export function MarketProofSection() {
  return (
    <section className="relative overflow-hidden bg-[#0b100d] py-16 text-white sm:py-24">
      <div
        className="absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 18% 22%, rgba(255,255,255,0.16), transparent 34%), radial-gradient(ellipse at 76% 14%, rgba(88,116,95,0.28), transparent 36%), radial-gradient(ellipse at 55% 85%, rgba(214,161,107,0.18), transparent 42%), linear-gradient(135deg, #0b100d 0%, #142119 48%, #060806 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.18) 18%, transparent 38%), linear-gradient(75deg, transparent 6%, rgba(255,255,255,0.1) 36%, transparent 62%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d6a16b]">
              Señal comercial
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Una ficha profesional vende mejor que un post perdido.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72">
              Zentro Urbano está preparado para medir la atención que recibe cada inmueble,
              compartirlo rápido y entregar reportes simples a propietarios e inmobiliarias.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/publicar"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
              >
                Publicar propiedad
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/publicidad"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/18 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ver publicidad
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {proofStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[28px] border border-white/12 bg-white/[0.08] p-5"
              >
                <p className="text-3xl font-semibold tracking-tight text-white">{stat.value}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-white/90">{stat.label}</p>
                <p className="mt-3 text-xs font-medium leading-5 text-white/58">{stat.helper}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {proofItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[26px] border border-white/10 bg-white/[0.07] p-5"
            >
              <div className="text-[#d6a16b]">{item.icon}</div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{item.copy}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-5 text-white/42">
          Los cierres de alquiler o venta se muestran únicamente cuando estén confirmados. Mientras
          tanto, la propuesta se apoya en fichas compartibles, reportes y métricas medibles.
        </p>
      </div>
    </section>
  );
}
