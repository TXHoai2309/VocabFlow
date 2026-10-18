import { sql, type SQL } from "drizzle-orm";
import { performance } from "node:perf_hooks";
import {
  APP_SCHEMA,
  type CatalogStudyScope,
  type StudyQueueCapacity,
  parseStudyQueueCapacity,
  reviewQueueResponseSchema,
  type ReviewQueueItem,
  type ReviewQueueResponse,
  vocabularyDtoSchema,
  type VocabularyDto
} from "@vocabflow/contracts";
import { householdLocalDate } from "./reviews";
import { authorizeLearnerOwnership } from "./learners";
import { resolveWeakReviewQueue } from "./weak-words";
import { jsonArray, jsonObject, vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type ReviewQueueDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type ReviewQueueServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "SCOPE_NOT_FOUND" | "INTERNAL_ERROR";

export type ReviewQueueTimings = {
  authorizationMs?: number;
  databaseMs?: number;
};

export type ReviewQueueScope = "saved" | "saved-all" | "weak" | CatalogStudyScope;

export function renderReviewQueueServerTiming(timings: {
  authInitMs?: number;
  authGetSessionMs?: number;
  authMs: number;
  authorizationMs: number;
  databaseMs: number;
  totalMs: number;
}): string {
  const duration = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0).toFixed(1);
  return [
    `auth_init;dur=${duration(timings.authInitMs ?? 0)}`,
    `auth_get_session;dur=${duration(timings.authGetSessionMs ?? 0)}`,
    `auth;dur=${duration(timings.authMs)}`,
    `authorization;dur=${duration(timings.authorizationMs)}`,
    `db;dur=${duration(timings.databaseMs)}`,
    `total;dur=${duration(timings.totalMs)}`
  ].join(", ");
}

export class ReviewQueueServiceError extends Error {
  readonly code: ReviewQueueServiceErrorCode;
  readonly status: 403 | 404 | 500;

  constructor(code: ReviewQueueServiceErrorCode, status: 403 | 404 | 500) {
    super(code);
    this.name = "ReviewQueueServiceError";
    this.code = code;
    this.status = status;
  }
}

type QueueRow = {
  id: number | string;
  word: string;
  ipa: string | null;
  vietnamese: string;
  source_meaning_vi?: string | null;
  short_meaning_vi?: string | null;
  short_meaning_status?: string | null;
  definition_en: string | null;
  example_en: string | null;
  image_url: string | null;
  audio_url: string | null;
  topic: string | null;
  level: string | null;
  enabled: boolean;
  content_version: number | string;
  status: string;
  next_review_date: string | null;
  revision: number | string | bigint;
  total_count: number | string | bigint;
  master_sense_identity?: string | null;
  display_form?: string | null;
  part_of_speech?: string | null;
  cefr?: string | null;
  tags?: unknown;
  examples?: unknown;
  content_sha256?: string | null;
  content_review_decision?: string | null;
  editorial_status?: string | null;
  rights_status?: string | null;
  development_media?: unknown;
};

type DailyNewUsageRow = {
  daily_new_word_limit: number | string | bigint;
  consumed_today: number | string | bigint;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
}

