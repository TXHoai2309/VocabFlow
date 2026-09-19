import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  learnerSettingsResponseSchema,
  updateLearnerSettingsRequestSchema,
  type LearnerSettingsResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";

export type LearnerSettingsDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type LearnerSettingsServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR";

export class LearnerSettingsServiceError extends Error {
  readonly code: LearnerSettingsServiceErrorCode;
  readonly status: 400 | 403 | 500;

  constructor(code: LearnerSettingsServiceErrorCode, status: 400 | 403 | 500) {
    super(code);
    this.name = "LearnerSettingsServiceError";
    this.code = code;
    this.status = status;
  }
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new LearnerSettingsServiceError("INTERNAL_ERROR", 500);
}

function safeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 100) {
    throw new LearnerSettingsServiceError("INTERNAL_ERROR", 500);
  }
  return value;
}

function toResponse(row: { learner_id: unknown; daily_new_word_limit: unknown }): LearnerSettingsResponse {
  const parsed = learnerSettingsResponseSchema.safeParse({
    learnerId: String(row.learner_id),
    dailyNewWordLimit: safeLimit(Number(row.daily_new_word_limit))
  });
  if (!parsed.success) throw new LearnerSettingsServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

export function parseLearnerSettingsRequest(payload: unknown): number {
  const parsed = updateLearnerSettingsRequestSchema.safeParse(payload);
  if (!parsed.success) throw new LearnerSettingsServiceError("INVALID_REQUEST", 400);
  return parsed.data.dailyNewWordLimit;
}

export type LearnerSettingsService = {
  get: (userId: string, learnerId: string) => Promise<LearnerSettingsResponse>;
  update: (userId: string, learnerId: string, payload: unknown) => Promise<LearnerSettingsResponse>;
};

export function createLearnerSettingsService(database: LearnerSettingsDatabase): LearnerSettingsService {
  return {
    async get(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new LearnerSettingsServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }
      try {
        const result = await database.execute(sql`
          SELECT id::text AS learner_id, daily_new_word_limit
          FROM "${sql.raw(APP_SCHEMA)}"."learner_profiles"
          WHERE id = ${ownership.learnerId}::uuid
          LIMIT 1
        `);
        const [row] = rowsOf<{ learner_id: unknown; daily_new_word_limit: unknown }>(result);
        if (!row) throw new LearnerSettingsServiceError("INTERNAL_ERROR", 500);
        return toResponse(row);
      } catch (error) {
        if (error instanceof LearnerSettingsServiceError) throw error;
        throw new LearnerSettingsServiceError("INTERNAL_ERROR", 500);
      }
    },
    async update(userId, learnerId, payload) {
      const dailyNewWordLimit = parseLearnerSettingsRequest(payload);
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new LearnerSettingsServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }
      try {
        const result = await database.execute(sql`
          UPDATE "${sql.raw(APP_SCHEMA)}"."learner_profiles"
          SET daily_new_word_limit = ${dailyNewWordLimit}::integer,
              updated_at = now()
          WHERE id = ${ownership.learnerId}::uuid
          RETURNING id::text AS learner_id, daily_new_word_limit
        `);
        const [row] = rowsOf<{ learner_id: unknown; daily_new_word_limit: unknown }>(result);
        if (!row) throw new LearnerSettingsServiceError("INTERNAL_ERROR", 500);
        return toResponse(row);
      } catch (error) {
        if (error instanceof LearnerSettingsServiceError) throw error;
        throw new LearnerSettingsServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
