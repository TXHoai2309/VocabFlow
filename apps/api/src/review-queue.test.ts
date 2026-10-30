import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createReviewQueueService, ReviewQueueServiceError } from "./review-queue";
import { V2_PUBLIC_MEDIA_OWNER_ATTESTATION_ID } from "./v2-public-media";
import type { ReviewQueueResponse } from "@vocabflow/contracts";

const learnerId = "00000000-0000-4000-8000-000000000010";

describe("V2 broad sources and explicit catalog filters", () => {
  it("keeps unclassified scope on both due and new queues before capacity", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const compiled = new PgDialect().sqlToQuery(query); queries.push(compiled);
      if (queries.length === 1) return authorizedRows();
      if (compiled.sql.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (compiled.sql.includes("daily_new_word_limit")) return dailyUsageRow(10, 0);
      return { rows: [] };
    });
    const result = await createReviewQueueService({ execute }, { datasetVersion: "v2" })
      .list("A", learnerId, undefined, { type: "all", cefr: "UNCLASSIFIED" }, 5);
    expect(result.queue).toEqual([]);
    const scoped = queries.filter(({ sql }) => sql.includes("COUNT(*) OVER()"));
    expect(scoped.length).toBeGreaterThanOrEqual(2);
    for (const query of scoped) {
      expect(query.sql).toContain("NULLIF(trim(md.cefr), '') IS NULL");
      expect(query.sql.indexOf("NULLIF(trim(md.cefr), '') IS NULL")).toBeLessThan(query.sql.indexOf("LIMIT"));
      expect(query.params).not.toContain("UNCLASSIFIED");
    }
  });
  it.each(["all", "pathway"] as const)("%s includes enabled words outside all learning sets", async (type) => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const rendered = new PgDialect().sqlToQuery(query); queries.push(rendered);
      if (queries.length === 1) return authorizedRows();
      if (rendered.sql.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (rendered.sql.includes("daily_new_word_limit")) return dailyUsageRow(10, 0);
      if (rendered.sql.includes("next_review_date <=")) return { rows: [] };
      if (rendered.sql.includes("lp.vocabulary_id IS NULL")) {
        // This word has no set membership: only an erroneously added set
        // predicate would hide it in the real query.
        expect(rendered.sql).not.toContain('"learning_set_items"');
        expect(rendered.sql).not.toContain('"learner_learning_sets"');
        return { rows: [newRow(999, 1)] };
      }
      throw new Error("Unexpected query");
    });
    const result = await createReviewQueueService({ execute }, { datasetVersion: "v2" }).list("A", learnerId, undefined, { type, level: "GRADE_1", cefr: "A1" }, 5);
    expect(result.queue.map((item) => item.vocabulary.id)).toEqual([999]);
    for (const query of queries.filter((item) => item.sql.includes("COUNT(*) OVER()"))) {
      expect(query.sql).toContain("v.enabled = true");
      expect(query.sql).toContain("v.level =");
      expect(query.sql).toContain("md.cefr =");
      expect(query.params).toEqual(expect.arrayContaining(["GRADE_1", "A1"]));
    }
  });
});
const householdId = "00000000-0000-4000-8000-000000000001";

describe("Study source API contract", () => {
  it.each(["capacity=5", "capacity=10", "capacity=20", "capacity=30", "source=custom&setIds=1,2&capacity=30", "source=pathway&capacity=30", "source=all&capacity=30", "source=all&cefr=UNCLASSIFIED&capacity=5", "topicId=7&capacity=30", "learningSetId=4&capacity=30", "scope=saved&capacity=30"])("accepts bounded candidate %s without changing scope", async (query) => {
    const list = vi.fn(async () => ({ learnerId, reviewDate: "2026-10-08", dueCount: 0, newCount: 0, queue: [] }));
    const app = createApp({ readSession: async () => ({ user: { id: "A" } }), reviewQueueService: { list } });
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?${query}`)).status).toBe(200);
    expect(list).toHaveBeenCalledWith("A", learnerId, expect.any(Object), query.startsWith("capacity=") ? undefined : expect.anything(), Number(new URLSearchParams(query).get("capacity")));
  });
  it.each(["capacity=0", "capacity=31", "capacity=100000", "capacity=15", "capacity=05", "capacity=", "capacity=30&capacity=30", "capacity=30&content=mixed", "scope=weak&capacity=30", "scope=saved&content=all&capacity=30"])("rejects invalid candidate contract %s", async (query) => {
    const list = vi.fn();
    const app = createApp({ readSession: async () => ({ user: { id: "A" } }), reviewQueueService: { list } });
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?${query}`)).status).toBe(400); expect(list).not.toHaveBeenCalled();
  });
  it.each(["source=pathway", "source=all", "source=custom&setIds=2,1", "learningSetId=4", "topicId=7"])("accepts %s with authenticated ownership handoff", async (query) => {
    const list = vi.fn(async (_userId: string) => ({ learnerId, reviewDate: "2026-10-08", dueCount: 0, newCount: 0, queue: [] }));
    const app = createApp({ readSession: async () => ({ user: { id: "A" } }), reviewQueueService: { list } });
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?${query}`)).status).toBe(200);
    expect(list.mock.calls[0]?.[0]).toBe("A");
  });
  it.each(["source=all&source=pathway", "source=custom", "source=custom&setIds=0", "source=custom&setIds=1,1", "source=custom&setIds=1&setIds=2", "source=custom&setIds=9007199254740992", "source=all&learningSetId=1", "topicId=1&topicId=2", "source=all&foo=1", `source=custom&setIds=${Array.from({ length: 51 }, (_, i) => i + 1).join(",")}`])("rejects %s before querying", async (query) => {
    const list = vi.fn();
    const app = createApp({ readSession: async () => ({ user: { id: "A" } }), reviewQueueService: { list } });
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?${query}`)).status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });
});