function safeCount(value: unknown): number {
  try {
    if (typeof value === "number") {
      if (Number.isSafeInteger(value) && value >= 0) return value;
      throw new Error("UNSAFE_COUNT");
    }
    const parsed = typeof value === "bigint" ? value : BigInt(String(value));
    if (parsed < 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("UNSAFE_COUNT");
    return Number(parsed);
  } catch {
    throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
  }
}

function vocabularyFromRow(row: QueueRow): VocabularyDto {
  const media = jsonObject(row.development_media);
  const images = jsonArray(media?.images);
  const singleImage = images?.length === 1 ? jsonObject(images[0]) : undefined;
  const wordAudio = jsonArray(media?.wordAudio);
  const exampleAudio = jsonArray(media?.exampleAudio);
  const vocabulary = {
    id: Number(row.id),
    word: row.word,
    ipa: row.ipa,
    vietnamese: row.vietnamese,
    ...(row.source_meaning_vi?.trim() ? { sourceMeaningVi: row.source_meaning_vi.trim() } : {}),
    ...(row.short_meaning_status === "VERIFIED" && row.short_meaning_vi?.trim() ? { shortMeaningVi: row.short_meaning_vi.trim(), shortMeaningStatus: "VERIFIED" as const } : {}),
    definitionEn: row.definition_en,
    exampleEn: row.example_en,
    imageUrl: images ? (singleImage ? String(singleImage.url ?? "") : null) : row.image_url,
    audioUrl: media ? null : row.audio_url,
    topic: row.topic,
    level: row.level == null ? null : String(row.level),
    enabled: row.enabled,
    contentVersion: Number(row.content_version),
    ...(row.master_sense_identity ? { masterSenseIdentity: String(row.master_sense_identity) } : {}),
    ...(row.display_form ? { displayForm: String(row.display_form) } : {}),
    ...(row.part_of_speech ? { partOfSpeech: String(row.part_of_speech) } : {}),
    ...(row.cefr ? { cefr: String(row.cefr) } : {}),
    ...(Array.isArray(row.tags) ? { tags: row.tags } : {}),
    ...(Array.isArray(row.examples) ? { examples: row.examples } : {}),
    ...(row.content_sha256 ? { contentHash: String(row.content_sha256) } : {}),
    ...(row.content_review_decision === "PASS" ? { contentReviewStatus: "PASS" as const } : {}),
    ...(row.editorial_status === "DRAFT" ? { editorialStatus: "DRAFT" as const } : {}),
    ...(row.rights_status === "UNKNOWN_REVIEW_REQUIRED" ? { rightsStatus: "UNKNOWN_REVIEW_REQUIRED" as const } : {}),
    ...(images || wordAudio || exampleAudio ? { developmentMedia: {
      ...(images ? { images } : {}),
      ...(wordAudio ? { wordAudio } : {}),
      ...(exampleAudio ? { exampleAudio } : {})
    } } : {}),
    ...(singleImage?.reviewStatus ? { imageMediaStatus: singleImage.reviewStatus === "ACCEPTED_MAPPING" ? "ACCEPTED_MAPPING" as const : singleImage.reviewStatus === "AMBIGUOUS" ? "AMBIGUOUS" as const : "PROPOSED" as const } : {})
  };
  const parsed = vocabularyDtoSchema.safeParse(vocabulary);
  if (!parsed.success) throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

function itemFromRow(row: QueueRow, queueType: ReviewQueueItem["queueType"]): ReviewQueueItem {
  const item = {
    vocabulary: vocabularyFromRow(row),
    queueType,
    status: row.status,
    nextReviewDate: row.next_review_date,
    expectedRevision: safeCount(row.revision)
  };
  const parsed = reviewQueueResponseSchema.shape.queue.element.safeParse(item);
  if (!parsed.success) throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

async function householdTimezone(database: ReviewQueueDatabase, householdId: string): Promise<string> {
  const result = await database.execute(sql`
    SELECT timezone
    FROM "${sql.raw(APP_SCHEMA)}"."households"
    WHERE id = ${householdId}::uuid
    LIMIT 1
  `);
  const [row] = rowsOf<{ timezone: unknown }>(result);
  if (!row || typeof row.timezone !== "string" || row.timezone.length === 0) {
    throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
  }
  return row.timezone;
}

async function dailyNewUsage(
  database: ReviewQueueDatabase,
  learnerId: string,
  reviewDate: string,
  datasetVersion: VocabularyDatasetVersion
): Promise<{ dailyNewWordLimit: number; consumedToday: number }> {
  const result = await database.execute(sql`
    SELECT lp.daily_new_word_limit,
           COUNT(progress.vocabulary_id) FILTER (
             WHERE progress.first_learned_date = ${reviewDate}::date
               AND usage_v.id IS NOT NULL
           ) AS consumed_today
    FROM "${sql.raw(APP_SCHEMA)}"."learner_profiles" lp
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" progress
      ON progress.learner_id = lp.id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" usage_v
      ON usage_v.id = progress.vocabulary_id
     AND ${vocabularyDatasetPredicate("usage_v", datasetVersion)}
    WHERE lp.id = ${learnerId}::uuid
    GROUP BY lp.daily_new_word_limit
  `);
  const [row] = rowsOf<DailyNewUsageRow>(result);
  if (!row) throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
  const dailyNewWordLimit = safeCount(row.daily_new_word_limit);
  const consumedToday = safeCount(row.consumed_today);
  if (dailyNewWordLimit > 100) throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
  return { dailyNewWordLimit, consumedToday };
}

function vocabularyMembership(learner: SQL, scope?: ReviewQueueScope, datasetVersion: VocabularyDatasetVersion = "legacy"): SQL {
  if (scope === "saved" || scope === "saved-all") {
    return sql`EXISTS (
      SELECT 1
      FROM "${sql.raw(APP_SCHEMA)}"."learner_saved_vocabulary" saved
      WHERE saved.learner_id = ${learner}
        AND saved.vocabulary_id = v.id
    )`;
  }
  if (typeof scope === "object") {
    if (datasetVersion === "v2" && scope.type === "pathway") return vocabularyDatasetPredicate("v", datasetVersion);
    if (datasetVersion === "v2" && scope.type === "topic") return sql`EXISTS (
      SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt
      JOIN "${sql.raw(APP_SCHEMA)}"."topics" t ON t.id = vt.topic_id AND t.enabled = true
      WHERE vt.vocabulary_id = v.id AND t.id = ${scope.id}
    )`;
    if (scope.type === "topic") return sql`${vocabularyMembership(learner, undefined, datasetVersion)} AND EXISTS (
      SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt
      JOIN "${sql.raw(APP_SCHEMA)}"."topics" t ON t.id = vt.topic_id
      WHERE vt.vocabulary_id = v.id AND t.enabled = true AND t.id = ${scope.id}
    )`;
    const selected = scope.type === "custom"
      ? sql`AND ls.id IN (${sql.join(scope.ids.map((id) => sql`${id}`), sql`, `)})`
      : scope.type === "learning-set" ? sql`AND ls.id = ${scope.id}` : sql``;
    return sql`EXISTS (
      SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
      JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id
      WHERE ls.enabled = true AND lsi.vocabulary_id = v.id ${selected}
    )`;
  }
  if (datasetVersion === "v2") return vocabularyDatasetPredicate("v", datasetVersion);
  return sql`EXISTS (
    SELECT 1
    FROM "${sql.raw(APP_SCHEMA)}"."learner_learning_sets" lls
    JOIN "${sql.raw(APP_SCHEMA)}"."learning_sets" ls ON ls.id = lls.learning_set_id
    JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id
    WHERE lls.learner_id = ${learner}
      AND lls.active = true
      AND ls.enabled = true
      AND lsi.vocabulary_id = v.id
  )`;
}

async function dueRows(database: ReviewQueueDatabase, learnerId: string, reviewDate: string, scope?: ReviewQueueScope, capacity?: StudyQueueCapacity, datasetVersion: VocabularyDatasetVersion = "legacy") {
  const membership = vocabularyMembership(sql.raw("lp.learner_id"), scope, datasetVersion);
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
           md.proposal_key AS master_sense_identity,
           md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
           sm.short_meaning_vi AS short_meaning_vi, sm.validation_status AS short_meaning_status,
           md.source_provenance->'masterV2Identity'->>'displayForm' AS display_form,
           md.part_of_speech, md.cefr, md.tags, md.examples, md.content_sha256,
           md.content_review_decision, md.editorial_status, md.rights_status, md.development_media,
           lp.status::text AS status,
           lp.next_review_date::text AS next_review_date,
           lp.revision,
           COUNT(*) OVER() AS total_count
    FROM "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
    JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lp.vocabulary_id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_short_meanings" sm
      ON sm.vocabulary_id = v.id AND sm.source_content_hash = md.content_sha256 AND sm.validation_status = 'VERIFIED'
    WHERE lp.learner_id = ${learnerId}::uuid
      AND lp.next_review_date <= ${reviewDate}::date
      AND v.enabled = true
      AND ${vocabularyDatasetPredicate("v", datasetVersion)}
      AND ${membership}
    ORDER BY lp.next_review_date ASC, v.id ASC
    LIMIT ${capacity ?? sql.raw("20")}
  `);
  return rowsOf<QueueRow>(result);
}

async function newRows(database: ReviewQueueDatabase, learnerId: string, scope?: ReviewQueueScope, capacity?: StudyQueueCapacity, datasetVersion: VocabularyDatasetVersion = "legacy") {
  const membership = vocabularyMembership(sql`${learnerId}::uuid`, scope, datasetVersion);
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
           md.proposal_key AS master_sense_identity,
           md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
           sm.short_meaning_vi AS short_meaning_vi, sm.validation_status AS short_meaning_status,
           md.source_provenance->'masterV2Identity'->>'displayForm' AS display_form,
           md.part_of_speech, md.cefr, md.tags, md.examples, md.content_sha256,
           md.content_review_decision, md.editorial_status, md.rights_status, md.development_media,
           'NEW'::text AS status,
           NULL::date AS next_review_date,
           0::bigint AS revision,
           COUNT(*) OVER() AS total_count
    FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_short_meanings" sm
      ON sm.vocabulary_id = v.id AND sm.source_content_hash = md.content_sha256 AND sm.validation_status = 'VERIFIED'
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
      ON lp.vocabulary_id = v.id
     AND lp.learner_id = ${learnerId}::uuid
    WHERE v.enabled = true
      AND ${vocabularyDatasetPredicate("v", datasetVersion)}
      AND lp.vocabulary_id IS NULL
      AND ${membership}
    ORDER BY v.id ASC
    LIMIT ${capacity ?? sql.raw("10")}
  `);
  return rowsOf<QueueRow>(result);
}

async function allSavedRows(database: ReviewQueueDatabase, learnerId: string, datasetVersion: VocabularyDatasetVersion) {
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
           COALESCE(lp.status::text, 'NEW') AS status,
           lp.next_review_date::text AS next_review_date,
           COALESCE(lp.revision, 0)::bigint AS revision,
           md.proposal_key AS master_sense_identity,
           md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
           sm.short_meaning_vi AS short_meaning_vi, sm.validation_status AS short_meaning_status,
           md.source_provenance->'masterV2Identity'->>'displayForm' AS display_form,
           md.part_of_speech, md.cefr, md.tags, md.examples, md.content_sha256,
           md.content_review_decision, md.editorial_status, md.rights_status, md.development_media,
           COUNT(*) OVER() AS total_count
    FROM "${sql.raw(APP_SCHEMA)}"."learner_saved_vocabulary" saved
    JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = saved.vocabulary_id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_short_meanings" sm
      ON sm.vocabulary_id = v.id AND sm.source_content_hash = md.content_sha256 AND sm.validation_status = 'VERIFIED'
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
      ON lp.learner_id = saved.learner_id
     AND lp.vocabulary_id = v.id
    WHERE saved.learner_id = ${learnerId}::uuid
      AND v.enabled = true
      AND ${vocabularyDatasetPredicate("v", datasetVersion)}
    ORDER BY v.id ASC
  `);
  return rowsOf<QueueRow>(result);
}

function savedQueueType(row: QueueRow, reviewDate: string): ReviewQueueItem["queueType"] {
  if (row.status === "NEW") return "NEW";
  return row.next_review_date && row.next_review_date <= reviewDate ? "DUE" : "VOLUNTARY";
}

export type ReviewQueueService = {
  list: (userId: string, learnerId: string, timings?: ReviewQueueTimings, scope?: ReviewQueueScope, capacity?: StudyQueueCapacity) => Promise<ReviewQueueResponse>;
};

export function createReviewQueueService(
  database: ReviewQueueDatabase,
  options: { now?: () => Date; datasetVersion?: VocabularyDatasetVersion } = {}
): ReviewQueueService {
  const now = options.now ?? (() => new Date());
  const datasetVersion = options.datasetVersion ?? "legacy";

  return {
    async list(userId, learnerId, timings, scope, capacity) {
      if (capacity !== undefined && !parseStudyQueueCapacity(String(capacity))) throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
      const authorizationStarted = timings ? performance.now() : 0;
      let ownership: Awaited<ReturnType<typeof authorizeLearnerOwnership>>;
      try {
        ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      } finally {
        if (timings) timings.authorizationMs = performance.now() - authorizationStarted;
      }
      if (ownership.decision === "FORBIDDEN") {
        throw new ReviewQueueServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        const databaseStarted = timings ? performance.now() : 0;
        let reviewDate: string;
        let usage: { dailyNewWordLimit: number; consumedToday: number };
        let due: QueueRow[];
        let availableNew: QueueRow[];
        try {
          let newScope = scope;
          if (typeof scope === "object") {
            if (scope.type === "custom" || scope.type === "learning-set" || scope.type === "topic") {
              const ids = scope.type === "custom" ? scope.ids : [scope.id];
              const table = scope.type === "topic" ? "topics" : "learning_sets";
              const idFilter = sql`id::bigint IN (${sql.join(ids.map((id) => sql`${id}::bigint`), sql`, `)})`;
              const validQuery = datasetVersion === "v2"
                ? scope.type === "topic"
                  ? sql`SELECT t.id FROM "${sql.raw(APP_SCHEMA)}"."topics" t
                      WHERE t.enabled = true AND ${idFilter}
                        AND EXISTS (
                          SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt
                          JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = vt.vocabulary_id AND v.enabled = true
                          WHERE vt.topic_id = t.id AND ${vocabularyDatasetPredicate("v", datasetVersion)}
                        )`
                  : sql`SELECT ls.id FROM "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
                      WHERE ls.enabled = true AND ${idFilter}
                        AND EXISTS (
                          SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi
                          JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id AND v.enabled = true
                          WHERE lsi.learning_set_id = ls.id AND ${vocabularyDatasetPredicate("v", datasetVersion)}
                        )`
                : sql`SELECT id FROM "${sql.raw(APP_SCHEMA)}".${sql.identifier(table)}
                    WHERE enabled = true AND ${idFilter}`;
              const valid = rowsOf<{ id: number }>(await database.execute(validQuery));
              if (valid.length !== ids.length) throw new ReviewQueueServiceError("SCOPE_NOT_FOUND", 404);
            }
            if (scope.type === "pathway" && datasetVersion !== "v2") {
              const candidates = rowsOf<{ id: number | string }>(await database.execute(sql`
                SELECT ls.id FROM "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
                WHERE ls.enabled = true AND EXISTS (
                  SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi
                  JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id AND v.enabled = true
                  WHERE lsi.learning_set_id = ls.id AND NOT EXISTS (
                    SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."learner_progress" p
                    WHERE p.learner_id = ${ownership.learnerId}::uuid AND p.vocabulary_id = v.id
                  )
                ) ORDER BY ls.sort_order ASC, ls.id ASC LIMIT 1
              `));
              newScope = { type: "custom", ids: candidates.length ? [Number(candidates[0]!.id)] : [] };
            } else if (scope.type === "pathway" && datasetVersion === "v2") {
              newScope = undefined;
            }
          }
          const timezone = await householdTimezone(database, ownership.householdId);
          reviewDate = householdLocalDate(now(), timezone);
          if (scope === "saved-all") {
            const rows = await allSavedRows(database, ownership.learnerId, datasetVersion);
            const items = rows.map((row) => itemFromRow(row, savedQueueType(row, reviewDate)));
            const queue = [
              ...items.filter((item) => item.queueType === "DUE"),
              ...items.filter((item) => item.queueType === "NEW"),
              ...items.filter((item) => item.queueType === "VOLUNTARY")
            ];
            const response = {
              learnerId: ownership.learnerId,
              reviewDate,
              dueCount: queue.filter((item) => item.queueType === "DUE").length,
              newCount: queue.filter((item) => item.queueType === "NEW").length,
              queue
            };
            const parsed = reviewQueueResponseSchema.safeParse(response);
            if (!parsed.success) throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
            return parsed.data;
          }
          if (scope === "weak") {
            const weak = await resolveWeakReviewQueue(database, ownership.learnerId, reviewDate, datasetVersion);
            const response = {
              learnerId: ownership.learnerId,
              reviewDate,
              dueCount: weak.dueCount,
              newCount: 0,
              queue: weak.queue
            };
            const parsed = reviewQueueResponseSchema.safeParse(response);
            if (!parsed.success) throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
            return parsed.data;
          }
          [usage, due, availableNew] = await Promise.all([
            dailyNewUsage(database, ownership.learnerId, reviewDate, datasetVersion),
            dueRows(database, ownership.learnerId, reviewDate, scope, capacity, datasetVersion),
            newScope && typeof newScope === "object" && newScope.type === "custom" && newScope.ids.length === 0 ? Promise.resolve([]) : newRows(database, ownership.learnerId, newScope, capacity, datasetVersion)
          ]);
        } finally {
          if (timings) timings.databaseMs = performance.now() - databaseStarted;
        }
        const dueCount = due.length === 0 ? 0 : safeCount(due[0]?.total_count);
        const newCount = availableNew.length === 0 ? 0 : safeCount(availableNew[0]?.total_count);
        const remainingNew = Math.max(0, usage.dailyNewWordLimit - usage.consumedToday);
        const selectedNew = availableNew.slice(0, remainingNew);
        const response = {
          learnerId: ownership.learnerId,
          reviewDate,
          dueCount,
          newCount,
          queue: [
            ...due.map((row) => itemFromRow(row, "DUE")),
            ...selectedNew.map((row) => itemFromRow(row, "NEW"))
          ]
        };
        const parsed = reviewQueueResponseSchema.safeParse(response);
        if (!parsed.success) throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof ReviewQueueServiceError) throw error;
        throw new ReviewQueueServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
