import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import type { ProgressSummaryResponse } from "@vocabflow/contracts";
import { createApp } from "./index";
import { createProgressSummaryService, ProgressSummaryServiceError } from "./progress-summary";

const learnerId = "00000000-0000-4000-8000-000000000010";
const otherLearnerId = "00000000-0000-4000-8000-000000000011";
const householdId = "00000000-0000-4000-8000-000000000001";

function authorizedRows(id = learnerId, household = householdId) {
  return { rows: [{ learner_id: id, household_id: household }] };
}

function summaryRow(values: Partial<Record<"new_count" | "learning_count" | "mastered_count" | "due_count" | "learned_count", number | string | bigint>> = {}) {
  return {
    rows: [{
      new_count: values.new_count ?? "30",
      learning_count: values.learning_count ?? "2",
      mastered_count: values.mastered_count ?? "3",
      due_count: values.due_count ?? "4",
      learned_count: values.learned_count ?? "5"
    }]
  };
}

function levelRows(rows: unknown[] = []) {
  return { rows };
}

describe("US-20 progress summary API boundary", () => {
  it("returns 401 before invoking the progress summary service", async () => {
    const service = { get: vi.fn() };
    const app = createApp({ readSession: async () => null, progressSummaryService: service });
    const response = await app.request("http://localhost/api/learners/" + learnerId + "/progress-summary");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Đăng nhập để tiếp tục." } });
    expect(service.get).not.toHaveBeenCalled();
  });

  it("returns the canonical summary for the authenticated learner", async () => {
    const summary: ProgressSummaryResponse = {
      learnerId,
      newCount: 30,
      learningCount: 2,
      masteredCount: 3,
      dueCount: 4,
      learnedCount: 5,
      progressByLevel: []
    };
    const service = { get: vi.fn(async () => summary) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), progressSummaryService: service });
    const response = await app.request("http://localhost/api/learners/" + learnerId + "/progress-summary");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(summary);
    expect(service.get).toHaveBeenCalledWith("parent-1", learnerId);
  });

  it("maps authorization and database failures to safe outward errors", async () => {
    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      progressSummaryService: {
        get: vi.fn(async () => { throw new ProgressSummaryServiceError("HOUSEHOLD_ACCESS_DENIED", 403); })
      }
    });
    const deniedResponse = await denied.request("http://localhost/api/learners/" + learnerId + "/progress-summary");
    expect(deniedResponse.status).toBe(403);
    expect(await deniedResponse.json()).toEqual({
      error: { code: "HOUSEHOLD_ACCESS_DENIED", message: "Bạn không có quyền truy cập learner này." }
    });

    const failed = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      progressSummaryService: { get: vi.fn(async () => { throw new Error("database secret"); }) }
    });
    const failedResponse = await failed.request("http://localhost/api/learners/" + learnerId + "/progress-summary");
    const body = await failedResponse.text();
    expect(failedResponse.status).toBe(503);
    expect(body).toContain('"code":"INTERNAL_ERROR"');
    expect(body).not.toContain("database secret");
  });
});

