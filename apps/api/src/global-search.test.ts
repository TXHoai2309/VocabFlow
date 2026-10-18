import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import {
  createGlobalSearchService,
  GlobalSearchServiceError,
  parseGlobalSearchQuery
} from "./global-search";

const learnerId = "00000000-0000-4000-8000-000000000010";
const householdId = "00000000-0000-4000-8000-000000000001";

function row(type: "VOCABULARY" | "TOPIC" | "LEARNING_SET", id: number, title: string) {
  return {
    entity_type: type,
    id,
    title,
    subtitle: type === "VOCABULARY" ? "gia đình" : null,
    subtitle_label: type === "VOCABULARY" ? "Giải thích nghĩa" : null,
    image_url: null,
    topic: type === "VOCABULARY" ? "Family" : null,
    level: type === "VOCABULARY" ? "GRADE_1" : null,
    description: type === "VOCABULARY" ? null : `Description for ${title}`,
    vocabulary_count: type === "LEARNING_SET" ? 12 : null,
    grade: type === "LEARNING_SET" ? "GRADE_1" : null
  };
}

const searchRows = [
  row("VOCABULARY", 1, "family"),
  row("TOPIC", 4, "Gia đình"),
  row("LEARNING_SET", 8, "Từ vựng gia đình")
];

function createDatabase(options: { authorized?: boolean; rows?: ReturnType<typeof row>[] } = {}) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const execute = vi.fn(async (query) => {
    const rendered = new PgDialect().sqlToQuery(query);
    queries.push(rendered);
    if (rendered.sql.includes('"household_members"')) {
      return options.authorized === false
        ? { rows: [] }
        : { rows: [{ learner_id: learnerId, household_id: householdId }] };
    }
    return { rows: options.rows ?? searchRows };
  });
  return { database: { execute }, execute, queries };
}

describe("global search query contract", () => {
  it("trims and Unicode-normalizes one query with a bounded default limit", () => {
    expect(parseGlobalSearchQuery(new URLSearchParams("q=+family+"))).toEqual({ q: "family", limit: 5 });
    expect(parseGlobalSearchQuery(new URLSearchParams("q=e%CC%81&limit=10"))).toEqual({ q: "é", limit: 10 });
    expect(parseGlobalSearchQuery(new URLSearchParams("q=x&limit=1"))).toEqual({ q: "x", limit: 1 });
  });

  it("rejects empty, overlong, duplicated, unknown and out-of-range query parameters", () => {
    expect(parseGlobalSearchQuery(new URLSearchParams())).toBeNull();
    expect(parseGlobalSearchQuery(new URLSearchParams("q=%20%20"))).toBeNull();
    expect(parseGlobalSearchQuery(new URLSearchParams(`q=${"é".repeat(101)}`))).toBeNull();
    expect(parseGlobalSearchQuery(new URLSearchParams("q=one&q=two"))).toBeNull();
    expect(parseGlobalSearchQuery(new URLSearchParams("q=family&debug=1"))).toBeNull();
    expect(parseGlobalSearchQuery(new URLSearchParams("q=family&limit=0"))).toBeNull();
    expect(parseGlobalSearchQuery(new URLSearchParams("q=family&limit=11"))).toBeNull();
    expect(parseGlobalSearchQuery(new URLSearchParams("q=family&limit=2.5"))).toBeNull();
  });
});

describe("global search learner API", () => {
  it("returns 401 before invoking search for an unauthenticated request", async () => {
    const search = { search: vi.fn() };
    const app = createApp({ readSession: async () => null, globalSearchService: search });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/search?q=family`);

    expect(response.status).toBe(401);
    expect(search.search).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "q=%20",
    `q=${"x".repeat(101)}`,
    "q=one&q=two",
    "q=family&debug=1",
    "q=family&limit=0"
  ])("returns 400 for invalid search query %s", async (query) => {
    const search = { search: vi.fn() };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), globalSearchService: search });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/search${query ? `?${query}` : ""}`);

    expect(response.status).toBe(400);
    expect(search.search).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: { code: "INVALID_REQUEST", message: "Từ khóa tìm kiếm không hợp lệ." }
    });
  });

  it("passes the normalized query and returns the three typed real-data groups", async () => {
    const payload = {
      query: "family",
      vocabulary: [{ type: "VOCABULARY" as const, id: 1, title: "family", subtitle: "gia đình", subtitleLabel: "Giải thích nghĩa" as const, imageUrl: null, topic: "Family", level: "GRADE_1" as const }],
      topics: [{ type: "TOPIC" as const, id: 4, title: "Gia đình", description: "Từ vựng về gia đình." }],
      learningSets: [{ type: "LEARNING_SET" as const, id: 8, title: "Từ vựng gia đình", description: "Bộ từ gia đình.", vocabularyCount: 12, grade: "GRADE_1" as const }]
    };
    const search = { search: vi.fn(async () => payload) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), globalSearchService: search });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/search?q=+family+&limit=5`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(search.search).toHaveBeenCalledWith("parent-1", learnerId, { q: "family", limit: 5 });
  });

  it("maps cross-household access to 403 with no internal details", async () => {
    const app = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      globalSearchService: { search: async () => { throw new GlobalSearchServiceError("HOUSEHOLD_ACCESS_DENIED", 403); } }
    });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/search?q=family`);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: { code: "HOUSEHOLD_ACCESS_DENIED", message: "Bạn không có quyền truy cập learner này." }
    });
  });
});

