// Optional paid services. Publishing and contacting owners stay free; nothing here is a % of the rent.
// Prices are fixed amounts in bolivianos. Every service is coordinated by WhatsApp.

export type ServiceIcon =
  | "camera" | "pen" | "cube" | "megaphone" | "star" | "key" | "user" | "file" | "clipboard"
  | "shield" | "pin" | "tag" | "coins" | "clock" | "whatsapp";

export type Gain = { icon: ServiceIcon; title: string; text: string };

export type Service = {
  slug: string;
  audience: "owner" | "tenant";
  title: string;
  icon: ServiceIcon;
  category: string;
  image: string;
  price: number;
  unit: string;
  fromPrice?: boolean;
  comingSoon?: boolean;
  featured?: boolean;
  summary: string;
  description: string;
  includes: string[];
  gains: Gain[];
  steps?: [string, string][];
  timing: string;
  options: [string, number][];
  faq: [string, string][];
};

export type ServicePackage = {
  slug: string;
  audience: "owner" | "tenant";
  title: string;
  goal: string;
  summary: string;
  image: string;
  accent: string;
  price: number;
  upfront?: number;
  onSuccess?: number;
  hero?: boolean;
  gift?: string;
  items: { service: string; label: string; value: number }[];
  gains: Gain[];
  conditions: string[];
};

// Fixed rate for showing the dollar reference on this page only.
export const servicesUsdRate = 12;

export const ownerCategories = ["Preparar el anuncio", "Promocionar", "Alquilar seguro", "Contrato y entrega"];
export const packageGoals = ["Para empezar", "Alquilar rápido", "Cerrar seguro", "Varias viviendas"];

const img = (name: string) => `/images/servicios/${name}.jpg`;

