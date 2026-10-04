import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import {
  ActivitySummaryServiceError,
  createActivitySummaryService,
  deriveStreak
} from "./activity-summary";

const learnerId = "00000000-0000-4000-8000-000000000010";
const otherLearnerId = "00000000-0000-4000-8000-000000000011";
const householdId = "00000000-0000-4000-8000-000000000001";

function authorizedRows(id = learnerId) {
  return { rows: [{ learner_id: id, household_id: householdId }] };
}

function activityRows(rows: Array<[string, number | string | bigint, number | string | bigint]>) {
  return { rows: rows.map(([activity_date, new_completed, review_completed]) => ({ activity_date, new_completed, review_completed })) };
}

describe("US-35 + US-36 activity summary API boundary", () => {
  it("requires authentication before invoking the service", async () => {
    const service = { get: vi.fn() };
    const app = createApp({ readSession: async () => null, activitySummaryService: service });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/activity-summary`);
    expect(response.status).toBe(401);
    expect(service.get).not.toHaveBeenCalled();
  });

  it("returns the canonical learner activity summary and maps forbidden access", async () => {
    const summary = {
      learnerId,
      localDate: "2026-09-20",
      dailyGoal: {
        newWords: { goal: 10, completed: 4, remaining: 6, percent: 40 },
        reviews: { goal: 20, completed: 13, remaining: 7, percent: 65 },
        overallPercent: 57,
        completed: false
      },
      streak: { currentStreak: 3, longestStreak: 7, todayActive: true }
    };
    const service = { get: vi.fn(async () => summary) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), activitySummaryService: service });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/activity-summary`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(summary);
    expect(service.get).toHaveBeenCalledWith("parent-1", learnerId);

    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      activitySummaryService: { get: vi.fn(async () => { throw new ActivitySummaryServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }) }
    });
    expect((await denied.request(`http://localhost/api/learners/${learnerId}/activity-summary`)).status).toBe(403);
  });
});

describe("US-35 + US-36 activity aggregation", () => {
  it("counts unique vocabulary from persisted review history and uses household-local review_date", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const results: unknown[] = [
      authorizedRows(),
      { rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_new_word_goal: 10, daily_review_word_goal: 20 }] },
      activityRows([
        ["2026-09-18", 1, 1],
        ["2026-09-19", 1, 0],
        ["2026-09-20", 4, 13]
      ])
    ];
    const database = { execute: vi.fn(async (query) => {
      queries.push(new PgDialect().sqlToQuery(query));
      return results.shift() ?? { rows: [] };
    }) };
    const service = createActivitySummaryService(database, { now: () => new Date("2026-09-20T00:30:00.000Z") });

    await expect(service.get("parent-1", learnerId)).resolves.toEqual({
      learnerId,
      localDate: "2026-09-20",
      dailyGoal: {
        newWords: { goal: 10, completed: 4, remaining: 6, percent: 40 },
        reviews: { goal: 20, completed: 13, remaining: 7, percent: 65 },
        overallPercent: 57,
        completed: false
      },
      streak: { currentStreak: 3, longestStreak: 3, todayActive: true }
    });
    expect(queries[2]?.sql).toContain('FROM "vocabflow_app"."review_events"');
    expect(queries[2]?.sql).toContain("COUNT(DISTINCT vocabulary_id)");
    expect(queries[2]?.sql).toContain("previous_status = 'NEW'");
    expect(queries[2]?.sql).toContain("previous_status <> 'NEW'");
    expect(queries[2]?.sql).toContain("GROUP BY review_date");
    expect(queries[2]?.sql).not.toContain("learner_progress");
  });

  it("derives current and longest streak deterministically", () => {
    expect(deriveStreak([], "2026-09-20")).toEqual({ currentStreak: 0, longestStreak: 0, todayActive: false });
    expect(deriveStreak(["2026-09-20", "2026-09-20"], "2026-09-20")).toEqual({ currentStreak: 1, longestStreak: 1, todayActive: true });
    expect(deriveStreak(["2026-09-18", "2026-09-19"], "2026-09-20")).toEqual({ currentStreak: 2, longestStreak: 2, todayActive: false });
    expect(deriveStreak(["2026-09-17", "2026-09-19", "2026-09-20"], "2026-09-20")).toEqual({ currentStreak: 2, longestStreak: 2, todayActive: true });
    expect(deriveStreak(["2026-09-15", "2026-09-16", "2026-09-18"], "2026-09-20")).toEqual({ currentStreak: 0, longestStreak: 2, todayActive: false });
  });

  it("keeps activity isolated by learner and rejects unsafe goal data", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows(otherLearnerId))
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_new_word_goal: 10, daily_review_word_goal: 20 }] })
      .mockResolvedValueOnce(activityRows([["2026-09-20", 1, 0]]));
    const service = createActivitySummaryService({ execute }, { now: () => new Date("2026-09-20T00:00:00.000Z") });
    await expect(service.get("parent-1", otherLearnerId)).resolves.toMatchObject({ learnerId: otherLearnerId });

    execute.mockReset();
    execute
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_new_word_goal: 0, daily_review_word_goal: 20 }] });
    await expect(createActivitySummaryService({ execute }).get("parent-1", learnerId)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("does not complete the composite goal when only one category reaches its target", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_new_word_goal: 10, daily_review_word_goal: 20 }] })
      .mockResolvedValueOnce(activityRows([["2026-09-20", 10, 0]]));
    await expect(createActivitySummaryService({ execute }, { now: () => new Date("2026-09-20T00:00:00.000Z") }).get("parent-1", learnerId)).resolves.toMatchObject({
      dailyGoal: {
        newWords: { goal: 10, completed: 10, remaining: 0, percent: 100 },
        reviews: { goal: 20, completed: 0, remaining: 20, percent: 0 },
        overallPercent: 33,
        completed: false
      }
    });
  });

  it("clamps overall progress at 100 percent while preserving actual completed counts", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_new_word_goal: 10, daily_review_word_goal: 20 }] })
      .mockResolvedValueOnce(activityRows([["2026-09-20", 14, 24]]));
    await expect(createActivitySummaryService({ execute }, { now: () => new Date("2026-09-20T00:00:00.000Z") }).get("parent-1", learnerId)).resolves.toMatchObject({
      dailyGoal: {
        newWords: { goal: 10, completed: 14, remaining: 0, percent: 100 },
        reviews: { goal: 20, completed: 24, remaining: 0, percent: 100 },
        overallPercent: 100,
        completed: true
      }
    });
  });

  it("uses household local date at the day boundary for goal counts and streak", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_new_word_goal: 10, daily_review_word_goal: 20 }] })
      .mockResolvedValueOnce(activityRows([
        ["2026-09-30", 9, 20],
        ["2026-10-01", 2, 4]
      ]));
    await expect(createActivitySummaryService({ execute }, { now: () => new Date("2026-09-30T17:30:00.000Z") }).get("parent-1", learnerId)).resolves.toMatchObject({
      localDate: "2026-10-01",
      dailyGoal: {
        newWords: { completed: 2, goal: 10, percent: 20 },
        reviews: { completed: 4, goal: 20, percent: 20 },
        overallPercent: 20
      },
      streak: { currentStreak: 2, todayActive: true }
    });
  });
});
