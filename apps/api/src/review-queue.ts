import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  reviewQueueResponseSchema,
  type ReviewQueueItem,
  type ReviewQueueResponse,
  vocabularyDtoSchema,
  type VocabularyDto
} from "@vocabflow/contracts";
import { householdLocalDate } from "./reviews";
import { authorizeLearnerOwnership } from "./learners";

export type ReviewQueueDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type ReviewQueueServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INTERNAL_ERROR";

export class ReviewQueueServiceError extends Error {
  readonly code: ReviewQueueServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: ReviewQueueServiceErrorCode, status: 403 | 500) {
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
  const vocabulary = {
    id: Number(row.id),
    word: row.word,
    ipa: row.ipa,
    vietnamese: row.vietnamese,
    definitionEn: row.definition_en,
    exampleEn: row.example_en,
    imageUrl: row.image_url,
    audioUrl: row.audio_url,
    topic: row.topic,
    level: row.level == null ? null : String(row.level),
    enabled: row.enabled,
    contentVersion: Number(row.content_version)
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

async function dueRows(database: ReviewQueueDatabase, learnerId: string, reviewDate: string) {
  const result = await database.execute(sql`
    SELECT v.id,
           v.word,
           v.ipa,
           v.vietnamese,
           v.definition_en,
           v.example_en,
           v.image_url,
           v.audio_url,
           v.topic,
           v.level,
           v.enabled,
           v.content_version,
           lp.status::text AS status,
           lp.next_review_date::text AS next_review_date,
           lp.revision,
           COUNT(*) OVER() AS total_count
    FROM "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
    JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lp.vocabulary_id
    WHERE lp.learner_id = ${learnerId}::uuid
      AND lp.next_review_date <= ${reviewDate}::date
      AND v.enabled = true
    ORDER BY lp.next_review_date ASC, v.id ASC
    LIMIT 20
  `);
  return rowsOf<QueueRow>(result);
}

async function newRows(database: ReviewQueueDatabase, learnerId: string) {
  const result = await database.execute(sql`
    SELECT v.id,
           v.word,
           v.ipa,
           v.vietnamese,
           v.definition_en,
           v.example_en,
           v.image_url,
           v.audio_url,
           v.topic,
           v.level,
           v.enabled,
           v.content_version,
           'NEW'::text AS status,
           NULL::date AS next_review_date,
           0::bigint AS revision,
           COUNT(*) OVER() AS total_count
    FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
      ON lp.vocabulary_id = v.id
     AND lp.learner_id = ${learnerId}::uuid
    WHERE v.enabled = true
      AND lp.vocabulary_id IS NULL
    ORDER BY v.id ASC
    LIMIT 10
  `);
  return rowsOf<QueueRow>(result);
}

export type ReviewQueueService = {
  list: (userId: string, learnerId: string) => Promise<ReviewQueueResponse>;
};

export function createReviewQueueService(
  database: ReviewQueueDatabase,
  options: { now?: () => Date } = {}
): ReviewQueueService {
  const now = options.now ?? (() => new Date());

  return {
    async list(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new ReviewQueueServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        const timezone = await householdTimezone(database, ownership.householdId);
        const reviewDate = householdLocalDate(now(), timezone);
        const due = await dueRows(database, ownership.learnerId, reviewDate);
        const availableNew = await newRows(database, ownership.learnerId);
        const dueCount = due.length === 0 ? 0 : safeCount(due[0]?.total_count);
        const newCount = availableNew.length === 0 ? 0 : safeCount(availableNew[0]?.total_count);
        const selectedNew = dueCount >= 20 ? [] : availableNew;
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
