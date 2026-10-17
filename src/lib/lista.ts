// Same text as the PDF in public/lista, so the page and the download never disagree.
// If you change a point, regenerate the PDF and its preview images (pagina-1/2.jpg, og-lista.jpg) too.
export const listaPdfPath = "/lista/lista-revisar-depa-antes-de-alquilar.pdf";
export const listaPdfPages = 4;

// id: stable key for saved marks; room: where it is checked in "Recorrer el depa"; fx: what the pixel house draws when it fails.
// kit: what to bring for that check; ask: a question for the owner; serious: a real red flag.
export type ListaRoom = "bano" | "cocina" | "sala" | "dormitorio" | "afuera" | "dueno";
export type ListaFx = "gotera" | "fisura" | "cucaracha" | "calefon" | "humedad";
export type ListaItem = { id: string; room: ListaRoom; fx?: ListaFx; title: string; detail: string; kit?: string; ask?: boolean; serious?: boolean };
export type ListaSection = { title: string; items: ListaItem[] };

export const listaSections: ListaSection[] = [
  {
    title: "Agua y lluvia",
    items: [
      { id: "la-calle-despues-de-llover", room: "afuera", title: "La calle después de llover.", detail: "Andá a ver la calle después de una lluvia: así vas a saber cómo es salir y volver a tu casa esos días." },
      { id: "el-escalon-para-entrar", room: "afuera", title: "El escalón para entrar.", detail: "Si desde la vereda tenés que bajar un escalón, el piso está más bajo que la calle y el agua puede entrar cuando llueve fuerte. Lo ideal es subir para entrar." },
      { id: "la-canica", room: "sala", title: "La canica.", detail: "Soltala en el piso: si rueda, el piso está desnivelado. Si rueda hacia el desagüe, esa zona escurre bien y no se inunda.", kit: "una canica" },
      { id: "el-cafe-en-el-inodoro", room: "bano", title: "El café en el inodoro.", detail: "Unas gotas en el tanque, sin tirar la cadena. Si en unos minutos el agua de abajo se pone marrón, hay una fuga que vas a pagar vos.", kit: "unas gotas de café" },
      { id: "la-presion-del-agua", room: "bano", title: "La presión del agua.", detail: "Abrí la ducha y la canilla de la cocina al mismo tiempo. Si el chorro baja casi a nada, vas a sufrir todos los días." },
      { id: "el-agua-de-la-canilla", room: "cocina", title: "El agua de la canilla.", detail: "Dejá correr la canilla un rato y llená una botella transparente: si sigue saliendo turbia, amarilla o con olor, el tanque está sucio o los caños están oxidados. Preguntá si el tanque tiene tapa: abierto, le entra tierra y cría mosquitos.", kit: "una botella transparente" },
      { id: "la-llave-de-paso", room: "cocina", title: "La llave de paso.", detail: "Pedí que te muestren dónde está la llave de paso del agua y que la cierren con una canilla abierta: el agua tiene que dejar de salir. Si está trabada o no corta, el día que se rompa un caño se te inunda el depa hasta que llegue el plomero." },
      { id: "debajo-del-lavaplatos", room: "cocina", title: "Debajo del lavaplatos.", detail: "Si hay manchas o madera hinchada, hay o hubo una fuga." },
      { id: "el-desague-de-la-ducha", room: "bano", title: "El desagüe de la ducha.", detail: "Echá un balde de agua: si tarda en irse, está tapado o mal hecho.", kit: "un balde de agua" },
      { id: "el-olor-de-las-rejillas", room: "bano", title: "El olor de las rejillas.", detail: "Echá media botella de agua en cada rejilla y olé en unos minutos: si sigue el olor a cloaca, lo más seguro es que el desagüe esté mal hecho, y eso no se arregla limpiando. Si no hay alcantarillado sino pozo séptico, preguntá quién paga vaciarlo." },
      { id: "si-cortan-el-agua", room: "dueno", title: "Si cortan el agua.", detail: "Preguntá cada cuánto cortan el agua en la zona y si hay tanque: sin reserva, cada corte te deja sin ducha ni baño. Si el agua sale directo de una bomba, sin tanque arriba, un corte de luz también te deja sin agua.", ask: true },
    ],
  },
  {
    title: "Luz y servicios",
    items: [
      { id: "cuanto-se-paga-de-luz", room: "dueno", title: "Cuánto se paga de luz.", detail: "Preguntale al dueño el promedio del mes y, sobre todo, si se corta con viento fuerte o lluvia.", ask: true },
      { id: "el-medidor-es-tuyo", room: "sala", title: "El medidor es tuyo.", detail: "Preguntá si el medidor de luz es solo tuyo o compartido. Apagá todo: si la lucecita sigue parpadeando, estás pagando la luz de otra persona.", ask: true },
      { id: "las-facturas-al-dia", room: "dueno", title: "Las facturas al día.", detail: "Pedí ver la última factura de luz, agua y gas: si hay meses sin pagar, que el dueño los pague antes de darte las llaves, o te cortan el servicio por una deuda que no es tuya.", ask: true },
      { id: "tu-cargador-en-cada-enchufe", room: "dormitorio", title: "Tu cargador en cada enchufe.", detail: "Si alguno no carga, está flojo o chispea, la instalación está mal.", kit: "tu cargador" },
      { id: "el-tablero-de-luz", room: "sala", title: "El tablero de luz.", detail: "Si tiene térmicos (las llavecitas), bien. Fusibles viejos o cables sueltos son una instalación antigua y riesgosa.", serious: true },
      { id: "la-ducha-electrica", room: "bano", title: "La ducha eléctrica.", detail: "Si los cables están a la vista o empalmados con cinta, no la toqués. Preguntá si tiene su propio térmico y cable a tierra: sin eso, te puede dar corriente mientras te bañás.", ask: true, serious: true },
      { id: "la-senal", room: "dormitorio", title: "La señal.", detail: "Hacé una videollamada en cada cuarto, sobre todo en el dormitorio y el baño.", kit: "el celular" },
      { id: "que-internet-llega", room: "dueno", title: "Qué internet llega.", detail: "Preguntale al dueño o a un vecino qué empresa de internet llega a esa calle y si se corta seguido. Si no llega ninguna, vas a estudiar y trabajar con los datos del celular, que salen caros.", ask: true },
    ],
  },
  {
    title: "Cocina, gas y lavado",
    items: [
      { id: "olor-a-gas", room: "cocina", title: "Olor a gas.", detail: "Apenas entrás a la cocina, olé antes de que prendan nada. Si huele a gas, no toqués la luz ni prendás fuego: cerrá la llave de la garrafa o del gas si la tenés a mano, abrí las ventanas, salí y no alquilés hasta que un técnico revise la instalación.", serious: true },
      { id: "la-garrafa-y-su-manguera", room: "cocina", title: "La garrafa y su manguera.", detail: "Si la manguera está reseca, cuarteada o atada con alambre, que la cambien antes de entrar. La garrafa no va en un mueble cerrado: si pierde, el gas se junta abajo y una chispa lo puede hacer explotar.", serious: true },
      { id: "el-calefon-a-gas", room: "bano", fx: "calefon", title: "El calefón a gas.", detail: "Fijate dónde está: tiene que estar afuera o en un lugar muy ventilado, con un caño que saque el humo. Si está en el baño o en un dormitorio, aunque tengan ventana, no alquilés hasta que lo saquen: suelta un gas sin olor que puede matarte mientras dormís o te bañás.", serious: true },
      { id: "puntitos-negros-en-la-cocina", room: "cocina", fx: "cucaracha", title: "Puntitos negros en la cocina.", detail: "Con la linterna del celular mirá rincones y detrás del refrigerador: puntitos como pimienta son de cucaracha, y granitos como arroz negro, de ratón. Si hay, pedí por escrito que fumiguen antes de entrar.", kit: "el celular" },
      { id: "donde-va-la-lavadora", room: "cocina", title: "Dónde va la lavadora.", detail: "Buscá una canilla, un desagüe y un enchufe juntos para la lavadora, y un lugar al sol para tender. Si falta, vas a lavar a mano o pagar lavandería, y la ropa secada adentro huele a humedad." },
    ],
  },
  {
    title: "Paredes, techo y estructura",
    items: [
      { id: "la-hoja-de-papel-en-la-ventana", room: "dormitorio", title: "La hoja de papel en la ventana.", detail: "Cerrala con una hoja en el medio y jalala, arriba, abajo y a los costados. Si sale fácil, no está sellada: entran polvo, mosquitos y agua.", kit: "una hoja de papel" },
      { id: "fisuras-en-diagonal", room: "sala", fx: "fisura", title: "Fisuras en diagonal.", detail: "Si salen en diagonal desde la esquina de una puerta o ventana, la estructura se movió. Las rayitas finas suelen ser solo del revoque.", serious: true },
      { id: "manchas-en-la-parte-baja-de-la-pared", room: "sala", fx: "humedad", title: "Manchas en la parte baja de la pared.", detail: "Pintura soplada en los primeros 30 a 50 cm es humedad que sube del suelo, y no se arregla pintando.", serious: true },
      { id: "las-esquinas-del-techo", room: "bano", fx: "gotera", title: "Las esquinas del techo.", detail: "Manchas, o pintura nueva en un solo rincón, pueden esconder goteras." },
      { id: "la-puerta-que-se-mueve-sola", room: "dormitorio", title: "La puerta que se mueve sola.", detail: "Abrila hasta la mitad y soltala: si se cierra o se abre sola, el marco o el piso están desnivelados." },
      { id: "las-columnas", room: "afuera", title: "Las columnas.", detail: "Manchas de óxido, cemento descascarado o fierros a la vista son graves.", serious: true },
      { id: "la-ceramica", room: "sala", title: "La cerámica.", detail: "Golpeala con los nudillos: si suena hueco, está despegada. Una grieta larga y recta que cruza varias piezas indica que el contrapiso se movió." },
      { id: "el-bano-ventilado", room: "bano", title: "El baño ventilado.", detail: "Sin ventana ni extractor, aparece moho en el techo." },
      { id: "los-roperos", room: "dormitorio", title: "Los roperos.", detail: "Abrilos y olé: el olor a humedad delata moho aunque se vea limpio." },
      { id: "el-comejen", room: "dormitorio", title: "El comején.", detail: "En zonas cálidas, apretá con la uña los marcos y zócalos de madera: si se hunde o suena hueco, o ves granitos como arena o caminitos de tierra en la pared, puede ser comején. Se come la madera de la casa y después tus muebles.", serious: true },
    ],
  },
  {
    title: "Seguridad y edificio",
    items: [
      { id: "la-puerta-de-entrada", room: "sala", title: "La puerta de entrada.", detail: "Cerrala con llave y movela con firmeza a la altura de la chapa, sin forzarla. Si baila mucho o el marco cede, la abren de un empujón." },
      { id: "quien-mas-tiene-llave", room: "dueno", title: "Quién más tiene llave.", detail: "Preguntá si podés cambiar la chapa cuando entrás: no sabés cuántas copias de la llave quedaron. Si el dueño se queda con una, que el contrato diga que solo entra avisándote antes.", ask: true },
      { id: "rejas-pero-con-salida", room: "dormitorio", title: "Rejas, pero con salida.", detail: "Fijate que las ventanas bajas o que dan al techo del vecino tengan reja, o por ahí entran a robar. Si todas las rejas son fijas, preguntá si alguna se abre desde adentro: en un incendio, es tu otra salida.", ask: true, serious: true },
      { id: "la-escalera-de-salida", room: "afuera", title: "La escalera de salida.", detail: "En un edificio, andá de la puerta del depa hasta la calle por la escalera, sin ascensor. Si está a oscuras, llena de cosas o tiene una reja con candado, en una emergencia te quedás atrapado.", serious: true },
    ],
  },
  {
    title: "La zona y el clima",
    items: [
      { id: "ir-de-noche", room: "afuera", title: "Ir de noche.", detail: "Volvé de noche y preguntá a alguien de la zona cómo es vivir ahí." },
      { id: "el-viaje-en-hora-pico", room: "afuera", title: "El viaje en hora pico.", detail: "Hacé el recorrido a tu trabajo o facultad un día de semana, a la hora real y en el micro, trufi, minibús o teleférico que vas a tomar. Si tardás mucho más de lo que pensabas o la parada queda lejos, lo pagás todos los días en tiempo y pasajes." },
      { id: "un-minuto-de-silencio", room: "dormitorio", title: "Un minuto de silencio.", detail: "Cerrá todo y quedate callado: escuchás vecinos, calle, perros o una discoteca." },
      { id: "el-sol-de-la-tarde", room: "sala", title: "El sol de la tarde.", detail: "Preguntá a qué hora le da el sol. Con sol de tarde, o techo de calamina sin cielo falso, el depa es un horno.", ask: true },
      { id: "el-frio-de-la-noche", room: "dormitorio", title: "El frío de la noche.", detail: "En ciudades frías como La Paz, El Alto, Oruro o Potosí, mirá con la brújula del celular hacia dónde da la ventana del dormitorio: si da al norte, le entra sol en invierno. Si da al sur, en invierno no le entra sol: de noche es helado y junta humedad.", kit: "el celular" },
      { id: "las-luces-apagadas", room: "sala", title: "Las luces apagadas.", detail: "De día, apagá todas las luces y fijate si se ve bien para leer. Si no entra luz natural, vas a tener el foco prendido todo el día y vas a pagar más de luz." },
      { id: "las-mallas-mosquiteras", room: "dormitorio", title: "Las mallas mosquiteras.", detail: "En zonas con mosquitos, fijate que cada ventana que se abre tenga malla, sin agujeros ni bordes sueltos. Sin malla entran de día y de noche, y en tierras bajas como Santa Cruz, Beni o Pando eso es riesgo de dengue." },
    ],
  },
  {
    title: "Que no te estafen",
    items: [
      { id: "nada-de-adelantos", room: "dueno", title: "Nada de adelantos.", detail: "No pagués reserva, adelanto ni comisión, ni por QR ni en efectivo, antes de ver el depa por dentro y conocer al dueño. Si está muy barato y te apuran porque hay otros interesados, casi seguro es estafa: reportá el aviso.", serious: true },
      { id: "que-sea-el-dueno", room: "dueno", title: "Que sea el dueño.", detail: "Pedile su carnet y un papel de la casa con el mismo nombre: el folio real, el último pago de impuestos o una factura de luz o agua. Si te alquila un pariente o un encargado, pedí un poder notariado del dueño; sin eso, no firmés ni pagués nada.", ask: true, serious: true },
      { id: "el-pago-a-nombre-del-dueno", room: "dueno", title: "El pago a nombre del dueño.", detail: "Antes de confirmar el QR, mirá que el nombre que muestra tu banco sea el del dueño o el de quien tiene su poder, y guardá el comprobante. Si pagás en efectivo, pedí un recibo firmado con la fecha, el monto y qué pagaste: la garantía, un mes adelantado o el alquiler.", serious: true },
      { id: "anticretico-con-abogado", room: "dueno", title: "Anticrético, con abogado.", detail: "En anticrético entregás mucha plata que te devuelven recién al final. Antes de pagar, que un abogado revise en Derechos Reales (con el certificado alodial) que la casa no esté hipotecada ni embargada, y que el contrato se haga ante notario y se inscriba ahí, o podés perder todo.", serious: true },
    ],
  },
  {
    title: "Antes de firmar",
    items: [
      { id: "expensas", room: "dueno", title: "Expensas.", detail: "Preguntá si están incluidas en el alquiler o se pagan aparte, y cuánto.", ask: true },
      { id: "plazo-subida-y-salida", room: "dueno", title: "Plazo, subida y salida.", detail: "Preguntá cuánto dura el contrato, cuánto sube al renovar y con cuánto aviso podés irte antes sin perder la garantía. Si no queda escrito, te pueden subir de golpe o quedarse con tu plata.", ask: true },
      { id: "dolares-o-bolivianos", room: "dueno", title: "Dólares o bolivianos.", detail: "Si el precio está en dólares, que el contrato diga en qué moneda pagás y a qué tipo de cambio, con el número escrito. Como el dólar sube y baja, sin eso cada mes vas a pagar distinto y discutir.", ask: true },
      { id: "mascotas-y-companeros", room: "dueno", title: "Mascotas y compañeros.", detail: "Si tenés mascota o vas a vivir con alguien, que el contrato lo diga, o te pueden pedir que dejés el depa. En un edificio, pedí el reglamento interno: si prohíbe mascotas, el sí de palabra del dueño no te sirve.", ask: true },
      { id: "por-escrito", room: "dueno", title: "Por escrito.", detail: "Quién paga los arreglos y cuándo te devuelven la garantía.", ask: true },
      { id: "la-lista-de-lo-que-queda", room: "dueno", title: "La lista de lo que queda.", detail: "Con el dueño, prendé todo lo que viene con el depa, como la cocina, el refrigerador o el aire, y anoten cómo está cada cosa. Firmen esa lista con el contrato: así no te cobran al salir lo que ya estaba roto." },
      { id: "firmas-ante-notario", room: "dueno", title: "Firmas ante notario.", detail: "Pedí que los dos reconozcan sus firmas del contrato ante notario: cuesta poco y, si después hay un problema, nadie puede negar lo que firmó." },
      { id: "fotos-del-dia-uno", room: "dueno", title: "Fotos del día uno.", detail: "Sacale foto a todo y a los medidores de luz y agua con la fecha el día que entrás.", kit: "el celular" },
    ],
  },
];

