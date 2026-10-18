import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  learnerVocabularyBrowseItemSchema,
  learnerVocabularyBrowseResponseSchema,
  type LearnerVocabularyBrowseItem,
  type LearnerVocabularyBrowseQuery,
  type LearnerVocabularyBrowseResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { LearnerVocabularyServiceError, type LearnerVocabularyDatabase } from "./learner-vocabulary";
import { jsonArray, jsonObject, vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

type VocabularyBrowseRow = {
  id: unknown;
  word: unknown;
  ipa: unknown;
  vietnamese: unknown;
  image_url: unknown;
  audio_url: unknown;
  topic: unknown;
  level: unknown;
  enabled: unknown;
  content_version: unknown;
  progress_status: unknown;
  next_review_date: unknown;
  master_sense_identity?: unknown;
  display_form?: unknown;
  part_of_speech?: unknown;
  cefr?: unknown;
  tags?: unknown;
  development_media?: unknown;
  content_sha256?: unknown;
  content_review_decision?: unknown;
  editorial_status?: unknown;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
}

function safeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function toBrowseItem(row: VocabularyBrowseRow): LearnerVocabularyBrowseItem {
  const media = jsonObject(row.development_media);
  const images = jsonArray(media?.images);
  const wordAudio = jsonArray(media?.wordAudio);
  const singleImage = images?.length === 1 ? jsonObject(images[0]) : undefined;
  const dto = {
    id: safeInteger(row.id),
    word: String(row.word),
    ipa: nullableText(row.ipa),
    vietnamese: String(row.vietnamese),
    imageUrl: images ? (singleImage ? nullableText(singleImage.url) : null) : nullableText(row.image_url),
    audioUrl: media ? null : nullableText(row.audio_url),
    topic: nullableText(row.topic),
    level: row.level == null ? null : String(row.level),
    enabled: row.enabled === true,
    contentVersion: safeInteger(row.content_version),
    status: row.progress_status == null ? "NEW" : String(row.progress_status),
    nextReviewDate: row.next_review_date == null ? null : String(row.next_review_date),
    ...(row.master_sense_identity ? { masterSenseIdentity: String(row.master_sense_identity) } : {}),
    ...(row.display_form ? { displayForm: String(row.display_form) } : {}),
    ...(row.part_of_speech ? { partOfSpeech: String(row.part_of_speech) } : {}),
    ...(row.cefr != null ? { cefr: String(row.cefr) } : {}),
    ...(row.content_sha256 ? { contentHash: String(row.content_sha256) } : {}),
    ...(row.content_review_decision === "PASS" ? { contentReviewStatus: "PASS" as const } : {}),
    ...(row.editorial_status === "DRAFT" ? { editorialStatus: "DRAFT" as const } : {}),
    ...(Array.isArray(row.tags) ? { tags: row.tags.map(String) } : {}),
    ...(images || wordAudio ? { developmentMedia: {
      ...(images ? { images } : {}),
      ...(wordAudio ? { wordAudio } : {})
    } } : {}),
    ...(singleImage?.reviewStatus ? { imageMediaStatus: singleImage.reviewStatus } : {})
  };
  const parsed = learnerVocabularyBrowseItemSchema.safeParse(dto);
  if (!parsed.success) throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

function browseFilters(datasetVersion: VocabularyDatasetVersion, query: LearnerVocabularyBrowseQuery): SQL[] {
  const filters: SQL[] = [
    sql`v.enabled = true`,
    vocabularyDatasetPredicate("v", datasetVersion)
  ];
  if (query.level) filters.push(sql`v.level = ${query.level}`);
  if (query.cefr) filters.push(sql`md.cefr = ${query.cefr}`);
  if (query.topic) filters.push(sql`(
    lower(COALESCE(v.topic, '')) = lower(${query.topic})
    OR EXISTS (
      SELECT 1
      FROM "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt
      JOIN "${sql.raw(APP_SCHEMA)}"."topics" t ON t.id = vt.topic_id
      WHERE vt.vocabulary_id = v.id
        AND t.enabled = true
        AND (lower(t.name) = lower(${query.topic}) OR lower(t.slug) = lower(${query.topic}))
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(md.tags, '[]'::jsonb)) AS tag(value)
      WHERE lower(tag.value) = lower(${query.topic})
    )
  )`);
  if (query.q) {
    const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
    filters.push(sql`(
      v.word ILIKE ${pattern} ESCAPE ${"\\"}
      OR COALESCE(v.vietnamese_override, v.vietnamese) ILIKE ${pattern} ESCAPE ${"\\"}
    )`);
  }
  return filters;
}

export type LearnerVocabularyBrowseService = {
  browse: (userId: string, learnerId: string, query: LearnerVocabularyBrowseQuery) => Promise<LearnerVocabularyBrowseResponse>;
};

export function createLearnerVocabularyBrowseService(
  database: LearnerVocabularyDatabase,
  options: { datasetVersion?: VocabularyDatasetVersion } = {}
): LearnerVocabularyBrowseService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async browse(userId, learnerId, query) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new LearnerVocabularyServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        const where = sql.join(browseFilters(datasetVersion, query), sql` AND `);
        const offset = (query.page - 1) * query.pageSize;
        const [pageResult, countResult, filtersResult] = await Promise.all([
          database.execute(sql`
            SELECT
              v.id, v.word, v.ipa,
              COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese,
              CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url,
              v.audio_url, v.topic, v.level, v.enabled, v.content_version,
              md.proposal_key AS master_sense_identity,
              md.source_provenance->'masterV2Identity'->>'displayForm' AS display_form,
              md.part_of_speech, md.cefr, md.tags, md.content_sha256,
              md.content_review_decision, md.editorial_status,
              CASE WHEN md.development_media IS NULL THEN NULL ELSE
                jsonb_strip_nulls(jsonb_build_object(
                  'images', md.development_media->'images',
                  'wordAudio', md.development_media->'wordAudio'
                ))
              END AS development_media,
              lp.status::text AS progress_status,
              lp.next_review_date
            FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
            LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
            LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
              ON lp.vocabulary_id = v.id
             AND lp.learner_id = ${ownership.learnerId}::uuid
            WHERE ${where}
            ORDER BY v.id ASC
            LIMIT ${query.pageSize} OFFSET ${offset}
          `),
          database.execute(sql`
            SELECT COUNT(*)::bigint AS total
            FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
            LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
            WHERE ${where}
          `),
          database.execute(sql`
            SELECT
              COALESCE((
                SELECT array_agg(options.cefr ORDER BY options.cefr)
                FROM (
                  SELECT DISTINCT md.cefr AS cefr
                  FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
                  JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
                  WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)} AND md.cefr IS NOT NULL
                ) options
              ), ARRAY[]::text[]) AS cefr_options,
              COALESCE((
                SELECT array_agg(options.topic ORDER BY options.topic)
                FROM (
                SELECT DISTINCT topic_values.topic
                FROM (
                    SELECT t.name AS topic
                    FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
                    JOIN "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt ON vt.vocabulary_id = v.id
                    JOIN "${sql.raw(APP_SCHEMA)}"."topics" t ON t.id = vt.topic_id
                    WHERE v.enabled = true
                      AND ${vocabularyDatasetPredicate("v", datasetVersion)}
                      AND t.enabled = true
                    UNION
                    SELECT NULLIF(BTRIM(v.topic), '') AS topic
                    FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
                    WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)}
                    UNION
                    SELECT NULLIF(BTRIM(tag.value), '') AS topic
                    FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
                    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
                    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(md.tags, '[]'::jsonb)) AS tag(value)
                    WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)}
                  ) topic_values
                  WHERE topic_values.topic IS NOT NULL
                ) options
              ), ARRAY[]::text[]) AS topic_options
          `)
        ]);

        const [countRow] = rowsOf<{ total: unknown }>(countResult);
        const [filterRow] = rowsOf<{ cefr_options: unknown; topic_options: unknown }>(filtersResult);
        const total = safeInteger(countRow?.total ?? 0);
        const response: LearnerVocabularyBrowseResponse = {
          vocabulary: rowsOf<VocabularyBrowseRow>(pageResult).map(toBrowseItem),
          total,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
          filters: {
            cefrOptions: Array.isArray(filterRow?.cefr_options) ? filterRow.cefr_options.map(String) : [],
            topicOptions: Array.isArray(filterRow?.topic_options) ? filterRow.topic_options.map(String) : []
          }
        };
        const parsed = learnerVocabularyBrowseResponseSchema.safeParse(response);
        if (!parsed.success) throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof LearnerVocabularyServiceError) throw error;
        throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
