import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { demoAccounts } from "../src/lib/demo-accounts";
import { directRentalDemoProperties } from "../src/lib/direct-rental-demo";
import { realProperties } from "../src/lib/properties";
import { loadLocalEnv } from "./env";

loadLocalEnv();

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta configurado.");
  }

  const target = new URL(databaseUrl);
  const database = decodeURIComponent(target.pathname.slice(1));
  if (
    process.env.NODE_ENV === "production" || process.env.ZENTRO_REQUIRE_DATABASE === "1" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
    !/_(qa|dev)$/.test(database) || process.env.ZENTRO_CONFIRM_SEED !== database
  ) {
    throw new Error("Seed permitido solo en una base local *_qa o *_dev, con ZENTRO_CONFIRM_SEED igual a su nombre. Nunca en produccion.");
  }

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    namedPlaceholders: true,
  });

  await connection.execute("delete from properties where is_seeded = 1 or id like 'cm-%' or id like 'mc-%'");

  const catalogProperties = [...realProperties, ...directRentalDemoProperties];
  const currentRealPropertyIds = realProperties.map((property) => property.id);
  const currentRealPropertySlugs = realProperties.map((property) => property.slug);

  if (currentRealPropertyIds.length > 0) {
    await connection.query(
      "delete from properties where is_seeded = 0 and id not in (?)",
      [currentRealPropertyIds],
    );
  }

  if (currentRealPropertySlugs.length > 0) {
    await connection.query(
      "delete from client_account_properties where property_slug not in (?)",
      [currentRealPropertySlugs],
    );
  }

  for (const property of catalogProperties) {
    await connection.execute(
    `insert into properties
      (id, slug, title, type, operation, price, currency, city, zone, address, bedrooms, bathrooms,
       garage, area, pets, furnished, security, pool, patio, grill, elevator, short_description,
       long_description, requirements, images, video, map_url, whatsapp, ideal_for, tags,
       listing_plan, featured, published, is_seeded, coordinates, neighborhood_highlights)
     values
      (:id, :slug, :title, :type, :operation, :price, :currency, :city, :zone, :address, :bedrooms,
       :bathrooms, :garage, :area, :pets, :furnished, :security, :pool, :patio, :grill, :elevator,
       :shortDescription, :longDescription, :requirements, :images, :video, :mapUrl, :whatsapp,
       :idealFor, :tags, :listingPlan, :featured, :published, :isSeeded, :coordinates,
       :neighborhoodHighlights)
     on duplicate key update
       slug = values(slug),
       title = values(title),
       type = values(type),
       operation = values(operation),
       price = values(price),
       currency = values(currency),
       city = values(city),
       zone = values(zone),
       address = values(address),
       bedrooms = values(bedrooms),
       bathrooms = values(bathrooms),
       garage = values(garage),
       area = values(area),
       pets = values(pets),
       furnished = values(furnished),
       security = values(security),
       pool = values(pool),
       patio = values(patio),
       grill = values(grill),
       elevator = values(elevator),
       short_description = values(short_description),
       long_description = values(long_description),
       requirements = values(requirements),
       images = values(images),
       video = values(video),
       map_url = values(map_url),
       whatsapp = values(whatsapp),
       ideal_for = values(ideal_for),
       tags = values(tags),
       listing_plan = values(listing_plan),
       featured = values(featured),
       published = values(published),
       is_seeded = values(is_seeded),
       coordinates = values(coordinates),
       neighborhood_highlights = values(neighborhood_highlights),
       updated_at = current_timestamp`,
    {
      id: property.id,
      slug: property.slug,
      title: property.title,
      type: property.type,
      operation: property.operation,
      price: property.price,
      currency: property.currency,
      city: property.city,
      zone: property.zone,
      address: property.address,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      garage: property.garage,
      area: property.area,
      pets: property.pets,
      furnished: property.furnished,
      security: property.security,
      pool: property.pool,
      patio: property.patio,
      grill: property.grill,
      elevator: property.elevator,
      shortDescription: property.shortDescription,
      longDescription: property.longDescription,
      requirements: JSON.stringify(property.requirements),
      images: JSON.stringify(property.images),
      video: property.video ?? null,
      mapUrl: property.mapUrl,
      whatsapp: property.whatsapp,
      idealFor: JSON.stringify(property.idealFor),
      tags: JSON.stringify(property.tags),
      listingPlan: property.listingPlan,
      featured: property.featured,
      published: property.published,
      isSeeded: property.isSeeded,
      coordinates: JSON.stringify(property.coordinates),
      neighborhoodHighlights: JSON.stringify(property.neighborhoodHighlights),
    },
    );
  }

  const credentials = new Map<
    string,
    { email: string; password?: string; authProvider?: "email" | "google" }
  >([
    ["familia-rivero", { email: "familia@zentrourbano.demo", password: "ZentroUrbanoFamilia2026" }],
    ["nova-urbana", { email: "nova@zentrourbano.demo", password: "ZentroUrbanoNova2026" }],
    ["mario-castro-tu-balcon", { email: "3213173102e@gmail.com", authProvider: "google" }],
  ]);

  for (const account of demoAccounts) {
    const credential = credentials.get(account.id);

    if (!credential) {
      continue;
    }

    const authProvider = credential.authProvider ?? "email";
    const passwordHash = credential.password ? await bcrypt.hash(credential.password, 12) : null;

    await connection.execute(
    `insert into client_accounts
      (id, kind, display_name, company_name, email, phone, avatar_initials, avatar_url, role_label, location, provider, status)
     values
      (:id, :kind, :displayName, :companyName, :email, :phone, :avatarInitials, :avatarUrl, :roleLabel, :location, :provider, 'active')
     on duplicate key update
       kind = values(kind),
       display_name = values(display_name),
       company_name = values(company_name),
       email = values(email),
       phone = values(phone),
       avatar_initials = values(avatar_initials),
       avatar_url = values(avatar_url),
       role_label = values(role_label),
       location = values(location),
       provider = values(provider),
       status = 'active',
       updated_at = current_timestamp`,
    {
      id: account.id,
      kind: account.kind,
      displayName: account.displayName,
      companyName: account.companyName ?? null,
      email: credential.email,
      phone: account.phone,
      avatarInitials: account.avatarInitials,
      avatarUrl: account.avatarUrl ?? null,
      roleLabel: account.roleLabel,
      location: account.location,
      provider: authProvider,
    },
    );

    const [accountIdRows] = await connection.execute(
      "select id from client_accounts where email = :email limit 1",
      { email: credential.email },
    );
    const resolvedAccountId =
      Array.isArray(accountIdRows) &&
      accountIdRows.length > 0 &&
      typeof (accountIdRows[0] as { id?: unknown }).id === "string"
        ? ((accountIdRows[0] as { id: string }).id)
        : account.id;

    const userId = `user_${account.id}`;
    await connection.execute(
    `insert into morada_users
      (id, account_id, email, password_hash, auth_provider, status)
     values
      (:id, :accountId, :email, :passwordHash, :authProvider, 'active')
     on duplicate key update
       account_id = values(account_id),
       email = values(email),
       password_hash = values(password_hash),
       auth_provider = values(auth_provider),
       status = 'active',
       updated_at = current_timestamp`,
    {
      id: userId,
      accountId: resolvedAccountId,
      email: credential.email,
      passwordHash,
      authProvider,
    },
    );

    for (const performance of account.performance) {
      const accountPropertyId = makeId("cap", `${resolvedAccountId}:${performance.propertySlug}`);
      const planSlug =
        performance.plan === "Premium" ? "premium" : performance.plan === "Pro" ? "pro" : "basic";

      await connection.execute(
      `insert into client_account_properties
        (id, account_id, property_slug, plan_slug, status)
       values
        (:id, :accountId, :propertySlug, :planSlug, 'active')
       on duplicate key update
        plan_slug = values(plan_slug),
        status = 'active',
        updated_at = current_timestamp`,
      {
        id: accountPropertyId,
        accountId: resolvedAccountId,
        propertySlug: performance.propertySlug,
        planSlug,
      },
      );

      await connection.execute(
      `insert into property_performance_snapshots
        (id, account_property_id, period_start, period_end, views, property_clicks, map_views,
         whatsapp_clicks, gallery_opens, weekly_views, recommendation)
       values
        (:id, :accountPropertyId, current_date - interval 6 day, current_date, :views,
         :propertyClicks, :mapViews, :whatsappClicks, :galleryOpens, :weeklyViews, :recommendation)
       on duplicate key update
        views = values(views),
        property_clicks = values(property_clicks),
        map_views = values(map_views),
        whatsapp_clicks = values(whatsapp_clicks),
        gallery_opens = values(gallery_opens),
        weekly_views = values(weekly_views),
        recommendation = values(recommendation)`,
      {
        id: makeId("perf", `${accountPropertyId}:current`),
        accountPropertyId,
        views: performance.views,
        propertyClicks: performance.propertyClicks,
        mapViews: performance.mapViews,
        whatsappClicks: performance.whatsappClicks,
        galleryOpens: performance.galleryOpens,
        weeklyViews: JSON.stringify(performance.weeklyViews),
        recommendation: performance.recommendation,
      },
      );

      if (planSlug === "premium") {
        await connection.execute(
        `insert into monthly_availability_checks
          (id, account_property_id, scheduled_for, status, notes)
         values
          (:id, :accountPropertyId, last_day(current_date), 'pending',
           'Consultar al cierre de mes si el inmueble sigue disponible.')
         on duplicate key update
          status = values(status),
          notes = values(notes)`,
        {
          id: makeId("check", `${accountPropertyId}:month`),
          accountPropertyId,
        },
        );
      }
    }

    for (const report of account.reports) {
      await connection.execute(
      `insert into weekly_reports
        (id, account_id, period_start, period_end, period_label, headline, summary, views,
         property_clicks, whatsapp_clicks, action)
       values
        (:id, :accountId, current_date - interval 6 day, current_date, :periodLabel, :headline,
         :summary, :views, :propertyClicks, :whatsappClicks, :action)
       on duplicate key update
        period_label = values(period_label),
        headline = values(headline),
        summary = values(summary),
        views = values(views),
        property_clicks = values(property_clicks),
        whatsapp_clicks = values(whatsapp_clicks),
        action = values(action)`,
      {
        id: report.id,
        accountId: resolvedAccountId,
        periodLabel: report.period,
        headline: report.headline,
        summary: report.summary,
        views: report.views,
        propertyClicks: report.propertyClicks,
        whatsappClicks: report.whatsappClicks,
        action: report.action,
      },
      );
    }
  }

  await connection.end();

  console.log(
    `Seed completo: ${realProperties.length} propiedades reales, ${directRentalDemoProperties.length} pruebas directas y ${credentials.size} cuentas.`,
  );
}

function makeId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha1").update(value).digest("hex").slice(0, 24)}`;
}
