import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  learningSetDetailSchema,
  learningSetSummarySchema,
  learnerLearningSetDtoSchema,
  learnerLearningSetMutationResponseSchema,
  type LearningSetDetail,
  type LearningSetSummary,
  type LearnerLearningSetDto,
  type LearnerLearningSetMutationResponse,
  type VocabularyDto,
  vocabularyDtoSchema
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership, LearnerServiceError, resolveHouseholdId } from "./learners";

export type LearningSetDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type LearningSetServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "LEARNING_SET_NOT_FOUND"
  | "INTERNAL_ERROR";

export class LearningSetServiceError extends Error {
  readonly code: LearningSetServiceErrorCode;
  readonly status: 403 | 404 | 500;

  constructor(code: LearningSetServiceErrorCode, status: 403 | 404 | 500) {
    super(code);
    this.name = "LearningSetServiceError";
    this.code = code;
    this.status = status;
  }
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new LearningSetServiceError("INTERNAL_ERROR", 500);
}

function safeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new LearningSetServiceError("INTERNAL_ERROR", 500);
  }
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

type SummaryRow = {
  id: number | string;
  slug: unknown;
  name: unknown;
  description: unknown;
  grade: unknown;
  enabled: unknown;
  sort_order: number | string;
  vocabulary_count: number | string | bigint;
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

type AssignmentRow = SummaryRow & { active: unknown };

function toSummary(row: SummaryRow): LearningSetSummary {
  const parsed = learningSetSummarySchema.safeParse({
    id: safeInteger(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    grade: row.grade == null ? null : String(row.grade),
    enabled: row.enabled === true,
    sortOrder: safeInteger(row.sort_order),
    vocabularyCount: safeInteger(row.vocabulary_count)
  });
  if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

function toVocabulary(row: VocabularyRow): VocabularyDto {
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
  if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

async function authorizeCatalogAccess(database: LearningSetDatabase, userId: string) {
  try {
    await resolveHouseholdId(database, userId);
  } catch (error) {
    if (error instanceof LearnerServiceError && error.code === "HOUSEHOLD_ACCESS_DENIED") {
      throw new LearningSetServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
    }
    throw new LearningSetServiceError("INTERNAL_ERROR", 500);
  }
}

async function summaryRows(database: LearningSetDatabase, extra: SQL = sql``) {
  const result = await database.execute(sql`
    SELECT ls.id,
           ls.slug,
           ls.name,
           ls.description,
           ls.grade::text AS grade,
           ls.enabled,
           ls.sort_order,
           COUNT(*) FILTER (WHERE v.enabled = true)::bigint AS vocabulary_count
    FROM "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id
    WHERE ls.enabled = true
      ${extra}
    GROUP BY ls.id, ls.slug, ls.name, ls.description, ls.grade, ls.enabled, ls.sort_order
    ORDER BY ls.sort_order ASC, ls.id ASC
  `);
  return rowsOf<SummaryRow>(result);
}

async function requireSet(database: LearningSetDatabase, learningSetId: number): Promise<LearningSetSummary> {
  const [row] = await summaryRows(database, sql`AND ls.id = ${learningSetId}`);
  if (!row) throw new LearningSetServiceError("LEARNING_SET_NOT_FOUND", 404);
  return toSummary(row);
}

async function requireOwnership(database: LearningSetDatabase, userId: string, learnerId: string) {
  const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
  if (ownership.decision === "FORBIDDEN") {
    throw new LearningSetServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
  }
  return ownership;
}

export type LearningSetService = {
  list: (userId: string) => Promise<LearningSetSummary[]>;
  detail: (userId: string, learningSetId: number) => Promise<LearningSetDetail>;
  listForLearner: (userId: string, learnerId: string) => Promise<LearnerLearningSetDto[]>;
  assign: (userId: string, learnerId: string, learningSetId: number) => Promise<LearnerLearningSetMutationResponse>;
  unassign: (userId: string, learnerId: string, learningSetId: number) => Promise<LearnerLearningSetMutationResponse>;
};

export function createLearningSetService(database: LearningSetDatabase): LearningSetService {
  return {
    async list(userId) {
      await authorizeCatalogAccess(database, userId);
      try {
        return (await summaryRows(database)).map(toSummary);
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    },

    async detail(userId, learningSetId) {
      await authorizeCatalogAccess(database, userId);
      try {
        const summary = await requireSet(database, learningSetId);
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
                 lsi.sort_order
          FROM "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi
          JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id
          WHERE lsi.learning_set_id = ${learningSetId}
            AND v.enabled = true
          ORDER BY lsi.sort_order ASC, v.id ASC
        `);
        const detail = {
          ...summary,
          items: rowsOf<VocabularyRow & { sort_order: number | string }>(result).map((row) => ({
            sortOrder: safeInteger(row.sort_order),
            vocabulary: toVocabulary(row)
          }))
        };
        const parsed = learningSetDetailSchema.safeParse(detail);
        if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    },

    async listForLearner(userId, learnerId) {
      const ownership = await requireOwnership(database, userId, learnerId);
      try {
        const result = await database.execute(sql`
          SELECT ls.id,
                 ls.slug,
                 ls.name,
                 ls.description,
                 ls.grade::text AS grade,
                 ls.enabled,
                 ls.sort_order,
                 COUNT(*) FILTER (WHERE v.enabled = true)::bigint AS vocabulary_count,
                 COALESCE(lls.active, false) AS active
          FROM "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_learning_sets" lls
            ON lls.learning_set_id = ls.id
           AND lls.learner_id = ${ownership.learnerId}::uuid
          WHERE ls.enabled = true
          GROUP BY ls.id, ls.slug, ls.name, ls.description, ls.grade, ls.enabled,
                   ls.sort_order, lls.active
          ORDER BY ls.sort_order ASC, ls.id ASC
        `);
        return rowsOf<AssignmentRow>(result).map((row) => {
          const parsed = learnerLearningSetDtoSchema.safeParse({
            learningSet: toSummary(row),
            active: row.active === true
          });
          if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
          return parsed.data;
        });
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    },

    async assign(userId, learnerId, learningSetId) {
      await requireOwnership(database, userId, learnerId);
      try {
        await requireSet(database, learningSetId);
        const result = await database.execute(sql`
          INSERT INTO "${sql.raw(APP_SCHEMA)}"."learner_learning_sets"
            (learner_id, learning_set_id, active)
          VALUES (${learnerId}::uuid, ${learningSetId}, true)
          ON CONFLICT (learner_id, learning_set_id)
          DO UPDATE SET active = true, updated_at = now()
          RETURNING learner_id::text AS learner_id, learning_set_id, active
        `);
        const [row] = rowsOf<{ learner_id: string; learning_set_id: number | string; active: unknown }>(result);
        const parsed = learnerLearningSetMutationResponseSchema.safeParse({
          learnerId: row?.learner_id,
          learningSetId: row ? safeInteger(row.learning_set_id) : 0,
          active: row?.active === true
        });
        if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    },

    async unassign(userId, learnerId, learningSetId) {
      await requireOwnership(database, userId, learnerId);
      try {
        await requireSet(database, learningSetId);
        await database.execute(sql`
          DELETE FROM "${sql.raw(APP_SCHEMA)}"."learner_learning_sets"
          WHERE learner_id = ${learnerId}::uuid
            AND learning_set_id = ${learningSetId}
        `);
        const parsed = learnerLearningSetMutationResponseSchema.safeParse({
          learnerId,
          learningSetId,
          active: false
        });
        if (!parsed.success) throw new LearningSetServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof LearningSetServiceError) throw error;
        throw new LearningSetServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
