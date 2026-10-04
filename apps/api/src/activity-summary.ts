import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  activitySummaryResponseSchema,
  type ActivitySummaryResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { householdLocalDate } from "./reviews";

export type ActivitySummaryDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type ActivitySummaryServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INTERNAL_ERROR";

export class ActivitySummaryServiceError extends Error {
  readonly code: ActivitySummaryServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: ActivitySummaryServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "ActivitySummaryServiceError";
    this.code = code;
    this.status = status;
  }
}

type ActivityRow = {
  activity_date: unknown;
  new_completed: unknown;
  review_completed: unknown;
};

type LearnerActivitySettings = {
  timezone: unknown;
  daily_new_word_goal: unknown;
  daily_review_word_goal: unknown;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
}

function safeNonNegativeCount(value: unknown): number {
  try {
    if (typeof value === "number") {
      if (Number.isSafeInteger(value) && value >= 0) return value;
      throw new Error("UNSAFE_COUNT");
    }
    const parsed = typeof value === "bigint" ? value : BigInt(String(value));
    if (parsed < 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("UNSAFE_COUNT");
    return Number(parsed);
  } catch {
    throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
  }
}

function safeGoal(value: unknown): number {
  const goal = safeNonNegativeCount(value);
  if (goal < 1 || goal > 100) throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
  return goal;
}

function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function dateToOrdinal(value: string): number {
  if (!isLocalDate(value)) throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function ordinalToDate(ordinal: number): string {
  const date = new Date(ordinal * 86_400_000);
  return date.toISOString().slice(0, 10);
}

export type DerivedStreak = {
  currentStreak: number;
  longestStreak: number;
  todayActive: boolean;
};

export function deriveStreak(activeDates: string[], today: string): DerivedStreak {
  if (!isLocalDate(today)) throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
  const ordinals = [...new Set(activeDates.map(dateToOrdinal))].sort((a, b) => a - b);
  const active = new Set(ordinals);
  const todayOrdinal = dateToOrdinal(today);
  const todayActive = active.has(todayOrdinal);

  let longestStreak = 0;
  let run = 0;
  let previous: number | undefined;
  for (const ordinal of ordinals) {
    run = previous !== undefined && ordinal === previous + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = ordinal;
  }

  const endpoint = todayActive
    ? todayOrdinal
    : active.has(todayOrdinal - 1)
      ? todayOrdinal - 1
      : undefined;
  let currentStreak = 0;
  if (endpoint !== undefined) {
    for (let ordinal = endpoint; active.has(ordinal); ordinal -= 1) currentStreak += 1;
  }

  return { currentStreak, longestStreak, todayActive };
}

async function learnerActivitySettings(
  database: ActivitySummaryDatabase,
  learnerId: string,
  householdId: string,
): Promise<LearnerActivitySettings> {
  const result = await database.execute(sql`
    SELECT h.timezone, lp.daily_new_word_goal, lp.daily_review_word_goal
    FROM "${sql.raw(APP_SCHEMA)}"."learner_profiles" lp
    JOIN "${sql.raw(APP_SCHEMA)}"."households" h ON h.id = lp.household_id
    WHERE lp.id = ${learnerId}::uuid
      AND lp.household_id = ${householdId}::uuid
    LIMIT 1
  `);
  const [row] = rowsOf<LearnerActivitySettings>(result);
  if (!row || typeof row.timezone !== "string" || row.timezone.length === 0) {
    throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
  }
  return row;
}

async function activityRows(
  database: ActivitySummaryDatabase,
  learnerId: string,
): Promise<ActivityRow[]> {
  const result = await database.execute(sql`
    SELECT review_date::text AS activity_date,
           COUNT(DISTINCT vocabulary_id) FILTER (
             WHERE previous_status = 'NEW' AND new_status <> 'NEW'
           ) AS new_completed,
           COUNT(DISTINCT vocabulary_id) FILTER (
             WHERE previous_status <> 'NEW'
           ) AS review_completed
    FROM "${sql.raw(APP_SCHEMA)}"."review_events"
    WHERE learner_id = ${learnerId}::uuid
    GROUP BY review_date
    ORDER BY review_date ASC
  `);
  return rowsOf<ActivityRow>(result);
}

function dailyGoalProgress(goalValue: unknown, completedValue: unknown) {
  const goal = safeGoal(goalValue);
  const completed = safeNonNegativeCount(completedValue);
  return {
    goal,
    completed,
    remaining: Math.max(0, goal - completed),
    percent: Math.min(100, Math.round(Math.min(completed, goal) / goal * 100))
  };
}

export type ActivitySummaryService = {
  get: (userId: string, learnerId: string) => Promise<ActivitySummaryResponse>;
};

export function createActivitySummaryService(
  database: ActivitySummaryDatabase,
  options: { now?: () => Date } = {},
): ActivitySummaryService {
  const now = options.now ?? (() => new Date());

  return {
    async get(userId, learnerId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new ActivitySummaryServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        const settings = await learnerActivitySettings(database, ownership.learnerId, ownership.householdId);
        const localDate = householdLocalDate(now(), settings.timezone as string);
        const rows = await activityRows(database, ownership.learnerId);
        const dailyRow = rows.find((row) => row.activity_date === localDate);
        const dailyGoal = {
          newWords: dailyGoalProgress(settings.daily_new_word_goal, dailyRow?.new_completed ?? 0),
          reviews: dailyGoalProgress(settings.daily_review_word_goal, dailyRow?.review_completed ?? 0)
        };
        const goalTotal = dailyGoal.newWords.goal + dailyGoal.reviews.goal;
        const completedTotal = Math.min(dailyGoal.newWords.completed, dailyGoal.newWords.goal)
          + Math.min(dailyGoal.reviews.completed, dailyGoal.reviews.goal);
        const isDailyGoalComplete = dailyGoal.newWords.completed >= dailyGoal.newWords.goal
          && dailyGoal.reviews.completed >= dailyGoal.reviews.goal;
        const dailyGoalSummary = {
          ...dailyGoal,
          overallPercent: Math.min(100, Math.round(completedTotal / goalTotal * 100)),
          completed: isDailyGoalComplete
        };
        const streak = deriveStreak(
          rows.map((row) => {
            if (typeof row.activity_date !== "string" || !isLocalDate(row.activity_date)) {
              throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
            }
            return row.activity_date;
          }),
          localDate,
        );
        const parsed = activitySummaryResponseSchema.safeParse({
          learnerId: ownership.learnerId,
          localDate,
          dailyGoal: dailyGoalSummary,
          streak
        });
        if (!parsed.success) throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof ActivitySummaryServiceError) throw error;
        throw new ActivitySummaryServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}

export function localDateMinusOne(value: string): string {
  return ordinalToDate(dateToOrdinal(value) - 1);
}
