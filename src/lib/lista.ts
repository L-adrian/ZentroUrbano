// Same text as the PDF in public/lista, so the page and the download never disagree.
export const listaPdfPath = "/lista/lista-revisar-depa-antes-de-alquilar.pdf";

export type ListaItem = { title: string; detail: string };
export type ListaSection = { title: string; items: ListaItem[] };

export const listaSections: ListaSection[] = [
  {
    title: "Agua y lluvia",
    items: [
      { title: "La calle después de llover.", detail: "Andá a ver la calle después de una lluvia: así vas a saber cómo es salir y volver a tu casa esos días." },
      { title: "El escalón para entrar.", detail: "Si desde la vereda tenés que bajar un escalón, el piso está más bajo que la calle y el agua puede entrar cuando llueve fuerte. Lo ideal es subir para entrar." },
      { title: "La canica.", detail: "Soltala en el piso: si rueda, el piso está desnivelado. Si rueda hacia el desagüe, esa zona escurre bien y no se inunda." },
      { title: "El café en el inodoro.", detail: "Unas gotas en el tanque, sin tirar la cadena. Si en unos minutos el agua de abajo se pone marrón, hay una fuga que vas a pagar vos." },
      { title: "La presión del agua.", detail: "Abrí la ducha y la canilla de la cocina al mismo tiempo. Si el chorro baja casi a nada, vas a sufrir todos los días." },
      { title: "Debajo del lavaplatos.", detail: "Si hay manchas o madera hinchada, hay o hubo una fuga." },
      { title: "El desagüe de la ducha.", detail: "Echá un balde de agua: si tarda en irse, está tapado o mal hecho." },
    ],
  },
  {
    title: "Luz y servicios",
    items: [
      { title: "Cuánto se paga de luz.", detail: "Preguntale al dueño el promedio del mes y, sobre todo, si se corta con viento fuerte o lluvia." },
      { title: "El medidor es tuyo.", detail: "Preguntá si el medidor de luz es solo tuyo o compartido. Apagá todo: si la lucecita sigue parpadeando, estás pagando la luz de otra persona." },
      { title: "Tu cargador en cada enchufe.", detail: "Si alguno no carga, está flojo o chispea, la instalación está mal." },
      { title: "El tablero de luz.", detail: "Si tiene térmicos (las llavecitas), bien. Fusibles viejos o cables sueltos son una instalación antigua y riesgosa." },
      { title: "La señal.", detail: "Hacé una videollamada en cada cuarto, sobre todo en el dormitorio y el baño." },
    ],
  },
  {
    title: "Paredes, techo y estructura",
    items: [
      { title: "La hoja de papel en la ventana.", detail: "Cerrala con una hoja en el medio y jalala, arriba, abajo y a los costados. Si sale fácil, no está sellada: entran polvo, mosquitos y agua." },
      { title: "Fisuras en diagonal.", detail: "Si salen en diagonal desde la esquina de una puerta o ventana, la estructura se movió. Las rayitas finas suelen ser solo del revoque." },
      { title: "Manchas en la parte baja de la pared.", detail: "Pintura soplada en los primeros 30 a 50 cm es humedad que sube del suelo, y no se arregla pintando." },
      { title: "Las esquinas del techo.", detail: "Manchas, o pintura nueva en un solo rincón, pueden esconder goteras." },
      { title: "La puerta que se mueve sola.", detail: "Abrila hasta la mitad y soltala: si se cierra o se abre sola, el marco o el piso están desnivelados." },
      { title: "Las columnas.", detail: "Manchas de óxido, cemento descascarado o fierros a la vista son graves." },
      { title: "La cerámica.", detail: "Golpeala con los nudillos: si suena hueco, está despegada. Una grieta larga y recta que cruza varias piezas indica que el contrapiso se movió." },
      { title: "El baño ventilado.", detail: "Sin ventana ni extractor, aparece moho en el techo." },
      { title: "Los roperos.", detail: "Abrilos y olé: el olor a humedad delata moho aunque se vea limpio." },
    ],
  },
  {
    title: "La zona y el calor",
    items: [
      { title: "Ir de noche.", detail: "Volvé de noche y preguntá a alguien de la zona cómo es vivir ahí." },
      { title: "Un minuto de silencio.", detail: "Cerrá todo y quedate callado: escuchás vecinos, calle, perros o una discoteca." },
      { title: "El sol de la tarde.", detail: "Preguntá a qué hora le da el sol. Con sol de tarde, o techo de calamina sin cielo falso, el depa es un horno." },
    ],
  },
  {
    title: "Antes de firmar",
    items: [
      { title: "Expensas.", detail: "Preguntá si están incluidas en el alquiler o se pagan aparte, y cuánto." },
      { title: "Por escrito.", detail: "Quién paga los arreglos y cuándo te devuelven la garantía." },
      { title: "Fotos del día uno.", detail: "Sacale foto a todo y a los medidores de luz y agua con la fecha el día que entrás." },
    ],
  },
];

export const listaTotal = listaSections.reduce((sum, section) => sum + section.items.length, 0);
