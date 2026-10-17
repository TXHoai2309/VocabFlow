import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  topicProgressResponseSchema,
  type TopicProgressResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { householdLocalDate } from "./reviews";
import type { VocabularyDatasetVersion } from "./vocabulary-dataset-version";
import { vocabularyDatasetPredicate } from "./vocabulary-dataset-version";

export type TopicProgressDatabase = { execute: (query: SQL) => Promise<unknown> };
export type TopicProgressServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INTERNAL_ERROR";

export class TopicProgressServiceError extends Error {
  readonly code: TopicProgressServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: TopicProgressServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "TopicProgressServiceError";
    this.code = code;
    this.status = status;
  }
}

type TopicProgressRow = {
  topic_id: unknown;
  slug: unknown;
  name: unknown;
  total: unknown;
  new_count: unknown;
  learning_count: unknown;
  mastered_count: unknown;
  due_count: unknown;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new TopicProgressServiceError("INTERNAL_ERROR", 500);
}

function safeCount(value: unknown): number {
  try {
    const parsed = typeof value === "number" ? value : Number(BigInt(String(value)));
    if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("UNSAFE_COUNT");
    return parsed;
  } catch {
    throw new TopicProgressServiceError("INTERNAL_ERROR", 500);
  }
}

async function householdTimezone(database: TopicProgressDatabase, householdId: string): Promise<string> {
  const result = await database.execute(sql`
    SELECT timezone FROM "${sql.raw(APP_SCHEMA)}"."households"
    WHERE id = ${householdId}::uuid LIMIT 1
  `);
  const [row] = rowsOf<{ timezone: unknown }>(result);
  if (!row || typeof row.timezone !== "string" || row.timezone.length === 0) {
    throw new TopicProgressServiceError("INTERNAL_ERROR", 500);
  }
  return row.timezone;
}

async function aggregateRows(
  database: TopicProgressDatabase,
  learnerId: string,
  localDate: string,
  datasetVersion: VocabularyDatasetVersion,
): Promise<TopicProgressRow[]> {
  const result = await database.execute(sql`
    WITH eligible_vocabulary AS (
      SELECT DISTINCT vt.vocabulary_id
      FROM "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt
      JOIN "${sql.raw(APP_SCHEMA)}"."topics" topic ON topic.id = vt.topic_id AND topic.enabled = true
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = vt.vocabulary_id AND v.enabled = true
      WHERE ${vocabularyDatasetPredicate("v", datasetVersion)}
        ${datasetVersion === "legacy" ? sql`AND EXISTS (
          SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."learner_learning_sets" lls
          JOIN "${sql.raw(APP_SCHEMA)}"."learning_sets" ls ON ls.id = lls.learning_set_id AND ls.enabled = true
          JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id AND lsi.vocabulary_id = v.id
          WHERE lls.learner_id = ${learnerId}::uuid AND lls.active = true
        )` : sql``}
    )
    SELECT
      t.id AS topic_id,
      t.slug,
      t.name,
      COUNT(ev.vocabulary_id) AS total,
      COUNT(ev.vocabulary_id) FILTER (WHERE lp.vocabulary_id IS NULL) AS new_count,
      COUNT(ev.vocabulary_id) FILTER (WHERE lp.status::text = 'LEARNING') AS learning_count,
      COUNT(ev.vocabulary_id) FILTER (WHERE lp.status::text = 'MASTERED') AS mastered_count,
      COUNT(ev.vocabulary_id) FILTER (WHERE lp.next_review_date <= ${localDate}::date) AS due_count
    FROM "${sql.raw(APP_SCHEMA)}"."topics" t
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt ON vt.topic_id = t.id
    LEFT JOIN eligible_vocabulary ev ON ev.vocabulary_id = vt.vocabulary_id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
      ON lp.vocabulary_id = ev.vocabulary_id AND lp.learner_id = ${learnerId}::uuid
    WHERE t.enabled = true
      AND EXISTS (
        SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" scoped_vt
        JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = scoped_vt.vocabulary_id AND v.enabled = true
        WHERE scoped_vt.topic_id = t.id AND ${vocabularyDatasetPredicate("v", datasetVersion)}
      )
    GROUP BY t.id, t.slug, t.name, t.sort_order
    ORDER BY t.sort_order ASC, t.id ASC
  `);
  return rowsOf<TopicProgressRow>(result);
}

export type TopicProgressService = { get: (userId: string, learnerId: string) => Promise<TopicProgressResponse> };

export function createTopicProgressService(
  database: TopicProgressDatabase,
  options: { now?: () => Date; datasetVersion?: VocabularyDatasetVersion } = {},
): TopicProgressService {
  const now = options.now ?? (() => new Date());
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async get(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") throw new TopicProgressServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      try {
        const timezone = await householdTimezone(database, ownership.householdId);
        const localDate = householdLocalDate(now(), timezone);
        const rows = await aggregateRows(database, ownership.learnerId, localDate, datasetVersion);
        const topics = rows.map((row) => ({
          topicId: safeCount(row.topic_id),
          slug: String(row.slug),
          name: String(row.name),
          total: safeCount(row.total),
          newCount: safeCount(row.new_count),
          learningCount: safeCount(row.learning_count),
          masteredCount: safeCount(row.mastered_count),
          dueCount: safeCount(row.due_count)
        }));
        const parsed = topicProgressResponseSchema.safeParse({ learnerId: ownership.learnerId, localDate, topics });
        if (!parsed.success) throw new TopicProgressServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof TopicProgressServiceError) throw error;
        throw new TopicProgressServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
