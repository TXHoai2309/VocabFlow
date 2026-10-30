import { describe, it, expect, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { PUBLIC_VOCABULARY_BATCH_LIMIT } from "@vocabflow/contracts";
import { readPublicLearningIndex } from "./public-learning-index";
import { readPublicVocabulary } from "./vocabulary";
import { readPublicVocabularyBrowse } from "./learner-vocabulary-browse";
import { createApp } from "./index";

const dialect = new PgDialect();
const compiled = (statement: SQL) => dialect.sqlToQuery(statement);
describe("bounded public learning reads", () => {
  it("builds a Production-sized index without content/media or private tables", async () => {
    const vocabulary = Array.from({ length: 7311 }, (_, index) => ({ id: index + 1, level: null }));
    const execute = vi.fn().mockResolvedValueOnce(vocabulary).mockResolvedValueOnce([
      { id: 1, slug: "all", name: "Tất cả", description: "Bộ từ", grade: null, sort_order: 0, vocabulary_ids: vocabulary.map((word) => word.id) }
    ]).mockResolvedValueOnce([]);
    const timings = {};
    const index = await readPublicLearningIndex({ execute }, "v2", timings);
    expect(index.vocabulary).toHaveLength(7311);
    expect(Buffer.byteLength(JSON.stringify(index))).toBeLessThan(300_000);
    expect(Object.keys(index.vocabulary[0]!)).toEqual(["id", "level"]);
    for (const [statement] of execute.mock.calls) {
      const query = compiled(statement).sql;
      expect(query).toContain("enabled = true");
      expect(query).not.toMatch(/development_media|examples|learner_progress|household|session/);
      expect(query).not.toMatch(/SELECT\s+md\.source_provenance(?:\s|,)/);
    }
    expect(Object.keys(timings)).toEqual(expect.arrayContaining(["index_words", "index_sets", "index_topics"]));
  });
  it("supports public index without consulting auth, with timing and cache headers", async () => {
    const readSession = vi.fn();
    const app = createApp({ readSession, publicLearningIndex: async () => ({ vocabulary: [], learningSets: [], topics: [] }) });
    const response = await app.request("/api/public/learning-index");
    expect(response.status).toBe(200); expect(readSession).not.toHaveBeenCalled();
    expect(response.headers.get("server-timing")).toContain("index_total");
    expect(response.headers.get("cache-control")).toContain("public");
    expect((await app.request("/api/public/learning-index?userId=private")).status).toBe(400);
  });
  it("rejects missing, repeated, duplicate, oversized or unsafe detail IDs before querying", async () => {
    const batch = vi.fn().mockResolvedValue([]);
    const app = createApp({ publicVocabularyBatch: batch });
    for (const query of ["", "?ids=", "?ids=1&ids=2", "?ids=1,1", "?ids=-1", "?ids=0", "?ids=2147483648", "?ids=1&userId=private", `?ids=${Array.from({ length: PUBLIC_VOCABULARY_BATCH_LIMIT + 1 }, (_, i) => i + 1).join(",")}`]) {
      expect((await app.request(`/api/public/vocabulary${query}`)).status, query).toBe(400);
    }
    expect(batch).not.toHaveBeenCalled();
    expect((await app.request("/api/public/vocabulary?ids=1,2")).status).toBe(200);
    expect(batch).toHaveBeenCalledWith(undefined, [1, 2]);
  });
  it("limits detail SQL by parameterized IDs instead of materializing the entire catalog", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    await readPublicVocabulary({ execute }, { datasetVersion: "v2", ids: [1, 2] });
    const query = compiled(execute.mock.calls[0]![0]);
    expect(query.sql).toMatch(/v\.id IN \(\$\d+, \$\d+\)/);
    expect(query.params).toEqual(expect.arrayContaining([1, 2]));
  });
  it("pages public browse in SQL without accessing learner progress", async () => {
    const execute = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 7311 }]).mockResolvedValueOnce([{ cefr_options: [], topic_options: [] }]);
    const result = await readPublicVocabularyBrowse({ execute }, "v2", { page: 2, pageSize: 30, learningSetId: 1 });
    expect(result.total).toBe(7311); expect(result.vocabulary).toHaveLength(0);
    const page = compiled(execute.mock.calls[0]![0]);
    expect(page.sql).toMatch(/LIMIT \$\d+ OFFSET \$\d+/);
    expect(page.params).toEqual(expect.arrayContaining([30]));
    for (const [statement] of execute.mock.calls) expect(compiled(statement).sql).not.toMatch(/learner_progress|household/);
    expect(page.sql).toContain("learning_set_items");
  });
  it("validates bounded browse and denies conflicting scopes", async () => {
    const browse = vi.fn().mockResolvedValue({ vocabulary: [], total: 0, page: 1, pageSize: 30, totalPages: 1, filters: { cefrOptions: [], topicOptions: [] } });
    const app = createApp({ publicVocabularyBrowse: browse });
    for (const query of ["pageSize=1000", "page=0", "page=1&page=2", "learningSetId=1&topicId=2", "learnerId=private"]) expect((await app.request(`/api/public/vocabulary/browse?${query}`)).status).toBe(400);
    expect(browse).not.toHaveBeenCalled();
    expect((await app.request("/api/public/vocabulary/browse?page=1&pageSize=30")).status).toBe(200);
  });
});
