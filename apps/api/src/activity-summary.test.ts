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

function activityRows(rows: Array<[string, number | string | bigint]>) {
  return { rows: rows.map(([activity_date, reviewed_unique]) => ({ activity_date, reviewed_unique })) };
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
      dailyGoal: { goal: 10, reviewedUnique: 7, remaining: 3, completed: false },
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
      { rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_learning_goal: 10 }] },
      activityRows([
        ["2026-09-18", 2],
        ["2026-09-19", 1],
        ["2026-09-20", 3]
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
      dailyGoal: { goal: 10, reviewedUnique: 3, remaining: 7, completed: false },
      streak: { currentStreak: 3, longestStreak: 3, todayActive: true }
    });
    expect(queries[2]?.sql).toContain('FROM "vocabflow_app"."review_events"');
    expect(queries[2]?.sql).toContain("COUNT(DISTINCT vocabulary_id)");
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
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_learning_goal: 10 }] })
      .mockResolvedValueOnce(activityRows([["2026-09-20", 1]]));
    const service = createActivitySummaryService({ execute }, { now: () => new Date("2026-09-20T00:00:00.000Z") });
    await expect(service.get("parent-1", otherLearnerId)).resolves.toMatchObject({ learnerId: otherLearnerId });

    execute.mockReset();
    execute
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_learning_goal: 0 }] });
    await expect(createActivitySummaryService({ execute }).get("parent-1", learnerId)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("keeps reviewedUnique above goal while clamping only remaining", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh", daily_learning_goal: 10 }] })
      .mockResolvedValueOnce(activityRows([["2026-09-20", 14]]));
    await expect(createActivitySummaryService({ execute }, { now: () => new Date("2026-09-20T00:00:00.000Z") }).get("parent-1", learnerId)).resolves.toMatchObject({
      dailyGoal: { goal: 10, reviewedUnique: 14, remaining: 0, completed: true }
    });
  });
});
