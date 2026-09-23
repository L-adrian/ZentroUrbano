import { getPropertyBySlug, type Property } from "@/lib/properties";

export type DemoAccountKind = "owner" | "agency";
export type DemoPlan = "Básico" | "Pro" | "Premium";
export type PropertyPerformance = {
  propertySlug: string;
  plan: DemoPlan;
  status: "Activa" | "Pausada";
  views: number;
  propertyClicks: number;
  mapViews: number;
  whatsappClicks: number;
  galleryOpens: number;
  weeklyViews: number[];
  recommendation: string;
};

export type WeeklyReport = {
  id: string;
  period: string;
  headline: string;
  summary: string;
  views: number;
  propertyClicks: number;
  whatsappClicks: number;
  action: string;
};

export type DemoAccount = {
  id: string;
  kind: DemoAccountKind;
  displayName: string;
  companyName?: string;
  email: string;
  phone: string;
  avatarInitials: string;
  avatarUrl?: string;
  roleLabel: string;
  location: string;
  planSummary: string;
  propertySlugs: string[];
  properties?: Property[];
  performance: PropertyPerformance[];
  reports: WeeklyReport[];
};

export const demoAccounts: DemoAccount[] = [
  {
    id: "familia-rivero",
    kind: "owner",
    displayName: "Familia Rivero",
    email: "familia.rivero@gmail.com",
    phone: "+591 7000 0023",
    avatarInitials: "FR",
    roleLabel: "Propietario familiar",
    location: "Santa Cruz, Bolivia",
    planSummary: "1 propiedad activa · Plan Básico",
    propertySlugs: ["monoambiente-estudiantes-centro"],
    performance: [
      {
        propertySlug: "monoambiente-estudiantes-centro",
        plan: "Básico",
        status: "Activa",
        views: 184,
        propertyClicks: 67,
        mapViews: 46,
        whatsappClicks: 12,
        galleryOpens: 71,
        weeklyViews: [18, 22, 19, 31, 27, 34, 33],
        recommendation:
          "Subir 2 fotos nuevas de cocina y baño para mejorar la decisión antes del click a WhatsApp.",
      },
    ],
    reports: [
      {
        id: "report-fr-001",
        period: "13 - 19 mayo",
        headline: "Buen rendimiento en mobile",
        summary:
          "La vivienda recibió 67 clicks de ficha durante la semana. La mayor parte vino desde celulares y el botón de WhatsApp mantiene buena conversión.",
        views: 184,
        propertyClicks: 67,
        whatsappClicks: 12,
        action: "Responder dudas sobre mascotas y agregar fotos de espacios pequeños.",
      },
    ],
  },
  {
    id: "nova-urbana",
    kind: "agency",
    displayName: "Nova Urbana",
    companyName: "Nova Urbana Inmobiliaria",
    email: "comercial@novaurbana.bo",
    phone: "+591 7000 0099",
    avatarInitials: "NU",
    roleLabel: "Cuenta inmobiliaria",
    location: "Santa Cruz, Bolivia",
    planSummary: "5 propiedades activas · Pro + Premium",
    propertySlugs: [
      "casa-luminosa-urubo",
      "townhouse-premium-las-palmas",
      "departamento-amoblado-sirari-premium",
      "departamento-av-beni-home-office",
      "casa-hamacas-patio-premium",
    ],
    performance: [
      {
        propertySlug: "casa-luminosa-urubo",
        plan: "Premium",
        status: "Activa",
        views: 612,
        propertyClicks: 221,
        mapViews: 188,
        whatsappClicks: 42,
        galleryOpens: 260,
        weeklyViews: [64, 72, 83, 91, 88, 106, 108],
        recommendation:
          "Mantener premium: la casa lidera clicks de ficha desde el mapa.",
      },
      {
        propertySlug: "townhouse-premium-las-palmas",
        plan: "Premium",
        status: "Activa",
        views: 448,
        propertyClicks: 164,
        mapViews: 126,
        whatsappClicks: 31,
        galleryOpens: 190,
        weeklyViews: [42, 53, 61, 58, 69, 81, 84],
        recommendation: "Agregar foto de amenities para sostener el interés premium.",
      },
      {
        propertySlug: "departamento-amoblado-sirari-premium",
        plan: "Pro",
        status: "Activa",
        views: 351,
        propertyClicks: 129,
        mapViews: 97,
        whatsappClicks: 24,
        galleryOpens: 138,
        weeklyViews: [32, 38, 45, 49, 53, 66, 68],
        recommendation: "Subir video corto del living amoblado para mejorar visitas.",
      },
      {
        propertySlug: "departamento-av-beni-home-office",
        plan: "Pro",
        status: "Activa",
        views: 289,
        propertyClicks: 93,
        mapViews: 82,
        whatsappClicks: 16,
        galleryOpens: 112,
        weeklyViews: [28, 31, 35, 40, 43, 55, 57],
        recommendation: "Destacar internet y escritorio en la primera foto.",
      },
      {
        propertySlug: "casa-hamacas-patio-premium",
        plan: "Pro",
        status: "Activa",
        views: 267,
        propertyClicks: 88,
        mapViews: 74,
        whatsappClicks: 14,
        galleryOpens: 101,
        weeklyViews: [24, 29, 31, 37, 39, 51, 56],
        recommendation: "Aclarar condiciones de garantía para reducir preguntas repetidas.",
      },
    ],
    reports: [
      {
        id: "report-nu-001",
        period: "13 - 19 mayo",
        headline: "Premium está concentrando la demanda",
        summary:
          "Las dos fichas premium representan el 47% de los clicks de vivienda y el 51% de los clics de WhatsApp.",
        views: 1967,
        propertyClicks: 695,
        whatsappClicks: 127,
        action:
          "Mover una propiedad Pro a Premium durante 7 días si necesita rotación más rápida.",
      },
      {
        id: "report-nu-002",
        period: "6 - 12 mayo",
        headline: "El mapa generó clicks mejor ubicados",
        summary:
          "Las fichas abiertas desde el mapa tuvieron más permanencia y menos rebote por dudas de zona.",
        views: 1714,
        propertyClicks: 587,
        whatsappClicks: 103,
        action: "Mantener coordenadas exactas y revisar descripciones de expensas.",
      },
    ],
  },
  {
    id: "mario-castro-tu-balcon",
    kind: "agency",
    displayName: "Luis Mario Castro",
    companyName: "Tu Balcon Inmobiliaria",
    email: "3213173102e@gmail.com",
    phone: "+591 7501 8456",
    avatarInitials: "MC",
    avatarUrl: "/images/agents/mario-castro.jpg",
    roleLabel: "Cuenta inmobiliaria",
    location: "Santa Cruz, Bolivia",
    planSummary: "6 propiedades activas",
    propertySlugs: [
      "casa-amoblada-condominio-brisas-del-norte-1",
      "casa-en-venta-zona-sur-santos-dumont",
      "departamento-amoblado-condominio-milan-banzer",
      "terreno-urubo-golf",
      "casa-alquiler-sobre-pavimento-zona-sur",
      "monoambiente-amoblado-tres-carabelas-centro",
    ],
    performance: [
      {
        propertySlug: "casa-amoblada-condominio-brisas-del-norte-1",
        plan: "Básico",
        status: "Activa",
        views: 0,
        propertyClicks: 0,
        mapViews: 0,
        whatsappClicks: 0,
        galleryOpens: 0,
        weeklyViews: [0, 0, 0, 0, 0, 0, 0],
        recommendation: "Monitorear vistas, ficha, mapa y WhatsApp desde esta semana.",
      },
      {
        propertySlug: "casa-en-venta-zona-sur-santos-dumont",
        plan: "Básico",
        status: "Activa",
        views: 0,
        propertyClicks: 0,
        mapViews: 0,
        whatsappClicks: 0,
        galleryOpens: 0,
        weeklyViews: [0, 0, 0, 0, 0, 0, 0],
        recommendation: "Monitorear vistas, ficha, mapa y WhatsApp desde esta semana.",
      },
      {
        propertySlug: "departamento-amoblado-condominio-milan-banzer",
        plan: "Básico",
        status: "Activa",
        views: 0,
        propertyClicks: 0,
        mapViews: 0,
        whatsappClicks: 0,
        galleryOpens: 0,
        weeklyViews: [0, 0, 0, 0, 0, 0, 0],
        recommendation: "Monitorear vistas, ficha, mapa y WhatsApp desde esta semana.",
      },
      {
        propertySlug: "terreno-urubo-golf",
        plan: "Básico",
        status: "Activa",
        views: 0,
        propertyClicks: 0,
        mapViews: 0,
        whatsappClicks: 0,
        galleryOpens: 0,
        weeklyViews: [0, 0, 0, 0, 0, 0, 0],
        recommendation: "Monitorear vistas, ficha, mapa y WhatsApp desde esta semana.",
      },
      {
        propertySlug: "casa-alquiler-sobre-pavimento-zona-sur",
        plan: "Básico",
        status: "Activa",
        views: 0,
        propertyClicks: 0,
        mapViews: 0,
        whatsappClicks: 0,
        galleryOpens: 0,
        weeklyViews: [0, 0, 0, 0, 0, 0, 0],
        recommendation: "Monitorear vistas, ficha, mapa y WhatsApp desde esta semana.",
      },
      {
        propertySlug: "monoambiente-amoblado-tres-carabelas-centro",
        plan: "Básico",
        status: "Activa",
        views: 0,
        propertyClicks: 0,
        mapViews: 0,
        whatsappClicks: 0,
        galleryOpens: 0,
        weeklyViews: [0, 0, 0, 0, 0, 0, 0],
        recommendation: "Monitorear vistas, ficha, mapa y WhatsApp desde esta semana.",
      },
    ],
    reports: [
      {
        id: "report-mc-001",
        period: "Inicio de monitoreo",
        headline: "Cuenta lista para medir resultados",
        summary:
          "Las fichas de Tu Balcon quedaron vinculadas para monitorear vistas, apertura de ficha, mapa, galeria y WhatsApp.",
        views: 0,
        propertyClicks: 0,
        whatsappClicks: 0,
        action: "Revisar el primer reporte semanal cuando existan interacciones reales.",
      },
    ],
  },
];

export function getDemoAccountById(id: string | null | undefined) {
  return demoAccounts.find((account) => account.id === id);
}

export function getDemoAccountProperties(account: DemoAccount): Property[] {
  if (account.properties) {
    return account.properties;
  }

  return account.propertySlugs
    .map((slug) => getPropertyBySlug(slug))
    .filter((property): property is Property => Boolean(property));
}

export function getPerformanceForProperty(account: DemoAccount, propertySlug: string) {
  return account.performance.find((item) => item.propertySlug === propertySlug);
}

export function getDemoAccountTotals(account: DemoAccount) {
  return account.performance.reduce(
    (totals, item) => ({
      views: totals.views + item.views,
      propertyClicks: totals.propertyClicks + item.propertyClicks,
      mapViews: totals.mapViews + item.mapViews,
      whatsappClicks: totals.whatsappClicks + item.whatsappClicks,
      galleryOpens: totals.galleryOpens + item.galleryOpens,
    }),
    {
      views: 0,
      propertyClicks: 0,
      mapViews: 0,
      whatsappClicks: 0,
      galleryOpens: 0,
    },
  );
}
