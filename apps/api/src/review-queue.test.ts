import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createReviewQueueService, ReviewQueueServiceError } from "./review-queue";
import type { ReviewQueueResponse } from "@vocabflow/contracts";

const learnerId = "00000000-0000-4000-8000-000000000010";
const householdId = "00000000-0000-4000-8000-000000000001";

function vocabularyRow(id: number, word = `word-${id}`) {
  return {
    id,
    word,
    ipa: null,
    vietnamese: `nghĩa-${id}`,
    definition_en: null,
    example_en: null,
    image_url: null,
    audio_url: null,
    topic: null,
    level: null,
    enabled: true,
    content_version: 1
  };
}

function dueRow(id: number, totalCount: number, revision: number | bigint | string = 4, nextReviewDate = "2026-09-14") {
  return {
    ...vocabularyRow(id),
    status: "LEARNING",
    next_review_date: nextReviewDate,
    revision,
    total_count: totalCount
  };
}

function newRow(id: number, totalCount: number) {
  return {
    ...vocabularyRow(id),
    status: "NEW",
    next_review_date: null,
    revision: 0n,
    total_count: totalCount
  };
}

function authorizedRows() {
  return { rows: [{ learner_id: learnerId, household_id: householdId }] };
}

describe("US-08 review queue API boundary", () => {
  it("returns 401 before invoking the queue service", async () => {
    const service = { list: vi.fn() };
    const app = createApp({ readSession: async () => null, reviewQueueService: service });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/review-queue`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Đăng nhập để tiếp tục." } });
    expect(service.list).not.toHaveBeenCalled();
  });

  it("returns the canonical queue response for the authenticated learner", async () => {
    const queue = {
      learnerId,
      reviewDate: "2026-09-14",
      dueCount: 1,
      newCount: 1,
      queue: [{
        vocabulary: {
          id: 1,
          word: "apple",
          ipa: null,
          vietnamese: "quả táo",
          definitionEn: null,
          exampleEn: null,
          imageUrl: null,
          audioUrl: null,
          topic: null,
          level: null,
          enabled: true,
          contentVersion: 1
        },
        queueType: "DUE",
        status: "LEARNING",
        nextReviewDate: "2026-09-14",
        expectedRevision: 4
      }]
    } satisfies ReviewQueueResponse;
    const service = { list: vi.fn(async () => queue) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), reviewQueueService: service });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/review-queue`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(queue);
    expect(service.list).toHaveBeenCalledWith("parent-1", learnerId);
  });

  it("maps authorization and database failures to safe outward errors", async () => {
    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      reviewQueueService: { list: vi.fn(async () => { throw new ReviewQueueServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }) }
    });
    const deniedResponse = await denied.request(`http://localhost/api/learners/${learnerId}/review-queue`);
    expect(deniedResponse.status).toBe(403);
    expect(await deniedResponse.json()).toEqual({
      error: { code: "HOUSEHOLD_ACCESS_DENIED", message: "Bạn không có quyền truy cập learner này." }
    });

    const failed = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      reviewQueueService: { list: vi.fn(async () => { throw new Error("database secret"); }) }
    });
    const failedResponse = await failed.request(`http://localhost/api/learners/${learnerId}/review-queue`);
    const body = await failedResponse.text();
    expect(failedResponse.status).toBe(503);
    expect(body).toContain('"code":"INTERNAL_ERROR"');
    expect(body).not.toContain("database secret");
  });
});