export const services: Service[] = [
  {
    slug: "fotos-profesionales", audience: "owner", title: "Fotos profesionales", icon: "camera", category: "Preparar el anuncio", image: img("fotos"),
    price: 250, unit: "pago único",
    summary: "Un fotógrafo visita tu vivienda y la deja lista para destacar entre los demás anuncios.",
    description: "Las fotos son lo primero que mira un inquilino. Vamos a tu vivienda, buscamos la mejor luz de cada ambiente y entregamos las fotos editadas, enderezadas y subidas a tu anuncio. Te damos también versiones verticales para que las compartas en tus redes y estados de WhatsApp.",
    includes: ["Visita de hasta 1 hora", "15 a 20 fotos editadas", "Fotos verticales para redes", "Las subimos a tu anuncio", "Consejos para ordenar antes de la sesión", "Una foto de fachada o edificio"],
    gains: [
      { icon: "clock", title: "Se alquila antes", text: "Los anuncios con buenas fotos reciben más consultas, así tu vivienda pasa menos tiempo vacía." },
      { icon: "coins", title: "Se paga sola", text: "Si alquilas en Bs 3.000, una semana menos vacía equivale a Bs 750: tres veces lo que cuestan las fotos." },
      { icon: "user", title: "Mejores interesados", text: "Quien ve fotos claras llega a la visita sabiendo lo que hay, y pierdes menos tiempo." },
    ],
    timing: "Listo en 48 horas", options: [["Hasta 120 m²", 250], ["Más de 120 m² o casa con jardín", 350]],
    faq: [["¿Tengo que estar presente?", "Sí, o alguien de tu confianza que abra la vivienda."], ["¿Puedo usar las fotos en otros sitios?", "Sí, las fotos son tuyas."]],
  },
  {
    slug: "anuncio-listo", audience: "owner", title: "Anuncio listo para publicar", icon: "pen", category: "Preparar el anuncio", image: img("preparacion"),
    price: 100, unit: "pago único",
    summary: "Escribimos tu anuncio, revisamos los datos y lo dejamos completo para que no falte nada.",
    description: "Nos cuentas cómo es tu vivienda por WhatsApp y nosotros armamos el anuncio completo: título claro, descripción honesta, garantía, expensas, mascotas, parqueo y ubicación en el mapa. Ordenamos tus fotos para que la mejor vaya primero.",
    includes: ["Título y descripción redactados", "Garantía, expensas y reglas claras", "Ubicación revisada en el mapa", "Fotos ordenadas y revisadas", "Precio sugerido según la zona", "Un cambio gratis en 30 días"],
    gains: [
      { icon: "clock", title: "No escribes nada", text: "Nos cuentas por WhatsApp y nosotros armamos el anuncio completo." },
      { icon: "user", title: "Menos preguntas repetidas", text: "Con garantía, expensas y reglas claras, no respondes lo mismo a cada interesado." },
      { icon: "star", title: "Aparece en más búsquedas", text: "Con los datos completos, tu anuncio coincide con más filtros." },
    ],
    timing: "Listo en 24 horas", options: [["Un anuncio", 100], ["3 anuncios del mismo edificio", 240]],
    faq: [["¿Necesito fotos profesionales?", "No. Revisamos las tuyas y te decimos si alguna conviene repetir."]],
  },
  {
    slug: "recorrido-3d", audience: "owner", title: "Recorrido 3D", icon: "cube", category: "Preparar el anuncio", image: img("tour"),
    price: 300, unit: "pago único",
    summary: "Un recorrido en 3D para que los interesados conozcan los ambientes antes de visitar.",
    description: "Con las fotos de tu vivienda armamos un recorrido 3D aproximado que se ve dentro de tu anuncio. Ayuda a que lleguen a la visita personas que ya saben cómo es el lugar. Es un servicio experimental: muestra la distribución y el estilo, no es una medida exacta del espacio.",
    includes: ["Recorrido de los ambientes principales", "Se ve dentro de tu anuncio", "Enlace para compartir", "Revisión antes de publicarlo"],
    gains: [
      { icon: "user", title: "Menos visitas en vano", text: "Quien ya recorrió la vivienda en 3D llega más decidido." },
      { icon: "clock", title: "Abierta a toda hora", text: "La conocen de noche o desde otra ciudad, sin que tengas que abrir la puerta." },
      { icon: "star", title: "Te diferencias", text: "Se destaca frente a los anuncios que solo tienen fotos." },
    ],
    timing: "Listo en 3 a 5 días", options: [["Hasta 4 ambientes", 300], ["Casa completa", 450]],
    faq: [["¿Es una reconstrucción exacta?", "No. Es una recreación asistida, útil para hacerse una idea del lugar."]],
  },
  {
    slug: "promocion-en-redes", audience: "owner", title: "Promoción en redes", icon: "megaphone", category: "Promocionar", image: img("promocion"),
    price: 150, unit: "por campaña",
    summary: "Mostramos tu vivienda en nuestras redes y en grupos de alquiler de Santa Cruz.",
    description: "Preparamos una publicación en carrusel con tus mejores fotos y la publicamos en el Instagram y Facebook de Zentro Urbano, más historias durante la semana y en grupos de alquiler de Santa Cruz. Todos los contactos llegan directo a tu WhatsApp.",
    includes: ["Carrusel en Instagram y Facebook", "3 historias en la semana", "Publicación en grupos de alquiler", "Contactos directo a tu WhatsApp", "Resumen de alcance al terminar"],
    gains: [
      { icon: "user", title: "Más gente la ve", text: "Llega a quienes buscan en Instagram, Facebook y grupos, no solo en la página." },
      { icon: "clock", title: "Te ahorra horas", text: "No tienes que publicar tú en cada grupo." },
      { icon: "whatsapp", title: "Contactos directo a ti", text: "Todo llega a tu WhatsApp, sin intermediarios." },
    ],
    timing: "Dura 7 días", options: [["Una semana", 150], ["Dos semanas", 250]],
    faq: [["¿Garantizan que se alquile?", "No. Aumentamos cuántas personas ven tu anuncio, pero no garantizamos un resultado."]],
  },
  {
    slug: "anuncio-destacado", audience: "owner", title: "Anuncio destacado", icon: "star", category: "Promocionar", image: img("destacado"), featured: true,
    price: 200, unit: "por mes",
    summary: "Tu anuncio aparece primero, en naranja, cuando alguien busca en tu zona.",
    description: "Tu vivienda aparece arriba en las búsquedas que coinciden con ella, con la franja naranja \"Destacado\" y un marcador naranja en el mapa. Siempre se indica que es un anuncio promocionado, para que los inquilinos confíen.",
    includes: ["Primero en búsquedas que coinciden", "Franja y marcador naranja", "Etiqueta clara de anuncio promocionado", "Reporte de vistas y contactos"],
    gains: [
      { icon: "star", title: "Primero en tu zona", text: "Aparece antes que los demás cuando alguien busca algo como lo tuyo." },
      { icon: "coins", title: "Cuesta lo mismo que 2 días vacíos", text: "En un alquiler de Bs 3.000, cada día vacío te cuesta Bs 100. El destacado cuesta Bs 200 al mes." },
      { icon: "clock", title: "Se activa hoy", text: "No tienes que esperar ni preparar nada." },
    ],
    timing: "Se activa el mismo día", options: [["15 días", 120], ["1 mes", 200]],
    faq: [["¿Aparece en cualquier búsqueda?", "Solo cuando tu vivienda coincide con los filtros de quien busca."]],
  },
  {
    slug: "jornada-de-visitas", audience: "owner", title: "Jornada de visitas", icon: "key", category: "Alquilar seguro", image: img("visitas"),
    price: 130, unit: "por jornada",
    summary: "Juntamos a los interesados de la semana en un bloque de 2 horas y los atendemos por ti.",
    description: "En vez de ir una vez por cada interesado, agrupamos a todos los de la semana en una jornada de 2 horas. Una persona de Zentro muestra tu vivienda, responde preguntas y al terminar te manda un resumen por WhatsApp: quién vino, qué preguntó y quién está interesado de verdad. Pagas por la jornada, no por cada persona.",
    includes: ["Bloque de 2 horas", "Coordinamos a todos los interesados", "Mostramos y respondemos preguntas", "Resumen de la jornada por WhatsApp", "Te pasamos a los interesados serios"],
    gains: [
      { icon: "clock", title: "Te ahorra tardes enteras", text: "No vas cada vez que alguien quiere ver: juntamos a todos en 2 horas." },
      { icon: "coins", title: "Un viaje, no diez", text: "Un solo viaje por jornada en vez de uno por cada interesado." },
      { icon: "user", title: "Solo interesados serios", text: "Te pasamos un resumen de quién de verdad quiere alquilar." },
    ],
    timing: "Jornadas de 08:00 a 20:00", options: [["1 jornada", 130], ["3 jornadas", 350]],
    faq: [["¿Y si no llega nadie?", "Si nadie confirma, movemos la jornada sin costo."], ["¿Quién tiene la llave?", "Tú decides: nos la prestas o nos encontramos con alguien de tu confianza."]],
  },
  {
    slug: "verificacion-de-inquilino", audience: "owner", title: "Verificación de inquilino", icon: "user", category: "Alquilar seguro", image: img("inquilino"),
    price: 150, unit: "por persona",
    summary: "Revisamos carnet, trabajo y referencias antes de que firmes el contrato.",
    description: "Antes de entregar tu vivienda, revisamos los datos del interesado, siempre con su autorización: que el carnet coincida, que el trabajo o ingreso sea real y qué dicen sus anteriores propietarios. Te entregamos un informe simple para que decidas tú.",
    includes: ["Revisión de carnet", "Confirmación de trabajo o ingresos", "Llamada a 2 referencias", "Informe simple para decidir"],
    gains: [
      { icon: "shield", title: "Menos riesgo de impagos", text: "Sabes antes de firmar si trabaja y cómo pagaba en su alquiler anterior." },
      { icon: "coins", title: "Un mal inquilino cuesta caro", text: "Meses sin cobrar y arreglos pueden costarte miles de bolivianos. Bs 150 es poco al lado." },
      { icon: "clock", title: "Decides más rápido", text: "Con un informe claro, no dudas entre varios interesados." },
    ],
    timing: "Listo en 2 a 3 días", options: [["1 persona", 150], ["Pareja o familia (2)", 250]],
    faq: [["¿Necesitan permiso del inquilino?", "Sí, siempre se hace con su autorización."]],
  },
  {
    slug: "modelo-de-contrato", audience: "owner", title: "Modelo de contrato", icon: "file", category: "Contrato y entrega", image: img("contrato"),
    price: 80, unit: "desde", fromPrice: true,
    summary: "Un contrato de alquiler claro, listo para completar y firmar.",
    description: "Un modelo de contrato de alquiler pensado para Santa Cruz, con las cláusulas que suelen generar problemas bien escritas: garantía, expensas, servicios, mascotas, plazo y devolución. Puedes completarlo tú, o pedir que lo personalicemos con los datos de tu vivienda.",
    includes: ["Garantía y su devolución", "Expensas y servicios básicos", "Plazo, renovación y aviso de salida", "Reglas de mascotas y reparaciones", "Anexo para el inventario", "Versión Word y PDF"],
    gains: [
      { icon: "shield", title: "Te protege", text: "Garantía, mascotas, reparaciones y salida quedan claras y por escrito." },
      { icon: "coins", title: "Más barato que empezar de cero", text: "No pagas para que te redacten un contrato desde la primera línea." },
      { icon: "clock", title: "Listo al instante", text: "No buscas modelos en internet ni copias contratos viejos." },
    ],
    timing: "Plantilla el mismo día", options: [["Plantilla para completar", 80], ["Personalizado con tus datos", 300]],
    faq: [["¿Lo revisa un abogado?", "La revisión por abogado puede agregarse con precio aparte."]],
  },
  {
    slug: "inventario-con-fotos", audience: "owner", title: "Inventario con fotos", icon: "clipboard", category: "Contrato y entrega", image: img("inventario"),
    price: 200, unit: "entrega y devolución",
    summary: "Registramos el estado de cada ambiente al entregar y lo comparamos al devolver.",
    description: "El día de la entrega revisamos cada ambiente con el inquilino: paredes, muebles, artefactos y lectura de medidores, con fotos fechadas. Ambos firman el acta. Al terminar el alquiler volvemos y comparamos, así la devolución de la garantía es clara para los dos.",
    includes: ["Acta firmada por ambos", "Fotos fechadas por ambiente", "Lectura de luz y agua", "Lista de muebles y artefactos", "Revisión al devolver la vivienda"],
    gains: [
      { icon: "coins", title: "Garantía sin peleas", text: "Con fotos fechadas se ve qué daño es nuevo y qué ya estaba." },
      { icon: "shield", title: "Respaldo para ambos", text: "El acta firmada sirve si hay un desacuerdo." },
      { icon: "clock", title: "Devolución más rápida", text: "Se compara en minutos, no se discute por semanas." },
    ],
    timing: "Visita de 1 a 2 horas", options: [["Departamento", 200], ["Casa", 280]],
    faq: [["¿Sirve si hay un problema con la garantía?", "Es el respaldo más claro que pueden tener ambas partes."]],
  },
  {
    slug: "inquilino-verificado", audience: "tenant", title: "Inquilino verificado", icon: "shield", category: "Para inquilinos", image: img("t-verificado"),
    price: 100, unit: "pago único",
    summary: "Una constancia que mandas a los dueños junto con tu mensaje. Te responden antes.",
    description: "Es una constancia de que eres quien dices ser, de que tienes ingresos para pagar el alquiler y de que tus anteriores propietarios o tu empleador te recomiendan. La haces una sola vez y te sirve durante 12 meses para todas las viviendas que te interesen. Se la mandas al dueño por WhatsApp junto con tu primer mensaje, y él ve un resumen de 1 página sin tus documentos.",
    includes: ["Revisión de tu carnet: que la foto y los datos coincidan", "Confirmación de ingresos con boleta de pago, contrato o extracto (eliges cuál)", "Llamada a 2 referencias: anterior propietario o empleador", "Constancia de 1 página para mandar por WhatsApp", "Tus documentos no se comparten con nadie", "Válida 12 meses, para todas las viviendas que quieras"],
    gains: [
      { icon: "clock", title: "Te responden antes", text: "Entre un mensaje con constancia y otro sin ella, es más fácil que el dueño responda primero al tuyo." },
      { icon: "coins", title: "No repites papeles", text: "Una sola verificación en vez de mandar carnet y boletas a cada dueño que contactas." },
      { icon: "shield", title: "Tus documentos, cuidados", text: "El dueño ve solo el resumen. Tus documentos se quedan con nosotros." },
    ],
    steps: [
      ["Nos mandas tus datos", "Por WhatsApp: foto de tu carnet, un comprobante de ingresos y 2 contactos de referencia."],
      ["Verificamos", "Revisamos los documentos y llamamos a tus referencias, en 2 a 3 días hábiles."],
      ["Recibes tu constancia", "Te la enviamos en PDF. Desde ahí, se la mandas a cada dueño que contactes."],
    ],
    timing: "Listo en 2 a 3 días", options: [["Una persona", 100], ["Pareja o familia (2)", 170]],
    faq: [["¿Qué ve el dueño?", "Un resumen de 1 página: que tu identidad, ingresos y referencias fueron confirmados, y la fecha. No ve tus documentos."], ["¿Me garantiza el alquiler?", "No. El dueño decide, pero llegas con ventaja frente a quien no está verificado."], ["¿Y si no paso la verificación?", "Te contamos el motivo y no se emite la constancia."]],
  },
  {
    slug: "visitamos-por-ti", audience: "tenant", title: "Visitamos por ti", icon: "key", category: "Para inquilinos", image: img("t-visita"),
    price: 120, unit: "por vivienda",
    summary: "¿Te mudas desde otra ciudad? Vamos nosotros y te mostramos todo en videollamada.",
    description: "Si vives en La Paz, Cochabamba o fuera del país, no tienes que viajar para conocer una vivienda. Una persona de Zentro va, te la muestra en videollamada y revisa lo que las fotos no muestran: presión del agua, ruido, humedad, señal del celular y cómo es la cuadra.",
    includes: ["Visita en videollamada", "Revisión de agua, luz y humedad", "Ruido y señal del celular", "Fotos y video de lo que pidas", "Cómo es la cuadra y el barrio"],
    gains: [
      { icon: "coins", title: "Te ahorras el viaje", text: "Ir y volver desde La Paz o Cochabamba, más hotel y días sin trabajar, cuesta bastante más que esta visita." },
      { icon: "shield", title: "No alquilas a ciegas", text: "Ves lo que las fotos no muestran antes de pagar la garantía." },
      { icon: "clock", title: "Decides desde tu casa", text: "Ves varias viviendas en un día, sin moverte." },
    ],
    timing: "Agendado en 48 horas", options: [["1 vivienda", 120], ["3 viviendas el mismo día", 300]],
    faq: [["¿Puedo hacer preguntas en vivo?", "Sí, la visita es en videollamada contigo."]],
  },
  {
    slug: "inventario-de-entrada", audience: "tenant", title: "Inventario de entrada", icon: "clipboard", category: "Para inquilinos", image: img("t-inventario"),
    price: 150, unit: "pago único",
    summary: "Fotos y acta del estado de la vivienda el día que entras. Protege tu garantía.",
    description: "El día que entras, registramos cómo está cada ambiente con fotos fechadas: paredes, pisos, muebles, artefactos y medidores. Lo firman tú y el dueño. Cuando te vayas, ese registro demuestra lo que ya estaba así, y te ayuda a que te devuelvan la garantía completa.",
    includes: ["Fotos fechadas de cada ambiente", "Acta firmada por ambos", "Lectura de luz y agua", "Copia digital para ti"],
    gains: [
      { icon: "coins", title: "Recuperas tu garantía", text: "La garantía suele ser de 1 o 2 meses de alquiler. Bs 150 la protege." },
      { icon: "shield", title: "Pruebas a tu favor", text: "Si algo ya estaba roto, queda en fotos con fecha." },
      { icon: "clock", title: "Sin discusiones al salir", text: "La devolución se resuelve comparando, no discutiendo." },
    ],
    timing: "Visita de 1 hora", options: [["Departamento", 150], ["Casa", 200]],
    faq: [["¿El dueño tiene que estar?", "Lo ideal es que sí, para que ambos firmen el acta."]],
  },
  {
    slug: "revision-de-contrato", audience: "tenant", title: "Revisión de contrato", icon: "file", category: "Para inquilinos", image: img("t-contrato"),
    price: 80, unit: "pago único",
    summary: "Antes de firmar, revisamos que el contrato sea justo y te marcamos lo raro.",
    description: "Nos mandas el contrato que te dio el dueño y lo revisamos: garantía y su devolución, expensas, aumentos, plazo, reparaciones y salida anticipada. Te devolvemos el contrato con notas claras de lo que conviene preguntar o cambiar antes de firmar.",
    includes: ["Revisión cláusula por cláusula", "Notas claras en el mismo documento", "Lo que conviene negociar", "Respuesta por WhatsApp"],
    gains: [
      { icon: "shield", title: "Firmas sabiendo", text: "Entiendes cada cláusula antes de comprometerte por un año o más." },
      { icon: "coins", title: "Evitas cobros sorpresa", text: "Un aumento, una multa o unas expensas escondidas te pueden costar mucho más que Bs 80." },
      { icon: "clock", title: "En 24 horas", text: "No retrasas la firma." },
    ],
    timing: "Listo en 24 horas", options: [["Un contrato", 80]],
    faq: [["¿Es asesoría legal?", "No reemplaza a un abogado. Es una revisión práctica de lo más común."]],
  },
  {
    slug: "te-lo-buscamos", audience: "tenant", title: "Te lo buscamos", icon: "pin", category: "Para inquilinos", image: img("t-busqueda"),
    price: 200, unit: "pago único",
    summary: "Nos dices qué necesitas, armamos una lista corta y agendamos las visitas en un día.",
    description: "Nos cuentas tu presupuesto, zona, fecha de entrada y lo que no puede faltar. Buscamos entre los anuncios de dueños directos, confirmamos disponibilidad y te armamos una lista corta. Después agendamos todas las visitas el mismo día para que no pierdas tiempo.",
    includes: ["Lista corta de hasta 5 opciones", "Disponibilidad confirmada", "Visitas agendadas el mismo día", "Solo dueños directos, sin comisión"],
    gains: [
      { icon: "clock", title: "Te ahorra semanas", text: "No revisas cientos de anuncios ni escribes a cada dueño." },
      { icon: "coins", title: "Sin comisión", text: "Una inmobiliaria suele cobrar un mes de alquiler. Aquí pagas Bs 200 fijos." },
      { icon: "pin", title: "Todo en un día", text: "Ves todas las opciones en una sola salida." },
    ],
    timing: "Lista en 3 días", options: [["Búsqueda", 200]],
    faq: [["¿Cobran comisión si alquilo?", "No. Pagas solo la búsqueda."]],
  },
  {
    slug: "kit-de-mudanza", audience: "tenant", title: "Kit de mudanza", icon: "tag", category: "Para inquilinos", image: img("t-mudanza"), comingSoon: true,
    price: 0, unit: "",
    summary: "Descuentos en mudanza, limpieza y arreglos con negocios de Santa Cruz.",
    description: "", includes: [], gains: [], timing: "", options: [], faq: [],
  },
];

