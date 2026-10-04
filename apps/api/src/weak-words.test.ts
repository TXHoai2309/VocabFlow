import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import {
  classifyWeakWord,
  createWeakWordsService,
  parseWeakWordsQuery,
  WeakWordsServiceError
} from "./weak-words";

const learnerId = "00000000-0000-4000-8000-000000000010";
const householdId = "00000000-0000-4000-8000-000000000001";
const reviewDate = "2026-10-04";

function row(id: number, input: {
  word?: string;
  meaning?: string;
  state?: "LEARNING" | "MASTERED";
  nextReviewDate?: string | null;
  reviewCount?: number;
  rememberedCount?: number;
  forgottenCount?: number;
  summaryReviewCount?: number;
  summaryRememberedCount?: number;
} = {}) {
  return {
    summary_review_count: input.summaryReviewCount ?? 17,
    summary_remembered_count: input.summaryRememberedCount ?? 9,
    id,
    word: input.word ?? `word-${id}`,
    ipa: null,
    vietnamese: input.meaning ?? `nghĩa-${id}`,
    definition_en: null,
    example_en: null,
    image_url: null,
    audio_url: null,
    topic: "Food",
    level: "GRADE_1",
    enabled: true,
    content_version: 1,
    learning_state: input.state ?? "LEARNING",
    next_review_date: input.nextReviewDate ?? null,
    revision: 3,
    review_count: input.reviewCount ?? 0,
    remembered_count: input.rememberedCount ?? 0,
    forgotten_count: input.forgottenCount ?? 0
  };
}

const candidateRows = [
  row(1, { word: "school", meaning: "trường học", reviewCount: 4, rememberedCount: 1, forgottenCount: 3, nextReviewDate: "2026-10-01" }),
  row(2, { word: "family", meaning: "gia đình", state: "MASTERED", reviewCount: 2, rememberedCount: 1, forgottenCount: 1, nextReviewDate: reviewDate }),
  row(3, { word: "mountain", reviewCount: 2, forgottenCount: 2, nextReviewDate: "2026-10-08" }),
  row(4, { word: "write", reviewCount: 1, forgottenCount: 1, nextReviewDate: "2026-10-05" }),
  row(5, { word: "book", state: "MASTERED", reviewCount: 5, rememberedCount: 4, forgottenCount: 1, nextReviewDate: "2026-10-02" }),
  row(6, { word: "garden", state: "MASTERED", reviewCount: 5, rememberedCount: 4, forgottenCount: 1, nextReviewDate: "2026-10-08" })
];

function authorizedRows() {
  return { rows: [{ learner_id: learnerId, household_id: householdId }] };
}

function createMockDatabase(rows = candidateRows) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const execute = vi.fn(async (query) => {
    const rendered = new PgDialect().sqlToQuery(query);
    queries.push(rendered);
    if (rendered.sql.includes('"household_members"')) return authorizedRows();
    if (rendered.sql.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
    if (rendered.sql.includes("WITH eligible_vocabulary")) return { rows };
    return { rows: [] };
  });
  return { database: { execute }, execute, queries };
}

describe("Weak Words classification and query parsing", () => {
  it("requires a sample and exact accuracy below 60 percent", () => {
    expect(classifyWeakWord("LEARNING", 0, 0)).toBe("LEARNING");
    expect(classifyWeakWord("LEARNING", 1, 0)).toBe("LEARNING");
    expect(classifyWeakWord("MASTERED", 1, 0)).toBe("STABLE");
    expect(classifyWeakWord("LEARNING", 2, 1)).toBe("WEAK");
    expect(classifyWeakWord("MASTERED", 5, 3)).toBe("STABLE");
    expect(classifyWeakWord("MASTERED", 5, 2)).toBe("WEAK");
  });

  it("accepts bounded query options and rejects unknown, duplicated and invalid values", () => {
    expect(parseWeakWordsQuery(new URLSearchParams("q=school&status=weak&page=2&pageSize=10"))).toEqual({
      q: "school", status: "weak", page: 2, pageSize: 10
    });
    expect(parseWeakWordsQuery(new URLSearchParams("pageSize=51"))).toBeNull();
    expect(parseWeakWordsQuery(new URLSearchParams("status=unknown"))).toBeNull();
    expect(parseWeakWordsQuery(new URLSearchParams("status="))).toBeNull();
    expect(parseWeakWordsQuery(new URLSearchParams("q=one&q=two"))).toBeNull();
    expect(parseWeakWordsQuery(new URLSearchParams("debug=1"))).toBeNull();
  });
});