describe("US-20 progress summary service", () => {
  it("authorizes, uses the household-local date, and aggregates canonical progress metrics", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const results: unknown[] = [
      authorizedRows(),
      { rows: [{ timezone: "America/Los_Angeles" }] },
      summaryRow({ new_count: 30n, learning_count: "2", mastered_count: 3, due_count: 4n, learned_count: 5 }),
      levelRows([
        { level: "GRADE_1", total: "10", learned_count: "6", mastered_count: "2" },
        { level: null, total: "2", learned_count: "0", mastered_count: "0" },
        { level: "GENERAL", total: "4", learned_count: "1", mastered_count: "0" }
      ])
    ];
    const service = createProgressSummaryService({
      execute: vi.fn(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return results.shift() ?? { rows: [] };
      })
    }, { now: () => new Date("2026-09-15T01:00:00.000Z") });

    await expect(service.get("parent-1", learnerId)).resolves.toEqual({
      learnerId,
      newCount: 30,
      learningCount: 2,
      masteredCount: 3,
      dueCount: 4,
      learnedCount: 5,
      progressByLevel: [
        { level: "GRADE_1", total: 10, learnedCount: 6, masteredCount: 2 },
        { level: null, total: 2, learnedCount: 0, masteredCount: 0 },
        { level: "GENERAL", total: 4, learnedCount: 1, masteredCount: 0 }
      ]
    });

    expect(queries).toHaveLength(4);
    expect(queries[0]?.sql).toContain("household_members");
    expect(queries[1]?.sql).toContain('FROM "vocabflow_app"."households"');
    expect(queries[2]?.sql).toContain("lp.learner_id = $2::uuid");
    expect(queries[2]?.sql).toContain("v.enabled = true AND lp.vocabulary_id IS NULL");
    expect(queries[2]?.sql).toContain("lp.status::text = 'LEARNING'");
    expect(queries[2]?.sql).toContain("lp.status::text = 'MASTERED'");
    expect(queries[2]?.sql).toContain("lp.next_review_date <= $1::date");
    expect(queries[2]?.sql).toContain("COUNT(DISTINCT lp.vocabulary_id)");
    expect(queries[2]?.params).toEqual(["2026-09-14", learnerId]);
    expect(queries[2]?.sql).not.toContain("review_events");
    const levels = queries[3]?.sql ?? "";
    expect(levels).toContain("WITH eligible_vocabulary AS");
    expect(levels).toContain("SELECT DISTINCT v.id, v.level");
    expect(levels).toContain('"vocabflow_app"."learner_learning_sets"');
    expect(levels).toContain("lls.active = true");
    expect(levels).toContain("ls.enabled = true");
    expect(levels).toContain("v.enabled = true");
    expect(levels).toContain("GROUP BY ev.level");
    expect(levels).toContain("WHEN 'GRADE_1' THEN 1");
    expect(levels).toContain("WHEN 'GENERAL' THEN 6");
    expect(levels).not.toContain("review_events");
  });

  it("returns zero learning metrics when the learner has no materialized progress", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(summaryRow({ new_count: 30, learning_count: 0, mastered_count: 0, due_count: 0, learned_count: 0 }))
      .mockResolvedValueOnce(levelRows());

    await expect(createProgressSummaryService({ execute }).get("parent-1", learnerId)).resolves.toEqual({
      learnerId,
      newCount: 30,
      learningCount: 0,
      masteredCount: 0,
      dueCount: 0,
      learnedCount: 0,
      progressByLevel: []
    });
  });

  it("keeps learner summaries isolated and denies a foreign household", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(summaryRow({ learned_count: 1 }))
      .mockResolvedValueOnce(levelRows())
      .mockResolvedValueOnce(authorizedRows(otherLearnerId))
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(summaryRow({ learned_count: 0 }))
      .mockResolvedValueOnce(levelRows());
    const service = createProgressSummaryService({ execute });

    await expect(service.get("parent-1", learnerId)).resolves.toMatchObject({ learnerId, learnedCount: 1 });
    await expect(service.get("parent-1", otherLearnerId)).resolves.toMatchObject({ learnerId: otherLearnerId, learnedCount: 0 });

    execute.mockResolvedValueOnce({ rows: [] });
    await expect(service.get("parent-1", learnerId)).rejects.toMatchObject({
      code: "HOUSEHOLD_ACCESS_DENIED",
      status: 403
    });
    expect(execute).toHaveBeenCalledTimes(9);
  });

  it("fails closed for unsafe aggregate counts", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(summaryRow({ learned_count: String(Number.MAX_SAFE_INTEGER + 1) }));

    await expect(createProgressSummaryService({ execute }).get("parent-1", learnerId)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500
    });
  });
});