const item = (service: string, label: string, value: number) => ({ service, label, value });

export const servicePackages: ServicePackage[] = [
  {
    slug: "pagas-solo-si-se-alquila", audience: "owner", title: "Pagas solo si se alquila", goal: "Alquilar rápido", hero: true, accent: "#13231c", image: img("p-exito"),
    summary: "Bs 100 para empezar. El resto, recién cuando firmas con tu inquilino.",
    price: 490, upfront: 100, onSuccess: 390,
    items: [item("anuncio-destacado", "Destacado hasta que se alquile", 600), item("jornada-de-visitas", "Filtro y agenda de interesados, sin límite", 0), item("modelo-de-contrato", "Contrato personalizado", 300), item("inventario-con-fotos", "Inventario con fotos el día de la entrega", 200)],
    gains: [
      { icon: "shield", title: "Cero riesgo", text: "Si no se alquila, solo pusiste Bs 100." },
      { icon: "coins", title: "Mucho menos que una inmobiliaria", text: "Una inmobiliaria cobra un mes de alquiler. Aquí son Bs 490 fijos, sea cual sea el precio." },
      { icon: "clock", title: "Te ahorra el trabajo", text: "Nosotros atendemos a los interesados. Tú solo vas a la firma." },
    ],
    conditions: ["Pagas Bs 100 al empezar y Bs 390 el día que firmas con el inquilino. Si no se alquila, no pagas nada más.", "Los interesados se coordinan por Zentro Urbano. Si alquilas a alguien que te contactó por Zentro, se paga el saldo.", "El destacado y la agenda siguen mientras confirmes cada 21 días que la vivienda está disponible.", "Los Bs 100 no se devuelven: cubren el arranque."],
  },
  {
    slug: "hasta-que-se-alquile", audience: "owner", title: "Hasta que se alquile", goal: "Alquilar rápido", accent: "#13231c", image: img("p-hasta"),
    summary: "Nos ocupamos de todo, desde las fotos hasta la firma del contrato.", price: 890,
    items: [item("fotos-profesionales", "Fotos profesionales y video recorrido", 250), item("anuncio-listo", "Anuncio listo para publicar", 100), item("anuncio-destacado", "Destacado hasta que se alquile", 600), item("jornada-de-visitas", "Filtro y agenda de interesados, sin límite", 0), item("jornada-de-visitas", "4 jornadas de visitas presenciales", 520), item("promocion-en-redes", "1 campaña en redes de 7 días", 150), item("modelo-de-contrato", "Contrato personalizado", 300), item("inventario-con-fotos", "Inventario con fotos al entregar", 200)],
    gains: [{ icon: "clock", title: "Te olvidas del proceso", text: "De las fotos a la firma, nosotros coordinamos todo." }, { icon: "shield", title: "Firmas protegido", text: "Contrato e inventario incluidos." }],
    conditions: ["El destacado, la agenda y el video siguen mientras confirmes cada 21 días que la vivienda está disponible.", "Las 4 jornadas son en total, no por mes. Las extras cuestan Bs 130.", "La campaña en redes se lanza en los primeros 15 días."],
  },
  {
    slug: "empieza-bien", audience: "owner", title: "Empieza bien", goal: "Para empezar", accent: "#176b4d", image: img("p-empieza"), gift: "Destacado gratis",
    summary: "Publica con buena cara desde el primer día.", price: 350,
    items: [item("fotos-profesionales", "Fotos profesionales", 250), item("anuncio-listo", "Anuncio listo para publicar", 100), item("anuncio-destacado", "Destacado 1 mes, gratis", 200)],
    gains: [{ icon: "star", title: "Destacado gratis", text: "Un mes destacado sin costo, que normalmente vale Bs 200." }, { icon: "clock", title: "Arrancas bien", text: "Un buen primer anuncio atrae consultas desde el primer día." }],
    conditions: ["El destacado empieza el día en que se publica el anuncio."],
  },
  {
    slug: "vitrina-3d", audience: "owner", title: "Vitrina 3D", goal: "Para empezar", accent: "#1d5f7a", image: img("p-vitrina"),
    summary: "Que conozcan tu vivienda antes de visitarla.", price: 590,
    items: [item("fotos-profesionales", "Fotos profesionales", 250), item("recorrido-3d", "Recorrido 3D", 300), item("anuncio-listo", "Anuncio listo para publicar", 100), item("anuncio-destacado", "Destacado 1 mes", 200)],
    gains: [{ icon: "user", title: "Menos visitas en vano", text: "Llegan quienes ya recorrieron la vivienda en 3D." }, { icon: "star", title: "Te diferencias", text: "Fotos, 3D y destacado juntos." }],
    conditions: ["El recorrido 3D es una recreación aproximada, no una medida exacta del espacio."],
  },
  {
    slug: "redes-a-full", audience: "owner", title: "Redes a full", goal: "Alquilar rápido", accent: "#8a3d6b", image: img("p-redes"),
    summary: "Ya tienes buenas fotos y quieres que te vea más gente.", price: 390,
    items: [item("anuncio-listo", "Anuncio revisado y mejorado", 100), item("promocion-en-redes", "2 campañas en redes (14 días)", 300), item("anuncio-destacado", "Destacado 1 mes", 200)],
    gains: [{ icon: "user", title: "Más alcance", text: "Dos semanas en redes y grupos, además de la página." }, { icon: "clock", title: "Sin publicar tú", text: "Nosotros nos ocupamos de los grupos." }],
    conditions: ["Las 2 campañas van una después de la otra.", "No garantizamos un número de contactos."],
  },
  {
    slug: "mas-visitas", audience: "owner", title: "Más visitas", goal: "Alquilar rápido", accent: "#ee7f1f", image: img("p-visitas"),
    summary: "Interesados que llegan y alguien que los atiende por ti.", price: 650,
    items: [item("anuncio-destacado", "Destacado 1 mes", 200), item("promocion-en-redes", "1 campaña en redes de 7 días", 150), item("jornada-de-visitas", "4 jornadas de visitas presenciales", 520)],
    gains: [{ icon: "clock", title: "No pierdes tardes", text: "Atendemos 4 jornadas de visitas por ti." }, { icon: "user", title: "Más interesados", text: "Destacado y redes para que haya a quién mostrarle la vivienda." }],
    conditions: ["Las 4 jornadas son en total y se usan dentro de 60 días."],
  },
  {
    slug: "cierre-seguro", audience: "owner", title: "Cierre seguro", goal: "Cerrar seguro", accent: "#3c4a43", image: img("p-cierre"),
    summary: "Ya tienes inquilino y quieres firmar tranquilo.", price: 490,
    items: [item("verificacion-de-inquilino", "Verificación de inquilino", 150), item("modelo-de-contrato", "Contrato personalizado", 300), item("inventario-con-fotos", "Inventario con fotos (entrega y devolución)", 200)],
    gains: [{ icon: "shield", title: "Firmas tranquilo", text: "Inquilino verificado, contrato claro e inventario." }, { icon: "coins", title: "Garantía sin peleas", text: "El inventario evita discusiones al final del alquiler." }],
    conditions: ["La verificación se hace siempre con autorización del interesado."],
  },
  {
    slug: "hasta-que-se-alquile-plus", audience: "owner", title: "Hasta que se alquile Plus", goal: "Alquilar rápido", accent: "#0f4d37", image: img("p-plus"),
    summary: "Todo el paquete completo, con 3D y el inquilino verificado.", price: 1150,
    items: [item("jornada-de-visitas", "Todo lo de Hasta que se alquile", 2120), item("recorrido-3d", "Recorrido 3D", 300), item("verificacion-de-inquilino", "Verificación de inquilino", 150)],
    gains: [{ icon: "cube", title: "Con recorrido 3D", text: "Los interesados recorren la vivienda antes de ir." }, { icon: "shield", title: "Inquilino verificado", text: "Sabes a quién le alquilas." }],
    conditions: ["Mismas condiciones que Hasta que se alquile."],
  },
  {
    slug: "varias-viviendas", audience: "owner", title: "Varias viviendas", goal: "Varias viviendas", accent: "#5a4a2f", image: img("p-multi"),
    summary: "Para dueños con 3 departamentos o más en el mismo edificio.", price: 990,
    items: [item("fotos-profesionales", "Fotos profesionales de 3 viviendas", 750), item("anuncio-listo", "3 anuncios listos", 300), item("anuncio-destacado", "Destacado 1 mes para las 3", 600)],
    gains: [{ icon: "clock", title: "Un solo trámite", text: "Una sola visita de fotos para todo el edificio." }, { icon: "coins", title: "Bs 330 por vivienda", text: "En vez de Bs 550 cada una por separado." }],
    conditions: ["Las 3 viviendas deben estar en el mismo edificio o condominio. Cada vivienda extra: Bs 290."],
  },
  {
    slug: "me-mudo-desde-lejos", audience: "tenant", title: "Me mudo desde lejos", goal: "Inquilinos", accent: "#1d5f7a", image: img("p-lejos"),
    summary: "Para quien llega de otra ciudad o del exterior.", price: 390,
    items: [item("te-lo-buscamos", "Te lo buscamos", 200), item("visitamos-por-ti", "Visitamos por ti, 2 viviendas", 240), item("revision-de-contrato", "Revisión de contrato", 80)],
    gains: [{ icon: "coins", title: "Sin viajar", text: "Buscas, visitas y revisas el contrato sin moverte de tu ciudad." }, { icon: "shield", title: "No alquilas a ciegas", text: "Ves todo en videollamada antes de pagar." }],
    conditions: ["Las 2 visitas se hacen el mismo día o en días seguidos."],
  },
  {
    slug: "entro-tranquilo", audience: "tenant", title: "Entro tranquilo", goal: "Inquilinos", accent: "#176b4d", image: img("p-mudanza"),
    summary: "Firma y entra sin sorpresas, con tu garantía protegida.", price: 260,
    items: [item("inquilino-verificado", "Inquilino verificado", 100), item("revision-de-contrato", "Revisión de contrato", 80), item("inventario-de-entrada", "Inventario de entrada", 150)],
    gains: [{ icon: "coins", title: "Proteges tu garantía", text: "El inventario de entrada te respalda cuando te vayas." }, { icon: "clock", title: "Te responden antes", text: "Con tu constancia de inquilino verificado." }],
    conditions: ["El inventario se hace el día de la entrega de la vivienda."],
  },
];

export const packageValue = (pkg: ServicePackage) => pkg.items.reduce((sum, entry) => sum + entry.value, 0);
export const getService = (slug: string) => services.find(service => service.slug === slug);
export const getPackage = (slug: string) => servicePackages.find(pkg => pkg.slug === slug);
export const formatBob = (amount: number) => `Bs ${amount.toLocaleString("es-BO")}`;
export const formatUsd = (amount: number) => `$us ${Math.round(amount / servicesUsdRate)}`;
