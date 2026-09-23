export type Operation = "Compra" | "Alquiler" | "Anticrético";
export type PropertyType = "Casa" | "Departamento" | "Terreno";
export type ListingPlan = "standard" | "featured";
export type PublisherKind = "owner" | "agency";

export type PropertyPublisher = {
  name: string;
  shortName: string;
  kind: PublisherKind;
  verified: boolean;
  brandColor: string;
  brandTextColor: string;
  logo?: string;
};

export type PropertyAgent = {
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp: string;
  photo: string;
  areas: string[];
  verified: boolean;
  responseTime: string;
};

export type Property = {
  rentalDetails?: import("@/lib/publication-input").PublicationDetails;
  id: string;
  slug: string;
  title: string;
  type: PropertyType;
  operation: Operation;
  price: number;
  currency: "USD" | "BOB";
  exchangeRate?: number | null;
  city: string;
  zone: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  garage: number;
  area: number;
  pets: boolean;
  furnished: boolean;
  security: boolean;
  pool: boolean;
  patio: boolean;
  grill: boolean;
  elevator: boolean;
  shortDescription: string;
  longDescription: string;
  requirements: string[];
  images: string[];
  video?: string;
  mapUrl: string;
  whatsapp: string;
  idealFor: string[];
  tags: string[];
  listingPlan: ListingPlan;
  publisher: PropertyPublisher;
  agent: PropertyAgent;
  featured: boolean;
  published: boolean;
  availabilityConfirmedAt?: string;
  isSeeded: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
  neighborhoodHighlights: string[];
};

export const heroImage =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=85";
export const mobileHeroImage =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=72";

export const lifestyleCategories = [
  {
    name: "Persona sola",
    description: "Espacios compactos, seguros y fáciles de mantener.",
    accent: "bg-[#eef7ef] text-[#285340]",
  },
  {
    name: "Parejas",
    description: "Departamentos luminosos cerca de cafés y servicios.",
    accent: "bg-[#fff2ec] text-[#8b4b31]",
  },
  {
    name: "Familias",
    description: "Casas con patio, colegios cerca y zonas tranquilas.",
    accent: "bg-[#edf2ff] text-[#243b73]",
  },
  {
    name: "Mascotas",
    description: "Ambientes pet friendly con patio o áreas verdes.",
    accent: "bg-[#f5f3e8] text-[#61562d]",
  },
  {
    name: "Home office",
    description: "Buena luz, silencio y espacio para trabajar mejor.",
    accent: "bg-[#eef6f8] text-[#28515c]",
  },
  {
    name: "Estudiantes",
    description: "Ubicaciones prácticas, económicas y bien conectadas.",
    accent: "bg-[#f4eefb] text-[#5d3d7a]",
  },
  {
    name: "Zonas tranquilas",
    description: "Calles residenciales y sensación de privacidad.",
    accent: "bg-[#eef5ef] text-[#304f37]",
  },
  {
    name: "Casas premium",
    description: "Propiedades curadas con acabados y amenities superiores.",
    accent: "bg-[#f1f1f1] text-[#202020]",
  },
  {
    name: "Económicos",
    description: "Opciones accesibles sin sacrificar claridad ni confianza.",
    accent: "bg-[#fff6d8] text-[#755b11]",
  },
];

export const popularZones = [
  {
    name: "Equipetrol",
    summary: "Cafés, oficinas, restaurantes y vida urbana.",
    count: 18,
  },
  {
    name: "Urubó",
    summary: "Casas amplias, privacidad y perfil premium.",
    count: 12,
  },
  {
    name: "Sirari",
    summary: "Residencial, silenciosa y cerca de servicios.",
    count: 9,
  },
  {
    name: "Norte Integrado",
    summary: "Conectividad, colegios y buena proyección.",
    count: 15,
  },
];

const publishers = {
  moradaDirect: {
    name: "Dueño directo",
    shortName: "D",
    kind: "owner",
    verified: true,
    brandColor: "#21352b",
    brandTextColor: "#ffffff",
  },
  century21: {
    name: "Century 21",
    shortName: "C21",
    kind: "agency",
    verified: true,
    brandColor: "#b99745",
    brandTextColor: "#171717",
  },
  remax: {
    name: "RE/MAX",
    shortName: "RE",
    kind: "agency",
    verified: true,
    brandColor: "#004e98",
    brandTextColor: "#ffffff",
  },
  marketplace: {
    name: "Marketplace",
    shortName: "MP",
    kind: "agency",
    verified: false,
    brandColor: "#21352b",
    brandTextColor: "#ffffff",
  },
  tuBalcon: {
    name: "Tu Balcón",
    shortName: "TB",
    kind: "agency",
    verified: true,
    brandColor: "#111827",
    brandTextColor: "#ffffff",
    logo: "/images/agencies/tu-balcon-logo.png",
  },
  inmobiliariaIndefinida: {
    name: "Inmobiliaria por confirmar",
    shortName: "IN",
    kind: "agency",
    verified: false,
    brandColor: "#7b4a35",
    brandTextColor: "#ffffff",
  },
} satisfies Record<string, PropertyPublisher>;

const agents = {
  valeriaRojas: {
    name: "Valeria Rojas",
    role: "Asesora inmobiliaria",
    email: "valeria.rojas@zentrourbano.com",
    phone: "+591 7000 0021",
    whatsapp: "59170000021",
    photo:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=85",
    areas: ["Urubó", "Sirari", "Casas familiares"],
    verified: true,
    responseTime: "Responde normalmente en menos de 1 hora",
  },
  marcoVargas: {
    name: "Marco Vargas",
    role: "Agente inmobiliario",
    email: "marco.vargas@zentrourbano.com",
    phone: "+591 7000 0022",
    whatsapp: "59170000022",
    photo:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=85",
    areas: ["Equipetrol", "Lofts", "Inversión"],
    verified: true,
    responseTime: "Responde normalmente durante el día",
  },
  andreaRivero: {
    name: "Andrea Rivero",
    role: "Dueña directa verificada",
    email: "andrea.rivero@zentrourbano.com",
    phone: "+591 7000 0023",
    whatsapp: "59170000023",
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=85",
    areas: ["Centro", "Norte Integrado", "Opciones prácticas"],
    verified: true,
    responseTime: "Responde normalmente en el día",
  },
  marketplaceReference: {
    name: "Anuncio original",
    role: "Referencia de Marketplace",
    email: "referencias@zentrourbano.com",
    phone: "Sin WhatsApp visible",
    whatsapp: "",
    photo: "",
    areas: ["Marketplace", "Referencia externa"],
    verified: false,
    responseTime: "Abre el anuncio original para contactar al responsable.",
  },
  contactoMutualista: {
    name: "Contacto del anuncio",
    role: "Responsable del inmueble",
    email: "referencias@zentrourbano.com",
    phone: "+591 7417 2652",
    whatsapp: "59174172652",
    photo: "",
    areas: ["Av. Mutualista", "Barrio Melchor Pinto"],
    verified: false,
    responseTime: "Contacto importado desde anuncio original.",
  },
  contactoUrbari: {
    name: "Contacto del anuncio",
    role: "Responsable del inmueble",
    email: "referencias@zentrourbano.com",
    phone: "+591 6204 9076 / +591 6450 3937",
    whatsapp: "59162049076",
    photo: "",
    areas: ["Urbari", "2do anillo"],
    verified: false,
    responseTime: "Contacto importado desde anuncio original.",
  },
  marioCastro: {
    name: "Luis Mario Castro",
    role: "Asesor inmobiliario - Tu Balcon",
    email: "3213173102e@gmail.com",
    phone: "+591 7501 8456 / +591 7517 6966",
    whatsapp: "59175018456",
    photo: "/images/agents/mario-castro.jpg",
    areas: ["Urubo", "Zona norte", "Zona sur", "Centro"],
    verified: true,
    responseTime: "Responde por WhatsApp para coordinar visitas.",
  },
} satisfies Record<string, PropertyAgent>;