describe("Scoped membership SQL before bounds", () => {
  function fixture(options: { studied?: number[]; disabled?: boolean; forbidden?: boolean; noNew?: boolean } = {}) {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const rendered = new PgDialect().sqlToQuery(query); queries.push(rendered);
      const statement = rendered.sql;
      if (queries.length === 1) return options.forbidden ? { rows: [] } : authorizedRows();
      if (statement.includes("SELECT id FROM")) return { rows: options.disabled ? [] : rendered.params.filter((id) => typeof id === "number").map((id) => ({ id })) };
      if (statement.includes("SELECT ls.id")) return { rows: options.noNew ? [] : [{ id: options.studied?.includes(101) ? 2 : 1 }] };
      if (statement.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (statement.includes("daily_new_word_limit")) return dailyUsageRow(2, 1);
      if (statement.includes("next_review_date <=")) return { rows: [dueRow(100, 1)] };
      if (statement.includes("lp.vocabulary_id IS NULL")) {
        // Distinct canonical rows outside the old global top ten. Membership
        // is EXISTS, so overlapping set links never multiply vocabulary rows.
        return { rows: [newRow(rendered.params.includes(2) ? 202 : 101, 2), newRow(303, 2)] };
      }
      return { rows: [] };
    });
    return { queries, service: createReviewQueueService({ execute }, { now: () => new Date("2026-10-08T03:00:00Z") }) };
  }
  it("binds Custom IDs, scopes before LIMIT, excludes assignment writes and retains due/daily cap", async () => {
    const { service, queries } = fixture();
    const queue = await service.list("A", learnerId, undefined, { type: "custom", ids: [1, 2] });
    expect(queue.queue.map((item) => [item.vocabulary.id, item.queueType])).toEqual([[100, "DUE"], [202, "NEW"]]);
    for (const query of queries.filter(({ sql }) => sql.includes("COUNT(*) OVER()"))) {
      expect(query.sql).toContain("EXISTS ("); expect(query.sql).toContain("ls.id IN (");
      expect(query.params).toContain(1); expect(query.params).toContain(2); expect(query.params).not.toContain(3);
      expect(query.sql.indexOf("lsi.vocabulary_id = v.id")).toBeLessThan(query.sql.lastIndexOf("LIMIT"));
      expect(query.sql).not.toContain('"learner_learning_sets"');
    }
    expect(new Set(queue.queue.map((item) => item.vocabulary.id)).size).toBe(queue.queue.length);
    expect(queries.every(({ sql }) => !/\b(INSERT|UPDATE|DELETE)\b/.test(sql))).toBe(true);
  });
  it("All is an enabled-set union rather than the legacy catalog or assignments", async () => {
    const { service, queries } = fixture(); await service.list("A", learnerId, undefined, { type: "all" });
    for (const query of queries.filter(({ sql }) => sql.includes("COUNT(*) OVER()"))) {
      expect(query.sql).toContain('"learning_set_items"'); expect(query.sql).toContain("ls.enabled = true"); expect(query.sql).toContain("v.enabled = true");
      expect(query.sql).not.toContain('"learner_learning_sets"'); expect(query.sql).not.toContain("ls.id IN");
    }
  });
  it("Pathway chooses by canonical missing progress and advances without mastery while retaining past due", async () => {
    for (const studied of [[], [101]]) {
      const { service, queries } = fixture({ studied });
      const queue = await service.list("A", learnerId, undefined, { type: "pathway" });
      expect(queue.queue.map((item) => item.vocabulary.id)).toEqual([100, studied.length ? 202 : 101]);
      const progression = queries.find(({ sql }) => sql.includes("SELECT ls.id"))!;
      expect(progression.sql).toContain("ORDER BY ls.sort_order ASC, ls.id ASC LIMIT 1");
      expect(progression.sql).toContain('"learner_progress"'); expect(progression.sql).toContain("NOT EXISTS"); expect(progression.params).toContain(learnerId);
      expect(progression.sql).not.toContain("MASTERED");
      expect(queries.find(({ sql }) => sql.includes("next_review_date <="))!.sql).not.toContain("ls.id IN");
    }
  });
  it("rejects disabled or missing sets after ownership, and blocks cross-account scope reads", async () => {
    await expect(fixture({ disabled: true }).service.list("A", learnerId, undefined, { type: "custom", ids: [1] })).rejects.toMatchObject({ code: "SCOPE_NOT_FOUND", status: 404 });
    const { service, queries } = fixture({ forbidden: true });
    await expect(service.list("B", learnerId, undefined, { type: "all" })).rejects.toMatchObject({ code: "HOUSEHOLD_ACCESS_DENIED" });
    expect(queries).toHaveLength(1);
  });
  it("keeps Due when every Pathway set has introduced its New words", async () => {
    const { service, queries } = fixture({ noNew: true });
    const result = await service.list("A", learnerId, undefined, { type: "pathway" });
    expect(result.queue.map((item) => item.queueType)).toEqual(["DUE"]);
    expect(queries.some(({ sql }) => sql.includes("lp.vocabulary_id IS NULL"))).toBe(false);
  });
  it("retains learner assignment membership for scoped Topic reads", async () => {
    const { service, queries } = fixture(); await service.list("A", learnerId, undefined, { type: "topic", id: 7 });
    for (const query of queries.filter(({ sql }) => sql.includes("COUNT(*) OVER()"))) {
      expect(query.sql).toContain('"learner_learning_sets"'); expect(query.sql).toContain('"vocabulary_topics"'); expect(query.params).toContain(7);
    }
  });

  it.each([
    { type: "topic" as const, id: 7, membershipTable: '"vocabulary_topics"' },
    { type: "learning-set" as const, id: 4, membershipTable: '"learning_set_items"' }
  ])("scopes V2 $type learning queues to the selected metadata membership", async ({ type, id, membershipTable }) => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const rendered = new PgDialect().sqlToQuery(query); queries.push(rendered);
      const statement = rendered.sql;
      if (queries.length === 1) return authorizedRows();
      if (statement.includes("SELECT t.id") || statement.includes("SELECT ls.id")) return { rows: [{ id }] };
      if (statement.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (statement.includes("daily_new_word_limit")) return dailyUsageRow(10, 0);
      if (statement.includes("next_review_date <=")) return { rows: [] };
      if (statement.includes("lp.vocabulary_id IS NULL")) return { rows: [newRow(701, 1)] };
      throw new Error("Unexpected V2 learning queue query");
    });
    const service = createReviewQueueService({ execute }, { datasetVersion: "v2" });
    const result = await service.list("A", learnerId, undefined, { type, id });
    expect(result.queue.map((item) => item.vocabulary.id)).toEqual([701]);
    const membershipQuery = queries.find(({ sql }) => sql.includes("COUNT(*) OVER()"))?.sql ?? "";
    expect(membershipQuery).toContain(membershipTable);
    expect(membershipQuery).toContain("source_dataset =");
    expect(membershipQuery).not.toContain('"learner_learning_sets"');
    expect(queries.some(({ sql }) => sql.includes("SELECT t.id") || sql.includes("SELECT ls.id"))).toBe(true);
  });
});