describe("US-08 review queue service", () => {
  it("authorizes the learner, derives the household date, and returns due before sparse new", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const results: unknown[] = [
      authorizedRows(),
      { rows: [{ timezone: "America/Los_Angeles" }] },
      { rows: [dueRow(2, 2, 7), dueRow(5, 2, 8n)] },
      { rows: [newRow(1, 3), newRow(3, 3), newRow(4, 3)] }
    ];
    const service = createReviewQueueService({
      execute: vi.fn(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return results.shift() ?? { rows: [] };
      })
    }, { now: () => new Date("2026-09-15T01:00:00.000Z") });

    await expect(service.list("parent-1", learnerId)).resolves.toEqual({
      learnerId,
      reviewDate: "2026-09-14",
      dueCount: 2,
      newCount: 3,
      queue: [
        expect.objectContaining({ "vocabulary": expect.objectContaining({ id: 2 }), queueType: "DUE", expectedRevision: 7 }),
        expect.objectContaining({ "vocabulary": expect.objectContaining({ id: 5 }), queueType: "DUE", expectedRevision: 8 }),
        expect.objectContaining({ "vocabulary": expect.objectContaining({ id: 1 }), queueType: "NEW", expectedRevision: 0 }),
        expect.objectContaining({ "vocabulary": expect.objectContaining({ id: 3 }), queueType: "NEW", expectedRevision: 0 }),
        expect.objectContaining({ "vocabulary": expect.objectContaining({ id: 4 }), queueType: "NEW", expectedRevision: 0 })
      ]
    });
    expect(queries).toHaveLength(4);
    expect(queries[2]?.sql).toContain("lp.learner_id = $1::uuid");
    expect(queries[2]?.sql).toContain("lp.next_review_date <= $2::date");
    expect(queries[2]?.sql).toContain("ORDER BY lp.next_review_date ASC, v.id ASC");
    expect(queries[2]?.sql).toContain("LIMIT 20");
    expect(queries[2]?.sql).toContain('"vocabflow_app"."learner_learning_sets"');
    expect(queries[2]?.sql).toContain("EXISTS");
    expect(queries[3]?.sql).toContain("LEFT JOIN \"vocabflow_app\".\"learner_progress\"");
    expect(queries[3]?.sql).toContain("lp.learner_id = $1::uuid");
    expect(queries[3]?.sql).toContain("lp.vocabulary_id IS NULL");
    expect(queries[3]?.sql).toContain("ORDER BY v.id ASC");
    expect(queries[3]?.sql).toContain("LIMIT 10");
    expect(queries[3]?.sql).toContain('"vocabflow_app"."learning_set_items"');
    expect(queries[3]?.sql).toContain("EXISTS");
  });

  it.each(["cross-household", "disabled", "missing"])("returns safe 403 for an actual %s authorization outcome", async (caseName) => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const service = createReviewQueueService({ execute });

    await expect(service.list("parent-1", learnerId)).rejects.toMatchObject({
      code: "HOUSEHOLD_ACCESS_DENIED",
      status: 403
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(caseName).toBeTruthy();
  });

  it("does not add new words when at least twenty due words exist", async () => {
    const due = Array.from({ length: 20 }, (_, index) => dueRow(index + 1, 21));
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce({ rows: due })
      .mockResolvedValueOnce({ rows: [newRow(100, 5)] });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });

    const result = await service.list("parent-1", learnerId);
    expect(result.dueCount).toBe(21);
    expect(result.newCount).toBe(5);
    expect(result.queue).toHaveLength(20);
    expect(result.queue.every((item) => item.queueType === "DUE")).toBe(true);
  });

  it("treats an empty progress result as virtual NEW and rejects malformed canonical rows safely", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [newRow(1, 1)] });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });
    const result = await service.list("parent-1", learnerId);
    expect(result.queue[0]).toMatchObject({ queueType: "NEW", status: "NEW", nextReviewDate: null, expectedRevision: 0 });

    const malformed = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce({ rows: [{ ...dueRow(1, 1), content_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(createReviewQueueService({ execute: malformed }, { now: () => new Date("2026-09-14T03:00:00.000Z") }).list("parent-1", learnerId))
      .rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 });
  });

  it("fails closed for an unsafe persisted BIGINT revision instead of truncating or defaulting", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce({ rows: [{ ...dueRow(1, 1, String(Number.MAX_SAFE_INTEGER + 1)) }] })
      .mockResolvedValueOnce({ rows: [] });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });

    await expect(service.list("parent-1", learnerId)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500
    });
  });
});