describe("Weak Words read API", () => {
  it("derives real signals, keeps due separate, sorts by priority and paginates without N+1", async () => {
    const { database, execute, queries } = createMockDatabase();
    const service = createWeakWordsService(database, { now: () => new Date("2026-10-04T03:00:00.000Z") });

    const result = await service.list("parent-1", learnerId, { q: "", status: null, page: 1, pageSize: 2 });

    expect(result.reviewDate).toBe(reviewDate);
    expect(result.summary).toEqual({ weakCount: 3, dueCount: 3, recentAccuracy: 53, recentReviewCount: 17 });
    expect(result.pagination).toEqual({ page: 1, pageSize: 2, totalItems: 4, totalPages: 2 });
    expect(result.items.map((item) => [item.vocabulary.word, item.weaknessStatus, item.dueStatus])).toEqual([
      ["school", "WEAK", "OVERDUE"],
      ["family", "WEAK", "DUE_TODAY"]
    ]);
    expect(result.items[0]?.recentAccuracy).toBe(25);
    expect(result.items[0]?.forgottenCount).toBe(3);
    expect(result.items[1]?.learningState).toBe("MASTERED");
    expect(execute).toHaveBeenCalledTimes(3);
    const query = queries[2]?.sql ?? "";
    expect(query).toContain('"vocabflow_app"."learner_learning_sets"');
    expect(query).toContain("lls.active = true");
    expect(query).toContain("v.enabled = true");
    expect(query).toContain("ROW_NUMBER() OVER");
    expect(query).toContain("INTERVAL '29 days'");
    expect(query).toContain("reviewed_at DESC, review_id DESC");
    expect(query).toContain("review_date >=");
    expect(query).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
  });

  it("searches English and Vietnamese, filters weakness status, and clamps page to available results", async () => {
    const { database } = createMockDatabase();
    const service = createWeakWordsService(database, { now: () => new Date("2026-10-04T03:00:00.000Z") });

    const vietnamese = await service.list("parent-1", learnerId, { q: "gia đình", status: "weak", page: 4, pageSize: 20 });
    expect(vietnamese.items.map((item) => item.vocabulary.word)).toEqual(["family"]);
    expect(vietnamese.pagination).toMatchObject({ page: 1, totalItems: 1, totalPages: 1 });

    const english = await service.list("parent-1", learnerId, { q: "school", status: null, page: 1, pageSize: 20 });
    expect(english.items.map((item) => item.vocabulary.word)).toEqual(["school"]);

    const defaultList = await service.list("parent-1", learnerId, { q: "", status: null, page: 1, pageSize: 20 });
    expect(defaultList.items.map((item) => item.vocabulary.word)).toEqual(["school", "family", "mountain", "book"]);
    expect(defaultList.pagination.totalItems).toBe(4);
    expect(defaultList.items.find((item) => item.vocabulary.word === "mountain")).toMatchObject({
      weaknessStatus: "WEAK",
      dueStatus: "UPCOMING"
    });
    expect(defaultList.items.find((item) => item.vocabulary.word === "book")).toMatchObject({
      weaknessStatus: "STABLE",
      dueStatus: "OVERDUE"
    });
    expect(defaultList.items.some((item) => item.vocabulary.word === "write" || item.vocabulary.word === "garden")).toBe(false);

    const learning = await service.list("parent-1", learnerId, { q: "", status: "learning", page: 1, pageSize: 20 });
    expect(learning.items.map((item) => item.vocabulary.word)).toEqual(["write"]);
    expect(learning.items[0]).toMatchObject({ weaknessStatus: "LEARNING", dueStatus: "UPCOMING" });

    const stable = await service.list("parent-1", learnerId, { q: "", status: "stable", page: 1, pageSize: 20 });
    expect(stable.items.map((item) => item.vocabulary.word)).toEqual(["book", "garden"]);
    expect(stable.items[1]).toMatchObject({ weaknessStatus: "STABLE", dueStatus: "UPCOMING" });
  });

  it("keeps one forgotten review Learning and returns null accuracy when no reviews exist", async () => {
    const noHistoryRow = row(9, { reviewCount: 0, rememberedCount: 0, forgottenCount: 0, summaryReviewCount: 0, summaryRememberedCount: 0 });
    const { database } = createMockDatabase([noHistoryRow]);
    const service = createWeakWordsService(database, { now: () => new Date("2026-10-04T03:00:00.000Z") });
    const result = await service.list("parent-1", learnerId, { q: "", status: "learning", page: 1, pageSize: 20 });

    expect(result.summary).toEqual({ weakCount: 0, dueCount: 0, recentAccuracy: null, recentReviewCount: 0 });
    expect(result.items[0]).toMatchObject({ weaknessStatus: "LEARNING", recentAccuracy: null, reviewCount: 0 });
  });

  it("returns 403 for a learner outside the authenticated household", async () => {
    const execute = vi.fn(async () => ({ rows: [] }));
    const service = createWeakWordsService({ execute });
    await expect(service.list("parent-1", learnerId)).rejects.toMatchObject({ code: "HOUSEHOLD_ACCESS_DENIED", status: 403 });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("Weak Words route", () => {
  it("requires a session and validates query parameters before listing", async () => {
    const list = vi.fn();
    const unauthenticated = createApp({ readSession: async () => null, weakWordsService: { list } });
    expect((await unauthenticated.request(`http://localhost/api/learners/${learnerId}/weak-words`)).status).toBe(401);

    const authenticated = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), weakWordsService: { list } });
    expect((await authenticated.request(`http://localhost/api/learners/${learnerId}/weak-words?status=bad`)).status).toBe(400);
    expect((await authenticated.request(`http://localhost/api/learners/${learnerId}/weak-words?q=a&q=b`)).status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it("passes learner-scoped filters and maps ownership failures safely", async () => {
    const payload = {
      learnerId,
      reviewDate,
      summary: { weakCount: 1, dueCount: 0, recentAccuracy: null, recentReviewCount: 0 },
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
    };
    const list = vi.fn(async () => payload);
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), weakWordsService: { list } });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/weak-words?q=school&status=weak&page=2`);
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith("parent-1", learnerId, { q: "school", status: "weak", page: 2, pageSize: 20 });

    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      weakWordsService: { list: vi.fn(async () => { throw new WeakWordsServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }) }
    });
    const deniedResponse = await denied.request(`http://localhost/api/learners/${learnerId}/weak-words`);
    expect(deniedResponse.status).toBe(403);
    expect(await deniedResponse.text()).not.toContain("householdId");
  });
});
