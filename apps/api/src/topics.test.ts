import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createTopicService, TopicServiceError } from "./topics";

const householdId = "00000000-0000-4000-8000-000000000001";

const topic = {
  id: 1,
  slug: "family",
  name: "Gia đình",
  description: "Từ vựng về gia đình và người thân.",
  sortOrder: 10,
  enabled: true
};

function vocabularyRow(id: number, enabled = true) {
  return {
    id,
    word: `word-${id}`,
    ipa: null,
    vietnamese: `nghĩa-${id}`,
    definition_en: null,
    example_en: null,
    image_url: null,
    audio_url: null,
    topic: "Family",
    level: null,
    enabled,
    content_version: 1
  };
}

describe("US-27 topic API boundary", () => {
  it("requires an authenticated session", async () => {
    const service = { list: vi.fn(), listVocabulary: vi.fn() };
    const app = createApp({ readSession: async () => null, topicService: service });
    const response = await app.request("http://localhost/api/topics");
    expect(response.status).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
  });

  it("lists enabled topics in the service", async () => {
    const service = { list: vi.fn(async () => [topic]), listVocabulary: vi.fn() };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), topicService: service });
    const response = await app.request("http://localhost/api/topics");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ topics: [topic] });
    expect(service.list).toHaveBeenCalledWith("parent-1");
  });

  it("validates topic ids and maps unavailable topics to 404", async () => {
    const service = {
      list: vi.fn(),
      listVocabulary: vi.fn(async () => { throw new TopicServiceError("TOPIC_NOT_FOUND", 404); })
    };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), topicService: service });
    const invalid = await app.request("http://localhost/api/topics/not-a-number/vocabulary");
    expect(invalid.status).toBe(400);
    expect(service.listVocabulary).not.toHaveBeenCalled();
    const missing = await app.request("http://localhost/api/topics/999/vocabulary");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: { code: "TOPIC_NOT_FOUND", message: "Topic không khả dụng." } });
  });
});

describe("US-27 topic service", () => {
  it("orders topics deterministically and preserves source-backed labels", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: householdId }] })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{ ...topic, sort_order: topic.sortOrder }] };
      });
    await expect(createTopicService({ execute }).list("parent-1")).resolves.toEqual([topic]);
    expect(queries[0]?.sql).toContain("WHERE t.enabled = true");
    expect(queries[0]?.sql).toContain("ORDER BY t.sort_order ASC, t.id ASC");
  });

  it("returns enabled vocabulary for a topic without learner progress joins", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: householdId }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [vocabularyRow(10)] };
      });
    await expect(createTopicService({ execute }).listVocabulary("parent-1", 1)).resolves.toMatchObject([{ id: 10, level: null }]);
    expect(queries[0]?.sql).toContain('JOIN "vocabflow_app"."vocabulary_topics"');
    expect(queries[0]?.sql).toContain("WITH RECURSIVE topic_tree");
    expect(queries[0]?.sql).toContain("vt.review_status = 'APPROVED'");
    expect(queries[0]?.sql).toContain("COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese");
    expect(queries[0]?.sql).toContain("CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url");
    expect(queries[0]?.sql).toContain("v.enabled = true");
    expect(queries[0]?.sql).toContain("ORDER BY v.id ASC");
    expect(queries[0]?.sql).not.toContain("learner_progress");
  });

  it("lists only current V2 topics and marks them as direct study scopes", async () => {
    const queries: string[] = [];
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: householdId }] })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query).sql);
        return { rows: [{ ...topic, sort_order: topic.sortOrder, study_scope_available: true }] };
      });
    const result = await createTopicService({ execute }, { datasetVersion: "v2" }).list("parent-1");
    expect(result).toMatchObject([{ slug: "family", studyScopeAvailable: true }]);
    expect(queries[0]).toContain('v.source_dataset =');
    expect(queries[0]).toContain('"vocabflow_app"."vocabulary_topics"');
  });

  it("returns V2 topic content, provenance evidence, and existing Development media", async () => {
    const queries: string[] = [];
    const row = {
      ...vocabularyRow(10),
      cefr: "A1",
      tags: ["topic-inferred:food"],
      metadata_assignments: {
        topics: [{ code: "FOOD", label: "Ẩm thực", status: "INFERRED_REVIEWABLE", confidence: "HIGH", evidenceType: "EXPLICIT_SEMANTIC_CUE", matchedEvidence: "food" }],
        subtopics: [{ code: "FRUIT", parentCode: "FOOD", label: "Trái cây", status: "INFERRED_REVIEWABLE", confidence: "HIGH", evidenceType: "EXPLICIT_SEMANTIC_CUE", matchedEvidence: "fruit" }],
        domains: []
      },
      master_sense_identity: "sense-10", display_form: "word-10", part_of_speech: "NOUN", content_hash: "a".repeat(64),
      content_review_status: "PASS", editorial_status: "DRAFT", rights_status: "UNKNOWN_REVIEW_REQUIRED",
      development_media: { images: [], wordAudio: [], exampleAudio: [] }
    };
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: householdId }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockImplementationOnce(async (query) => { queries.push(new PgDialect().sqlToQuery(query).sql); return { rows: [row] }; });
    const result = await createTopicService({ execute }, { datasetVersion: "v2" }).listVocabulary("parent-1", 1);
    expect(result[0]).toMatchObject({ masterSenseIdentity: "sense-10", contentHash: "a".repeat(64), cefr: "A1", developmentMedia: { images: [] } });
    expect(result[0]?.metadataEvidence?.[0]).toMatchObject({ dimension: "TOPIC", code: "FOOD" });
    expect(result[0]?.metadataEvidence?.[1]).toMatchObject({ dimension: "SUBTOPIC", code: "FRUIT", label: "Trái cây" });
    expect(queries[0]).toContain('v.source_dataset =');
  });

  it("denies catalog access before reading topics", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    await expect(createTopicService({ execute }).list("outsider")).rejects.toMatchObject({ code: "HOUSEHOLD_ACCESS_DENIED", status: 403 });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
