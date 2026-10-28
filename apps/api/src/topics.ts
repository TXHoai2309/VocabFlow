import { topicMembership } from "./topic-policy";
import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  topicDtoSchema,
  type TopicDto,
  vocabularyDtoSchema,
  type VocabularyDto
} from "@vocabflow/contracts";
import { LearnerServiceError, resolveHouseholdId } from "./learners";
import type { VocabularyDatasetVersion } from "./vocabulary-dataset-version";
import { jsonArray, jsonObject, vocabularyDatasetPredicate } from "./vocabulary-dataset-version";

export type TopicDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type TopicServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "TOPIC_NOT_FOUND"
  | "INTERNAL_ERROR";

export class TopicServiceError extends Error {
  readonly code: TopicServiceErrorCode;
  readonly status: 403 | 404 | 500;

  constructor(code: TopicServiceErrorCode, status: 403 | 404 | 500) {
    super(code);
    this.name = "TopicServiceError";
    this.code = code;
    this.status = status;
  }
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new TopicServiceError("INTERNAL_ERROR", 500);
}

type TopicRow = {
  id: number | string;
  slug: unknown;
  name: unknown;
  description: unknown;
  sort_order: number | string;
  enabled: unknown;
  parent_topic_id?: unknown;
  study_scope_available?: unknown;
};

type VocabularyRow = {
  id: number | string;
  word: unknown;
  ipa: unknown;
  vietnamese: unknown;
  source_meaning_vi?: unknown;
  short_meaning_vi?: unknown;
  short_meaning_status?: unknown;
  definition_en: unknown;
  example_en: unknown;
  image_url: unknown;
  audio_url: unknown;
  topic: unknown;
  level: unknown;
  enabled: unknown;
  content_version: number | string;
  cefr?: unknown;
  tags?: unknown;
  metadata_assignments?: unknown;
  master_sense_identity?: unknown;
  display_form?: unknown;
  part_of_speech?: unknown;
  content_hash?: unknown;
  content_review_status?: unknown;
  editorial_status?: unknown;
  rights_status?: unknown;
  development_media?: unknown;
};

function safeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new TopicServiceError("INTERNAL_ERROR", 500);
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function toTopicDto(row: TopicRow, datasetVersion: VocabularyDatasetVersion): TopicDto {
  const parsed = topicDtoSchema.safeParse({
    id: safeInteger(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    sortOrder: safeInteger(row.sort_order),
    enabled: row.enabled === true,
    ...(row.parent_topic_id != null ? { parentTopicId: safeInteger(row.parent_topic_id) } : {}),
    ...(datasetVersion === "v2" ? { studyScopeAvailable: row.study_scope_available === true } : {})
  });
  if (!parsed.success) throw new TopicServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

function toVocabularyDto(row: VocabularyRow): VocabularyDto {
  const assignments = jsonObject(row.metadata_assignments);
  const metadataEvidence = [
    ...(jsonArray(assignments?.topics) ?? []).map((item) => {
      const value = jsonObject(item) ?? {};
      return { dimension: "TOPIC" as const, code: String(value.code ?? ""), label: value.label, status: value.status,
        confidence: value.confidence, evidenceType: value.evidenceType, matchedEvidence: value.matchedEvidence };
    }),
    ...(jsonArray(assignments?.subtopics) ?? []).map((item) => {
      const value = jsonObject(item) ?? {};
      return { dimension: "SUBTOPIC" as const, code: String(value.code ?? ""), label: value.label, parentCode: String(value.parentCode ?? ""), status: value.status,
        confidence: value.confidence, evidenceType: value.evidenceType, matchedEvidence: value.matchedEvidence };
    }),
    ...(jsonArray(assignments?.domains) ?? []).map((item) => {
      const value = jsonObject(item) ?? {};
      return { dimension: "DOMAIN" as const, code: String(value.code ?? ""), label: value.label, status: value.status,
        confidence: value.confidence, evidenceType: value.evidenceType, matchedEvidence: value.matchedEvidence };
    })
  ];
  const developmentMedia = jsonObject(row.development_media);
  const parsed = vocabularyDtoSchema.safeParse({
    id: safeInteger(row.id),
    word: String(row.word),
    ipa: nullableText(row.ipa),
    vietnamese: String(row.vietnamese),
    ...(typeof row.source_meaning_vi === "string" && row.source_meaning_vi.trim() ? { sourceMeaningVi: row.source_meaning_vi.trim() } : {}),
    ...(row.short_meaning_status === "VERIFIED" && typeof row.short_meaning_vi === "string" && row.short_meaning_vi.trim() ? { shortMeaningVi: row.short_meaning_vi.trim(), shortMeaningStatus: "VERIFIED" as const } : {}),
    definitionEn: nullableText(row.definition_en),
    exampleEn: nullableText(row.example_en),
    imageUrl: nullableText(row.image_url),
    audioUrl: nullableText(row.audio_url),
    topic: nullableText(row.topic),
    level: row.level == null ? null : String(row.level),
    enabled: row.enabled === true,
    contentVersion: safeInteger(row.content_version),
    ...(row.cefr ? { cefr: String(row.cefr) } : {}),
    ...(Array.isArray(row.tags) ? { tags: row.tags as string[] } : {}),
    ...(metadataEvidence.length ? { metadataEvidence } : {}),
    ...(row.master_sense_identity ? { masterSenseIdentity: String(row.master_sense_identity) } : {}),
    ...(row.display_form ? { displayForm: String(row.display_form) } : {}),
    ...(row.part_of_speech ? { partOfSpeech: String(row.part_of_speech) } : {}),
    ...(row.content_hash ? { contentHash: String(row.content_hash) } : {}),
    ...(row.content_review_status ? { contentReviewStatus: String(row.content_review_status) } : {}),
    ...(row.editorial_status ? { editorialStatus: String(row.editorial_status) } : {}),
    ...(row.rights_status ? { rightsStatus: String(row.rights_status) } : {}),
    ...(developmentMedia ? { developmentMedia } : {})
  });
  if (!parsed.success) throw new TopicServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

async function authorizeCatalogAccess(database: TopicDatabase, userId: string) {
  try {
    await resolveHouseholdId(database, userId);
  } catch (error) {
    if (error instanceof LearnerServiceError && error.code === "HOUSEHOLD_ACCESS_DENIED") {
      throw new TopicServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
    }
    throw new TopicServiceError("INTERNAL_ERROR", 500);
  }
}

export type TopicService = {
  list: (userId: string) => Promise<TopicDto[]>;
  listVocabulary: (userId: string, topicId: number) => Promise<VocabularyDto[]>;
};

export function createTopicService(database: TopicDatabase, options: { datasetVersion?: VocabularyDatasetVersion } = {}): TopicService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async list(userId) {
      await authorizeCatalogAccess(database, userId);
      try {
        const result = await database.execute(sql`
          SELECT t.id, t.slug, t.name, t.description, t.sort_order, t.enabled, t.parent_topic_id,
                 ${datasetVersion === "v2" ? sql`true` : sql`false`} AS study_scope_available
          FROM "${sql.raw(APP_SCHEMA)}"."topics" t
          WHERE t.enabled = true AND t.review_status = 'APPROVED'
            AND EXISTS (
              SELECT 1
              FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
              WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)}
                AND ${topicMembership(sql`v.id`, sql`t.id`)}
            )
          ORDER BY t.sort_order ASC, t.id ASC
        `);
        return rowsOf<TopicRow>(result).map((row) => toTopicDto(row, datasetVersion));
      } catch (error) {
        if (error instanceof TopicServiceError) throw error;
        throw new TopicServiceError("INTERNAL_ERROR", 500);
      }
    },

    async listVocabulary(userId, topicId) {
      await authorizeCatalogAccess(database, userId);
      try {
        const topicResult = await database.execute(sql`
          SELECT t.id
          FROM "${sql.raw(APP_SCHEMA)}"."topics" t
          WHERE t.id = ${topicId}
            AND t.enabled = true
            AND t.review_status = 'APPROVED'
            AND EXISTS (SELECT 1 FROM "${sql.raw(APP_SCHEMA)}".vocabularies v
              WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)}
                AND ${topicMembership(sql`v.id`, sql`t.id`)})
          LIMIT 1
        `);
        if (rowsOf<{ id: number | string }>(topicResult).length === 0) {
          throw new TopicServiceError("TOPIC_NOT_FOUND", 404);
        }

        const result = await database.execute(sql`
          SELECT
            v.id,
            v.word,
            v.ipa,
            COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese,
            v.definition_en,
            v.example_en,
            CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url,
            v.audio_url,
            v.topic,
            v.level,
            v.enabled,
            v.content_version,
            md.cefr,
            md.tags,
            md.source_provenance->'developmentLearningMetadataV1'->'assignments' AS metadata_assignments,
            md.proposal_key AS master_sense_identity,
            md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
            sm.short_meaning_vi AS short_meaning_vi, sm.validation_status AS short_meaning_status,
            md.source_provenance->'masterV2Identity'->>'displayForm' AS display_form,
            md.part_of_speech,
            md.content_sha256 AS content_hash,
            md.content_review_decision AS content_review_status,
            md.editorial_status,
            md.rights_status,
            md.development_media
          FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_short_meanings" sm
            ON sm.vocabulary_id = v.id AND sm.source_content_hash = md.content_sha256 AND sm.validation_status = 'VERIFIED'
          WHERE ${topicMembership(sql`v.id`, sql`${topicId}`)}
            AND v.enabled = true
            AND ${vocabularyDatasetPredicate("v", datasetVersion)}
          ORDER BY v.id ASC
        `);
        return rowsOf<VocabularyRow>(result).map(toVocabularyDto);
      } catch (error) {
        if (error instanceof TopicServiceError) throw error;
        throw new TopicServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
