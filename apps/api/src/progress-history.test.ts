import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import {
  createProgressHistoryService,
  ProgressHistoryServiceError,
  PROGRESS_HISTORY_MAX_DAYS
} from "./progress-history";

const learnerId = "00000000-0000-4000-8000-000000000010";
const householdId = "00000000-0000-4000-8000-000000000001";

function authorizedRows() {
  return { rows: [{ learner_id: learnerId, household_id: householdId }] };
}

describe("US-37 progress history API boundary", () => {
  it("requires authentication and validates the required local-date range", async () => {
    const service = { get: vi.fn() };
    const unsigned = createApp({ readSession: async () => null, progressHistoryService: service });
    expect((await unsigned.request(`http://localhost/api/learners/${learnerId}/progress-history?from=2026-09-14&to=2026-09-20`)).status).toBe(401);
    expect(service.get).not.toHaveBeenCalled();

    const signed = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), progressHistoryService: service });
    expect((await signed.request(`http://localhost/api/learners/${learnerId}/progress-history?from=2026-09-14`)).status).toBe(400);
  });

  it("returns the learner-scoped read model and maps denied access", async () => {
    const value = { learnerId, timezone: "Asia/Ho_Chi_Minh", from: "2026-09-14", to: "2026-09-20", days: [] };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), progressHistoryService: { get: vi.fn(async () => value) } });
    expect(await (await app.request(`http://localhost/api/learners/${learnerId}/progress-history?from=2026-09-14&to=2026-09-20`)).json()).toEqual(value);

    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      progressHistoryService: { get: vi.fn(async () => { throw new ProgressHistoryServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }) }
    });
    expect((await denied.request(`http://localhost/api/learners/${learnerId}/progress-history?from=2026-09-14&to=2026-09-20`)).status).toBe(403);
  });
});

describe("US-37 progress history aggregation", () => {
  it("uses one range aggregation, zero-fills local dates, and preserves repeated review semantics", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const database = { execute: vi.fn(async (query) => {
      queries.push(new PgDialect().sqlToQuery(query));
      if (queries.length === 1) return authorizedRows();
      if (queries.length === 2) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      return { rows: [
        { date: "2026-09-14", reviews: "2", unique_words: "1", remembered: "1", forgotten: "1", new_learned: "1" },
        { date: "2026-09-16", reviews: "1", unique_words: "1", remembered: "1", forgotten: "0", new_learned: "0" }
      ] };
    }) };
    const result = await createProgressHistoryService(database).get("parent-1", learnerId, "2026-09-14", "2026-09-16");

    expect(result.days).toEqual([
      { date: "2026-09-14", reviews: 2, uniqueWords: 1, remembered: 1, forgotten: 1, newLearned: 1 },
      { date: "2026-09-15", reviews: 0, uniqueWords: 0, remembered: 0, forgotten: 0, newLearned: 0 },
      { date: "2026-09-16", reviews: 1, uniqueWords: 1, remembered: 1, forgotten: 0, newLearned: 0 }
    ]);
    const aggregate = queries[2]?.sql ?? "";
    expect(aggregate).toContain('FROM "vocabflow_app"."review_events"');
    expect(aggregate).toContain("COUNT(DISTINCT vocabulary_id)");
    expect(aggregate).toContain("previous_status::text = 'NEW'");
    expect(aggregate).toContain("GROUP BY review_date");
    expect(aggregate).not.toContain("learner_progress");
  });

  it("rejects invalid dates, reversed ranges, and ranges beyond the bounded maximum before reading data", async () => {
    const execute = vi.fn();
    const service = createProgressHistoryService({ execute });
    await expect(service.get("parent-1", learnerId, "2026-02-30", "2026-03-01")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(service.get("parent-1", learnerId, "2026-09-20", "2026-09-19")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(service.get("parent-1", learnerId, "2026-01-01", "2026-04-01")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(PROGRESS_HISTORY_MAX_DAYS).toBe(90);
    expect(execute).not.toHaveBeenCalled();
  });
});
