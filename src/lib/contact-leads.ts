import "server-only";
import { randomUUID } from "node:crypto";
import { executeQuery, queryOne, queryRows } from "@/lib/mysql";

export type ContactLeadStatus = "pending" | "contacted" | "authorized" | "rejected";

export type ContactLead = {
  id: string;
  propertySlug: string | null;
  contactName: string | null;
  whatsappRaw: string;
  whatsappNormalized: string;
  whatsappDisplay: string;
  sourcePlatform: string;
  sourceUrl: string | null;
  sourceExcerpt: string | null;
  status: ContactLeadStatus;
  usageConsent: boolean;
  lastContactedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ContactLeadRow = {
  id: string;
  property_slug: string | null;
  contact_name: string | null;
  whatsapp_raw: string;
  whatsapp_normalized: string;
  source_platform: string;
  source_url: string | null;
  source_excerpt: string | null;
  status: ContactLeadStatus;
  usage_consent: boolean;
  last_contacted_at: Date | string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type SaveContactLeadsInput = {
  propertySlug?: string | null;
  contactName?: string | null;
  whatsapp?: string | null;
  sourcePlatform?: string | null;
  sourceUrl?: string | null;
  sourceText?: string | null;
  notes?: string | null;
};

export async function listContactLeads() {
  const rows = await queryRows<ContactLeadRow>(
    `select *
       from property_contact_leads
      order by
        case status
          when 'pending' then 0
          when 'contacted' then 1
          when 'authorized' then 2
          when 'rejected' then 3
          else 4
        end,
        created_at desc`,
  );

  return rows?.map(mapContactLeadRow) ?? null;
}

export async function saveContactLeads(input: SaveContactLeadsInput) {
  const numbers = extractWhatsAppNumbers([input.whatsapp, input.sourceText].filter(Boolean).join("\n"));

  if (numbers.length === 0) {
    return [];
  }

  const saved: ContactLead[] = [];
  const propertySlug = cleanText(input.propertySlug);
  const sourcePlatform = cleanText(input.sourcePlatform) ?? "facebook_marketplace";
  const sourceUrl = cleanText(input.sourceUrl);
  const contactName = cleanText(input.contactName);
  const notes = cleanText(input.notes);

  for (const number of numbers) {
    const sourceExcerpt = buildSourceExcerpt(input.sourceText, number.raw);
    const existing = await findExistingLead(number.normalized, propertySlug, sourceUrl);

    if (existing) {
      await executeQuery(
        `update property_contact_leads
            set property_slug = :propertySlug,
                contact_name = :contactName,
                whatsapp_raw = :whatsappRaw,
                source_platform = :sourcePlatform,
                source_url = :sourceUrl,
                source_excerpt = :sourceExcerpt,
                notes = :notes,
                updated_at = current_timestamp
          where id = :id`,
        {
          id: existing.id,
          propertySlug: propertySlug ?? existing.property_slug,
          contactName: contactName ?? existing.contact_name,
          whatsappRaw: number.raw,
          sourcePlatform: sourcePlatform ?? existing.source_platform,
          sourceUrl: sourceUrl ?? existing.source_url,
          sourceExcerpt: sourceExcerpt ?? existing.source_excerpt,
          notes: notes ?? existing.notes,
        },
      );

      const updated = await getContactLeadById(existing.id);

      if (updated) {
        saved.push(updated);
      }

      continue;
    }

    const id = `lead_${randomUUID().replaceAll("-", "").slice(0, 24)}`;

    await executeQuery(
      `insert into property_contact_leads
        (id, property_slug, contact_name, whatsapp_raw, whatsapp_normalized, source_platform,
         source_url, source_excerpt, status, usage_consent, notes)
       values
        (:id, :propertySlug, :contactName, :whatsappRaw, :whatsappNormalized, :sourcePlatform,
         :sourceUrl, :sourceExcerpt, 'pending', false, :notes)`,
      {
        id,
        propertySlug,
        contactName,
        whatsappRaw: number.raw,
        whatsappNormalized: number.normalized,
        sourcePlatform,
        sourceUrl,
        sourceExcerpt,
        notes,
      },
    );

    const created = await getContactLeadById(id);

    if (created) {
      saved.push(created);
    }
  }

  return saved;
}

export async function updateContactLeadStatus(
  id: string,
  status: ContactLeadStatus,
  notes?: string | null,
) {
  const usageConsent = status === "authorized";
  const lastContactedExpression = status === "contacted" ? "current_timestamp" : "last_contacted_at";

  await executeQuery(
    `update property_contact_leads
        set status = :status,
            usage_consent = :usageConsent,
            last_contacted_at = ${lastContactedExpression},
            notes = :notes,
            updated_at = current_timestamp
      where id = :id`,
    {
      id,
      status,
      usageConsent,
      notes: cleanText(notes),
    },
  );

  return getContactLeadById(id);
}

export async function deleteContactLead(id: string) {
  await executeQuery("delete from property_contact_leads where id = :id", { id });
}

export function extractWhatsAppNumbers(text: string) {
  const matches = text.match(/(?:\+?591[\s().-]*)?[67](?:[\s().-]*\d){7}/g) ?? [];
  const unique = new Map<string, { raw: string; normalized: string; display: string }>();

  for (const raw of matches) {
    const normalized = normalizeBolivianWhatsapp(raw);

    if (normalized) {
      unique.set(normalized, {
        raw: raw.trim(),
        normalized,
        display: formatBolivianWhatsapp(normalized),
      });
    }
  }

  return Array.from(unique.values());
}

export function normalizeBolivianWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const explicitCountry = digits.match(/591[67]\d{7}/);

  if (explicitCountry) {
    return explicitCountry[0];
  }

  const local = digits.match(/[67]\d{7}/);

  if (local) {
    return `591${local[0]}`;
  }

  return null;
}

function formatBolivianWhatsapp(normalized: string) {
  if (!normalized.startsWith("591") || normalized.length !== 11) {
    return normalized;
  }

  const local = normalized.slice(3);
  return `+591 ${local.slice(0, 4)} ${local.slice(4)}`;
}

async function getContactLeadById(id: string) {
  const row = await queryOne<ContactLeadRow>(
    "select * from property_contact_leads where id = :id limit 1",
    { id },
  );

  return row ? mapContactLeadRow(row) : null;
}

async function findExistingLead(
  whatsappNormalized: string,
  propertySlug: string | null,
  sourceUrl: string | null,
) {
  return queryOne<ContactLeadRow>(
    `select *
       from property_contact_leads
      where whatsapp_normalized = :whatsappNormalized
        and (
          (:hasSourceUrl = 1 and source_url = :sourceUrl)
          or (:hasSourceUrl = 0 and source_url is null and coalesce(property_slug, '') = :propertySlugKey)
        )
      limit 1`,
    {
      whatsappNormalized,
      hasSourceUrl: sourceUrl ? 1 : 0,
      sourceUrl,
      propertySlugKey: propertySlug ?? "",
    },
  );
}

function mapContactLeadRow(row: ContactLeadRow): ContactLead {
  return {
    id: row.id,
    propertySlug: row.property_slug,
    contactName: row.contact_name,
    whatsappRaw: row.whatsapp_raw,
    whatsappNormalized: row.whatsapp_normalized,
    whatsappDisplay: formatBolivianWhatsapp(row.whatsapp_normalized),
    sourcePlatform: row.source_platform,
    sourceUrl: row.source_url,
    sourceExcerpt: row.source_excerpt,
    status: row.status,
    usageConsent: Boolean(row.usage_consent),
    lastContactedAt: dateToIso(row.last_contacted_at),
    notes: row.notes,
    createdAt: dateToIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: dateToIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildSourceExcerpt(sourceText: string | null | undefined, rawNumber: string) {
  if (!sourceText?.trim()) {
    return null;
  }

  const normalizedText = sourceText.replace(/\s+/g, " ").trim();
  const index = normalizedText.indexOf(rawNumber.trim());
  const safeIndex = index >= 0 ? index : 0;
  const start = Math.max(0, safeIndex - 220);
  const end = Math.min(normalizedText.length, safeIndex + rawNumber.length + 220);

  return normalizedText.slice(start, end);
}

function dateToIso(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
