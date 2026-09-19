import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createTopicService, TopicServiceError } from "./topics";

const householdId = "00000000-0000-4000-8000-000000000001";

const topic = {
  id: 1,
  slug: "family",
  name: "Family",
  description: "Vocabulary classified as Family by the imported source.",
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
    expect(queries[0]?.sql).toContain("WHERE enabled = true");
    expect(queries[0]?.sql).toContain("ORDER BY sort_order ASC, id ASC");
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
    expect(queries[0]?.sql).toContain('FROM "vocabflow_app"."vocabulary_topics"');
    expect(queries[0]?.sql).toContain("v.enabled = true");
    expect(queries[0]?.sql).toContain("ORDER BY v.id ASC");
    expect(queries[0]?.sql).not.toContain("learner_progress");
  });

  it("denies catalog access before reading topics", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    await expect(createTopicService({ execute }).list("outsider")).rejects.toMatchObject({ code: "HOUSEHOLD_ACCESS_DENIED", status: 403 });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
