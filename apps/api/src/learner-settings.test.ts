import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import {
  createLearnerSettingsService,
  LearnerSettingsServiceError,
  parseLearnerSettingsRequest
} from "./learner-settings";

const learnerId = "00000000-0000-4000-8000-000000000010";
const learnerBId = "00000000-0000-4000-8000-000000000011";
const householdId = "00000000-0000-4000-8000-000000000001";

function authorizedRows() {
  return { rows: [{ learner_id: learnerId, household_id: householdId }] };
}

describe("US-30 learner settings API", () => {
  it("requires authentication before invoking settings", async () => {
    const service = { get: vi.fn(), update: vi.fn() };
    const app = createApp({ readSession: async () => null, learnerSettingsService: service });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/settings`);
    expect(response.status).toBe(401);
    expect(service.get).not.toHaveBeenCalled();
  });

  it("returns and updates the canonical setting for an owned learner", async () => {
    const service = {
      get: vi.fn(async () => ({ learnerId, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 })),
      update: vi.fn(async () => ({ learnerId, dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 15 }))
    };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerSettingsService: service });

    const current = await app.request(`http://localhost/api/learners/${learnerId}/settings`);
    expect(current.status).toBe(200);
    expect(await current.json()).toEqual({ learnerId, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 });

    const updated = await app.request(`http://localhost/api/learners/${learnerId}/settings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 15 })
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ learnerId, dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 15 });
    expect(service.update).toHaveBeenCalledWith("parent-1", learnerId, { dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 15 });
  });

  it("maps foreign learner access to 403 and malformed settings to 400", async () => {
    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      learnerSettingsService: {
        get: vi.fn(async () => { throw new LearnerSettingsServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }),
        update: vi.fn()
      }
    });
    const deniedResponse = await denied.request(`http://localhost/api/learners/${learnerId}/settings`);
    expect(deniedResponse.status).toBe(403);

    const invalid = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      learnerSettingsService: {
        get: vi.fn(),
        update: vi.fn(async () => { throw new LearnerSettingsServiceError("INVALID_REQUEST", 400); })
      }
    });
    const invalidResponse = await invalid.request(`http://localhost/api/learners/${learnerId}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ dailyNewWordLimit: -1 })
    });
    expect(invalidResponse.status).toBe(400);
  });
});

describe("US-30 learner settings service", () => {
  it("accepts the bounded integer contract and rejects unsafe values", () => {
    expect(parseLearnerSettingsRequest({ dailyNewWordLimit: 0 })).toEqual({ dailyNewWordLimit: 0 });
    expect(parseLearnerSettingsRequest({ dailyNewWordGoal: 1 })).toEqual({ dailyNewWordGoal: 1 });
    expect(parseLearnerSettingsRequest({ dailyNewWordGoal: 100 })).toEqual({ dailyNewWordGoal: 100 });
    expect(parseLearnerSettingsRequest({ dailyReviewWordGoal: 20 })).toEqual({ dailyReviewWordGoal: 20 });
    expect(() => parseLearnerSettingsRequest({ dailyNewWordLimit: -1 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordLimit: 101 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordLimit: 1.5 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordLimit: "10" })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordGoal: 0 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordGoal: -1 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordGoal: 101 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordGoal: "" })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyReviewWordGoal: 0 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyReviewWordGoal: -1 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyReviewWordGoal: 101 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyReviewWordGoal: 1.5 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyReviewWordGoal: "" })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyReviewWordGoal: Number.NaN })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({})).toThrow("INVALID_REQUEST");
  });

  it("reads and writes only through the authorized learner scope", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return authorizedRows();
      })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{ learner_id: learnerId, daily_new_word_limit: 10, daily_new_word_goal: 10, daily_review_word_goal: 20 }] };
      })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return authorizedRows();
      })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{ learner_id: learnerId, daily_new_word_limit: 5, daily_new_word_goal: 5, daily_review_word_goal: 15 }] };
      });
    const service = createLearnerSettingsService({ execute });

    await expect(service.get("parent-1", learnerId)).resolves.toEqual({ learnerId, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 });
    await expect(service.update("parent-1", learnerId, { dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 15 })).resolves.toEqual({ learnerId, dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 15 });
    expect(queries[1]?.sql).toContain("daily_new_word_limit");
    expect(queries[1]?.sql).toContain("daily_new_word_goal");
    expect(queries[1]?.sql).toContain("daily_review_word_goal");
    expect(queries[3]?.sql).toContain("UPDATE");
    expect(queries[3]?.sql).toContain("daily_new_word_goal");
    expect(queries[3]?.sql).toContain("daily_review_word_goal");
    expect(queries.map((query) => query.sql).join(" ")).not.toContain("parent-1");
  });

  it("returns independent saved goals for learners in the same household", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ learner_id: learnerId, household_id: householdId }] })
      .mockResolvedValueOnce({ rows: [{ learner_id: learnerId, daily_new_word_limit: 10, daily_new_word_goal: 10, daily_review_word_goal: 20 }] })
      .mockResolvedValueOnce({ rows: [{ learner_id: learnerBId, household_id: householdId }] })
      .mockResolvedValueOnce({ rows: [{ learner_id: learnerBId, daily_new_word_limit: 5, daily_new_word_goal: 5, daily_review_word_goal: 10 }] });
    const service = createLearnerSettingsService({ execute });

    await expect(service.get("parent-1", learnerId)).resolves.toEqual({
      learnerId, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20
    });
    await expect(service.get("parent-1", learnerBId)).resolves.toEqual({
      learnerId: learnerBId, dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 10
    });
  });
});
