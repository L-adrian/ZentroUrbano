// Short practical guides for tenants. They are general advice, not legal advice.
export type Guide = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: { title: string; items?: string[]; text?: string }[];
};

export const guides: Guide[] = [
  {
    slug: "visita",
    title: "Qué revisar en la visita",
    description: "Lista para revisar agua, luz, humedad, seguridad y el barrio antes de alquilar en Santa Cruz.",
    intro: "Una visita bien hecha evita sorpresas después de firmar. Lleva esta lista en el celular y saca fotos de lo que veas.",
    sections: [
      {
        title: "Dentro de la vivienda",
        items: [
          "Abre las llaves de agua y la ducha: revisa la presión y si sale agua caliente.",
          "Prueba los enchufes y los interruptores. Pregunta si el medidor de luz es propio o compartido.",
          "Busca manchas de humedad en techos, esquinas y detrás de los muebles.",
          "Revisa que puertas, ventanas, rejas y cerraduras cierren bien.",
          "Mira el estado de cocina, baños y desagües. Abre los grifos un rato y fíjate si el agua se va bien.",
          "Anota qué muebles y aparatos quedan en la vivienda y en qué estado están.",
        ],
      },
      {
        title: "Afuera y en el barrio",
        items: [
          "Pregunta si la calle o el patio se inundan cuando llueve fuerte.",
          "Mira qué micros o líneas pasan cerca y cuánto tardas a tu trabajo o estudio.",
          "Si puedes, pasa también de noche para ver la iluminación y el ruido.",
          "Confirma dónde se estaciona y si el parqueo está incluido en el precio.",
        ],
      },
      {
        title: "Preguntas para el dueño",
        items: [
          "¿Cuánto se paga al mes en total, con expensas, agua, luz, gas e internet?",
          "¿Cuánto es la garantía y cuándo se devuelve?",
          "¿Desde qué fecha está libre y por cuánto tiempo mínimo se alquila?",
          "¿Se aceptan mascotas? ¿Cuántas personas pueden vivir?",
          "¿Quién paga las reparaciones si algo se rompe?",
        ],
      },
    ],
  },
  {
    slug: "contrato",
    title: "Qué confirmar antes de firmar",
    description: "Lo que debe decir un contrato de alquiler: montos, garantía, duración, servicios y cómo salir.",
    intro: "Un contrato escrito protege a las dos partes. Antes de firmar, confirma que diga claramente lo que acordaron de palabra.",
    sections: [
      {
        title: "Quiénes firman",
        items: [
          "Nombre completo y número de carnet de quien alquila y de quien recibe la vivienda.",
          "Que quien firma sea el dueño o tenga un poder para alquilar. Pide ver el Folio Real o una factura de luz o agua a su nombre.",
          "La dirección exacta de la vivienda.",
        ],
      },
      {
        title: "Montos y fechas",
        items: [
          "El alquiler mensual y la moneda (Bs o $us). Si es en dólares, cómo se paga en bolivianos.",
          "Qué día del mes se paga y cómo: depósito, transferencia o en efectivo con recibo.",
          "Cuánto es la garantía, cuándo se devuelve y por qué motivos se puede descontar.",
          "Quién paga expensas, agua, luz, gas e internet.",
          "Cuánto dura el contrato y con cuánta anticipación hay que avisar para salir.",
        ],
      },
      {
        title: "Reglas de la vivienda",
        items: [
          "Si se aceptan mascotas y cuántas personas pueden vivir.",
          "Quién paga las reparaciones y cómo se avisan.",
          "Un inventario con fotos de lo que queda en la vivienda y su estado.",
        ],
      },
      {
        title: "Al firmar",
        text: "Cada parte se queda con un ejemplar firmado. Si quieren más respaldo, pueden reconocer las firmas ante un notario. No firmes hojas en blanco ni un contrato con espacios sin llenar.",
      },
    ],
  },
  {
    slug: "garantia",
    title: "El recibo de la garantía",
    description: "Cuándo pagar la garantía de un alquiler, qué debe decir el recibo y cómo pedir que te la devuelvan.",
    intro: "La garantía es el dinero que se deja al dueño al empezar el alquiler y que se devuelve al salir si no hay daños ni deudas. Págala solo al firmar el contrato y siempre con recibo.",
    sections: [
      {
        title: "Qué debe decir el recibo",
        items: [
          "Fecha y lugar.",
          "Monto en números y en letras, y la moneda.",
          "Nombre y carnet de quien paga y de quien recibe.",
          "La dirección de la vivienda y que el dinero es la garantía de ese alquiler.",
          "Cuándo y cómo se devuelve.",
          "Las firmas de las dos personas.",
        ],
      },
      {
        title: "Un ejemplo",
        text: "\"Recibí de [nombre completo], CI [número], la suma de Bs 3.000 (tres mil bolivianos) como garantía del alquiler de la vivienda ubicada en [dirección]. Se devolverá al entregar la vivienda, descontando solo daños comprobados o deudas de servicios. Santa Cruz, [fecha]. [Firma, nombre y CI de quien recibe].\"",
      },
      {
        title: "Al salir de la vivienda",
        items: [
          "Revisen juntos el inventario y las fotos de la entrada.",
          "Pide por escrito el detalle de cualquier descuento.",
          "Acuerden la fecha en que se devuelve el dinero.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
