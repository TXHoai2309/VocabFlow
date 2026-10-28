import { sql, type SQL } from "drizzle-orm";
import { topicClosure } from "./topic-policy";
import {
  APP_SCHEMA,
  learningSetDetailSchema,
  learningSetSummarySchema,
  learnerLearningSetDtoSchema,
  learnerLearningSetMutationResponseSchema,
  type LearningSetDetail,
  type LearningSetSummary,
  type LearnerLearningSetDto,
  type LearnerLearningSetMutationResponse,
  type VocabularyDto,
  vocabularyDtoSchema
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership, LearnerServiceError, resolveHouseholdId } from "./learners";
import type { VocabularyDatasetVersion } from "./vocabulary-dataset-version";
import { jsonArray, jsonObject, vocabularyDatasetPredicate } from "./vocabulary-dataset-version";

export type LearningSetDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type LearningSetServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "LEARNING_SET_NOT_FOUND"
  | "INTERNAL_ERROR";

export class LearningSetServiceError extends Error {
  readonly code: LearningSetServiceErrorCode;
  readonly status: 403 | 404 | 500;

  constructor(code: LearningSetServiceErrorCode, status: 403 | 404 | 500) {
    super(code);
    this.name = "LearningSetServiceError";
    this.code = code;
    this.status = status;
  }
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new LearningSetServiceError("INTERNAL_ERROR", 500);
}

function safeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new LearningSetServiceError("INTERNAL_ERROR", 500);
  }
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

