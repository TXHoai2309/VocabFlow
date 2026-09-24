import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  vocabularyDtoSchema,
  type VocabularyLevel,
  type VocabularyDto
} from "@vocabflow/contracts";
import { LearnerServiceError, resolveHouseholdId } from "./learners";

export type VocabularyDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type VocabularyServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "INTERNAL_ERROR";

export class VocabularyServiceError extends Error {
  readonly code: VocabularyServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: VocabularyServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "VocabularyServiceError";
    this.code = code;
    this.status = status;
  }
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new VocabularyServiceError("INTERNAL_ERROR", 500);
}

type VocabularyRow = {
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
};

function nullableText(value: unknown) {
  return value == null ? null : String(value);
}

function toVocabularyDto(row: VocabularyRow): VocabularyDto {
  const id = Number(row.id);
  const contentVersion = Number(row.content_version);
  const dto = {
    id,
    word: String(row.word),
    ipa: nullableText(row.ipa),
    vietnamese: String(row.vietnamese),
    definitionEn: nullableText(row.definition_en),
    exampleEn: nullableText(row.example_en),
    imageUrl: nullableText(row.image_url),
    audioUrl: nullableText(row.audio_url),
    topic: nullableText(row.topic),
    level: row.level == null ? null : String(row.level),
    enabled: row.enabled === true,
    contentVersion
  };
  const parsed = vocabularyDtoSchema.safeParse(dto);
  if (!parsed.success) throw new VocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

export type VocabularyService = {
  list: (userId: string, level?: VocabularyLevel) => Promise<VocabularyDto[]>;
};

export function createVocabularyService(database: VocabularyDatabase): VocabularyService {
  return {
    async list(userId, level) {
      try {
        // Household membership is an authorization gate only. The vocabulary
        // query below intentionally has no household_id or learner_id scope.
        await resolveHouseholdId(database, userId);
      } catch (error) {
        if (error instanceof LearnerServiceError && error.code === "HOUSEHOLD_ACCESS_DENIED") {
          throw new VocabularyServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
        }
        throw new VocabularyServiceError("INTERNAL_ERROR", 500);
      }

      try {
        const result = await database.execute(sql`
          SELECT id, word, ipa, COALESCE(vietnamese_override, vietnamese) AS vietnamese,
                 definition_en, example_en,
                 CASE WHEN image_quarantined THEN NULL ELSE image_url END AS image_url,
                 audio_url, topic, enabled, content_version, level
          FROM "${sql.raw(APP_SCHEMA)}"."vocabularies"
          WHERE enabled = true
            ${level ? sql`AND level = ${level}` : sql``}
          ORDER BY id ASC
        `);
        return rowsOf<VocabularyRow>(result).map(toVocabularyDto);
      } catch (error) {
        if (error instanceof VocabularyServiceError) throw error;
        throw new VocabularyServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
