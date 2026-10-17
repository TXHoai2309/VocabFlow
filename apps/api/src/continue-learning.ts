import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  continueLearningSummaryResponseSchema,
  type ContinueLearningCandidate,
  type ContinueLearningSummaryResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import type { VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type ContinueLearningDatabase = { execute: (query: SQL) => Promise<unknown> };
export type ContinueLearningServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INTERNAL_ERROR";

export class ContinueLearningServiceError extends Error {
  readonly code: ContinueLearningServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: ContinueLearningServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "ContinueLearningServiceError";
    this.code = code;
    this.status = status;
  }
}

type ContinueLearningRow = {
  scope: unknown;
  scope_id: unknown;
  title: unknown;
  total_count: unknown;
  learned_count: unknown;
  last_activity_at: unknown;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new ContinueLearningServiceError("INTERNAL_ERROR", 500);
}

function safeCount(value: unknown): number {
  try {
    const parsed = typeof value === "number" ? value : Number(BigInt(String(value)));
    if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("UNSAFE_COUNT");
    return parsed;
  } catch {
    throw new ContinueLearningServiceError("INTERNAL_ERROR", 500);
  }
}

function timestamp(value: unknown): string | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) throw new ContinueLearningServiceError("INTERNAL_ERROR", 500);
  return parsed.toISOString();
}

async function latestCandidate(database: ContinueLearningDatabase, learnerId: string): Promise<ContinueLearningCandidate | null> {
  // Review events store vocabulary activity, not collection provenance; timestamps are only a ranking heuristic.
  // Study session queue, index, mode and source provenance are not persisted, so exact session/source resume is unsupported.
  const result = await database.execute(sql`
    WITH active_sets AS (
      SELECT ls.id, ls.name, ls.sort_order
      FROM "${sql.raw(APP_SCHEMA)}"."learner_learning_sets" lls
      JOIN "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
        ON ls.id = lls.learning_set_id AND ls.enabled = true
      WHERE lls.learner_id = ${learnerId}::uuid AND lls.active = true
    ),
    eligible_vocabulary AS (
      SELECT DISTINCT lsi.vocabulary_id
      FROM active_sets als
      JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = als.id
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v
        ON v.id = lsi.vocabulary_id AND v.enabled = true
    ),
    collection_members AS (
      SELECT 'LEARNING_SET'::text AS scope, als.id AS scope_id, als.name AS title,
             als.sort_order AS scope_order, lsi.vocabulary_id
      FROM active_sets als
      JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = als.id
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v
        ON v.id = lsi.vocabulary_id AND v.enabled = true
      UNION ALL
      SELECT 'TOPIC'::text AS scope, t.id AS scope_id, t.name AS title,
             t.sort_order AS scope_order, ev.vocabulary_id
      FROM "${sql.raw(APP_SCHEMA)}"."topics" t
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt ON vt.topic_id = t.id
      JOIN eligible_vocabulary ev ON ev.vocabulary_id = vt.vocabulary_id
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v
        ON v.id = ev.vocabulary_id AND v.enabled = true
      WHERE t.enabled = true
      UNION ALL
      SELECT 'SAVED'::text AS scope, NULL::integer AS scope_id, 'Từ đã lưu'::text AS title,
             2147483647 AS scope_order, lsv.vocabulary_id
      FROM "${sql.raw(APP_SCHEMA)}"."learner_saved_vocabulary" lsv
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v
        ON v.id = lsv.vocabulary_id AND v.enabled = true
      WHERE lsv.learner_id = ${learnerId}::uuid
    ),
    collection_vocabulary AS (
      SELECT DISTINCT vocabulary_id FROM collection_members
    ),
    latest_review_by_vocabulary AS (
      SELECT re.vocabulary_id, MAX(re.reviewed_at) AS last_activity_at
      FROM "${sql.raw(APP_SCHEMA)}"."review_events" re
      JOIN collection_vocabulary cv ON cv.vocabulary_id = re.vocabulary_id
      WHERE re.learner_id = ${learnerId}::uuid
      GROUP BY re.vocabulary_id
    ),
    collection_progress AS (
      SELECT
        cm.scope,
        cm.scope_id,
        cm.title,
        cm.scope_order,
        COUNT(DISTINCT cm.vocabulary_id) AS total_count,
        COUNT(DISTINCT cm.vocabulary_id) FILTER (
          WHERE lp.status::text IN ('LEARNING', 'MASTERED')
        ) AS learned_count,
        MAX(lr.last_activity_at) AS last_activity_at
      FROM collection_members cm
      LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
        ON lp.learner_id = ${learnerId}::uuid AND lp.vocabulary_id = cm.vocabulary_id
      LEFT JOIN latest_review_by_vocabulary lr ON lr.vocabulary_id = cm.vocabulary_id
      GROUP BY cm.scope, cm.scope_id, cm.title, cm.scope_order
    )
    SELECT scope, scope_id, title, total_count, learned_count, last_activity_at
    FROM collection_progress
    WHERE learned_count > 0 AND learned_count < total_count
    ORDER BY last_activity_at DESC NULLS LAST,
      CASE scope WHEN 'LEARNING_SET' THEN 0 WHEN 'TOPIC' THEN 1 ELSE 2 END ASC,
      scope_order ASC,
      scope_id ASC NULLS LAST
    LIMIT 1
  `);
  const [row] = rowsOf<ContinueLearningRow>(result);
  if (!row) return null;

  const totalCount = safeCount(row.total_count);
  const learnedCount = safeCount(row.learned_count);
  if (totalCount === 0 || learnedCount === 0 || learnedCount >= totalCount) {
    throw new ContinueLearningServiceError("INTERNAL_ERROR", 500);
  }
  const scopeId = row.scope_id === null ? null : safeCount(row.scope_id);
  const candidate = {
    scope: row.scope,
    scopeId,
    title: row.title,
    totalCount,
    learnedCount,
    progressPercent: Math.round((learnedCount / totalCount) * 100),
    lastActivityAt: timestamp(row.last_activity_at)
  };
  const parsed = continueLearningSummaryResponseSchema.shape.candidate.safeParse(candidate);
  if (!parsed.success) throw new ContinueLearningServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

export type ContinueLearningService = {
  get: (userId: string, learnerId: string) => Promise<ContinueLearningSummaryResponse>;
};

export function createContinueLearningService(database: ContinueLearningDatabase, options: { datasetVersion?: VocabularyDatasetVersion } = {}): ContinueLearningService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async get(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new ContinueLearningServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }
      try {
        // The V2 catalog has no learning-set or topic definitions yet; never
        // surface a legacy collection as a V2 continuation target.
        const candidate = datasetVersion === "v2" ? null : await latestCandidate(database, ownership.learnerId);
        const parsed = continueLearningSummaryResponseSchema.safeParse({ learnerId: ownership.learnerId, candidate });
        if (!parsed.success) throw new ContinueLearningServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof ContinueLearningServiceError) throw error;
        throw new ContinueLearningServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