type SummaryRow = {
  id: number | string;
  slug: unknown;
  name: unknown;
  description: unknown;
  grade: unknown;
  enabled: unknown;
  sort_order: number | string;
  vocabulary_count: number | string | bigint;
  topics?: unknown;
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

type AssignmentRow = SummaryRow & { active: unknown };

function toSummary(row: SummaryRow, datasetVersion: VocabularyDatasetVersion): LearningSetSummary {
  const topics = jsonArray(row.topics)?.flatMap((item) => {
    const topic = jsonObject(item);
    if (!topic) return [];
    return [{ id: safeInteger(topic.id), slug: String(topic.slug), name: String(topic.name) }];
  });
  const parsed = learningSetSummarySchema.safeParse({
    id: safeInteger(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    grade: row.grade == null ? null : String(row.grade),
    enabled: row.enabled === true,
    sortOrder: safeInteger(row.sort_order),
    vocabularyCount: safeInteger(row.vocabulary_count),
    ...(topics ? { topics } : {}),
    ...(datasetVersion === "v2" ? {
      studyScopeAvailable: true,
      ...(String(row.slug).startsWith("v2-cefr-") ? { classificationStatus: "SOURCE_VERIFIED" as const } : {}),
      ...(String(row.slug).startsWith("v2-domain-") ? { classificationStatus: "INFERRED_REVIEWABLE" as const } : {})
    } : {})
  });
  if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

function toVocabulary(row: VocabularyRow): VocabularyDto {
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
  if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

async function authorizeCatalogAccess(database: LearningSetDatabase, userId: string) {
  try {
    await resolveHouseholdId(database, userId);
  } catch (error) {
    if (error instanceof LearnerServiceError && error.code === "HOUSEHOLD_ACCESS_DENIED") {
      throw new LearningSetServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
    }
    throw new LearningSetServiceError("INTERNAL_ERROR", 500);
  }
}

async function summaryRows(database: LearningSetDatabase, datasetVersion: VocabularyDatasetVersion, extra: SQL = sql``, includeTopics = false) {
  const cteStart = includeTopics ? topicClosure() : sql`WITH`;
  const cteSeparator = includeTopics ? sql`,` : sql``;
  const setTopicCtes = includeTopics ? sql`, set_topics AS (
      SELECT DISTINCT scoped_lsi.learning_set_id, topic.id, topic.slug, topic.name, topic.sort_order
      FROM "${sql.raw(APP_SCHEMA)}"."learning_set_items" scoped_lsi
      JOIN eligible_vocabulary ev ON ev.id = scoped_lsi.vocabulary_id
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt
        ON vt.vocabulary_id = ev.id AND vt.review_status = 'APPROVED'
      JOIN topic_tree tree ON tree.descendant_id = vt.topic_id
      JOIN "${sql.raw(APP_SCHEMA)}"."topics" topic ON topic.id = tree.ancestor_id
    ), set_topic_summary AS (
      SELECT learning_set_id,
        jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name) ORDER BY sort_order, id) AS topics
      FROM set_topics GROUP BY learning_set_id
    )` : sql``;
  const topicSelection = includeTopics ? sql`, COALESCE(set_topic_summary.topics, '[]'::jsonb) AS topics` : sql``;
  const topicJoin = includeTopics ? sql`LEFT JOIN set_topic_summary ON set_topic_summary.learning_set_id = ls.id` : sql``;
  const topicGroup = includeTopics ? sql`, set_topic_summary.topics` : sql``;
  const result = await database.execute(sql`
    ${cteStart}${cteSeparator}
    eligible_vocabulary AS (
      SELECT DISTINCT v.id
      FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
      WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)}
    )
    ${setTopicCtes}
    SELECT ls.id,
           ls.slug,
           ls.name,
           ls.description,
           ls.grade::text AS grade,
           ls.enabled,
           ls.sort_order,
           COUNT(*) FILTER (WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)})::bigint AS vocabulary_count
           ${topicSelection}
    FROM "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id
    ${topicJoin}
    WHERE ls.enabled = true
      AND EXISTS (
        SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."learning_set_items" scoped_lsi
        JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = scoped_lsi.vocabulary_id AND v.enabled = true
        WHERE scoped_lsi.learning_set_id = ls.id AND ${vocabularyDatasetPredicate("v", datasetVersion)}
      )
      ${extra}
    GROUP BY ls.id, ls.slug, ls.name, ls.description, ls.grade, ls.enabled, ls.sort_order ${topicGroup}
    ORDER BY ls.sort_order ASC, ls.id ASC
  `);
  return rowsOf<SummaryRow>(result);
}

async function requireSet(database: LearningSetDatabase, learningSetId: number, datasetVersion: VocabularyDatasetVersion): Promise<LearningSetSummary> {
  const [row] = await summaryRows(database, datasetVersion, sql`AND ls.id = ${learningSetId}`);
  if (!row) throw new LearningSetServiceError("LEARNING_SET_NOT_FOUND", 404);
  return toSummary(row, datasetVersion);
}

async function requireOwnership(database: LearningSetDatabase, userId: string, learnerId: string) {
  const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
  if (ownership.decision === "FORBIDDEN") {
    throw new LearningSetServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
  }
  return ownership;
}

export type LearningSetService = {
  list: (userId: string, options?: { includeTopics?: boolean }) => Promise<LearningSetSummary[]>;
  detail: (userId: string, learningSetId: number) => Promise<LearningSetDetail>;
  listForLearner: (userId: string, learnerId: string) => Promise<LearnerLearningSetDto[]>;
  assign: (userId: string, learnerId: string, learningSetId: number) => Promise<LearnerLearningSetMutationResponse>;
  unassign: (userId: string, learnerId: string, learningSetId: number) => Promise<LearnerLearningSetMutationResponse>;
};

export function createLearningSetService(database: LearningSetDatabase, options: { datasetVersion?: VocabularyDatasetVersion } = {}): LearningSetService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async list(userId, options = {}) {
      await authorizeCatalogAccess(database, userId);
      try {
        return (await summaryRows(database, datasetVersion, sql``, options.includeTopics === true)).map((row) => toSummary(row, datasetVersion));
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    },

    async detail(userId, learningSetId) {
      await authorizeCatalogAccess(database, userId);
      try {
        const summary = await requireSet(database, learningSetId, datasetVersion);
        const result = await database.execute(sql`
          SELECT v.id,
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
                 md.development_media,
                 lsi.sort_order
          FROM "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi
          JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_short_meanings" sm
            ON sm.vocabulary_id = v.id AND sm.source_content_hash = md.content_sha256 AND sm.validation_status = 'VERIFIED'
          WHERE lsi.learning_set_id = ${learningSetId}
            AND v.enabled = true
            AND ${vocabularyDatasetPredicate("v", datasetVersion)}
          ORDER BY lsi.sort_order ASC, v.id ASC
        `);
        const detail = {
          ...summary,
          items: rowsOf<VocabularyRow & { sort_order: number | string }>(result).map((row) => ({
            sortOrder: safeInteger(row.sort_order),
            vocabulary: toVocabulary(row)
          }))
        };
        const parsed = learningSetDetailSchema.safeParse(detail);
        if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    },

    async listForLearner(userId, learnerId) {
      const ownership = await requireOwnership(database, userId, learnerId);
      if (datasetVersion === "v2") return [];
      try {
        const result = await database.execute(sql`
          SELECT ls.id,
                 ls.slug,
                 ls.name,
                 ls.description,
                 ls.grade::text AS grade,
                 ls.enabled,
                 ls.sort_order,
                 COUNT(*) FILTER (WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)})::bigint AS vocabulary_count,
                 COALESCE(lls.active, false) AS active
          FROM "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_learning_sets" lls
            ON lls.learning_set_id = ls.id
           AND lls.learner_id = ${ownership.learnerId}::uuid
          WHERE ls.enabled = true
            AND EXISTS (
              SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."learning_set_items" scoped_lsi
              JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = scoped_lsi.vocabulary_id AND v.enabled = true
              WHERE scoped_lsi.learning_set_id = ls.id AND ${vocabularyDatasetPredicate("v", datasetVersion)}
            )
          GROUP BY ls.id, ls.slug, ls.name, ls.description, ls.grade, ls.enabled,
                   ls.sort_order, lls.active
          ORDER BY ls.sort_order ASC, ls.id ASC
        `);
        return rowsOf<AssignmentRow>(result).map((row) => {
          const parsed = learnerLearningSetDtoSchema.safeParse({
            learningSet: toSummary(row, datasetVersion),
            active: row.active === true
          });
          if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
          return parsed.data;
        });
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    },

    async assign(userId, learnerId, learningSetId) {
      await requireOwnership(database, userId, learnerId);
      if (datasetVersion === "v2") throw new LearningSetServiceError("LEARNING_SET_NOT_FOUND", 404);
      try {
        await requireSet(database, learningSetId, datasetVersion);
        const result = await database.execute(sql`
          INSERT INTO "${sql.raw(APP_SCHEMA)}"."learner_learning_sets"
            (learner_id, learning_set_id, active)
          VALUES (${learnerId}::uuid, ${learningSetId}, true)
          ON CONFLICT (learner_id, learning_set_id)
          DO UPDATE SET active = true, updated_at = now()
          RETURNING learner_id::text AS learner_id, learning_set_id, active
        `);
        const [row] = rowsOf<{ learner_id: string; learning_set_id: number | string; active: unknown }>(result);
        const parsed = learnerLearningSetMutationResponseSchema.safeParse({
          learnerId: row?.learner_id,
          learningSetId: row ? safeInteger(row.learning_set_id) : 0,
          active: row?.active === true
        });
        if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    },

    async unassign(userId, learnerId, learningSetId) {
      await requireOwnership(database, userId, learnerId);
      if (datasetVersion === "v2") throw new LearningSetServiceError("LEARNING_SET_NOT_FOUND", 404);
      try {
        await requireSet(database, learningSetId, datasetVersion);
        await database.execute(sql`
          DELETE FROM "${sql.raw(APP_SCHEMA)}"."learner_learning_sets"
          WHERE learner_id = ${learnerId}::uuid
            AND learning_set_id = ${learningSetId}
        `);
        const parsed = learnerLearningSetMutationResponseSchema.safeParse({
          learnerId,
          learningSetId,
          active: false
        });
        if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
