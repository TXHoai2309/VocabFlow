import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createContinueLearningService, ContinueLearningServiceError } from "./continue-learning";

const learnerId = "00000000-0000-4000-8000-000000000010";
const householdId = "00000000-0000-4000-8000-000000000001";

function authorized() {
  return { rows: [{ learner_id: learnerId, household_id: householdId }] };
}

describe("continue learning read model", () => {
  it("requires an authenticated household member and rejects unexpected query parameters", async () => {
    const service = { get: vi.fn() };
    const app = createApp({ readSession: async () => null, continueLearningService: service });
    expect((await app.request(`http://localhost/api/learners/${learnerId}/continue-learning`)).status).toBe(401);
    expect(service.get).not.toHaveBeenCalled();

    const authenticated = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      continueLearningService: service
    });
    expect((await authenticated.request(`http://localhost/api/learners/${learnerId}/continue-learning?scope=topic`)).status).toBe(400);
    expect(service.get).not.toHaveBeenCalled();
  });

  it("maps cross-household service errors to 403 without leaking details", async () => {
    const app = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      continueLearningService: { get: vi.fn(async () => { throw new ContinueLearningServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }) }
    });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/continue-learning`);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "HOUSEHOLD_ACCESS_DENIED" } });
  });

  it("serves a validated learner summary without exposing a vocabulary list", async () => {
    const candidate = {
      scope: "LEARNING_SET" as const,
      scopeId: 7,
      title: "Bộ từ Food",
      totalCount: 20,
      learnedCount: 6,
      progressPercent: 30,
      lastActivityAt: "2026-10-02T04:30:00.000Z"
    };
    const app = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      continueLearningService: { get: vi.fn(async () => ({ learnerId, candidate })) }
    });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/continue-learning`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ learnerId, candidate });
  });

  it.each([
    ["LEARNING_SET", 7, "Bộ từ Food", "20", "6", "2026-10-02T04:30:00.000Z", 30],
    ["TOPIC", 3, "Food", "20", "11", "2026-10-02T04:30:00.000Z", 55],
    ["SAVED", null, "Từ đã lưu", "10", "2", null, 20]
  ] as const)("returns scoped progress for %s candidates with review-event recency", async (scope, scopeId, title, total, learned, lastActivityAt, percent) => {
    const queries: string[] = [];
    const database = { execute: vi.fn(async (query) => {
      queries.push(new PgDialect().sqlToQuery(query).sql);
      if (queries.length === 1) return authorized();
      return { rows: [{ scope, scope_id: scopeId, title, total_count: total, learned_count: learned, last_activity_at: lastActivityAt }] };
    }) };

    const result = await createContinueLearningService(database).get("parent-1", learnerId);
    expect(result).toEqual({
      learnerId,
      candidate: {
        scope,
        scopeId,
        title,
        totalCount: Number(total),
        learnedCount: Number(learned),
        progressPercent: percent,
        lastActivityAt
      }
    });
    expect(queries).toHaveLength(2);
    const aggregate = queries[1] ?? "";
    expect(aggregate).toContain('"vocabflow_app"."learner_learning_sets"');
    expect(aggregate).toContain('"vocabflow_app"."learner_saved_vocabulary"');
    expect(aggregate).toContain('"vocabflow_app"."vocabulary_topics"');
    expect(aggregate).toContain('"vocabflow_app"."review_events"');
    expect(aggregate).toContain("lls.active = true");
    expect(aggregate).toContain("ls.enabled = true");
    expect(aggregate).toContain("t.enabled = true");
    expect(aggregate).toContain("v.enabled = true");
    expect(aggregate).toContain("lsv.learner_id =");
    expect(aggregate).toContain("JOIN eligible_vocabulary ev ON ev.vocabulary_id = vt.vocabulary_id");
    expect(aggregate).toContain("MAX(re.reviewed_at) AS last_activity_at");
    expect(aggregate).toContain("collection_vocabulary AS (");
    expect(aggregate).toContain("latest_review_by_vocabulary AS (");
    expect(aggregate).toContain("JOIN collection_vocabulary cv ON cv.vocabulary_id = re.vocabulary_id");
    expect(aggregate).toContain("GROUP BY re.vocabulary_id");
    expect(aggregate).toContain("LEFT JOIN latest_review_by_vocabulary lr ON lr.vocabulary_id = cm.vocabulary_id");
    expect(aggregate).not.toContain('LEFT JOIN "vocabflow_app"."review_events" re');
    expect(aggregate).toContain("lp.status::text IN ('LEARNING', 'MASTERED')");
    expect(aggregate).toContain("COUNT(DISTINCT cm.vocabulary_id)");
    expect(aggregate).toContain("WHERE learned_count > 0 AND learned_count < total_count");
    expect(aggregate).toContain("ORDER BY last_activity_at DESC NULLS LAST");
    expect(aggregate).toContain("CASE scope WHEN 'LEARNING_SET' THEN 0 WHEN 'TOPIC' THEN 1 ELSE 2 END ASC");
    expect(aggregate).toContain("scope_order ASC");
    expect(aggregate).toContain("scope_id ASC NULLS LAST");
    expect(aggregate.trimStart()).toMatch(/^WITH/);
    expect(queries.every((query) => /^\s*(SELECT|WITH)/i.test(query))).toBe(true);
  });

  it("does not produce a candidate when every collection is untouched or complete", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorized())
      .mockResolvedValueOnce({ rows: [] });
    await expect(createContinueLearningService({ execute }).get("parent-1", learnerId))
      .resolves.toEqual({ learnerId, candidate: null });
  });

  it("counts a Topic only over the enabled active-set intersection", async () => {
    const queries: string[] = [];
    const database = { execute: vi.fn(async (query) => {
      queries.push(new PgDialect().sqlToQuery(query).sql);
      if (queries.length === 1) return authorized();
      // Fixture: the Topic has 23 enabled words, 5 overlap active Sets, and 3 of those 5 are learned.
      return { rows: [{ scope: "TOPIC", scope_id: 8, title: "Food", total_count: "5", learned_count: "3", last_activity_at: null }] };
    }) };

    const result = await createContinueLearningService(database).get("parent-1", learnerId);
    expect(result.candidate).toMatchObject({
      scope: "TOPIC", scopeId: 8, title: "Food", totalCount: 5, learnedCount: 3, progressPercent: 60
    });
    const aggregate = queries[1] ?? "";
    expect(aggregate).toContain("JOIN eligible_vocabulary ev ON ev.vocabulary_id = vt.vocabulary_id");
    expect(aggregate).toContain("WHERE learned_count > 0 AND learned_count < total_count");
  });

  it.each(["untouched active subset", "complete active subset"])(
    "does not select a Topic based on learned vocabulary outside its %s",
    async () => {
      const queries: string[] = [];
      const execute = vi.fn(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query).sql);
        if (queries.length === 1) return authorized();
        // Any LEARNING/MASTERED rows outside active Sets are excluded by the membership join.
        return { rows: [] };
      });
      await expect(createContinueLearningService({ execute }).get("parent-1", learnerId))
        .resolves.toEqual({ learnerId, candidate: null });
      const aggregate = queries[1] ?? "";
      expect(aggregate).toContain("JOIN eligible_vocabulary ev ON ev.vocabulary_id = vt.vocabulary_id");
      expect(aggregate).toContain("WHERE learned_count > 0 AND learned_count < total_count");
    }
  );

  it("returns only the most recent candidate selected by the server and computes rounded progress", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorized())
      .mockResolvedValueOnce({ rows: [{
        scope: "TOPIC", scope_id: "4", title: "School", total_count: "3", learned_count: "2",
        last_activity_at: new Date("2026-10-03T00:00:00.000Z")
      }] });
    const result = await createContinueLearningService({ execute }).get("parent-1", learnerId);
    expect(result.candidate).toMatchObject({
      scope: "TOPIC", scopeId: 4, title: "School", totalCount: 3, learnedCount: 2,
      progressPercent: 67, lastActivityAt: "2026-10-03T00:00:00.000Z"
    });
  });
});
