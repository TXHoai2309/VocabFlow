import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import type { LearnerSavedVocabularyDto } from "@vocabflow/contracts";
import { createApp } from "./index";
import {
  createLearnerSavedVocabularyService,
  LearnerSavedVocabularyServiceError
} from "./learner-saved-vocabulary";

const learnerId = "00000000-0000-4000-8000-000000000010";
const householdId = "00000000-0000-4000-8000-000000000001";
const savedAt = new Date("2026-10-02T11:20:00.000Z");

function authorizedRows() {
  return { rows: [{ learner_id: learnerId, household_id: householdId }] };
}

function savedRow(id = 2) {
  return {
    id,
    word: `word-${id}`,
    ipa: `/word-${id}/`,
    vietnamese: `nghĩa-${id}`,
    definition_en: null,
    example_en: null,
    image_url: null,
    audio_url: null,
    topic: "Food",
    level: "GRADE_1",
    enabled: true,
    content_version: 1,
    progress_status: null,
    next_review_date: null,
    saved_at: savedAt
  };
}

describe("learner saved vocabulary API", () => {
  it("requires an authenticated session and rejects malformed mutation requests", async () => {
    const service = { list: vi.fn(), save: vi.fn(), unsave: vi.fn() };
    const unauthorized = createApp({ readSession: async () => null, learnerSavedVocabularyService: service });
    expect((await unauthorized.request(`http://localhost/api/learners/${learnerId}/saved-vocabulary`)).status).toBe(401);
    const authenticated = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      learnerSavedVocabularyService: service
    });
    expect((await authenticated.request(`http://localhost/api/learners/${learnerId}/saved-vocabulary/2?unexpected=1`, { method: "POST" })).status).toBe(400);
    expect((await authenticated.request(`http://localhost/api/learners/${learnerId}/saved-vocabulary/0`, { method: "DELETE" })).status).toBe(400);
    expect(service.save).not.toHaveBeenCalled();
    expect(service.unsave).not.toHaveBeenCalled();
  });

  it("lists saved rows only through the authorized learner-scoped relationship", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const service = createLearnerSavedVocabularyService({
      execute: vi.fn(async (query) => {
        const rendered = new PgDialect().sqlToQuery(query);
        queries.push(rendered);
        return queries.length === 1 ? authorizedRows() : { rows: [savedRow()] };
      })
    });

    await expect(service.list("parent-1", learnerId)).resolves.toEqual([{
      vocabulary: {
        id: 2,
        word: "word-2",
        ipa: "/word-2/",
        vietnamese: "nghĩa-2",
        definitionEn: null,
        exampleEn: null,
        imageUrl: null,
        audioUrl: null,
        topic: "Food",
        level: "GRADE_1",
        enabled: true,
        contentVersion: 1,
        status: "NEW",
        nextReviewDate: null
      },
      savedAt: savedAt.toISOString()
    }]);
    expect(queries).toHaveLength(2);
    expect(queries[1]?.sql).toContain('"vocabflow_app"."learner_saved_vocabulary"');
    expect(queries[1]?.sql).toContain("saved.learner_id = $1::uuid");
    expect(queries[1]?.sql).toContain("v.enabled = true");
    expect(queries[1]?.sql).toContain("ORDER BY saved.created_at DESC, v.id ASC");
    expect(queries[1]?.params).toContain(learnerId);
  });

  it("saves only enabled catalog vocabulary and keeps duplicate saves idempotent", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const rendered = new PgDialect().sqlToQuery(query);
      queries.push(rendered);
      if (queries.length === 1) return authorizedRows();
      return { rows: [{ learner_id: learnerId, vocabulary_id: 2, saved_at: savedAt }] };
    });
    const service = createLearnerSavedVocabularyService({ execute });

    await expect(service.save("parent-1", learnerId, 2)).resolves.toMatchObject({
      learnerId,
      vocabularyId: 2,
      saved: true,
      savedAt: savedAt.toISOString()
    });
    await expect(service.save("parent-1", learnerId, 2)).resolves.toMatchObject({ saved: true, savedAt: savedAt.toISOString() });
    const insertQuery = queries[1]?.sql ?? "";
    expect(insertQuery).toContain("v.enabled = true");
    expect(insertQuery).toContain("ON CONFLICT (learner_id, vocabulary_id)");
    expect(insertQuery).toContain("DO UPDATE SET created_at = \"learner_saved_vocabulary\".created_at");
  });

  it("rejects missing/disabled vocabulary, authorizes learner ownership, and safely unsaves a missing relation", async () => {
    const missingVocabulary = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [] });
    await expect(createLearnerSavedVocabularyService({ execute: missingVocabulary }).save("parent-1", learnerId, 999))
      .rejects.toMatchObject({ code: "VOCABULARY_NOT_FOUND", status: 404 });

    const unauthorized = vi.fn().mockResolvedValue({ rows: [] });
    await expect(createLearnerSavedVocabularyService({ execute: unauthorized }).list("parent-2", learnerId))
      .rejects.toMatchObject({ code: "HOUSEHOLD_ACCESS_DENIED", status: 403 });
    expect(unauthorized).toHaveBeenCalledOnce();

    const unsave = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [] });
    await expect(createLearnerSavedVocabularyService({ execute: unsave }).unsave("parent-1", learnerId, 2))
      .resolves.toMatchObject({ learnerId, vocabularyId: 2, saved: false, savedAt: null });
  });

  it("serves learner-owned list/save/unsave routes and maps unavailable content safely", async () => {
    const savedVocabulary: LearnerSavedVocabularyDto[] = [{
      vocabulary: {
        id: 2,
        word: "word-2",
        ipa: "/word-2/",
        vietnamese: "nghĩa-2",
        definitionEn: null,
        exampleEn: null,
        imageUrl: null,
        audioUrl: null,
        topic: "Food",
        level: "GRADE_1",
        enabled: true,
        contentVersion: 1,
        status: "NEW",
        nextReviewDate: null
      },
      savedAt: savedAt.toISOString()
    }];
    const service = {
      list: vi.fn(async () => savedVocabulary),
      save: vi.fn(async () => ({ learnerId, vocabularyId: 2, saved: true, savedAt: savedAt.toISOString() })),
      unsave: vi.fn(async () => ({ learnerId, vocabularyId: 2, saved: false, savedAt: null }))
    };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerSavedVocabularyService: service });

    const listed = await app.request(`http://localhost/api/learners/${learnerId}/saved-vocabulary`);
    expect(listed.status).toBe(200);
    expect(await listed.json()).toEqual({ savedVocabulary });
    expect(service.list).toHaveBeenCalledWith("parent-1", learnerId);
    const saved = await app.request(`http://localhost/api/learners/${learnerId}/saved-vocabulary/2`, { method: "POST" });
    expect(saved.status).toBe(200);
    expect(service.save).toHaveBeenCalledWith("parent-1", learnerId, 2);
    const removed = await app.request(`http://localhost/api/learners/${learnerId}/saved-vocabulary/2`, { method: "DELETE" });
    expect(removed.status).toBe(200);
    expect(service.unsave).toHaveBeenCalledWith("parent-1", learnerId, 2);

    const unavailable = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      learnerSavedVocabularyService: {
        ...service,
        save: vi.fn(async () => { throw new LearnerSavedVocabularyServiceError("VOCABULARY_NOT_FOUND", 404); })
      }
    });
    const failed = await unavailable.request(`http://localhost/api/learners/${learnerId}/saved-vocabulary/999`, { method: "POST" });
    expect(failed.status).toBe(404);
    expect(await failed.json()).toEqual({ error: { code: "VOCABULARY_NOT_FOUND", message: "Vocabulary không khả dụng." } });
  });
});
