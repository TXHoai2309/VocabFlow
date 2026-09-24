import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import type { LearnerVocabularyDto } from "@vocabflow/contracts";
import { createApp } from "./index";
import { createLearnerVocabularyService, LearnerVocabularyServiceError } from "./learner-vocabulary";

const learnerId = "00000000-0000-4000-8000-000000000010";
const otherLearnerId = "00000000-0000-4000-8000-000000000011";
const householdId = "00000000-0000-4000-8000-000000000001";

function authorizedRows(id = learnerId, household = householdId) {
  return { rows: [{ learner_id: id, household_id: household }] };
}

function vocabularyRow(id: number, status: string | null = null, nextReviewDate: string | null = null) {
  return {
    id,
    word: `word-${id}`,
    ipa: null,
    vietnamese: `nghĩa-${id}`,
    definition_en: null,
    example_en: null,
    image_url: null,
    audio_url: null,
    topic: null,
    level: null,
    enabled: true,
    content_version: 1,
    progress_status: status,
    next_review_date: nextReviewDate
  };
}

describe("US-22 learner vocabulary API boundary", () => {
  it("returns 401 before invoking the learner vocabulary service", async () => {
    const service = { list: vi.fn() };
    const app = createApp({ readSession: async () => null, learnerVocabularyService: service });
    const response = await app.request("http://localhost/api/learners/" + learnerId + "/vocabulary");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Đăng nhập để tiếp tục." } });
    expect(service.list).not.toHaveBeenCalled();
  });

  it("returns the canonical learner-scoped vocabulary envelope", async () => {
    const vocabulary: LearnerVocabularyDto[] = [{
      id: 1,
      word: "apple",
      ipa: null,
      vietnamese: "táo",
      definitionEn: null,
      exampleEn: null,
      imageUrl: null,
      audioUrl: null,
      topic: null,
      level: null,
      enabled: true,
      contentVersion: 1,
      status: "NEW",
      nextReviewDate: null
    }];
    const service = { list: vi.fn(async () => vocabulary) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerVocabularyService: service });
    const response = await app.request("http://localhost/api/learners/" + learnerId + "/vocabulary");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ vocabulary });
    expect(service.list).toHaveBeenCalledWith("parent-1", learnerId);
  });

  it("maps foreign learner and database failures to safe errors", async () => {
    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      learnerVocabularyService: {
        list: vi.fn(async () => { throw new LearnerVocabularyServiceError("HOUSEHOLD_ACCESS_DENIED", 403); })
      }
    });
    const deniedResponse = await denied.request("http://localhost/api/learners/" + learnerId + "/vocabulary");
    expect(deniedResponse.status).toBe(403);
    expect(await deniedResponse.json()).toEqual({
      error: { code: "HOUSEHOLD_ACCESS_DENIED", message: "Bạn không có quyền truy cập learner này." }
    });

    const failed = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      learnerVocabularyService: { list: vi.fn(async () => { throw new Error("database secret"); }) }
    });
    const failedResponse = await failed.request("http://localhost/api/learners/" + learnerId + "/vocabulary");
    const body = await failedResponse.text();
    expect(failedResponse.status).toBe(503);
    expect(body).toContain('"code":"INTERNAL_ERROR"');
    expect(body).not.toContain("database secret");
  });

  it("rejects an invalid level before reading learner vocabulary", async () => {
    const service = { list: vi.fn(async () => []) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerVocabularyService: service });
    const response = await app.request("http://localhost/api/learners/" + learnerId + "/vocabulary?level=unknown");
    expect(response.status).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });
});

describe("US-22 learner vocabulary service", () => {
  it("uses a learner-scoped left join, excludes disabled rows, and resolves virtual NEW", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return authorizedRows();
      })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return {
          rows: [
            vocabularyRow(1),
            vocabularyRow(2, "LEARNING", "2026-09-20"),
            vocabularyRow(3, "MASTERED", "2026-09-10")
          ]
        };
      });

    await expect(createLearnerVocabularyService({ execute }).list("parent-1", learnerId)).resolves.toEqual([
      expect.objectContaining({ id: 1, status: "NEW", nextReviewDate: null }),
      expect.objectContaining({ id: 2, status: "LEARNING", nextReviewDate: "2026-09-20" }),
      expect.objectContaining({ id: 3, status: "MASTERED", nextReviewDate: "2026-09-10" })
    ]);
    expect(queries).toHaveLength(2);
    expect(queries[1]?.sql).toContain('LEFT JOIN "vocabflow_app"."learner_progress"');
    expect(queries[1]?.sql).toContain("COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese");
    expect(queries[1]?.sql).toContain("CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url");
    expect(queries[1]?.sql).toContain("lp.learner_id = $1::uuid");
    expect(queries[1]?.sql).toContain("WHERE v.enabled = true");
    expect(queries[1]?.sql).toContain("ORDER BY v.id ASC");
    expect(queries[1]?.sql).not.toContain("WHERE lp.learner_id");
    expect(queries[1]?.params).toEqual([learnerId]);
  });

  it("keeps the same vocabulary status independent for two learners", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [vocabularyRow(1, "LEARNING")] })
      .mockResolvedValueOnce(authorizedRows(otherLearnerId))
      .mockResolvedValueOnce({ rows: [vocabularyRow(1)] });
    const service = createLearnerVocabularyService({ execute });

    await expect(service.list("parent-1", learnerId)).resolves.toMatchObject([{ id: 1, status: "LEARNING" }]);
    await expect(service.list("parent-1", otherLearnerId)).resolves.toMatchObject([{ id: 1, status: "NEW" }]);
  });

  it("filters by level after learner authorization", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [vocabularyRow(1)] };
      });
    await expect(createLearnerVocabularyService({ execute }).list("parent-1", learnerId, "GENERAL"))
      .resolves.toMatchObject([{ id: 1, status: "NEW", level: null }]);
    expect(queries[0]?.sql).toContain("v.level = $2");
    expect(queries[0]?.params).toEqual([learnerId, "GENERAL"]);
  });

  it("returns an empty enabled vocabulary list without inventing rows", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [] });
    await expect(createLearnerVocabularyService({ execute }).list("parent-1", learnerId)).resolves.toEqual([]);
  });

  it("denies a foreign household before reading vocabulary", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    await expect(createLearnerVocabularyService({ execute }).list("parent-1", learnerId)).rejects.toMatchObject({
      code: "HOUSEHOLD_ACCESS_DENIED",
      status: 403
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("fails closed for unsafe persisted numeric fields", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ ...vocabularyRow(1), content_version: String(Number.MAX_SAFE_INTEGER + 1) }] });
    await expect(createLearnerVocabularyService({ execute }).list("parent-1", learnerId)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500
    });
  });
});
