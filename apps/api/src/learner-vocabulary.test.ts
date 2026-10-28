import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import type { LearnerVocabularyDto } from "@vocabflow/contracts";
import { createApp } from "./index";
import { createLearnerVocabularyService, LearnerVocabularyServiceError } from "./learner-vocabulary";
import { createLearnerVocabularyBrowseService } from "./learner-vocabulary-browse";

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

  it("accepts a single V2 vocabulary id for an efficient detail read", async () => {
    const service = { list: vi.fn(async () => []) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerVocabularyService: service });
    const response = await app.request("http://localhost/api/learners/" + learnerId + "/vocabulary?id=42");
    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith("parent-1", learnerId, undefined, 42);
  });

  it("rejects a non-positive vocabulary id before reading learner vocabulary", async () => {
    const service = { list: vi.fn(async () => []) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerVocabularyService: service });
    const response = await app.request("http://localhost/api/learners/" + learnerId + "/vocabulary?id=0");
    expect(response.status).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it("adds a compatible paged browse contract with a default page size of 30", async () => {
    const browse = vi.fn(async (_userId, _learnerId, query) => ({
      vocabulary: [], total: 7311, page: query.page, pageSize: query.pageSize,
      totalPages: Math.ceil(7311 / query.pageSize), filters: { cefrOptions: ["A1"], topicOptions: ["Animals"] }
    }));
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerVocabularyBrowseService: { browse } });
    const response = await app.request("http://localhost/api/learners/" + learnerId + "/vocabulary/browse");

    expect(response.status).toBe(200);
    expect((await response.json()).pageSize).toBe(30);
    expect(browse).toHaveBeenCalledWith("parent-1", learnerId, { page: 1, pageSize: 30 });
  });

  it("rejects invalid or duplicate browse query parameters before reading data", async () => {
    const browse = vi.fn();
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerVocabularyBrowseService: { browse } });
    for (const suffix of ["?pageSize=15", "?page=0", "?cefr=Z9", "?topic=Animals&topic=Food"]) {
      const response = await app.request("http://localhost/api/learners/" + learnerId + "/vocabulary/browse" + suffix);
      expect(response.status).toBe(400);
    }
    expect(browse).not.toHaveBeenCalled();
  });
});

describe("US-22 paged vocabulary browse service", () => {
  it("filters in PostgreSQL, returns only one compact stable page, and counts separately", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const compiled = new PgDialect().sqlToQuery(query);
      queries.push(compiled);
      if (compiled.sql.includes('"learner_profiles"')) return authorizedRows();
      if (compiled.sql.includes("COUNT(*)")) return { rows: [{ total: "7311" }] };
      if (compiled.sql.includes("cefr_options")) return { rows: [{ cefr_options: ["A1", "A2"], topic_options: ["Animals"] }] };
      return { rows: [
        { ...vocabularyRow(31), master_sense_identity: "sense-31", display_form: "tear", part_of_speech: "VERB", cefr: "A1", tags: ["Animals"], development_media: { images: [], wordAudio: [] } },
        { ...vocabularyRow(32), master_sense_identity: "sense-32", display_form: "tease", part_of_speech: "VERB", cefr: "A1", tags: ["Animals"], development_media: { images: [], wordAudio: [] } }
      ] };
    });
    const service = createLearnerVocabularyBrowseService({ execute }, { datasetVersion: "v2" });

    const result = await service.browse("parent-1", learnerId, {
      page: 2, pageSize: 30, q: "tear", level: "GRADE_1", cefr: "A1", topic: "Animals"
    });

    expect(result).toMatchObject({ total: 7311, page: 2, pageSize: 30, totalPages: 244, filters: { cefrOptions: ["A1", "A2"], topicOptions: ["Animals"] } });
    expect(result.vocabulary.map((row) => row.id)).toEqual([31, 32]);
    expect(result.vocabulary[0]).not.toHaveProperty("definitionEn");
    expect(result.vocabulary[0]).not.toHaveProperty("examples");
    const pageQuery = queries.find((query) => query.sql.includes('FROM "vocabflow_app"."vocabularies" v') && query.sql.includes("LIMIT"));
    const countQuery = queries.find((query) => query.sql.includes("COUNT(*)"));
    expect(pageQuery?.sql).toContain("v.word ILIKE");
    expect(pageQuery?.sql).toContain("v.level =");
    expect(pageQuery?.sql).toContain("md.cefr =");
    expect(pageQuery?.sql).not.toContain("jsonb_array_elements_text");
    expect(pageQuery?.sql).toContain("review_status = 'APPROVED'");
    expect(pageQuery?.sql).toContain("learner_saved_vocabulary");
    expect(pageQuery?.sql).toContain('"vocabulary_topics"');
    expect(pageQuery?.sql).toContain("ORDER BY v.id ASC");
    expect(pageQuery?.sql).toContain("LIMIT");
    expect(pageQuery?.sql).not.toContain("md.examples");
    expect(pageQuery?.sql).not.toContain("exampleAudio");
    expect(countQuery?.sql).toContain("COUNT(*)");
    expect(pageQuery?.params).toContain(30);
    expect(queries).toHaveLength(4);
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
    expect(queries[1]?.params).toEqual([learnerId, "VOCABFLOW_MASTER_V2_DEV"]);
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
    expect(queries[0]?.sql).toContain("v.level = $3");
    expect(queries[0]?.params).toEqual([learnerId, "VOCABFLOW_MASTER_V2_DEV", "GENERAL"]);
  });

  it("filters V2 detail reads by vocabulary id after learner authorization", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [vocabularyRow(42)] };
      });
    await expect(createLearnerVocabularyService({ execute }, { datasetVersion: "v2" }).list("parent-1", learnerId, undefined, 42))
      .resolves.toMatchObject([{ id: 42, status: "NEW" }]);
    expect(queries[0]?.sql).toContain("AND v.id = $3");
    expect(queries[0]?.params).toEqual([learnerId, "VOCABFLOW_MASTER_V2_DEV", 42]);
  });

  it("keeps legacy detail reads on the legacy list behavior", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [vocabularyRow(42), vocabularyRow(43)] };
      });
    await expect(createLearnerVocabularyService({ execute }, { datasetVersion: "legacy" }).list("parent-1", learnerId, undefined, 42))
      .resolves.toHaveLength(2);
    expect(queries[0]?.sql).not.toContain("AND v.id =");
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
