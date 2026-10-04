import { NextResponse, type NextRequest } from "next/server";
import { canEditProperty } from "@/lib/mysql-auth";
import { executeQuery, hasDatabaseConfig, queryOne } from "@/lib/mysql";
import { isRentalPropertyType } from "@/lib/rentals";
import { isDisplayCurrency, parseCurrencyAmount, parsePropertyExchangeRate } from "@/lib/currency";
import { revalidatePath } from "next/cache";
import { getPropertyVideoUrl } from "@/lib/property-video";
import { allowedOwnerImage, ownerMapUrl, ownerWhatsapp, parseJsonArray } from "@/lib/owner-listing-edit";
import { petsPolicies } from "@/lib/publication-input";
import { beforeVisitPatch, parseBeforeVisitInput } from "@/lib/before-visit";
import { isSameSiteRequest } from "@/lib/request-origin";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/propiedades/[slug]">,
) {
  if (!isSameSiteRequest(request)) {
    return NextResponse.json({ ok: false, stored: false, message: "Origen no permitido." }, { status: 403 });
  }
  const { slug } = await context.params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      {
        ok: false,
        stored: false,
        message: "DATABASE_URL no esta configurado para guardar cambios.",
      },
      { status: 503 },
    );
  }

  if (!payload) {
    return NextResponse.json(
      { ok: false, stored: false, message: "JSON invalido." },
      { status: 400 },
    );
  }

  if (payload.operation !== "Alquiler" || !isRentalPropertyType(payload.type)) {
    return NextResponse.json(
      { ok: false, stored: false, message: "Solo se pueden gestionar viviendas en alquiler directo." },
      { status: 400 },
    );
  }

  const allowed = await canEditProperty(slug);

  if (!allowed) {
    return NextResponse.json(
      { ok: false, stored: false, message: "No tienes permiso para editar esta propiedad." },
      { status: 403 },
    );
  }

  const price=parseCurrencyAmount(payload.price);
  const counts=["bedrooms","bathrooms","garage","area"].map(key=>Number(payload[key]));
  const coordinates=payload.coordinates as {lat?:unknown;lng?:unknown}|undefined;
  if (!text(payload.title).trim() || text(payload.title).length>220 || price===null || price<=0 || price>100_000_000 ||
    counts.some(value=>!Number.isInteger(value) || value<0 || value>1_000_000) ||
    typeof coordinates?.lat !== "number" || typeof coordinates.lng !== "number" || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng) || Math.abs(coordinates.lat)>90 || Math.abs(coordinates.lng)>180 ||
    !Array.isArray(payload.images) || !payload.images.length || payload.images.length>15 || payload.images.some(value=>typeof value !== "string" || !/^(\/images\/|\/media\/propiedades\/|https:\/\/)/.test(value)) ||
    (payload.video != null && payload.video !== "" && !getPropertyVideoUrl(payload.video))) {
    return NextResponse.json({ok:false,stored:false,message:"Revisa precio, medidas y ubicación. Las fotos o videos deben tener una URL permanente; los archivos nuevos requieren una nueva solicitud."},{status:400});
  }

  const currency = text(payload.currency);
  const hasExchangeRate = Object.hasOwn(payload, "exchangeRate");
  const exchangeRate = currency === "USD" ? parsePropertyExchangeRate(payload.exchangeRate) : null;
  if (!isDisplayCurrency(currency) || (currency === "USD" && hasExchangeRate && exchangeRate === null)) {
    return NextResponse.json({ ok: false, stored: false, message: "Revisa la moneda y el tipo de cambio: debe ser mayor a 0 y de hasta 1000 Bs por USD." }, { status: 400 });
  }

  // "Sí", "No" or "A consultar" from the editor; older clients only send the pets checkbox.
  const petsPolicy = (petsPolicies as readonly unknown[]).includes(payload.petsPolicy) ? String(payload.petsPolicy) : null;

  // "Antes de visitar": only when the editor sends it (older clients do not), and only for
  // listings that came through the form (rental_details); the rest of the JSON is kept.
  let beforeVisit = "{}";
  if (payload.beforeVisit !== undefined && payload.beforeVisit !== null) {
    const parsed = typeof payload.beforeVisit === "object" && !Array.isArray(payload.beforeVisit)
      ? parseBeforeVisitInput(payload.beforeVisit as Record<string, unknown>)
      : null;
    const problem = parsed ? Object.values(parsed.errors)[0] : "Revisa los datos de «Antes de visitar».";
    if (!parsed || problem) return NextResponse.json({ ok: false, stored: false, message: problem }, { status: 400 });
    beforeVisit = JSON.stringify(beforeVisitPatch(parsed.values));
  }

  let whatsapp: string | null | undefined;
  let mapUrl: string | null | undefined;
  try {
    const current=await queryOne<{currency:string;requirements:unknown;rental_details:unknown;images:unknown;whatsapp:string|null;map_url:string|null}>("SELECT currency,requirements,rental_details,images,whatsapp,map_url FROM properties WHERE slug=:slug",{slug});
    if (!current) return NextResponse.json({ok:false,stored:false,message:"Ficha no encontrada."},{status:404});
    const currentImages=parseJsonArray(current.images);
    if ((payload.images as string[]).some(image=>!allowedOwnerImage(image,currentImages))) {
      return NextResponse.json({ok:false,stored:false,message:"Las fotos nuevas deben subirse con una nueva solicitud para revisión."},{status:400});
    }
    whatsapp=ownerWhatsapp(payload.whatsapp,current.whatsapp);
    mapUrl=ownerMapUrl(payload.mapUrl,current.map_url);
    if (whatsapp===undefined || mapUrl===undefined) {
      return NextResponse.json({ok:false,stored:false,message:"Revisa el WhatsApp (8 dígitos que empiecen por 6 o 7, con o sin +591) y el enlace del mapa (https)."},{status:400});
    }
    const requirements=typeof current.requirements === "string" ? JSON.parse(current.requirements) : current.requirements;
    if (current.rental_details && (current.currency !== currency || JSON.stringify(requirements) !== JSON.stringify(payload.requirements))) {
      return NextResponse.json({ok:false,stored:false,message:"Los cambios de moneda o condiciones de ingreso requieren una nueva solicitud para revisión. Puedes actualizar el precio y el tipo de cambio aquí."},{status:400});
    }
    await executeQuery(
    `update properties
        set title = :title,
            type = :type,
            operation = :operation,
            price = :price,
            rental_details = case when rental_details is null then null
              when :petsPolicy is null then JSON_SET(JSON_MERGE_PATCH(rental_details, :beforeVisit), '$.price', :price)
              else JSON_SET(JSON_MERGE_PATCH(rental_details, :beforeVisit), '$.price', :price, '$.petsPolicy', :petsPolicy) end,
            currency = :currency,
            exchange_rate = case when :replaceExchangeRate = 1 then :exchangeRate else exchange_rate end,
            city = :city,
            zone = :zone,
            address = :address,
            bedrooms = :bedrooms,
            bathrooms = :bathrooms,
            garage = :garage,
            area = :area,
            pets = :pets,
            furnished = :furnished,
            security = :security,
            pool = :pool,
            patio = :patio,
            grill = :grill,
            elevator = :elevator,
            short_description = :shortDescription,
            long_description = :longDescription,
            requirements = :requirements,
            images = :images,
            video = :video,
            map_url = :mapUrl,
            whatsapp = :whatsapp,
            ideal_for = :idealFor,
            tags = :tags,
            coordinates = case when json_extract(rental_details, '$.locationConfirmedAt') is null then :coordinates else coordinates end,
            neighborhood_highlights = :neighborhoodHighlights,
            updated_at = current_timestamp
      where slug = :slug`,
    {
      slug,
      title: text(payload.title),
      type: text(payload.type),
      operation: text(payload.operation),
      price,
      currency: text(payload.currency),
      exchangeRate,
      replaceExchangeRate: currency === "BOB" || hasExchangeRate,
      city: text(payload.city),
      zone: text(payload.zone),
      address: text(payload.address),
      bedrooms: number(payload.bedrooms),
      bathrooms: number(payload.bathrooms),
      garage: number(payload.garage),
      area: number(payload.area),
      pets: petsPolicy ? petsPolicy === "allowed" : boolean(payload.pets),
      petsPolicy,
      beforeVisit,
      furnished: boolean(payload.furnished),
      security: boolean(payload.security),
      pool: boolean(payload.pool),
      patio: boolean(payload.patio),
      grill: boolean(payload.grill),
      elevator: boolean(payload.elevator),
      shortDescription: text(payload.shortDescription),
      longDescription: text(payload.longDescription),
      requirements: json(payload.requirements, []),
      images: json(payload.images, []),
      video: nullableText(payload.video),
      mapUrl,
      whatsapp,
      idealFor: json(payload.idealFor, []),
      tags: json(payload.tags, []),
      coordinates: json(payload.coordinates, null),
      neighborhoodHighlights: json(payload.neighborhoodHighlights, []),
    },
  );
  } catch {
    return NextResponse.json({ ok: false, stored: false, message: "No se pudieron guardar los cambios. Intenta nuevamente o contacta a soporte." }, { status: 503 });
  }

  revalidatePath(`/propiedades/${slug}`);
  revalidatePath("/");
  revalidatePath("/bienvenida");
  revalidatePath("/propiedades");
  revalidatePath("/mapa");
  revalidatePath("/cliente");
  revalidatePath("/[operation]/[city]/[zone]", "page");
  revalidatePath("/departamentos/[zone]", "page");

  return NextResponse.json({ ok: true, stored: true });
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
}

function boolean(value: unknown) {
  return Boolean(value);
}

function json(value: unknown, fallback: unknown) {
  return JSON.stringify(value ?? fallback);
}

