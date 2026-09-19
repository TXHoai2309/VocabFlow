import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createVocabularyService, VocabularyServiceError } from "./vocabulary";

const householdId = "00000000-0000-4000-8000-000000000001";
const vocabulary = [
  {
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
    contentVersion: 1
  },
  {
    id: 30,
    word: "new",
    ipa: null,
    vietnamese: "mới",
    definitionEn: null,
    exampleEn: null,
    imageUrl: null,
    audioUrl: null,
    topic: null,
    level: null,
    enabled: true,
    contentVersion: 1
  }
];

function appWithSession(session: { user: { id: string } } | null, vocabularyService = {
  list: vi.fn(async () => vocabulary)
}) {
  return {
    app: createApp({ readSession: async () => session, vocabularyService }),
    vocabularyService
  };
}

describe("US-04 vocabulary API boundary", () => {
  it("returns 401 without a valid session", async () => {
    const { app, vocabularyService } = appWithSession(null);
    const response = await app.request("http://localhost/api/vocabulary");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Đăng nhập để tiếp tục." } });
    expect(vocabularyService.list).not.toHaveBeenCalled();
  });

  it("returns the shared vocabulary envelope for an authenticated household", async () => {
    const { app, vocabularyService } = appWithSession({ user: { id: "parent-1" } });
    const response = await app.request("http://localhost/api/vocabulary");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ vocabulary });
    expect(vocabularyService.list).toHaveBeenCalledWith("parent-1");
  });

  it.each(["householdId=attacker", "learnerId=attacker"])("rejects unsupported scope input: %s", async (query) => {
    const { app, vocabularyService } = appWithSession({ user: { id: "parent-1" } });
    const response = await app.request(`http://localhost/api/vocabulary?${query}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "INVALID_REQUEST", message: "Dữ liệu gửi lên không hợp lệ." } });
    expect(vocabularyService.list).not.toHaveBeenCalled();
  });

  it("accepts a validated level filter and preserves the filter in the service call", async () => {
    const { app, vocabularyService } = appWithSession({ user: { id: "parent-1" } });
    const response = await app.request("http://localhost/api/vocabulary?level=GRADE_1");
    expect(response.status).toBe(200);
    expect(vocabularyService.list).toHaveBeenCalledWith("parent-1", "GRADE_1");
  });

  it.each(["level=invalid", "level=GRADE_1&level=GRADE_2"])("rejects invalid level input: %s", async (query) => {
    const { app, vocabularyService } = appWithSession({ user: { id: "parent-1" } });
    const response = await app.request(`http://localhost/api/vocabulary?${query}`);
    expect(response.status).toBe(400);
    expect(vocabularyService.list).not.toHaveBeenCalled();
  });

  it("maps missing household membership to a safe 403", async () => {
    const service = { list: vi.fn(async () => { throw new VocabularyServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }) };
    const { app } = appWithSession({ user: { id: "parent-1" } }, service);
    const response = await app.request("http://localhost/api/vocabulary");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "HOUSEHOLD_ACCESS_DENIED", message: "Bạn không có quyền truy cập household này." } });
  });

  it("maps database failures to a safe 503 without leaking internals", async () => {
    const service = { list: vi.fn(async () => { throw new Error("raw database connection detail"); }) };
    const { app } = appWithSession({ user: { id: "parent-1" } }, service);
    const response = await app.request("http://localhost/api/vocabulary");
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('"code":"INTERNAL_ERROR"');
    expect(body).not.toContain("raw database connection detail");
  });
});

describe("US-04 vocabulary service", () => {
  it("uses membership only as an authorization gate and reads enabled content in id order", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{ household_id: householdId }] };
      })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return {
          rows: vocabulary.map((item) => ({
            id: item.id,
            word: item.word,
            ipa: item.ipa,
            vietnamese: item.vietnamese,
            definition_en: item.definitionEn,
            example_en: item.exampleEn,
            image_url: item.imageUrl,
            audio_url: item.audioUrl,
            topic: item.topic,
            level: item.level,
            enabled: item.enabled,
            content_version: item.contentVersion
          }))
        };
      });

    await expect(createVocabularyService({ execute }).list("parent-1")).resolves.toEqual(vocabulary);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(queries[1]?.sql).toContain('FROM "vocabflow_app"."vocabularies"');
    expect(queries[1]?.sql).toContain("WHERE enabled = true");
    expect(queries[1]?.sql).toContain("ORDER BY id ASC");
    expect(queries[1]?.sql).not.toContain("household_id");
    expect(queries[1]?.sql).not.toContain("learner_id");
  });

  it("returns an empty array when no enabled records exist", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: householdId }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(createVocabularyService({ execute }).list("parent-1")).resolves.toEqual([]);
  });

  it("adds a level predicate without changing enabled ordering semantics", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: householdId }] })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{ ...vocabulary[0], level: "GRADE_1", content_version: 1 }] };
      });
    await expect(createVocabularyService({ execute }).list("parent-1", "GRADE_1")).resolves.toMatchObject([{ id: 1, level: "GRADE_1" }]);
    expect(queries[0]?.sql).toContain("level = $1");
    expect(queries[0]?.params).toEqual(["GRADE_1"]);
  });

  it("denies a user without canonical household membership", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    await expect(createVocabularyService({ execute }).list("parent-1")).rejects.toMatchObject({
      code: "HOUSEHOLD_ACCESS_DENIED",
      status: 403
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("serializes nullable optional fields and rejects malformed database rows safely", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: householdId }] })
      .mockResolvedValueOnce({ rows: [{ ...vocabulary[0], content_version: 0 }] });
    await expect(createVocabularyService({ execute }).list("parent-1")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500
    });
  });
});
