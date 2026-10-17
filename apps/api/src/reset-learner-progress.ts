import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  resetLearnerProgressResponseSchema,
  type ResetLearnerProgressResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type ResetLearnerProgressDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type ResetLearnerProgressServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "INTERNAL_ERROR";

export class ResetLearnerProgressServiceError extends Error {
  readonly code: ResetLearnerProgressServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: ResetLearnerProgressServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "ResetLearnerProgressServiceError";
    this.code = code;
    this.status = status;
  }
}

type DeletedProgressRow = { vocabulary_id: unknown };

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new ResetLearnerProgressServiceError("INTERNAL_ERROR", 500);
}

export type ResetLearnerProgressService = {
  reset: (userId: string, learnerId: string) => Promise<ResetLearnerProgressResponse>;
};

export function createResetLearnerProgressService(
  database: ResetLearnerProgressDatabase,
  options: { datasetVersion?: VocabularyDatasetVersion } = {}
): ResetLearnerProgressService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async reset(userId, learnerId) {
      let ownership;
      try {
        ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      } catch {
        throw new ResetLearnerProgressServiceError("INTERNAL_ERROR", 500);
      }
      if (ownership.decision === "FORBIDDEN") {
        throw new ResetLearnerProgressServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        // A single DELETE is atomic in PostgreSQL. Keeping the mutation in one
        // statement also matches the runtime's Neon HTTP database pattern and
        // makes a future partial reset impossible at this boundary.
        const result = await database.execute(sql`
          DELETE FROM "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
          USING "${sql.raw(APP_SCHEMA)}"."vocabularies" v
          WHERE lp.learner_id = ${ownership.learnerId}::uuid
            AND lp.vocabulary_id = v.id
            AND ${vocabularyDatasetPredicate("v", datasetVersion)}
          RETURNING lp.vocabulary_id
        `);
        const parsed = resetLearnerProgressResponseSchema.safeParse({
          learnerId: ownership.learnerId,
          deletedProgressCount: rowsOf<DeletedProgressRow>(result).length
        });
        if (!parsed.success) throw new ResetLearnerProgressServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof ResetLearnerProgressServiceError) throw error;
        throw new ResetLearnerProgressServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
