import { sql, type SQL } from "drizzle-orm";

/** A reversible development presentation, never a canonical release or Master ID. */
export const localEditorialPilot = sql`(current_database() = 'vocabflow_dev'
  AND md.source_provenance->'editorialLocalPreview'->>'status' = 'OWNER_APPROVED_LOCAL_PREVIEW'
  AND md.source_provenance->'editorialLocalPreview'->>'sourceContentSha256' = md.content_sha256)`;

const ownerLocal = sql`(current_database()='vocabflow_dev' AND md.source_provenance->'ownerEditorialCatalog'->>'catalogId'='owner-editorial-1547-20261030-r0001')`;
const ownerPublished = sql`(v.source_dataset='VOCABFLOW_OWNER_EDITORIAL' AND md.source_provenance->'ownerPublishedCatalog'->>'catalogId'='owner-production-1547-20261030-r0001')`;
export const localFirstWords = sql`(${localEditorialPilot} OR ((${ownerLocal} OR ${ownerPublished}) AND md.tags ? 'EDITORIAL:FIRST_WORDS'))`;

export function editorialPreviewField(field: "examples" | "media" | "meaningVi" | "exampleEn", fallback: SQL): SQL {
  const keys = { examples: sql`'examples'`, media: sql`'media'`, meaningVi: sql`'meaningVi'`, exampleEn: sql`'exampleEn'` };
  return sql`(CASE WHEN ${localEditorialPilot} THEN md.source_provenance->'editorialLocalPreview'->${keys[field]} ELSE ${fallback} END)`;
}

export const editorialPreviewTags = sql`CASE WHEN ${localEditorialPilot}
  THEN md.tags || '["EDITORIAL:FIRST_WORDS"]'::jsonb ELSE md.tags END`;
export const editorialPreviewMeaning = sql`CASE WHEN ${localEditorialPilot}
  THEN md.source_provenance->'editorialLocalPreview'->>'meaningVi'
  WHEN ${ownerLocal} THEN md.source_provenance->'ownerEditorialCatalog'->>'shortMeaningVi'
  WHEN ${ownerPublished} THEN md.source_provenance->'ownerPublishedCatalog'->>'shortMeaningVi' ELSE sm.short_meaning_vi END`;
export const editorialPreviewMeaningStatus = sql`CASE WHEN ${localEditorialPilot}
  OR ${ownerLocal} OR ${ownerPublished} THEN 'VERIFIED' ELSE sm.validation_status END`;
export const editorialPreviewExampleEn = sql`CASE WHEN ${localEditorialPilot}
  THEN md.source_provenance->'editorialLocalPreview'->>'exampleEn' ELSE v.example_en END`;
export const editorialPreviewWord = sql`CASE WHEN ${localEditorialPilot}
  THEN md.source_provenance->'masterV2Identity'->>'headword' ELSE v.word END`;
export const editorialPreviewDisplayForm = sql`CASE WHEN ${localEditorialPilot}
  THEN md.source_provenance->'masterV2Identity'->>'headword'
  ELSE md.source_provenance->'masterV2Identity'->>'displayForm' END`;
