import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  learnerVocabularyDtoSchema,
  type LearnerVocabularyDto
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";

export type LearnerVocabularyDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type LearnerVocabularyServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "INTERNAL_ERROR";

export class LearnerVocabularyServiceError extends Error {
  readonly code: LearnerVocabularyServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: LearnerVocabularyServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "LearnerVocabularyServiceError";
    this.code = code;
    this.status = status;
  }
}

type LearnerVocabularyRow = {
  id: number | string;
  word: unknown;
  ipa: unknown;
  vietnamese: unknown;
  definition_en: unknown;
  example_en: unknown;
  image_url: unknown;
  audio_url: unknown;
  topic: unknown;
  enabled: unknown;
  content_version: number | string;
  progress_status: unknown;
  next_review_date: unknown;
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
  if (!Number.isSafeInteger(parsed)) throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function toLearnerVocabularyDto(row: LearnerVocabularyRow): LearnerVocabularyDto {
  const parsed = learnerVocabularyDtoSchema.safeParse({
    id: safeInteger(row.id),
    word: String(row.word),
    ipa: nullableText(row.ipa),
    vietnamese: String(row.vietnamese),
    definitionEn: nullableText(row.definition_en),
    exampleEn: nullableText(row.example_en),
    imageUrl: nullableText(row.image_url),
    audioUrl: nullableText(row.audio_url),
    topic: nullableText(row.topic),
    enabled: row.enabled === true,
    contentVersion: safeInteger(row.content_version),
    status: row.progress_status == null ? "NEW" : String(row.progress_status),
    nextReviewDate: row.next_review_date == null ? null : String(row.next_review_date)
  });
  if (!parsed.success) throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

export type LearnerVocabularyService = {
  list: (userId: string, learnerId: string) => Promise<LearnerVocabularyDto[]>;
};

export function createLearnerVocabularyService(database: LearnerVocabularyDatabase): LearnerVocabularyService {
  return {
    async list(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new LearnerVocabularyServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        const result = await database.execute(sql`
          SELECT
            v.id,
            v.word,
            v.ipa,
            v.vietnamese,
            v.definition_en,
            v.example_en,
            v.image_url,
            v.audio_url,
            v.topic,
            v.enabled,
            v.content_version,
            lp.status::text AS progress_status,
            lp.next_review_date
          FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
            ON lp.vocabulary_id = v.id
           AND lp.learner_id = ${ownership.learnerId}::uuid
          WHERE v.enabled = true
          ORDER BY v.id ASC
        `);
        return rowsOf<LearnerVocabularyRow>(result).map(toLearnerVocabularyDto);
      } catch (error) {
        if (error instanceof LearnerVocabularyServiceError) throw error;
        throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