export const listaTotal = listaSections.reduce((sum, section) => sum + section.items.length, 0);

export const listaKit = ["Una canica", "Unas gotas de café", "Una hoja de papel", "Una botella transparente", "Tu cargador", "El celular con batería"];

export const listaItems = listaSections.flatMap(section => section.items);

// Order of the first 27-point list, whose marks were saved by position ("0-0", "0-1"...) before ids existed.
export const listaLegacyIds = [
  ["la-calle-despues-de-llover", "el-escalon-para-entrar", "la-canica", "el-cafe-en-el-inodoro", "la-presion-del-agua", "debajo-del-lavaplatos", "el-desague-de-la-ducha"],
  ["cuanto-se-paga-de-luz", "el-medidor-es-tuyo", "tu-cargador-en-cada-enchufe", "el-tablero-de-luz", "la-senal"],
  ["la-hoja-de-papel-en-la-ventana", "fisuras-en-diagonal", "manchas-en-la-parte-baja-de-la-pared", "las-esquinas-del-techo", "la-puerta-que-se-mueve-sola", "las-columnas", "la-ceramica", "el-bano-ventilado", "los-roperos"],
  ["ir-de-noche", "un-minuto-de-silencio", "el-sol-de-la-tarde"],
  ["expensas", "por-escrito", "fotos-del-dia-uno"],
];