export const properties: Property[] = [
  {
    id: "cm-001",
    slug: "casa-luminosa-urubo",
    title: "Casa luminosa con patio en Urubó",
    type: "Casa",
    operation: "Alquiler",
    price: 1250,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Urubó",
    address: "Zona Urubó, condominio residencial",
    bedrooms: 4,
    bathrooms: 4,
    garage: 2,
    area: 310,
    pets: true,
    furnished: false,
    security: true,
    pool: true,
    patio: true,
    grill: true,
    elevator: false,
    shortDescription:
      "Casa amplia, luminosa y lista para una familia que necesita privacidad sin alejarse de la ciudad.",
    longDescription:
      "Una propiedad curada por Zentro Urbano: espacios sociales abiertos, patio funcional, buena iluminación natural y una distribución cómoda para familia, visitas y trabajo desde casa.",
    requirements: [
      "Contrato mínimo de 12 meses",
      "Garantía equivalente a un mes",
      "Documentación laboral o respaldo de ingresos",
    ],
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.762,-63.251",
    whatsapp: "59170000021",
    idealFor: ["Familias", "Mascotas", "Home office"],
    tags: [
      "Familiar",
      "Ideal para mascotas",
      "Zona tranquila",
      "Seguridad 24/7",
      "Mucha iluminación natural",
    ],
    listingPlan: "featured",
    publisher: publishers.century21,
    agent: agents.valeriaRojas,
    featured: true,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.762,
      lng: -63.251,
    },
    neighborhoodHighlights: ["Privacidad", "Colegios cerca", "Condominio"],
  },
  {
    id: "cm-002",
    slug: "departamento-equipetrol-home-office",
    title: "Departamento moderno en Equipetrol",
    type: "Departamento",
    operation: "Alquiler",
    price: 680,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Equipetrol",
    address: "Equipetrol Norte, cerca de cafés y oficinas",
    bedrooms: 2,
    bathrooms: 2,
    garage: 1,
    area: 92,
    pets: false,
    furnished: true,
    security: true,
    pool: true,
    patio: false,
    grill: true,
    elevator: true,
    shortDescription:
      "Departamento amoblado con estética limpia, ideal para pareja joven o trabajo remoto.",
    longDescription:
      "Ubicación urbana, edificio con amenities y una distribución eficiente para quienes quieren vivir cerca de cafés, restaurantes y zonas de oficina. La propiedad destaca por su luz natural y sensación de orden.",
    requirements: [
      "Contrato mínimo de 6 meses",
      "Garantía equivalente a un mes",
      "No incluye expensas",
    ],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.759,-63.197",
    whatsapp: "59170000022",
    idealFor: ["Parejas", "Home office"],
    tags: [
      "Ideal para pareja joven",
      "Home office",
      "Cerca de cafés",
      "Amoblado",
      "Premium",
    ],
    listingPlan: "featured",
    publisher: publishers.remax,
    agent: agents.marcoVargas,
    featured: true,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.759,
      lng: -63.197,
    },
    neighborhoodHighlights: ["Cafés", "Oficinas", "Amenities"],
  },
  {
    id: "cm-003",
    slug: "monoambiente-estudiantes-centro",
    title: "Monoambiente práctico cerca del centro",
    type: "Departamento",
    operation: "Alquiler",
    price: 2200,
    currency: "BOB",
    city: "Santa Cruz",
    zone: "Centro",
    address: "Zona centro, conexión rápida a universidades",
    bedrooms: 1,
    bathrooms: 1,
    garage: 0,
    area: 38,
    pets: false,
    furnished: true,
    security: true,
    pool: false,
    patio: false,
    grill: false,
    elevator: true,
    shortDescription:
      "Una opción eficiente para estudiantes o primera vivienda, con ubicación práctica y bajo mantenimiento.",
    longDescription:
      "Unidad compacta y eficiente para quienes buscan una opción económica sin perder claridad, ubicación práctica y costos predecibles.",
    requirements: [
      "Contrato mínimo de 6 meses",
      "Garantía simple",
      "Ideal para una persona",
    ],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.783,-63.181",
    whatsapp: "59170000023",
    idealFor: ["Persona sola", "Estudiantes", "Económicos"],
    tags: ["Ideal para estudiantes", "Económico", "Amoblado", "Zona conectada"],
    listingPlan: "standard",
    publisher: publishers.moradaDirect,
    agent: agents.andreaRivero,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.783,
      lng: -63.181,
    },
    neighborhoodHighlights: ["Transporte", "Universidades", "Bajo costo"],
  },
  {
    id: "cm-004",
    slug: "terreno-norte-integrado",
    title: "Terreno con proyección en zona norte",
    type: "Terreno",
    operation: "Compra",
    price: 58000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Norte Integrado",
    address: "Zona norte, urbanización en crecimiento",
    bedrooms: 0,
    bathrooms: 0,
    garage: 0,
    area: 420,
    pets: true,
    furnished: false,
    security: false,
    pool: false,
    patio: true,
    grill: false,
    elevator: false,
    shortDescription:
      "Terreno para vivienda familiar o inversión de mediano plazo.",
    longDescription:
      "Terreno con contexto de zona, claridad de superficie y enfoque en potencial de vida para construir o invertir con mejor información.",
    requirements: [
      "Documentación sujeta a verificación",
      "Documentación legal por verificar",
      "Negociación directa con propietario al publicar ficha real",
    ],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.713,-63.156",
    whatsapp: "59170000023",
    idealFor: ["Familias", "Económicos"],
    tags: ["Perfecto para construir", "Económico", "Zona en crecimiento"],
    listingPlan: "standard",
    publisher: publishers.moradaDirect,
    agent: agents.andreaRivero,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.713,
      lng: -63.156,
    },
    neighborhoodHighlights: ["Proyección", "Acceso norte", "Urbanización"],
  },
  {
    id: "cm-005",
    slug: "casa-sirari-zona-tranquila",
    title: "Casa serena en Sirari",
    type: "Casa",
    operation: "Anticrético",
    price: 85000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Sirari",
    address: "Sirari, calle residencial",
    bedrooms: 3,
    bathrooms: 3,
    garage: 2,
    area: 240,
    pets: true,
    furnished: false,
    security: true,
    pool: false,
    patio: true,
    grill: true,
    elevator: false,
    shortDescription:
      "Casa cómoda en zona silenciosa, ideal para familia pequeña y mascotas.",
    longDescription:
      "Casa con enfoque lifestyle: patio, privacidad y cercanía a servicios sin entrar en una zona demasiado comercial.",
    requirements: [
      "Contrato anticrético con revisión legal",
      "Plazo sugerido de 2 años",
      "Gastos notariales según acuerdo",
    ],
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.756,-63.188",
    whatsapp: "59170000021",
    idealFor: ["Familias", "Mascotas", "Zonas tranquilas"],
    tags: ["Zona tranquila", "Ideal para mascotas", "Familiar", "Patio"],
    listingPlan: "standard",
    publisher: publishers.century21,
    agent: agents.valeriaRojas,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.756,
      lng: -63.188,
    },
    neighborhoodHighlights: ["Residencial", "Patio", "Baja densidad"],
  },
  {
    id: "cm-006",
    slug: "loft-premium-equipetrol",
    title: "Loft premium con vista urbana",
    type: "Departamento",
    operation: "Compra",
    price: 118000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Equipetrol",
    address: "Equipetrol, edificio boutique",
    bedrooms: 1,
    bathrooms: 2,
    garage: 1,
    area: 74,
    pets: true,
    furnished: false,
    security: true,
    pool: true,
    patio: false,
    grill: true,
    elevator: true,
    shortDescription:
      "Loft con acabados modernos para inversión, vida urbana o alquiler temporal.",
    longDescription:
      "Una opción de perfil premium con diseño, ubicación y potencial de rentabilidad para vida urbana o alquiler temporal.",
    requirements: [
      "Pago inicial sujeto a negociación",
      "Documentación legal por verificar",
      "Documentación legal por verificar",
    ],
    images: [
      "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.761,-63.199",
    whatsapp: "59170000022",
    idealFor: ["Persona sola", "Parejas", "Casas premium"],
    tags: ["Premium", "Perfecto para Airbnb", "Cerca de cafés", "Seguridad 24/7"],
    listingPlan: "featured",
    publisher: publishers.remax,
    agent: agents.marcoVargas,
    featured: true,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.761,
      lng: -63.199,
    },
    neighborhoodHighlights: ["Vista urbana", "Inversión", "Boutique"],
  },
  {
    id: "cm-007",
    slug: "townhouse-premium-las-palmas",
    title: "Townhouse premium en Las Palmas",
    type: "Casa",
    operation: "Alquiler",
    price: 1450,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Las Palmas",
    address: "Las Palmas, condominio privado cerca de servicios",
    bedrooms: 3,
    bathrooms: 4,
    garage: 2,
    area: 210,
    pets: true,
    furnished: false,
    security: true,
    pool: true,
    patio: true,
    grill: true,
    elevator: false,
    shortDescription:
      "Townhouse destacado para familia que busca seguridad, patio y una zona residencial con buen acceso.",
    longDescription:
      "Ficha premium con ubicación clara, ambientes sociales integrados, patio funcional y amenities de condominio. Pensada para familias o parejas que quieren mudarse sin perder privacidad.",
    requirements: [
      "Contrato mínimo de 12 meses",
      "Garantía equivalente a un mes",
      "Mascotas sujetas a reglamento del condominio",
    ],
    images: [
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600566752227-8f3b9c0c6f3f?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.785,-63.215",
    whatsapp: "59170000021",
    idealFor: ["Familias", "Mascotas", "Casas premium"],
    tags: [
      "Premium",
      "Ideal para mascotas",
      "Seguridad 24/7",
      "Patio",
      "Zona tranquila",
    ],
    listingPlan: "featured",
    publisher: publishers.century21,
    agent: agents.valeriaRojas,
    featured: true,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.785,
      lng: -63.215,
    },
    neighborhoodHighlights: ["Condominio", "Patio", "Pet friendly"],
  },
  {
    id: "cm-008",
    slug: "departamento-amoblado-sirari-premium",
    title: "Departamento amoblado en Sirari",
    type: "Departamento",
    operation: "Alquiler",
    price: 820,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Sirari",
    address: "Sirari, edificio con amenities y acceso rápido",
    bedrooms: 2,
    bathrooms: 2,
    garage: 1,
    area: 104,
    pets: false,
    furnished: true,
    security: true,
    pool: true,
    patio: false,
    grill: true,
    elevator: true,
    shortDescription:
      "Departamento destacado, amoblado y listo para mudanza rápida en una zona tranquila.",
    longDescription:
      "Una opción premium para quienes buscan comodidad inmediata: mobiliario completo, buena luz, seguridad, amenities y una ubicación residencial sin quedar lejos de Equipetrol.",
    requirements: [
      "Contrato mínimo de 6 meses",
      "Garantía equivalente a un mes",
      "No incluye expensas ni servicios",
    ],
    images: [
      "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.753,-63.19",
    whatsapp: "59170000022",
    idealFor: ["Parejas", "Home office", "Zonas tranquilas"],
    tags: [
      "Amoblado",
      "Home office",
      "Seguridad 24/7",
      "Zona tranquila",
      "Premium",
    ],
    listingPlan: "featured",
    publisher: publishers.remax,
    agent: agents.marcoVargas,
    featured: true,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.753,
      lng: -63.19,
    },
    neighborhoodHighlights: ["Amoblado", "Amenities", "Silencioso"],
  },
  {
    id: "cm-009",
    slug: "departamento-av-beni-home-office",
    title: "Departamento funcional en Av. Beni",
    type: "Departamento",
    operation: "Alquiler",
    price: 3900,
    currency: "BOB",
    city: "Santa Cruz",
    zone: "Av. Beni",
    address: "Av. Beni, zona norte con acceso rápido",
    bedrooms: 2,
    bathrooms: 2,
    garage: 1,
    area: 86,
    pets: false,
    furnished: true,
    security: true,
    pool: false,
    patio: false,
    grill: false,
    elevator: true,
    shortDescription:
      "Departamento práctico para pareja o home office, con buena conexión hacia el norte.",
    longDescription:
      "Una opción curada para quienes buscan vivir en zona norte sin subir demasiado el presupuesto. Tiene distribución eficiente, edificio con seguridad y acceso rápido a servicios diarios.",
    requirements: [
      "Contrato mínimo de 6 meses",
      "Garantía equivalente a un mes",
      "No incluye expensas",
    ],
    images: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.736,-63.175",
    whatsapp: "59170000022",
    idealFor: ["Parejas", "Home office"],
    tags: ["Home office", "Amoblado", "Zona conectada", "Seguridad 24/7"],
    listingPlan: "standard",
    publisher: publishers.remax,
    agent: agents.marcoVargas,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.736,
      lng: -63.175,
    },
    neighborhoodHighlights: ["Zona norte", "Conectado", "Edificio"],
  },
  {
    id: "cm-010",
    slug: "casa-hamacas-patio-premium",
    title: "Casa con patio en Hamacas",
    type: "Casa",
    operation: "Alquiler",
    price: 980,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Hamacas",
    address: "Hamacas, zona residencial norte",
    bedrooms: 3,
    bathrooms: 3,
    garage: 2,
    area: 260,
    pets: true,
    furnished: false,
    security: true,
    pool: false,
    patio: true,
    grill: true,
    elevator: false,
    shortDescription:
      "Casa destacada para familia que quiere zona norte, patio y privacidad.",
    longDescription:
      "Ficha premium ubicada al norte de la ciudad, con patio amplio, garaje doble y espacios sociales cómodos. Ideal para familias que priorizan tranquilidad y acceso a colegios.",
    requirements: [
      "Contrato mínimo de 12 meses",
      "Garantía equivalente a un mes",
      "Mascotas permitidas con acuerdo previo",
    ],
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.724,-63.174",
    whatsapp: "59170000021",
    idealFor: ["Familias", "Mascotas", "Zonas tranquilas"],
    tags: ["Familiar", "Ideal para mascotas", "Patio", "Zona tranquila"],
    listingPlan: "featured",
    publisher: publishers.century21,
    agent: agents.valeriaRojas,
    featured: true,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.724,
      lng: -63.174,
    },
    neighborhoodHighlights: ["Norte", "Patio", "Colegios"],
  },
  {
    id: "cm-011",
    slug: "departamento-av-busch-estudiantes",
    title: "Departamento cerca de Av. Busch",
    type: "Departamento",
    operation: "Alquiler",
    price: 3100,
    currency: "BOB",
    city: "Santa Cruz",
    zone: "Av. Busch",
    address: "Av. Busch, cerca de universidades y transporte",
    bedrooms: 2,
    bathrooms: 1,
    garage: 0,
    area: 68,
    pets: false,
    furnished: true,
    security: true,
    pool: false,
    patio: false,
    grill: false,
    elevator: true,
    shortDescription:
      "Opción práctica para estudiantes o roommates cerca de transporte y servicios.",
    longDescription:
      "Departamento compacto con ubicación céntrica, pensado para quienes necesitan movilidad diaria y costos controlados sin perder claridad en la ficha.",
    requirements: [
      "Contrato mínimo de 6 meses",
      "Garantía simple",
      "Ideal para máximo dos personas",
    ],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.777,-63.195",
    whatsapp: "59170000023",
    idealFor: ["Estudiantes", "Persona sola", "Económicos"],
    tags: ["Ideal para estudiantes", "Económico", "Amoblado", "Zona conectada"],
    listingPlan: "standard",
    publisher: publishers.moradaDirect,
    agent: agents.andreaRivero,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.777,
      lng: -63.195,
    },
    neighborhoodHighlights: ["Transporte", "Universidades", "Céntrico"],
  },
  {
    id: "cm-012",
    slug: "casa-urbari-anticretico",
    title: "Casa cómoda en Urbari",
    type: "Casa",
    operation: "Anticrético",
    price: 72000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Urbari",
    address: "Urbari, calle residencial con acceso a segundo anillo",
    bedrooms: 3,
    bathrooms: 2,
    garage: 2,
    area: 190,
    pets: true,
    furnished: false,
    security: false,
    pool: false,
    patio: true,
    grill: true,
    elevator: false,
    shortDescription:
      "Casa en anticrético para familia pequeña que quiere zona oeste y patio.",
    longDescription:
      "Propiedad de perfil familiar con espacios sencillos, patio funcional y ubicación práctica para moverse hacia el centro o zona oeste.",
    requirements: [
      "Contrato anticrético con revisión legal",
      "Plazo sugerido de 2 años",
      "Gastos notariales según acuerdo",
    ],
    images: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.793,-63.206",
    whatsapp: "59170000021",
    idealFor: ["Familias", "Mascotas", "Económicos"],
    tags: ["Familiar", "Patio", "Ideal para mascotas", "Zona conectada"],
    listingPlan: "standard",
    publisher: publishers.century21,
    agent: agents.valeriaRojas,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.793,
      lng: -63.206,
    },
    neighborhoodHighlights: ["Oeste", "Patio", "Familiar"],
  },
  {
    id: "cm-013",
    slug: "terreno-doble-via-la-guardia",
    title: "Terreno amplio por Doble Vía La Guardia",
    type: "Terreno",
    operation: "Compra",
    price: 74000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Doble Vía La Guardia",
    address: "Doble Vía La Guardia, zona sur oeste en expansión",
    bedrooms: 0,
    bathrooms: 0,
    garage: 0,
    area: 620,
    pets: true,
    furnished: false,
    security: false,
    pool: false,
    patio: true,
    grill: false,
    elevator: false,
    shortDescription:
      "Terreno destacado para construir o invertir en una zona con crecimiento sostenido.",
    longDescription:
      "Opción premium de terreno con superficie generosa, ubicación de expansión y enfoque claro para proyecto familiar o inversión de mediano plazo.",
    requirements: [
      "Documentación sujeta a verificación",
      "Levantamiento y límites por confirmar",
      "Negociación directa al avanzar",
    ],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.817,-63.228",
    whatsapp: "59170000023",
    idealFor: ["Familias", "Económicos"],
    tags: ["Perfecto para construir", "Zona en crecimiento", "Inversión"],
    listingPlan: "featured",
    publisher: publishers.moradaDirect,
    agent: agents.andreaRivero,
    featured: true,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.817,
      lng: -63.228,
    },
    neighborhoodHighlights: ["Sur oeste", "Expansión", "620 m²"],
  },
  {
    id: "cm-014",
    slug: "monoambiente-mutualista",
    title: "Monoambiente cerca de Mutualista",
    type: "Departamento",
    operation: "Alquiler",
    price: 1900,
    currency: "BOB",
    city: "Santa Cruz",
    zone: "Mutualista",
    address: "Mutualista, zona este con comercio cercano",
    bedrooms: 1,
    bathrooms: 1,
    garage: 0,
    area: 34,
    pets: false,
    furnished: true,
    security: true,
    pool: false,
    patio: false,
    grill: false,
    elevator: false,
    shortDescription:
      "Monoambiente económico para una persona, con comercio y transporte cerca.",
    longDescription:
      "Unidad simple y bien ubicada para quien prioriza presupuesto, movilidad y mantenimiento bajo. Una ficha directa para búsquedas rápidas en zona este.",
    requirements: [
      "Contrato mínimo de 6 meses",
      "Garantía simple",
      "Ideal para una persona",
    ],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.774,-63.155",
    whatsapp: "59170000023",
    idealFor: ["Persona sola", "Estudiantes", "Económicos"],
    tags: ["Económico", "Ideal para estudiantes", "Amoblado", "Zona conectada"],
    listingPlan: "standard",
    publisher: publishers.moradaDirect,
    agent: agents.andreaRivero,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.774,
      lng: -63.155,
    },
    neighborhoodHighlights: ["Este", "Comercio", "Transporte"],
  },
  {
    id: "cm-015",
    slug: "casa-av-alemana-familiar",
    title: "Casa familiar por Av. Alemana",
    type: "Casa",
    operation: "Compra",
    price: 128000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Av. Alemana",
    address: "Av. Alemana, zona norte este residencial",
    bedrooms: 4,
    bathrooms: 3,
    garage: 2,
    area: 280,
    pets: true,
    furnished: false,
    security: true,
    pool: false,
    patio: true,
    grill: true,
    elevator: false,
    shortDescription:
      "Casa para compra con perfil familiar, patio y buena conectividad hacia el norte.",
    longDescription:
      "Propiedad pensada para familia que necesita ambientes definidos, patio y acceso a servicios de zona norte este. La ficha prioriza información clara para comparar antes de visitar.",
    requirements: [
      "Documentación legal por verificar",
      "Pago inicial sujeto a negociación",
      "Visita previa coordinación",
    ],
    images: [
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600566752227-8f3b9c0c6f3f?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.752,-63.164",
    whatsapp: "59170000021",
    idealFor: ["Familias", "Mascotas"],
    tags: ["Familiar", "Ideal para mascotas", "Patio", "Seguridad 24/7"],
    listingPlan: "standard",
    publisher: publishers.century21,
    agent: agents.valeriaRojas,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.752,
      lng: -63.164,
    },
    neighborhoodHighlights: ["Norte este", "Patio", "Familiar"],
  },
  {
    id: "cm-016",
    slug: "departamento-zona-sur-premium",
    title: "Departamento premium en zona sur",
    type: "Departamento",
    operation: "Alquiler",
    price: 560,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Zona Sur",
    address: "Zona Sur, cerca de Av. Santos Dumont",
    bedrooms: 2,
    bathrooms: 2,
    garage: 1,
    area: 88,
    pets: false,
    furnished: true,
    security: true,
    pool: true,
    patio: false,
    grill: true,
    elevator: true,
    shortDescription:
      "Departamento destacado al sur de la ciudad, amoblado y con amenities.",
    longDescription:
      "Opción premium para quienes necesitan vivir hacia zona sur con ficha clara, edificio con seguridad y un presupuesto medio en dólares.",
    requirements: [
      "Contrato mínimo de 6 meses",
      "Garantía equivalente a un mes",
      "No incluye expensas",
    ],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.822,-63.183",
    whatsapp: "59170000022",
    idealFor: ["Parejas", "Home office"],
    tags: ["Premium", "Amoblado", "Home office", "Seguridad 24/7"],
    listingPlan: "featured",
    publisher: publishers.remax,
    agent: agents.marcoVargas,
    featured: true,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.822,
      lng: -63.183,
    },
    neighborhoodHighlights: ["Sur", "Amenities", "Amoblado"],
  },
  {
    id: "cm-017",
    slug: "casa-plan-3000-economica",
    title: "Casa económica en Plan 3000",
    type: "Casa",
    operation: "Alquiler",
    price: 2600,
    currency: "BOB",
    city: "Santa Cruz",
    zone: "Plan 3000",
    address: "Plan 3000, zona residencial con comercio cercano",
    bedrooms: 3,
    bathrooms: 2,
    garage: 1,
    area: 150,
    pets: true,
    furnished: false,
    security: false,
    pool: false,
    patio: true,
    grill: false,
    elevator: false,
    shortDescription:
      "Casa accesible para familia que prioriza espacio y presupuesto.",
    longDescription:
      "Opción económica con dormitorios suficientes, patio y ubicación en zona este-sur. La ficha ayuda a comparar rápido sin esconder condiciones básicas.",
    requirements: [
      "Contrato mínimo de 12 meses",
      "Garantía simple",
      "Servicios por cuenta del inquilino",
    ],
    images: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.81,-63.137",
    whatsapp: "59170000023",
    idealFor: ["Familias", "Mascotas", "Económicos"],
    tags: ["Económico", "Familiar", "Patio", "Ideal para mascotas"],
    listingPlan: "standard",
    publisher: publishers.moradaDirect,
    agent: agents.andreaRivero,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.81,
      lng: -63.137,
    },
    neighborhoodHighlights: ["Este sur", "Económico", "Patio"],
  },
  {
    id: "cm-018",
    slug: "terreno-porongo-vista",
    title: "Terreno con vista hacia Porongo",
    type: "Terreno",
    operation: "Compra",
    price: 46000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Porongo",
    address: "Porongo, área residencial en crecimiento",
    bedrooms: 0,
    bathrooms: 0,
    garage: 0,
    area: 500,
    pets: true,
    furnished: false,
    security: false,
    pool: false,
    patio: true,
    grill: false,
    elevator: false,
    shortDescription:
      "Terreno para proyecto familiar fuera del centro urbano, con perfil de inversión tranquila.",
    longDescription:
      "Opción de terreno hacia Porongo para quienes buscan más aire, menor densidad y una ficha clara antes de coordinar visita.",
    requirements: [
      "Documentación sujeta a verificación",
      "Límites y acceso por confirmar",
      "Negociación directa al avanzar",
    ],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1600&q=85",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.741,-63.282",
    whatsapp: "59170000023",
    idealFor: ["Familias", "Zonas tranquilas", "Económicos"],
    tags: ["Zona tranquila", "Perfecto para construir", "Económico"],
    listingPlan: "standard",
    publisher: publishers.moradaDirect,
    agent: agents.andreaRivero,
    featured: false,
    published: true,
    isSeeded: true,
    coordinates: {
      lat: -17.741,
      lng: -63.282,
    },
    neighborhoodHighlights: ["Porongo", "Tranquilo", "500 m²"],
  },
  {
    id: "real-002",
    slug: "departamento-torre-urbari-2do-anillo",
    title: "Departamento equipado en Torre Urbari",
    type: "Departamento",
    operation: "Alquiler",
    price: 2200,
    currency: "BOB",
    city: "Santa Cruz",
    zone: "Urbari",
    address: "Barrio Urbari, sobre el 2do anillo, Torre Urbari",
    bedrooms: 1,
    bathrooms: 1,
    garage: 1,
    area: 50,
    pets: false,
    furnished: true,
    security: false,
    pool: true,
    patio: false,
    grill: true,
    elevator: false,
    shortDescription:
      "Departamento equipado de 50 m2 en Torre Urbari, con 1 dormitorio en suite, garaje, balcon y areas comunes.",
    longDescription:
      "Departamento en alquiler en Urbari, sobre el 2do anillo, con ubicacion practica cerca de centros comerciales, bancos, colegios y servicios. Cuenta con 1 dormitorio en suite, living comedor, cocina americana, balcon, area de servicio, garaje y gas domiciliario. Esta equipado con lavadora, secadora, aires acondicionados, cocina, heladera y extractora. El edificio ofrece area verde, piscina y churrasqueras. Fotos y disponibilidad sujetas a confirmacion con el responsable del anuncio.",
    requirements: [
      "Mes de alquiler",
      "Mes de garantia",
      "Mes de comision inmobiliaria",
    ],
    images: [
      "/images/properties/torre-urbari/01.jpg",
      "/images/properties/torre-urbari/02.jpg",
      "/images/properties/torre-urbari/03.jpg",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.7936417,-63.1947039",
    whatsapp: "59162049076",
    idealFor: ["Persona sola", "Parejas", "Home office"],
    tags: ["Equipado", "Garaje", "Piscina", "Churrasquera", "Balcon"],
    listingPlan: "standard",
    publisher: publishers.marketplace,
    agent: agents.contactoUrbari,
    featured: false,
    published: true,
    isSeeded: false,
    coordinates: {
      lat: -17.7936417,
      lng: -63.1947039,
    },
    neighborhoodHighlights: ["Urbari", "2do anillo", "Servicios"],
  },
  {
    id: "real-010",
    slug: "casa-amoblada-condominio-brisas-del-norte-1",
    title: "Casa amoblada en Cond. Brisas del Norte 1",
    type: "Casa",
    operation: "Alquiler",
    price: 2500,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Zona Norte",
    address: "Condominio Brisas del Norte 1, entre 8vo y 9no anillo",
    bedrooms: 5,
    bathrooms: 0,
    garage: 2,
    area: 0,
    pets: false,
    furnished: true,
    security: true,
    pool: true,
    patio: true,
    grill: true,
    elevator: false,
    shortDescription:
      "Casa amoblada con 5 dormitorios, escritorio, patio amplio, piscina y areas sociales completas.",
    longDescription:
      "Casa amoblada en alquiler dentro del Condominio Brisas del Norte 1, zona norte entre 8vo y 9no anillo. La propiedad cuenta con 5 dormitorios, uno de ellos en suite, escritorio, living-comedor, cocina cerrada, area BBQ, amplio patio con piscina, garaje para 2 vehiculos y aires acondicionados en toda la casa. El alquiler incluye expensas y se maneja con tipo de cambio oficial. El condominio ofrece piscina, churrasqueras, salon de eventos, parque infantil y seguridad 24 horas.",
    requirements: [
      "Expensas incluidas",
      "Tipo de cambio oficial",
      "Coordinar visita con Mario Castro",
    ],
    images: [
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/01.jpg",
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/02.jpg",
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/03.jpg",
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/04.jpg",
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/05.jpg",
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/06.jpg",
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/07.jpg",
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/08.jpg",
      "/images/properties/casa-amoblada-condominio-brisas-del-norte-1/09.jpg",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.7032611,-63.1791325",
    whatsapp: "59175018456",
    idealFor: ["Familias", "Casas premium", "Mascotas"],
    tags: ["Amoblada", "Piscina", "Seguridad 24/7", "Area BBQ", "Expensas incluidas"],
    listingPlan: "standard",
    publisher: publishers.tuBalcon,
    agent: agents.marioCastro,
    featured: false,
    published: true,
    isSeeded: false,
    coordinates: {
      lat: -17.7032611,
      lng: -63.1791325,
    },
    neighborhoodHighlights: ["Brisas del Norte", "Zona norte", "Condominio"],
  },
  {
    id: "real-011",
    slug: "casa-en-venta-zona-sur-santos-dumont",
    title: "Casa en venta sobre Santos Dumont, zona sur",
    type: "Casa",
    operation: "Compra",
    price: 270000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Zona Sur",
    address: "6to anillo Santos Dumont, cerca de lineas 110 y 23",
    bedrooms: 5,
    bathrooms: 0,
    garage: 1,
    area: 360,
    pets: false,
    furnished: false,
    security: false,
    pool: true,
    patio: true,
    grill: false,
    elevator: false,
    shortDescription:
      "Casa en venta con 360 m2 de terreno, 260 m2 construidos, piscina, terraza y departamento independiente.",
    longDescription:
      "Casa en venta ubicada en zona sur, sobre 6to anillo Santos Dumont, con acceso por lineas 110 y 23. Tiene 360 m2 de terreno y 260 m2 de construccion. En planta alta cuenta con 3 dormitorios, uno en suite. La vivienda principal incluye sala amplia, estudio, cocina, banos, piscina, terraza y garaje. Tambien incorpora un departamento independiente de 2 dormitorios, aires acondicionados y acabados en madera chiquitana. Precio de referencia con tipo de cambio 7.",
    requirements: [
      "Tipo de cambio 7",
      "Documentacion a verificar antes de reserva",
      "Coordinar visita con Mario Castro",
    ],
    images: [
      "/images/properties/casa-en-venta-zona-sur-santos-dumont/01.jpg",
      "/images/properties/casa-en-venta-zona-sur-santos-dumont/02.jpg",
      "/images/properties/casa-en-venta-zona-sur-santos-dumont/03.jpg",
      "/images/properties/casa-en-venta-zona-sur-santos-dumont/04.jpg",
      "/images/properties/casa-en-venta-zona-sur-santos-dumont/05.jpg",
      "/images/properties/casa-en-venta-zona-sur-santos-dumont/06.jpg",
      "/images/properties/casa-en-venta-zona-sur-santos-dumont/07.jpg",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.8408779,-63.1800421",
    whatsapp: "59175018456",
    idealFor: ["Familias", "Casas premium", "Home office"],
    tags: ["Casa en venta", "Departamento independiente", "Piscina", "Terraza", "Madera chiquitana"],
    listingPlan: "standard",
    publisher: publishers.tuBalcon,
    agent: agents.marioCastro,
    featured: false,
    published: true,
    isSeeded: false,
    coordinates: {
      lat: -17.8408779,
      lng: -63.1800421,
    },
    neighborhoodHighlights: ["Santos Dumont", "Zona sur", "6to anillo"],
  },
  {
    id: "real-012",
    slug: "departamento-amoblado-condominio-milan-banzer",
    title: "Departamento amoblado en Condominio Milan",
    type: "Departamento",
    operation: "Compra",
    price: 65000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Zona Norte",
    address: "Condominio Privado Milan, 8vo anillo Av. Banzer",
    bedrooms: 1,
    bathrooms: 1,
    garage: 1,
    area: 0,
    pets: false,
    furnished: true,
    security: true,
    pool: true,
    patio: false,
    grill: true,
    elevator: false,
    shortDescription:
      "Departamento amoblado y equipado con 1 dormitorio, parqueo, piscina, gimnasio y seguridad 24/7.",
    longDescription:
      "Departamento amoblado en venta dentro del Condominio Milan, sobre 8vo anillo y Av. Banzer, zona norte. Cuenta con 1 dormitorio, sala-comedor integrados, cocina equipada, bano moderno y parqueo incluido. El condominio ofrece seguridad 24/7, piscina, gimnasio, areas sociales y churrasquera. Se entrega totalmente amoblado y equipado. Precio de referencia con tipo de cambio 7.",
    requirements: [
      "Tipo de cambio 7",
      "Totalmente amoblado y equipado",
      "Coordinar visita con Mario Castro",
    ],
    images: [
      "/images/properties/departamento-amoblado-condominio-milan-banzer/01.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/02.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/03.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/04.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/05.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/06.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/07.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/08.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/09.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/10.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/11.jpg",
      "/images/properties/departamento-amoblado-condominio-milan-banzer/12.jpg",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.7130777,-63.1788698",
    whatsapp: "59175018456",
    idealFor: ["Persona sola", "Parejas", "Home office"],
    tags: ["Amoblado", "Parqueo", "Piscina", "Gimnasio", "Seguridad 24/7"],
    listingPlan: "standard",
    publisher: publishers.tuBalcon,
    agent: agents.marioCastro,
    featured: false,
    published: true,
    isSeeded: false,
    coordinates: {
      lat: -17.7130777,
      lng: -63.1788698,
    },
    neighborhoodHighlights: ["Av. Banzer", "8vo anillo", "Condominio Milan"],
  },
  {
    id: "real-013",
    slug: "terreno-urubo-golf",
    title: "Terreno en Urubo Golf",
    type: "Terreno",
    operation: "Compra",
    price: 230000,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Urubo Golf",
    address: "Urubo Golf, zona residencial",
    bedrooms: 0,
    bathrooms: 0,
    garage: 0,
    area: 1080,
    pets: false,
    furnished: false,
    security: false,
    pool: false,
    patio: false,
    grill: false,
    elevator: false,
    shortDescription:
      "Terreno de 1.080 m2 en Urubo Golf, ideal para proyecto residencial premium.",
    longDescription:
      "Terreno en venta dentro del entorno de Urubo Golf, con 1.080 m2 de superficie y acceso por camino vecinal interno. Es una opcion pensada para construir una vivienda de perfil premium en una zona residencial consolidada del Urubo. Precio de referencia en dolares con tipo de cambio paralelo, a confirmar con el asesor antes de cualquier reserva.",
    requirements: [
      "Precio de referencia con tipo de cambio paralelo",
      "Documentacion a verificar antes de reserva",
      "Coordinar visita con Mario Castro",
    ],
    images: [
      "/images/properties/terreno-urubo-golf/01.jpg",
      "/images/properties/terreno-urubo-golf/02.jpg",
      "/images/properties/terreno-urubo-golf/03.jpg",
      "/images/properties/terreno-urubo-golf/04.jpg",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.7344469,-63.2291992",
    whatsapp: "59175018456",
    idealFor: ["Casas premium", "Familias", "Zonas tranquilas"],
    tags: ["1.080 m2", "Urubo Golf", "Proyecto residencial", "Zona premium", "Terreno"],
    listingPlan: "standard",
    publisher: publishers.tuBalcon,
    agent: agents.marioCastro,
    featured: false,
    published: true,
    isSeeded: false,
    coordinates: {
      lat: -17.7344469,
      lng: -63.2291992,
    },
    neighborhoodHighlights: ["Urubo Golf", "Urubo", "Zona residencial"],
  },
  {
    id: "real-014",
    slug: "casa-alquiler-sobre-pavimento-zona-sur",
    title: "Casa en alquiler sobre pavimento, zona sur",
    type: "Casa",
    operation: "Alquiler",
    price: 3000,
    currency: "BOB",
    city: "Santa Cruz",
    zone: "Zona Sur",
    address: "Zona sur, detras del Hospital Frances",
    bedrooms: 2,
    bathrooms: 1,
    garage: 0,
    area: 0,
    pets: false,
    furnished: false,
    security: false,
    pool: false,
    patio: true,
    grill: false,
    elevator: false,
    shortDescription:
      "Casa en alquiler sobre pavimento con 2 dormitorios, living comedor, cocina y patio.",
    longDescription:
      "Casa en alquiler ubicada en zona sur, detras del Hospital Frances, con acceso sobre pavimento. Cuenta con 2 dormitorios, living comedor, cocina, 1 bano y patio. Es una opcion funcional para familia pequena o pareja que busca moverse en zona sur con condiciones claras de ingreso.",
    requirements: [
      "Pago por adelantado",
      "1 mes de garantia",
      "Mes de comision inmobiliaria",
      "Coordinar visita con Mario Castro",
    ],
    images: [
      "/images/properties/casa-alquiler-sobre-pavimento-zona-sur/01.jpg",
      "/images/properties/casa-alquiler-sobre-pavimento-zona-sur/02.jpg",
      "/images/properties/casa-alquiler-sobre-pavimento-zona-sur/03.jpg",
      "/images/properties/casa-alquiler-sobre-pavimento-zona-sur/04.jpg",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.8554,-63.1901",
    whatsapp: "59175018456",
    idealFor: ["Familias", "Parejas", "Económicos"],
    tags: ["Sobre pavimento", "Zona sur", "Patio", "2 dormitorios", "Hospital Frances"],
    listingPlan: "standard",
    publisher: publishers.tuBalcon,
    agent: agents.marioCastro,
    featured: false,
    published: true,
    isSeeded: false,
    coordinates: {
      lat: -17.8554,
      lng: -63.1901,
    },
    neighborhoodHighlights: ["Hospital Frances", "Zona sur", "Pavimento"],
  },
  {
    id: "real-015",
    slug: "monoambiente-amoblado-tres-carabelas-centro",
    title: "Monoambiente amoblado en Cond. Tres Carabelas",
    type: "Departamento",
    operation: "Alquiler",
    price: 350,
    currency: "USD",
    city: "Santa Cruz",
    zone: "Centro",
    address: "Calle Velasco, Condominio Tres Carabelas, diagonal Colegio Cristo Rey",
    bedrooms: 1,
    bathrooms: 1,
    garage: 0,
    area: 34,
    pets: false,
    furnished: true,
    security: true,
    pool: false,
    patio: false,
    grill: true,
    elevator: true,
    shortDescription:
      "Monoambiente amoblado de 34 m2 en piso 12, con expensas incluidas y hermosa vista.",
    longDescription:
      "Monoambiente amoblado en alquiler en zona Centro, Calle Velasco, Condominio Tres Carabelas, diagonal al Colegio Cristo Rey. Cuenta con dormitorio con ropero empotrado, bano privado, cocina, lavanderia, gas domiciliario, aire acondicionado y hermosa vista desde el piso 12. El precio es de 350 dolares e incluye expensas. El edificio cuenta con seguridad 24 horas, ascensores, camaras y churrasqueras. No incluye parqueo.",
    requirements: [
      "Pago en dolares",
      "Expensas incluidas",
      "Sin parqueo",
      "Coordinar visita con Mario Castro",
    ],
    images: [
      "/images/properties/monoambiente-amoblado-tres-carabelas-centro/01.jpg",
      "/images/properties/monoambiente-amoblado-tres-carabelas-centro/02.jpg",
      "/images/properties/monoambiente-amoblado-tres-carabelas-centro/03.jpg",
      "/images/properties/monoambiente-amoblado-tres-carabelas-centro/04.jpg",
      "/images/properties/monoambiente-amoblado-tres-carabelas-centro/05.jpg",
      "/images/properties/monoambiente-amoblado-tres-carabelas-centro/06.jpg",
    ],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=-17.7821,-63.1768",
    whatsapp: "59175018456",
    idealFor: ["Persona sola", "Estudiantes", "Home office"],
    tags: ["Monoambiente", "Amoblado", "Expensas incluidas", "Piso 12", "Centro"],
    listingPlan: "standard",
    publisher: publishers.tuBalcon,
    agent: agents.marioCastro,
    featured: false,
    published: true,
    isSeeded: false,
    coordinates: {
      lat: -17.7821,
      lng: -63.1768,
    },
    neighborhoodHighlights: ["Calle Velasco", "Colegio Cristo Rey", "Centro"],
  },
];

if (process.env.ZENTRO_ENABLE_LEGACY_DEMOS === "1") {
  properties.push(...createCuratedExpansionProperties());
}

// Only real or manually approved properties should be exposed publicly.
// Seed/demo records remain available only as legacy reference data.
export const realProperties = properties.filter((property) => !property.isSeeded);

export const publishedProperties = realProperties
  .filter((property) => property.published)
  .sort(sortPropertiesByVisibility);
export const featuredProperties = publishedProperties.filter(
  (property) => property.listingPlan === "featured",
);

export function getPropertyBySlug(slug: string) {
  return publishedProperties.find((property) => property.slug === slug);
}

export function getSimilarProperties(property: Property) {
  return publishedProperties
    .filter((candidate) => candidate.slug !== property.slug)
    .filter(
      (candidate) =>
        candidate.zone === property.zone ||
        candidate.operation === property.operation ||
        candidate.idealFor.some((tag) => property.idealFor.includes(tag)),
    )
    .slice(0, 3);
}

export function formatPrice(property: Pick<Property, "currency" | "price" | "operation">) {
  const amount = new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 0,
  }).format(property.price);

  const prefix = property.currency === "USD" ? "$us" : "Bs";
  const suffix = property.operation === "Alquiler" ? "/mes" : "";

  return `${prefix} ${amount}${suffix}`;
}

function sortPropertiesByVisibility(a: Property, b: Property) {
  const planRank = getListingPlanRank(a) - getListingPlanRank(b);

  if (planRank !== 0) {
    return planRank;
  }

  return a.id.localeCompare(b.id);
}

function getListingPlanRank(property: Pick<Property, "listingPlan">) {
  return property.listingPlan === "featured" ? 0 : 1;
}

function createCuratedExpansionProperties(): Property[] {
  const zones = [
    {
      zone: "Equipetrol",
      lat: -17.759,
      lng: -63.198,
      highlights: ["Cafes", "Oficinas", "Vida urbana"],
    },
    {
      zone: "Urubó",
      lat: -17.765,
      lng: -63.252,
      highlights: ["Privacidad", "Condominios", "Naturaleza"],
    },
    {
      zone: "Sirari",
      lat: -17.754,
      lng: -63.189,
      highlights: ["Residencial", "Baja densidad", "Servicios"],
    },
    {
      zone: "Las Palmas",
      lat: -17.782,
      lng: -63.212,
      highlights: ["Familiar", "Accesos", "Patio"],
    },
    {
      zone: "Norte Integrado",
      lat: -17.714,
      lng: -63.156,
      highlights: ["Colegios", "Proyección", "Conectividad"],
    },
    {
      zone: "Av. Beni",
      lat: -17.73,
      lng: -63.179,
      highlights: ["Transporte", "Comercio", "Conexión"],
    },
    {
      zone: "Hamacas",
      lat: -17.702,
      lng: -63.168,
      highlights: ["Familias", "Colegios", "Zona norte"],
    },
    {
      zone: "Centro",
      lat: -17.783,
      lng: -63.181,
      highlights: ["Universidades", "Transporte", "Bajo costo"],
    },
    {
      zone: "Urbarí",
      lat: -17.803,
      lng: -63.191,
      highlights: ["Tradicional", "Servicios", "Calles tranquilas"],
    },
    {
      zone: "Cambódromo",
      lat: -17.711,
      lng: -63.198,
      highlights: ["Norte", "Acceso rapido", "Espacio"],
    },
    {
      zone: "Mutualista",
      lat: -17.762,
      lng: -63.165,
      highlights: ["Comercio", "Conexión", "Oportunidad"],
    },
    {
      zone: "Doble vía La Guardia",
      lat: -17.822,
      lng: -63.234,
      highlights: ["Industrial", "Accesos", "Terreno"],
    },
  ];
  const apartmentImages = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=82",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=82",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=82",
  ];
  const houseImages = [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=82",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=82",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=82",
  ];
  const landImages = [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=82",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=82",
    "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1600&q=82",
  ];
  const typeCycle: PropertyType[] = ["Departamento", "Casa", "Departamento", "Terreno"];
  const operationCycle: Operation[] = ["Alquiler", "Compra", "Alquiler", "Anticrético"];
  const lifestyleCycle = [
    ["Persona sola", "Home office"],
    ["Parejas", "Mascotas"],
    ["Familias", "Zonas tranquilas"],
    ["Estudiantes", "Económicos"],
    ["Casas premium", "Home office"],
  ];
  const tagCycle = [
    ["Home office", "Mucha iluminación natural", "Cerca de cafés"],
    ["Ideal para mascotas", "Zona tranquila", "Familiar"],
    ["Seguridad 24/7", "Premium", "Cerca de colegios"],
    ["Ideal para estudiantes", "Económico", "Zona conectada"],
    ["Perfecto para Airbnb", "Cerca de cafés", "Amoblado"],
  ];

  return Array.from({ length: 42 }, (_, index) => {
    const zone = zones[index % zones.length];
    const type = typeCycle[index % typeCycle.length];
    const operation = operationCycle[index % operationCycle.length];
    const isLand = type === "Terreno";
    const isApartment = type === "Departamento";
    const isFeatured = index % 5 === 0 || (isApartment && index % 7 === 0);
    const bedrooms = isLand ? 0 : isApartment ? (index % 4 === 0 ? 1 : (index % 3) + 1) : (index % 3) + 3;
    const bathrooms = isLand ? 0 : isApartment ? Math.max(1, bedrooms) : bedrooms;
    const area = isLand ? 360 + index * 14 : isApartment ? 42 + (index % 8) * 13 : 180 + (index % 7) * 28;
    const currency: Property["currency"] = operation === "Alquiler" && index % 3 === 0 ? "BOB" : "USD";
    const price =
      operation === "Compra"
        ? isLand
          ? 42000 + index * 1800
          : isApartment
            ? 62000 + index * 2500
            : 98000 + index * 4200
        : operation === "Anticrético"
          ? isLand
            ? 38000 + index * 1200
            : 60000 + index * 2200
          : currency === "BOB"
            ? 2200 + index * 130
            : isApartment
              ? 360 + index * 24
              : 780 + index * 35;
    const lat = Number((zone.lat + ((index % 6) - 2.5) * 0.006).toFixed(6));
    const lng = Number((zone.lng + ((index % 7) - 3) * 0.0065).toFixed(6));
    const titleType = isLand ? "Terreno" : isApartment && bedrooms === 1 ? "Monoambiente" : type;
    const title =
      operation === "Alquiler"
        ? `${titleType} en alquiler en ${zone.zone}`
        : operation === "Compra"
          ? `${titleType} en venta en ${zone.zone}`
          : `${titleType} en anticrético en ${zone.zone}`;
    const images = isLand ? landImages : isApartment ? apartmentImages : houseImages;
    const agent = index % 3 === 0 ? agents.andreaRivero : index % 3 === 1 ? agents.valeriaRojas : agents.marcoVargas;
    const publisher =
      index % 4 === 0
        ? publishers.moradaDirect
        : index % 4 === 1
          ? publishers.century21
          : publishers.remax;

    return {
      id: `mc-${String(index + 19).padStart(3, "0")}`,
      slug: slugify(`${title}-${index + 19}`),
      title,
      type,
      operation,
      price,
      currency,
      city: "Santa Cruz",
      zone: zone.zone,
      address: `${zone.zone}, ubicación referencial verificada`,
      bedrooms,
      bathrooms,
      garage: isLand ? 0 : index % 4 === 0 ? 0 : isApartment ? 1 : 2,
      area,
      pets: !isLand && index % 3 !== 0,
      furnished: isApartment && index % 2 === 0,
      security: !isLand && index % 2 === 0,
      pool: !isLand && isFeatured,
      patio: !isApartment,
      grill: !isLand && index % 3 === 1,
      elevator: isApartment && index % 2 === 0,
      shortDescription: isLand
        ? `Lote curado en ${zone.zone}, pensado para inversión o proyecto familiar con ubicación clara.`
        : `Ficha curada en ${zone.zone}, con datos claros, mapa real y contacto directo por WhatsApp.`,
      longDescription: isLand
        ? `Terreno referencial dentro del catálogo curado de Zentro Urbano. Incluye superficie, zona, coordenadas y puntos clave para evaluar el potencial sin navegar una publicación desordenada.`
        : `Propiedad organizada para comparar rápido: ambientes, requisitos, ubicación, etiquetas lifestyle y contacto del responsable. El objetivo es que el usuario entienda si encaja antes de escribir por WhatsApp.`,
      requirements:
        operation === "Alquiler"
          ? ["Garantía a coordinar", "Contrato según acuerdo", "Disponibilidad sujeta a confirmación"]
          : ["Documentación legal por verificar", "Negociación directa al avanzar", "Disponibilidad sujeta a confirmación"],
      images,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      whatsapp: agent.whatsapp,
      idealFor: lifestyleCycle[index % lifestyleCycle.length],
      tags: tagCycle[index % tagCycle.length],
      listingPlan: isFeatured ? "featured" : "standard",
      publisher,
      agent,
      featured: isFeatured,
      published: true,
      isSeeded: true,
      coordinates: {
        lat,
        lng,
      },
      neighborhoodHighlights: zone.highlights,
    };
  });
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