describe("Bounded Study candidate capacity", () => {
  it("does not bypass session authentication or learner ownership when capacity is requested", async () => {
    const list = vi.fn();
    const app = createApp({ readSession: async () => null, reviewQueueService: { list } });
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?capacity=30`)).status).toBe(401);
    expect(list).not.toHaveBeenCalled();
    const execute = vi.fn(async () => ({ rows: [] }));
    await expect(createReviewQueueService({ execute }).list("other-account", learnerId, undefined, { type: "custom", ids: [1] }, 30)).rejects.toMatchObject({ status: 403, code: "HOUSEHOLD_ACCESS_DENIED" });
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, { type: "all" }, { type: "pathway" }, { type: "custom", ids: [1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] }, { type: "learning-set", id: 4 }, { type: "topic", id: 7 }, "saved"] as const)("supplies up to 30 of each type within scope %j", async (scope) => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const rendered = new PgDialect().sqlToQuery(query); queries.push(rendered);
      const statement = rendered.sql;
      if (queries.length === 1) return authorizedRows();
      if (statement.includes("SELECT id FROM")) return { rows: rendered.params.filter((value) => typeof value === "number").map((id) => ({ id })) };
      if (statement.includes("SELECT ls.id")) return { rows: [{ id: 1 }] };
      if (statement.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (statement.includes("daily_new_word_limit")) return dailyUsageRow(100, 0);
      const limit = Number(rendered.params.at(-1));
      if (statement.includes("next_review_date <=")) return { rows: Array.from({ length: limit }, (_, i) => dueRow(i + 1, 45)) };
      if (statement.includes("lp.vocabulary_id IS NULL")) return { rows: Array.from({ length: limit }, (_, i) => newRow(i + 100, 147)) };
      throw new Error("Unexpected query");
    });
    const service = createReviewQueueService({ execute });
    const result = await service.list("A", learnerId, undefined, scope as import("./review-queue").ReviewQueueScope | undefined, 30);
    expect(result.queue.filter((item) => item.queueType === "DUE")).toHaveLength(30);
    expect(result.queue.filter((item) => item.queueType === "NEW")).toHaveLength(30);
    expect(result.dueCount).toBe(45); expect(result.newCount).toBe(147);
    expect(new Set(result.queue.map((item) => item.vocabulary.id)).size).toBe(60);
    for (const query of queries.filter((query) => query.sql.includes("COUNT(*) OVER()"))) {
      expect(query.params.at(-1)).toBe(30); expect(query.sql.indexOf("EXISTS")).toBeLessThan(query.sql.lastIndexOf("LIMIT"));
    }
    expect(queries.length).toBeLessThanOrEqual(6);
  });
  it.each([0, 4])("caps 30 candidates at canonical remaining allowance %i", async (remaining) => {
    const execute = vi.fn(async (query) => {
      const { sql: statement } = new PgDialect().sqlToQuery(query);
      if (execute.mock.calls.length === 1) return authorizedRows();
      if (statement.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (statement.includes("daily_new_word_limit")) return dailyUsageRow(10, 10 - remaining);
      if (statement.includes("next_review_date <=")) return { rows: Array.from({ length: 20 }, (_, i) => dueRow(i + 1, 20)) };
      return { rows: Array.from({ length: 30 }, (_, i) => newRow(i + 100, 40)) };
    });
    const result = await createReviewQueueService({ execute }).list("A", learnerId, undefined, undefined, 30);
    expect(result.queue.filter((item) => item.queueType === "NEW")).toHaveLength(remaining);
    expect(result.newCount).toBe(40);
  });
});

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

function dailyUsageRow(limit = 10, consumedToday = 0) {
  return { rows: [{ daily_new_word_limit: limit, consumed_today: consumedToday }] };
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
    const readSession = vi.fn(async (_request: Request, _env: unknown, timings?: { authInitMs?: number; authGetSessionMs?: number }) => {
      if (timings) {
        timings.authInitMs = 12.3;
        timings.authGetSessionMs = 845.6;
      }
      return { user: { id: "parent-1" } };
    });
    const app = createApp({
      readSession,
      reviewQueueService: service
    });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/review-queue`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(queue);
    expect(service.list).toHaveBeenCalledWith("parent-1", learnerId, expect.any(Object));
    const timing = response.headers.get("Server-Timing");
    expect(timing).toMatch(/auth_init;dur=12\.3, auth_get_session;dur=845\.6, auth;dur=\d+\.\d+, authorization;dur=\d+\.\d+, db;dur=\d+\.\d+, total;dur=\d+\.\d+/);
    expect(timing).not.toContain(learnerId);
    expect(timing).not.toContain("parent-1");
    expect(timing).not.toContain("secret");
  });

  it("preserves the compact source meaning and approved media URLs through the nested queue response sanitizer", async () => {
    const imageUrl = "https://res.cloudinary.com/vocabflow/image/authenticated/s--Abc_def1--/v1729000000/Vocab/v2/images/about.jpg";
    const wordAudioUrl = "https://res.cloudinary.com/vocabflow/video/authenticated/s--Audio_12--/v1729000000/Vocab/v2/audio/about.mp3";
    const exampleAudioUrl = "https://res.cloudinary.com/vocabflow/video/authenticated/s--Exmpl_12--/v1729000000/Vocab/v2/audio/about-example.mp3";
    const queue: ReviewQueueResponse = {
      learnerId,
      reviewDate: "2026-10-18",
      dueCount: 0,
      newCount: 1,
      queue: [{
        vocabulary: {
          id: 92,
          word: "about",
          ipa: "/əˈbaʊt/",
          partOfSpeech: "ADVERB",
          vietnamese: "quanh quẩn hoặc ở nhiều chỗ trong một khu vực gần đó",
          sourceMeaningVi: "ở quanh khu vực đó",
          definitionEn: "In various places within or near an area.",
          exampleEn: "The children wandered about while we packed the bags.",
          examples: [{ exampleKey: "about-adv-example-1", en: "The children wandered about while we packed the bags.", vi: "Bọn trẻ đi quanh quẩn trong lúc chúng tôi xếp đồ vào túi." }],
          imageUrl: null,
          audioUrl: null,
          topic: null,
          level: null,
          enabled: true,
          contentVersion: 1,
          masterSenseIdentity: "about|ADVERB|sense-1",
          contentHash: "a".repeat(64),
          contentReviewStatus: "PASS",
          editorialStatus: "DRAFT",
          rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
          developmentMedia: {
            images: [{
              url: imageUrl, mediaSha256: "b".repeat(64), mimeType: "image/jpeg",
              sourceNoteIdentity: "about-note:1", reviewStatus: "ACCEPTED_MAPPING",
              rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
              targetProposalKey: "about|ADVERB|sense-1", targetContentSha256: "a".repeat(64)
            }],
            wordAudio: [{ url: wordAudioUrl, mediaSha256: "c".repeat(64), mimeType: "audio/mpeg", sourceNoteIdentity: "about-note:1", reviewStatus: "ACCEPTED_MAPPING", rightsStatus: "UNKNOWN_REVIEW_REQUIRED", pronunciation: "/əˈbaʊt/", pronunciationEvidence: "Source-note Sound/IPA matches target IPA" }],
            exampleAudio: [{ url: exampleAudioUrl, mediaSha256: "d".repeat(64), mimeType: "audio/mpeg", sourceNoteIdentity: "about-note:1", reviewStatus: "ACCEPTED_MAPPING", rightsStatus: "UNKNOWN_REVIEW_REQUIRED", exampleKey: "about-adv-example-1" }]
          }
        },
        queueType: "NEW",
        status: "NEW",
        nextReviewDate: null,
        expectedRevision: 0
      }]
    };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), reviewQueueService: { list: async () => queue } });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/review-queue`, {}, {
      VERCEL_ENV: "production",
      VOCABFLOW_V2_PUBLIC_MEDIA_ATTESTATION_ID: V2_PUBLIC_MEDIA_OWNER_ATTESTATION_ID
    });
    const body = await response.json() as ReviewQueueResponse;
    const item = body.queue[0]?.vocabulary;

    expect(response.status).toBe(200);
    expect(item).toMatchObject({
      word: "about",
      partOfSpeech: "ADVERB",
      vietnamese: "quanh quẩn hoặc ở nhiều chỗ trong một khu vực gần đó",
      sourceMeaningVi: "ở quanh khu vực đó",
      definitionEn: "In various places within or near an area."
    });
    expect(item?.imageUrl).toBe(imageUrl);
    expect(item?.audioUrl).toBe(wordAudioUrl);
    expect(item?.examples?.[0]).toMatchObject({
      en: "The children wandered about while we packed the bags.",
      audioUrl: exampleAudioUrl
    });
    expect(item).not.toHaveProperty("developmentMedia");
    expect(item?.rightsStatus).toBe("UNKNOWN_REVIEW_REQUIRED");
  });

  it("accepts the saved scope, passes it to the queue service, and rejects unknown or duplicate scope params", async () => {
    const queue: ReviewQueueResponse = { learnerId, reviewDate: "2026-09-14", dueCount: 0, newCount: 0, queue: [] };
    const service = { list: vi.fn(async () => queue) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), reviewQueueService: service });

    const saved = await app.request(`http://localhost/api/learners/${learnerId}/review-queue?scope=saved`);
    expect(saved.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith("parent-1", learnerId, expect.any(Object), "saved");
    expect(await saved.json()).toEqual(queue);
    const savedAll = await app.request(`http://localhost/api/learners/${learnerId}/review-queue?scope=saved&content=all`);
    expect(savedAll.status).toBe(200);
    expect(service.list).toHaveBeenLastCalledWith("parent-1", learnerId, expect.any(Object), "saved-all");
    const weak = await app.request(`http://localhost/api/learners/${learnerId}/review-queue?scope=weak`);
    expect(weak.status).toBe(200);
    expect(service.list).toHaveBeenLastCalledWith("parent-1", learnerId, expect.any(Object), "weak");
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?scope=other`)).status).toBe(400);
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?scope=saved&scope=saved`)).status).toBe(400);
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?scope=saved&content=all&content=all`)).status).toBe(400);
    expect((await app.request(`http://localhost/api/learners/${learnerId}/review-queue?content=all`)).status).toBe(400);
    expect(service.list).toHaveBeenCalledTimes(3);
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
  it("serializes source meaning, Sense identity and all media evidence into the Review Queue DTO", async () => {
    const image = { url: "https://media.example/about.jpg", mediaSha256: "b".repeat(64), mimeType: "image/jpeg", sourceNoteIdentity: "about-note:1", reviewStatus: "PROPOSED", rightsStatus: "UNKNOWN_REVIEW_REQUIRED" };
    const wordAudio = { url: "https://media.example/about.mp3", mediaSha256: "c".repeat(64), mimeType: "audio/mpeg", sourceNoteIdentity: "about-note:1", reviewStatus: "PROPOSED", rightsStatus: "UNKNOWN_REVIEW_REQUIRED", pronunciation: "/əˈbaʊt/", pronunciationEvidence: "Source-note Sound/IPA matches target IPA" };
    const exampleAudio = { url: "https://media.example/about-example.mp3", mediaSha256: "d".repeat(64), mimeType: "audio/mpeg", sourceNoteIdentity: "about-note:1", reviewStatus: "ACCEPTED_MAPPING", rightsStatus: "UNKNOWN_REVIEW_REQUIRED", exampleKey: "about-adv-example-1" };
    const row = {
      ...newRow(92, 1),
      word: "about",
      ipa: "/əˈbaʊt/",
      part_of_speech: "ADVERB",
      vietnamese: "quanh quẩn hoặc ở nhiều chỗ trong một khu vực gần đó",
      source_meaning_vi: "ở quanh khu vực đó",
      definition_en: "In various places within or near an area.",
      example_en: "The children wandered about while we packed the bags.",
      examples: [{ exampleKey: "about-adv-example-1", en: "The children wandered about while we packed the bags.", vi: "Bọn trẻ đi quanh quẩn trong lúc chúng tôi xếp đồ vào túi." }],
      master_sense_identity: "about|ADVERB|sense-1",
      content_sha256: "a".repeat(64),
      content_review_decision: "PASS",
      editorial_status: "DRAFT",
      rights_status: "UNKNOWN_REVIEW_REQUIRED",
      development_media: { images: [image], wordAudio: [wordAudio], exampleAudio: [exampleAudio] }
    };
    const execute = vi.fn(async (query) => {
      const statement = new PgDialect().sqlToQuery(query).sql;
      if (statement.includes("SELECT lp.id::text AS learner_id")) return authorizedRows();
      if (statement.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (statement.includes("daily_new_word_limit")) return dailyUsageRow();
      if (statement.includes("next_review_date <=")) return { rows: [] };
      if (statement.includes("lp.vocabulary_id IS NULL")) return { rows: [row] };
      throw new Error("Unexpected Review Queue query");
    });

    const result = await createReviewQueueService({ execute }, { datasetVersion: "v2", now: () => new Date("2026-10-18T03:00:00Z") })
      .list("parent-1", learnerId);
    const vocabulary = result.queue[0]?.vocabulary;

    expect(vocabulary).toMatchObject({
      word: "about",
      partOfSpeech: "ADVERB",
      vietnamese: "quanh quẩn hoặc ở nhiều chỗ trong một khu vực gần đó",
      sourceMeaningVi: "ở quanh khu vực đó",
      definitionEn: "In various places within or near an area.",
      masterSenseIdentity: "about|ADVERB|sense-1",
      contentHash: "a".repeat(64),
      contentReviewStatus: "PASS",
      editorialStatus: "DRAFT"
    });
    expect(vocabulary?.examples).toEqual(row.examples);
    expect(vocabulary?.developmentMedia?.images).toEqual([image]);
    expect(vocabulary?.developmentMedia?.wordAudio).toEqual([wordAudio]);
    expect(vocabulary?.developmentMedia?.exampleAudio).toEqual([exampleAudio]);
    expect(vocabulary?.rightsStatus).toBe("UNKNOWN_REVIEW_REQUIRED");
  });

  it("restricts both saved due and new rows to this learner's saved vocabulary", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const rendered = new PgDialect().sqlToQuery(query);
      queries.push(rendered);
      if (queries.length === 1) return authorizedRows();
      if (rendered.sql.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (rendered.sql.includes("daily_new_word_limit")) return dailyUsageRow();
      if (rendered.sql.includes("next_review_date <=")) return { rows: [dueRow(7, 1)] };
      if (rendered.sql.includes("lp.vocabulary_id IS NULL")) return { rows: [newRow(9, 1)] };
      return { rows: [] };
    });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });

    const result = await service.list("parent-1", learnerId, undefined, "saved");

    expect(result.queue.map((entry) => [entry.vocabulary.id, entry.queueType])).toEqual([[7, "DUE"], [9, "NEW"]]);
    const dueQuery = queries.find(({ sql: statement }) => statement.includes("next_review_date <="))?.sql ?? "";
    const newQuery = queries.find(({ sql: statement }) => statement.includes("lp.vocabulary_id IS NULL"))?.sql ?? "";
    for (const statement of [dueQuery, newQuery]) {
      expect(statement).toContain('"vocabflow_app"."learner_saved_vocabulary"');
      expect(statement).toContain("saved.learner_id =");
      expect(statement).not.toContain('"vocabflow_app"."learner_learning_sets"');
    }
    expect(queries.some(({ params }) => params.includes(learnerId))).toBe(true);
  });

  it("returns every saved item for explicit saved-all and distinguishes due from voluntary practice", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn(async (query) => {
      const rendered = new PgDialect().sqlToQuery(query);
      queries.push(rendered);
      if (queries.length === 1) return authorizedRows();
      if (rendered.sql.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (rendered.sql.includes('"learner_saved_vocabulary" saved')) {
        return { rows: [
          { ...newRow(1, 4), status: "NEW", next_review_date: null, revision: 0 },
          { ...dueRow(2, 4, 3, "2026-09-14"), status: "LEARNING" },
          { ...dueRow(3, 4, 7, "2026-09-15"), status: "LEARNING" },
          { ...dueRow(4, 4, 12, "2026-10-01"), status: "MASTERED" }
        ] };
      }
      return { rows: [] };
    });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });

    const result = await service.list("parent-1", learnerId, undefined, "saved-all");

    expect(result.queue.map((entry) => [entry.vocabulary.id, entry.status, entry.queueType])).toEqual([
      [2, "LEARNING", "DUE"],
      [1, "NEW", "NEW"],
      [3, "LEARNING", "VOLUNTARY"],
      [4, "MASTERED", "VOLUNTARY"]
    ]);
    expect(result).toMatchObject({ dueCount: 1, newCount: 1 });
    expect(new Set(result.queue.map((entry) => entry.vocabulary.id)).size).toBe(4);
    expect(execute).toHaveBeenCalledTimes(3);
    const savedQuery = queries[2]?.sql ?? "";
    expect(savedQuery).toContain('FROM "vocabflow_app"."learner_saved_vocabulary" saved');
    expect(savedQuery).toContain("saved.learner_id =");
    expect(savedQuery).toContain('LEFT JOIN "vocabflow_app"."learner_progress"');
    expect(savedQuery).toContain("v.enabled = true");
    expect(savedQuery).not.toContain('"vocabflow_app"."learner_learning_sets"');
    expect(queries.some(({ params }) => params.includes(learnerId))).toBe(true);
  });

  it("resolves only Weak candidates server-side and keeps due separate from voluntary practice", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const weakCandidates = [
      {
        ...vocabularyRow(9), summary_review_count: 5, summary_remembered_count: 2,
        learning_state: "LEARNING", next_review_date: "2026-09-13", revision: 6,
        review_count: 3, remembered_count: 1, forgotten_count: 2
      },
      {
        ...vocabularyRow(4), summary_review_count: 5, summary_remembered_count: 2,
        learning_state: "MASTERED", next_review_date: "2026-09-20", revision: 8,
        review_count: 2, remembered_count: 0, forgotten_count: 2
      },
      {
        ...vocabularyRow(7), summary_review_count: 5, summary_remembered_count: 2,
        learning_state: "MASTERED", next_review_date: "2026-09-13", revision: 12,
        review_count: 4, remembered_count: 4, forgotten_count: 0
      }
    ];
    const execute = vi.fn(async (query) => {
      const rendered = new PgDialect().sqlToQuery(query);
      queries.push(rendered);
      if (queries.length === 1) return authorizedRows();
      if (rendered.sql.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (rendered.sql.includes("WITH eligible_vocabulary")) return { rows: weakCandidates };
      return { rows: [] };
    });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });

    const result = await service.list("parent-1", learnerId, undefined, "weak");

    expect(result).toMatchObject({ reviewDate: "2026-09-14", dueCount: 1, newCount: 0 });
    expect(result.queue.map(({ vocabulary, queueType, status }) => [vocabulary.id, queueType, status])).toEqual([
      [9, "DUE", "LEARNING"],
      [4, "VOLUNTARY", "MASTERED"]
    ]);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(queries[2]?.sql).toContain("review_events");
    expect(queries.every(({ sql: statement }) => !/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(statement))).toBe(true);
  });

  it("authorizes the learner, derives the household date, and returns due before sparse new", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const results: unknown[] = [
      authorizedRows(),
      { rows: [{ timezone: "America/Los_Angeles" }] },
      dailyUsageRow(),
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
    expect(queries).toHaveLength(5);
    expect(queries[2]?.sql).toContain("first_learned_date");
    expect(queries[3]?.sql).toContain("lp.learner_id = $1::uuid");
    expect(queries[3]?.sql).toContain("lp.next_review_date <= $2::date");
    expect(queries[3]?.sql).toContain("ORDER BY lp.next_review_date ASC, v.id ASC");
    expect(queries[3]?.sql).toContain("LIMIT 20");
    expect(queries[3]?.sql).toContain("COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese");
    expect(queries[3]?.sql).toContain("CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url");
    expect(queries[3]?.sql).toContain('"vocabflow_app"."learner_learning_sets"');
    expect(queries[3]?.sql).toContain("EXISTS");
    expect(queries[4]?.sql).toContain("LEFT JOIN \"vocabflow_app\".\"learner_progress\"");
    expect(queries[4]?.sql).toContain("lp.learner_id = $1::uuid");
    expect(queries[4]?.sql).toContain("lp.vocabulary_id IS NULL");
    expect(queries[4]?.sql).toContain("ORDER BY v.id ASC");
    expect(queries[4]?.sql).toContain("LIMIT 10");
    expect(queries[4]?.sql).toContain("COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese");
    expect(queries[4]?.sql).toContain("CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url");
    expect(queries[4]?.sql).toContain('"vocabflow_app"."learning_set_items"');
    expect(queries[4]?.sql).toContain("EXISTS");
  });

  it("runs the three reads independent of the household date concurrently without adding queries", async () => {
    let activeQueries = 0;
    let maximumConcurrentQueries = 0;
    const execute = vi.fn(async (query) => {
      const { sql: statement } = new PgDialect().sqlToQuery(query);
      activeQueries += 1;
      maximumConcurrentQueries = Math.max(maximumConcurrentQueries, activeQueries);
      try {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (statement.includes("SELECT lp.id::text AS learner_id")) return authorizedRows();
        if (statement.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
        if (statement.includes("daily_new_word_limit")) return dailyUsageRow();
        if (statement.includes("next_review_date <=")) return { rows: [dueRow(2, 1)] };
        if (statement.includes("lp.vocabulary_id IS NULL")) return { rows: [newRow(3, 1)] };
        return { rows: [] };
      } finally {
        activeQueries -= 1;
      }
    });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });

    const response = await service.list("parent-1", learnerId);

    expect(execute).toHaveBeenCalledTimes(5);
    expect(maximumConcurrentQueries).toBe(3);
    expect(response.queue.map((item) => [item.vocabulary.id, item.queueType])).toEqual([[2, "DUE"], [3, "NEW"]]);
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

  it("allows NEW at 36 due based on remaining hard quota, not Daily Goals", async () => {
    const statements: string[] = [];
    const due = Array.from({ length: 20 }, (_, index) => dueRow(index + 1, 36));
    const availableNew = Array.from({ length: 10 }, (_, index) => newRow(index + 100, 10));
    const execute = vi.fn(async (query) => {
      const { sql: statement } = new PgDialect().sqlToQuery(query);
      statements.push(statement);
      if (statements.length === 1) return authorizedRows();
      if (statement.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (statement.includes("daily_new_word_limit")) return dailyUsageRow(10, 5);
      if (statement.includes("next_review_date <=")) return { rows: due };
      if (statement.includes("lp.vocabulary_id IS NULL")) return { rows: availableNew };
      return { rows: [] };
    });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });

    const result = await service.list("parent-1", learnerId);
    expect(result.dueCount).toBe(36);
    expect(result.newCount).toBe(10);
    expect(result.queue).toHaveLength(25);
    expect(result.queue.slice(0, 20).every((item) => item.queueType === "DUE")).toBe(true);
    expect(result.queue.slice(20).map((item) => item.vocabulary.id)).toEqual([100, 101, 102, 103, 104]);
    const dailyUsageQuery = statements.find((statement) => statement.includes("daily_new_word_limit")) ?? "";
    expect(dailyUsageQuery).not.toContain("daily_new_word_goal");
    expect(dailyUsageQuery).not.toContain("daily_review_word_goal");
  });

  it("treats an empty progress result as virtual NEW and rejects malformed canonical rows safely", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(dailyUsageRow())
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [newRow(1, 1)] });
    const service = createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") });
    const result = await service.list("parent-1", learnerId);
    expect(result.queue[0]).toMatchObject({ queueType: "NEW", status: "NEW", nextReviewDate: null, expectedRevision: 0 });

    const malformed = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(dailyUsageRow())
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

  it("limits NEW rows by the remaining daily allowance while preserving the eligible count", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(dailyUsageRow(10, 6))
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [newRow(1, 5), newRow(2, 5), newRow(3, 5), newRow(4, 5), newRow(5, 5)] });

    const result = await createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") }).list("parent-1", learnerId);
    expect(result.newCount).toBe(5);
    expect(result.queue.filter((item) => item.queueType === "NEW").map((item) => item.vocabulary.id)).toEqual([1, 2, 3, 4]);
  });

  it("keeps due Review available with zero New quota and does not read the Review Goal", async () => {
    const statements: string[] = [];
    const execute = vi.fn(async (query) => {
      const { sql: statement } = new PgDialect().sqlToQuery(query);
      statements.push(statement);
      if (statements.length === 1) return authorizedRows();
      if (statement.includes("SELECT timezone")) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      if (statement.includes("daily_new_word_limit")) return dailyUsageRow(0, 0);
      if (statement.includes("next_review_date <=")) return { rows: [dueRow(1, 1)] };
      if (statement.includes("lp.vocabulary_id IS NULL")) return { rows: [newRow(2, 4)] };
      return { rows: [] };
    });

    const result = await createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") }).list("parent-1", learnerId);
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0]).toMatchObject({ queueType: "DUE", vocabulary: { id: 1 } });
    const dailyUsageQuery = statements.find((statement) => statement.includes("daily_new_word_limit")) ?? "";
    expect(dailyUsageQuery).not.toContain("daily_review_word_goal");
  });

  it("returns no NEW once the hard daily limit is reached but still returns due Review", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(dailyUsageRow(10, 10))
      .mockResolvedValueOnce({ rows: [dueRow(1, 1)] })
      .mockResolvedValueOnce({ rows: [newRow(2, 4)] });

    const result = await createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") }).list("parent-1", learnerId);

    expect(result.newCount).toBe(4);
    expect(result.queue.map((item) => item.queueType)).toEqual(["DUE"]);
  });

  it("safely processes rows with backfilled provenance metadata in developmentMedia without failing validation", async () => {
    const backfilledImage = {
      url: "https://res.cloudinary.com/vocabflow/image/authenticated/s--Abc_1234--/v1/Vocab/v2/images/7de12dcbb731044f09520cceda680268658817fe7cc674f948e6cae2b4471f50.jpg",
      mediaSha256: "7de12dcbb731044f09520cceda680268658817fe7cc674f948e6cae2b4471f50",
      mimeType: "image/jpeg",
      sourceNoteIdentity: "1556384730998:ie!<.B&L!>",
      reviewStatus: "PROPOSED",
      rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
      mappingKey: "829af1fa34c78b07424868f31f988faa1800f144f6b441789bd848b8145560d4",
      sourceNoteId: "1556384730998",
      sourceNoteGuid: "ie!<.B&L!>",
      sourceRecordEvidenceSha256: "7f07bfb8ca19b888b8a5b01397036f974876b2ede924b80759a77418bad82f2b",
      sourceFilename: "11_0201.jpg",
      byteLength: 21303,
      targetProposalKey: "EDITORIAL_2H2K:advertise:public-promotion",
      targetContentSha256: "97cd1480cfe0b61a97834aab14ec002f6542ed3e32d3fcae85ccdda30b2feb77",
      mappingConfidence: 0.718,
      mappingEvidence: "{}",
      visualReview: "NOT_PERFORMED",
      provider: "CLOUDINARY",
      publicId: "Vocab/v2/images/7de12dcbb731044f09520cceda680268658817fe7cc674f948e6cae2b4471f50",
      resourceType: "image",
      deliveryType: "authenticated",
      sourceApkgSha256: "495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b",
      sourceMappingBundleSha256: "7bb52fbae0e329b00b8d1713e2959c888bc2cc5b82496403682a3d1dd213c068"
    };
    const row = {
      ...newRow(30830, 1),
      word: "advertise",
      master_sense_identity: "EDITORIAL_2H2K:advertise:public-promotion",
      content_sha256: "97cd1480cfe0b61a97834aab14ec002f6542ed3e32d3fcae85ccdda30b2feb77",
      content_review_decision: "PASS",
      editorial_status: "DRAFT",
      rights_status: "UNKNOWN_REVIEW_REQUIRED",
      development_media: { images: [backfilledImage] }
    };
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ timezone: "Asia/Ho_Chi_Minh" }] })
      .mockResolvedValueOnce(dailyUsageRow(10, 0))
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] });

    const result = await createReviewQueueService({ execute }, { now: () => new Date("2026-09-14T03:00:00.000Z") }).list("parent-1", learnerId);
    expect(result.newCount).toBe(1);
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0]?.vocabulary.id).toBe(30830);
  });
});
