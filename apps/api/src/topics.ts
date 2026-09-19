import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  topicDtoSchema,
  type TopicDto,
  vocabularyDtoSchema,
  type VocabularyDto
} from "@vocabflow/contracts";
import { LearnerServiceError, resolveHouseholdId } from "./learners";

export type TopicDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type TopicServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "TOPIC_NOT_FOUND"
  | "INTERNAL_ERROR";

export class TopicServiceError extends Error {
  readonly code: TopicServiceErrorCode;
  readonly status: 403 | 404 | 500;

  constructor(code: TopicServiceErrorCode, status: 403 | 404 | 500) {
    super(code);
    this.name = "TopicServiceError";
    this.code = code;
    this.status = status;
  }
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new TopicServiceError("INTERNAL_ERROR", 500);
}

type TopicRow = {
  id: number | string;
  slug: unknown;
  name: unknown;
  description: unknown;
  sort_order: number | string;
  enabled: unknown;
};

type VocabularyRow = {
  id: number | string;
  word: unknown;
  ipa: unknown;
  vietnamese: unknown;
  definition_en: unknown;
  example_en: unknown;
  image_url: unknown;
  audio_url: unknown;
  topic: unknown;
  level: unknown;
  enabled: unknown;
  content_version: number | string;
};

function safeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new TopicServiceError("INTERNAL_ERROR", 500);
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function toTopicDto(row: TopicRow): TopicDto {
  const parsed = topicDtoSchema.safeParse({
    id: safeInteger(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    sortOrder: safeInteger(row.sort_order),
    enabled: row.enabled === true
  });
  if (!parsed.success) throw new TopicServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

function toVocabularyDto(row: VocabularyRow): VocabularyDto {
  const parsed = vocabularyDtoSchema.safeParse({
    id: safeInteger(row.id),
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
    contentVersion: safeInteger(row.content_version)
  });
  if (!parsed.success) throw new TopicServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

async function authorizeCatalogAccess(database: TopicDatabase, userId: string) {
  try {
    await resolveHouseholdId(database, userId);
  } catch (error) {
    if (error instanceof LearnerServiceError && error.code === "HOUSEHOLD_ACCESS_DENIED") {
      throw new TopicServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
    }
    throw new TopicServiceError("INTERNAL_ERROR", 500);
  }
}

export type TopicService = {
  list: (userId: string) => Promise<TopicDto[]>;
  listVocabulary: (userId: string, topicId: number) => Promise<VocabularyDto[]>;
};

export function createTopicService(database: TopicDatabase): TopicService {
  return {
    async list(userId) {
      await authorizeCatalogAccess(database, userId);
      try {
        const result = await database.execute(sql`
          SELECT id, slug, name, description, sort_order, enabled
          FROM "${sql.raw(APP_SCHEMA)}"."topics"
          WHERE enabled = true
          ORDER BY sort_order ASC, id ASC
        `);
        return rowsOf<TopicRow>(result).map(toTopicDto);
      } catch (error) {
        if (error instanceof TopicServiceError) throw error;
        throw new TopicServiceError("INTERNAL_ERROR", 500);
      }
    },

    async listVocabulary(userId, topicId) {
      await authorizeCatalogAccess(database, userId);
      try {
        const topicResult = await database.execute(sql`
          SELECT id
          FROM "${sql.raw(APP_SCHEMA)}"."topics"
          WHERE id = ${topicId}
            AND enabled = true
          LIMIT 1
        `);
        if (rowsOf<{ id: number | string }>(topicResult).length === 0) {
          throw new TopicServiceError("TOPIC_NOT_FOUND", 404);
        }

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
            v.level,
            v.enabled,
            v.content_version
          FROM "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt
          JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = vt.vocabulary_id
          WHERE vt.topic_id = ${topicId}
            AND v.enabled = true
          ORDER BY v.id ASC
        `);
        return rowsOf<VocabularyRow>(result).map(toVocabularyDto);
      } catch (error) {
        if (error instanceof TopicServiceError) throw error;
        throw new TopicServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
