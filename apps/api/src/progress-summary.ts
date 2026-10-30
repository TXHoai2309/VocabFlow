import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  progressSummaryResponseSchema,
  type ProgressSummaryResponse
} from "@vocabflow/contracts";
import { householdLocalDate } from "./reviews";
import { authorizeLearnerOwnership } from "./learners";
import { vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type ProgressSummaryDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type ProgressSummaryServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INTERNAL_ERROR";

export class ProgressSummaryServiceError extends Error {
  readonly code: ProgressSummaryServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: ProgressSummaryServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "ProgressSummaryServiceError";
    this.code = code;
    this.status = status;
  }
}

type SummaryRow = {
  new_count: number | string | bigint;
  learning_count: number | string | bigint;
  mastered_count: number | string | bigint;
  due_count: number | string | bigint;
  learned_count: number | string | bigint;
};

type LevelProgressRow = {
  level: unknown;
  total: unknown;
  learned_count: unknown;
  mastered_count: unknown;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new ProgressSummaryServiceError("INTERNAL_ERROR", 500);
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
    throw new ProgressSummaryServiceError("INTERNAL_ERROR", 500);
  }
}

async function householdTimezone(database: ProgressSummaryDatabase, householdId: string): Promise<string> {
  const result = await database.execute(sql`
    SELECT timezone
    FROM "${sql.raw(APP_SCHEMA)}"."households"
    WHERE id = ${householdId}::uuid
    LIMIT 1
  `);
  const [row] = rowsOf<{ timezone: unknown }>(result);
  if (!row || typeof row.timezone !== "string" || row.timezone.length === 0) {
    throw new ProgressSummaryServiceError("INTERNAL_ERROR", 500);
  }
  return row.timezone;
}

async function summaryRow(
  database: ProgressSummaryDatabase,
  learnerId: string,
  reviewDate: string,
  datasetVersion: VocabularyDatasetVersion,
): Promise<SummaryRow> {
  const result = await database.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE v.enabled = true AND lp.vocabulary_id IS NULL) AS new_count,
      COUNT(DISTINCT lp.vocabulary_id) FILTER (WHERE lp.status::text = 'LEARNING') AS learning_count,
      COUNT(DISTINCT lp.vocabulary_id) FILTER (WHERE lp.status::text = 'MASTERED') AS mastered_count,
      COUNT(DISTINCT lp.vocabulary_id) FILTER (
        WHERE v.enabled = true
          AND lp.next_review_date <= ${reviewDate}::date
      ) AS due_count,
      COUNT(DISTINCT lp.vocabulary_id) AS learned_count
    FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
      ON lp.vocabulary_id = v.id
     AND lp.learner_id = ${learnerId}::uuid
    WHERE ${vocabularyDatasetPredicate("v", datasetVersion)}
  `);
  const [row] = rowsOf<SummaryRow>(result);
  if (!row) throw new ProgressSummaryServiceError("INTERNAL_ERROR", 500);
  return row;
}

async function levelProgressRows(database: ProgressSummaryDatabase, learnerId: string, datasetVersion: VocabularyDatasetVersion): Promise<LevelProgressRow[]> {
  if (datasetVersion !== "legacy") {
    const result = await database.execute(sql`
      SELECT v.level::text AS level,
             COUNT(*) AS total,
             COUNT(lp.vocabulary_id) AS learned_count,
             COUNT(*) FILTER (WHERE lp.status::text = 'MASTERED') AS mastered_count
      FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
      LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
        ON lp.vocabulary_id = v.id AND lp.learner_id = ${learnerId}::uuid
      WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)}
      GROUP BY v.level
      ORDER BY v.level NULLS LAST
    `);
    return rowsOf<LevelProgressRow>(result);
  }
  const result = await database.execute(sql`
    WITH eligible_vocabulary AS (
      SELECT DISTINCT v.id, v.level
      FROM "${sql.raw(APP_SCHEMA)}"."learner_learning_sets" lls
      JOIN "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
        ON ls.id = lls.learning_set_id
       AND ls.enabled = true
      JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi
        ON lsi.learning_set_id = ls.id
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v
        ON v.id = lsi.vocabulary_id
       AND v.enabled = true
      WHERE lls.learner_id = ${learnerId}::uuid
        AND lls.active = true
    )
    SELECT ev.level::text AS level,
           COUNT(*) AS total,
           COUNT(lp.vocabulary_id) AS learned_count,
           COUNT(*) FILTER (WHERE lp.status::text = 'MASTERED') AS mastered_count
    FROM eligible_vocabulary ev
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
      ON lp.vocabulary_id = ev.id
     AND lp.learner_id = ${learnerId}::uuid
    GROUP BY ev.level
    ORDER BY CASE ev.level::text
      WHEN 'GRADE_1' THEN 1
      WHEN 'GRADE_2' THEN 2
      WHEN 'GRADE_3' THEN 3
      WHEN 'GRADE_4' THEN 4
      WHEN 'GRADE_5' THEN 5
      WHEN 'GENERAL' THEN 6
      ELSE 7
    END ASC
  `);
  return rowsOf<LevelProgressRow>(result);
}

export type ProgressSummaryService = {
  get: (userId: string, learnerId: string) => Promise<ProgressSummaryResponse>;
};

export function createProgressSummaryService(
  database: ProgressSummaryDatabase,
  options: { now?: () => Date; datasetVersion?: VocabularyDatasetVersion } = {},
): ProgressSummaryService {
  const now = options.now ?? (() => new Date());
  const datasetVersion = options.datasetVersion ?? "legacy";

  return {
    async get(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new ProgressSummaryServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        const timezone = await householdTimezone(database, ownership.householdId);
        const reviewDate = householdLocalDate(now(), timezone);
        const [row, levelRows] = await Promise.all([
          summaryRow(database, ownership.learnerId, reviewDate, datasetVersion),
          levelProgressRows(database, ownership.learnerId, datasetVersion)
        ]);
        const parsed = progressSummaryResponseSchema.safeParse({
          learnerId: ownership.learnerId,
          newCount: safeCount(row.new_count),
          learningCount: safeCount(row.learning_count),
          masteredCount: safeCount(row.mastered_count),
          dueCount: safeCount(row.due_count),
          learnedCount: safeCount(row.learned_count),
          progressByLevel: levelRows.map((level) => ({
            level: level.level == null ? null : String(level.level),
            total: safeCount(level.total),
            learnedCount: safeCount(level.learned_count),
            masteredCount: safeCount(level.mastered_count)
          }))
        });
        if (!parsed.success) throw new ProgressSummaryServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof ProgressSummaryServiceError) throw error;
        throw new ProgressSummaryServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
