import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  progressHistoryResponseSchema,
  type ProgressHistoryResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";

export const PROGRESS_HISTORY_MAX_DAYS = 90;

export type ProgressHistoryDatabase = { execute: (query: SQL) => Promise<unknown> };
export type ProgressHistoryServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INVALID_REQUEST" | "INTERNAL_ERROR";

export class ProgressHistoryServiceError extends Error {
  readonly code: ProgressHistoryServiceErrorCode;
  readonly status: 400 | 403 | 500;

  constructor(code: ProgressHistoryServiceErrorCode, status: 400 | 403 | 500) {
    super(code);
    this.name = "ProgressHistoryServiceError";
    this.code = code;
    this.status = status;
  }
}

type HistoryRow = {
  date: unknown;
  reviews: unknown;
  unique_words: unknown;
  remembered: unknown;
  forgotten: unknown;
  new_learned: unknown;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new ProgressHistoryServiceError("INTERNAL_ERROR", 500);
}

function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function ordinal(value: string): number {
  if (!isLocalDate(value)) throw new ProgressHistoryServiceError("INVALID_REQUEST", 400);
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function dateForOrdinal(value: number): string {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

function safeCount(value: unknown): number {
  try {
    const parsed = typeof value === "number" ? value : Number(BigInt(String(value)));
    if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("UNSAFE_COUNT");
    return parsed;
  } catch {
    throw new ProgressHistoryServiceError("INTERNAL_ERROR", 500);
  }
}

async function householdTimezone(database: ProgressHistoryDatabase, householdId: string): Promise<string> {
  const result = await database.execute(sql`
    SELECT timezone FROM "${sql.raw(APP_SCHEMA)}"."households"
    WHERE id = ${householdId}::uuid LIMIT 1
  `);
  const [row] = rowsOf<{ timezone: unknown }>(result);
  if (!row || typeof row.timezone !== "string" || row.timezone.length === 0) {
    throw new ProgressHistoryServiceError("INTERNAL_ERROR", 500);
  }
  return row.timezone;
}

async function aggregateRows(
  database: ProgressHistoryDatabase,
  learnerId: string,
  from: string,
  to: string,
): Promise<HistoryRow[]> {
  const result = await database.execute(sql`
    SELECT
      review_date::text AS date,
      COUNT(*) AS reviews,
      COUNT(DISTINCT vocabulary_id) AS unique_words,
      COUNT(*) FILTER (WHERE result::text = 'REMEMBERED') AS remembered,
      COUNT(*) FILTER (WHERE result::text = 'FORGOTTEN') AS forgotten,
      COUNT(DISTINCT vocabulary_id) FILTER (WHERE previous_status::text = 'NEW') AS new_learned
    FROM "${sql.raw(APP_SCHEMA)}"."review_events"
    WHERE learner_id = ${learnerId}::uuid
      AND review_date >= ${from}::date
      AND review_date <= ${to}::date
    GROUP BY review_date
    ORDER BY review_date ASC
  `);
  return rowsOf<HistoryRow>(result);
}

export type ProgressHistoryService = {
  get: (userId: string, learnerId: string, from: string, to: string) => Promise<ProgressHistoryResponse>;
};

export function createProgressHistoryService(database: ProgressHistoryDatabase): ProgressHistoryService {
  return {
    async get(userId, learnerId, from, to) {
      const fromOrdinal = ordinal(from);
      const toOrdinal = ordinal(to);
      if (fromOrdinal > toOrdinal || toOrdinal - fromOrdinal + 1 > PROGRESS_HISTORY_MAX_DAYS) {
        throw new ProgressHistoryServiceError("INVALID_REQUEST", 400);
      }
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new ProgressHistoryServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }
      try {
        const [timezone, rows] = await Promise.all([
          householdTimezone(database, ownership.householdId),
          aggregateRows(database, ownership.learnerId, from, to)
        ]);
        const byDate = new Map(rows.map((row) => [String(row.date), row]));
        const days = Array.from({ length: toOrdinal - fromOrdinal + 1 }, (_, index) => {
          const date = dateForOrdinal(fromOrdinal + index);
          const row = byDate.get(date);
          return {
            date,
            reviews: row ? safeCount(row.reviews) : 0,
            uniqueWords: row ? safeCount(row.unique_words) : 0,
            remembered: row ? safeCount(row.remembered) : 0,
            forgotten: row ? safeCount(row.forgotten) : 0,
            newLearned: row ? safeCount(row.new_learned) : 0
          };
        });
        const parsed = progressHistoryResponseSchema.safeParse({
          learnerId: ownership.learnerId, timezone, from, to, days
        });
        if (!parsed.success) throw new ProgressHistoryServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof ProgressHistoryServiceError) throw error;
        throw new ProgressHistoryServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
