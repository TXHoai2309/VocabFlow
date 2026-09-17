import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  progressSummaryResponseSchema,
  type ProgressSummaryResponse
} from "@vocabflow/contracts";
import { householdLocalDate } from "./reviews";
import { authorizeLearnerOwnership } from "./learners";

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
  `);
  const [row] = rowsOf<SummaryRow>(result);
  if (!row) throw new ProgressSummaryServiceError("INTERNAL_ERROR", 500);
  return row;
}

export type ProgressSummaryService = {
  get: (userId: string, learnerId: string) => Promise<ProgressSummaryResponse>;
};

export function createProgressSummaryService(
  database: ProgressSummaryDatabase,
  options: { now?: () => Date } = {},
): ProgressSummaryService {
  const now = options.now ?? (() => new Date());

  return {
    async get(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new ProgressSummaryServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        const timezone = await householdTimezone(database, ownership.householdId);
        const reviewDate = householdLocalDate(now(), timezone);
        const row = await summaryRow(database, ownership.learnerId, reviewDate);
        const parsed = progressSummaryResponseSchema.safeParse({
          learnerId: ownership.learnerId,
          newCount: safeCount(row.new_count),
          learningCount: safeCount(row.learning_count),
          masteredCount: safeCount(row.mastered_count),
          dueCount: safeCount(row.due_count),
          learnedCount: safeCount(row.learned_count)
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
