import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createTopicProgressService, TopicProgressServiceError } from "./topic-progress";

const learnerId = "00000000-0000-4000-8000-000000000010";
const householdId = "00000000-0000-4000-8000-000000000001";

describe("US-38 topic progress", () => {
  it("requires authentication and maps cross-household access to 403", async () => {
    const service = { get: vi.fn() };
    expect((await createApp({ readSession: async () => null, topicProgressService: service })
      .request(`http://localhost/api/learners/${learnerId}/topic-progress`)).status).toBe(401);
    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      topicProgressService: { get: vi.fn(async () => { throw new TopicProgressServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }) }
    });
    expect((await denied.request(`http://localhost/api/learners/${learnerId}/topic-progress`)).status).toBe(403);
  });

  it("derives topic states from unique eligible vocabulary in one query", async () => {
    const queries: string[] = [];
    const database = { execute: vi.fn(async (query) => {
      queries.push(new PgDialect().sqlToQuery(query).sql);
      if (queries.length === 1) return { rows: [{ learner_id: learnerId, household_id: householdId }] };
      if (queries.length === 2) return { rows: [{ timezone: "Asia/Ho_Chi_Minh" }] };
      return { rows: [
        { topic_id: 1, slug: "family", name: "Family", total: "3", new_count: "1", learning_count: "1", mastered_count: "1", due_count: "2" },
        { topic_id: 2, slug: "food", name: "Food", total: "0", new_count: "0", learning_count: "0", mastered_count: "0", due_count: "0" }
      ] };
    }) };
    const result = await createTopicProgressService(database, { now: () => new Date("2026-09-20T17:30:00.000Z") }).get("parent-1", learnerId);

    expect(result).toMatchObject({
      learnerId,
      localDate: "2026-09-21",
      topics: [
        { topicId: 1, total: 3, newCount: 1, learningCount: 1, masteredCount: 1, dueCount: 2 },
        { topicId: 2, total: 0, newCount: 0, learningCount: 0, masteredCount: 0, dueCount: 0 }
      ]
    });
    const aggregate = queries[2] ?? "";
    expect(aggregate).toContain("WITH eligible_vocabulary AS");
    expect(aggregate).toContain("SELECT DISTINCT lsi.vocabulary_id");
    expect(aggregate).toContain("lls.active = true");
    expect(aggregate).toContain("ls.enabled = true");
    expect(aggregate).toContain("v.enabled = true");
    expect(aggregate).toContain("lp.next_review_date <=");
    expect(aggregate).toContain("LEFT JOIN \"vocabflow_app\".\"vocabulary_topics\"");
  });
});