describe("global search database service", () => {
  it("returns learner-scoped vocabulary, accessible topics and enabled Learning Sets", async () => {
    const { database } = createDatabase();
    const response = await createGlobalSearchService(database).search("parent-1", learnerId, { q: "family", limit: 5 });

    expect(response).toEqual({
      query: "family",
      vocabulary: [{ type: "VOCABULARY", id: 1, title: "family", subtitle: "gia đình", subtitleLabel: "Giải thích nghĩa", imageUrl: null, topic: "Family", level: "GRADE_1" }],
      topics: [{ type: "TOPIC", id: 4, title: "Gia đình", description: "Description for Gia đình" }],
      learningSets: [{ type: "LEARNING_SET", id: 8, title: "Từ vựng gia đình", description: "Description for Từ vựng gia đình", vocabularyCount: 12, grade: "GRADE_1" }]
    });
  });

  it("returns the verified gloss only from the current-hash overlay", async () => {
    const verified = row("VOCABULARY", 1, "family");
    verified.subtitle = "gia đình";
    verified.subtitle_label = "Nghĩa tiếng Việt";
    const { database, queries } = createDatabase({ rows: [verified] });
    const response = await createGlobalSearchService(database, { datasetVersion: "v2" }).search("parent-1", learnerId, { q: "family", limit: 5 });

    expect(response.vocabulary[0]).toMatchObject({ subtitle: "gia đình", subtitleLabel: "Nghĩa tiếng Việt" });
    expect(queries[1]?.sql).toContain('"master_v2_short_meanings"');
    expect(queries[1]?.sql).toContain("sm.source_content_hash = md.content_sha256");
    expect(queries[1]?.sql).toContain("sm.validation_status = 'VERIFIED'");
  });

  it("denies a learner outside the authenticated household before search", async () => {
    const { database, execute } = createDatabase({ authorized: false });
    await expect(createGlobalSearchService(database).search("parent-1", learnerId, { q: "family", limit: 5 }))
      .rejects.toMatchObject({ code: "HOUSEHOLD_ACCESS_DENIED", status: 403 });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("uses one parameterized, deterministic read for all three entities and caps every group", async () => {
    const rows = [
      ...Array.from({ length: 7 }, (_, index) => row("VOCABULARY", index + 1, `family-${index}`)),
      ...Array.from({ length: 7 }, (_, index) => row("TOPIC", index + 11, `Family topic ${index}`)),
      ...Array.from({ length: 7 }, (_, index) => row("LEARNING_SET", index + 21, `Family set ${index}`))
    ];
    const { database, execute, queries } = createDatabase({ rows });
    const query = { q: "family%'_", limit: 3 };
    const response = await createGlobalSearchService(database).search("parent-1", learnerId, query);
    const searchQuery = queries[1]!;

    expect(response.vocabulary).toHaveLength(3);
    expect(response.topics).toHaveLength(3);
    expect(response.learningSets).toHaveLength(3);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(searchQuery.sql).toContain("WITH eligible_vocabulary");
    expect(searchQuery.sql).toContain("v.enabled = true");
    expect(searchQuery.sql).toContain("lls.active = true");
    expect(searchQuery.sql).toContain("t.enabled = true");
    expect(searchQuery.sql).toContain("ls.enabled = true");
    expect(searchQuery.sql).toContain("row_number() OVER");
    expect(searchQuery.sql).toContain("lower(title) COLLATE \"C\"");
    expect(searchQuery.sql).toContain("entity_rank <=");
    expect(searchQuery.params).toContain(query.q);
    expect(searchQuery.params).toContain("%family\\%'\\_%");
    expect(searchQuery.sql).not.toContain(query.q);
    expect(searchQuery.sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
  });

  it("ranks exact vocabulary before prefix, substring and Vietnamese meaning with stable ties", async () => {
    const { database, queries } = createDatabase();
    await createGlobalSearchService(database).search("parent-1", learnerId, { q: "family", limit: 5 });
    const searchSql = queries[1]!.sql;

    expect(searchSql.indexOf("WHEN lower(v.word) = lower(")).toBeLessThan(searchSql.indexOf("WHEN lower(v.word) LIKE lower("));
    expect(searchSql).toContain("OR lower(COALESCE(v.vietnamese_override, v.vietnamese)) LIKE");
    expect(searchSql).toContain("WHEN lower(t.name) = lower(");
    expect(searchSql).toContain("WHEN lower(ls.name) = lower(");
    expect(searchSql).toContain("ORDER BY match_rank ASC, stable_order ASC, lower(title) COLLATE \"C\" ASC, id ASC");
  });
});
