import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  gamificationResponseSchema,
  type GamificationResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export const XP_PER_LEVEL = 100 as const;

export type GamificationDatabase = { execute: (query: SQL) => Promise<unknown> };
export type GamificationServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INTERNAL_ERROR";

export class GamificationServiceError extends Error {
  readonly code: GamificationServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: GamificationServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "GamificationServiceError";
    this.code = code;
    this.status = status;
  }
}

type SummaryRow = { total_xp: unknown };
type AchievementRow = { code: unknown; name: unknown; description: unknown; unlocked_at: unknown };

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new GamificationServiceError("INTERNAL_ERROR", 500);
}

function safeCount(value: unknown): number {
  try {
    const parsed = typeof value === "number" ? value : Number(BigInt(String(value ?? 0)));
    if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("UNSAFE_COUNT");
    return parsed;
  } catch {
    throw new GamificationServiceError("INTERNAL_ERROR", 500);
  }
}

function nullableTimestamp(value: unknown): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new GamificationServiceError("INTERNAL_ERROR", 500);
  return date.toISOString();
}

async function reconcileAchievements(database: GamificationDatabase, learnerId: string): Promise<void> {
  await database.execute(sql`
    WITH learner_state AS (
      SELECT
        EXISTS (
          SELECT 1 FROM "${sql.raw(APP_SCHEMA)}"."review_events" re
          WHERE re.learner_id = ${learnerId}::uuid
        ) AS has_review,
        (SELECT COUNT(*) FROM "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
          WHERE lp.learner_id = ${learnerId}::uuid) AS learned_count,
        EXISTS (
          SELECT 1
          FROM "${sql.raw(APP_SCHEMA)}"."xp_events" xe
          WHERE xe.learner_id = ${learnerId}::uuid
            AND xe.source_type = 'DAILY_GOAL'
        ) AS completed_daily_goal,
        COALESCE((
          SELECT MAX(streak_length)
          FROM (
            SELECT COUNT(*) AS streak_length
            FROM (
              SELECT review_date,
                     review_date - (ROW_NUMBER() OVER (ORDER BY review_date))::integer AS streak_group
              FROM (
                SELECT DISTINCT review_date
                FROM "${sql.raw(APP_SCHEMA)}"."review_events"
                WHERE learner_id = ${learnerId}::uuid
              ) active_dates
            ) grouped_dates
            GROUP BY streak_group
          ) streaks
        ), 0) AS longest_streak
    )
    INSERT INTO "${sql.raw(APP_SCHEMA)}"."learner_achievements" (learner_id, achievement_id)
    SELECT ${learnerId}::uuid, a.id
    FROM "${sql.raw(APP_SCHEMA)}"."achievements" a
    CROSS JOIN learner_state state
    WHERE a.enabled = true
      AND (
        (a.code = 'FIRST_REVIEW' AND state.has_review)
        OR (a.code = 'TEN_WORDS_LEARNED' AND state.learned_count >= 10)
        OR (a.code = 'FIFTY_WORDS_LEARNED' AND state.learned_count >= 50)
        OR (a.code = 'SEVEN_DAY_STREAK' AND state.longest_streak >= 7)
        OR (a.code = 'DAILY_GOAL_COMPLETED' AND state.completed_daily_goal)
      )
    ON CONFLICT (learner_id, achievement_id) DO NOTHING
  `);
}

async function summary(database: GamificationDatabase, learnerId: string, datasetVersion: VocabularyDatasetVersion): Promise<SummaryRow> {
  if (datasetVersion !== "legacy") {
    const result = await database.execute(sql`
      SELECT COALESCE(SUM(xe.points), 0) AS total_xp
      FROM "${sql.raw(APP_SCHEMA)}"."xp_events" xe
      JOIN "${sql.raw(APP_SCHEMA)}"."review_events" re
        ON (xe.source_type = 'REVIEW' AND xe.source_key = 'review:' || re.review_id::text)
        OR (xe.source_type = 'EXERCISE_CORRECT' AND xe.source_key = 'exercise-correct:' || re.review_id::text)
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = re.vocabulary_id
      WHERE xe.learner_id = ${learnerId}::uuid
        AND re.learner_id = ${learnerId}::uuid
        AND ${vocabularyDatasetPredicate("v", datasetVersion)}
    `);
    const [row] = rowsOf<SummaryRow>(result);
    if (!row) throw new GamificationServiceError("INTERNAL_ERROR", 500);
    return row;
  }
  const result = await database.execute(sql`
    SELECT COALESCE(SUM(points), 0) AS total_xp
    FROM "${sql.raw(APP_SCHEMA)}"."xp_events"
    WHERE learner_id = ${learnerId}::uuid
  `);
  const [row] = rowsOf<SummaryRow>(result);
  if (!row) throw new GamificationServiceError("INTERNAL_ERROR", 500);
  return row;
}

async function achievementRows(database: GamificationDatabase, learnerId: string): Promise<AchievementRow[]> {
  const result = await database.execute(sql`
    SELECT a.code, a.name, a.description, la.unlocked_at
    FROM "${sql.raw(APP_SCHEMA)}"."achievements" a
    LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_achievements" la
      ON la.achievement_id = a.id
     AND la.learner_id = ${learnerId}::uuid
    WHERE a.enabled = true
    ORDER BY a.sort_order ASC, a.id ASC
  `);
  return rowsOf<AchievementRow>(result);
}

export type GamificationService = { get: (userId: string, learnerId: string) => Promise<GamificationResponse> };

export function createGamificationService(database: GamificationDatabase, options: { datasetVersion?: VocabularyDatasetVersion } = {}): GamificationService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async get(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") throw new GamificationServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      try {
        if (datasetVersion === "legacy") await reconcileAchievements(database, ownership.learnerId);
        const [xpRow, achievements] = await Promise.all([
          summary(database, ownership.learnerId, datasetVersion),
          datasetVersion !== "legacy" ? Promise.resolve([]) : achievementRows(database, ownership.learnerId)
        ]);
        const total = safeCount(xpRow.total_xp);
        const xpIntoLevel = total % XP_PER_LEVEL;
        const parsed = gamificationResponseSchema.safeParse({
          learnerId: ownership.learnerId,
          xp: {
            total,
            level: Math.floor(total / XP_PER_LEVEL) + 1,
            xpIntoLevel,
            xpPerLevel: XP_PER_LEVEL,
            xpToNextLevel: XP_PER_LEVEL - xpIntoLevel
          },
          achievements: achievements.map((achievement) => ({
            code: String(achievement.code),
            name: String(achievement.name),
            description: String(achievement.description),
            unlockedAt: nullableTimestamp(achievement.unlocked_at)
          }))
        });
        if (!parsed.success) throw new GamificationServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof GamificationServiceError) throw error;
        throw new GamificationServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
