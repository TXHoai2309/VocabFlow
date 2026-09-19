import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import {
  createLearnerSettingsService,
  LearnerSettingsServiceError,
  parseLearnerSettingsRequest
} from "./learner-settings";

const learnerId = "00000000-0000-4000-8000-000000000010";
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
      get: vi.fn(async () => ({ learnerId, dailyNewWordLimit: 10 })),
      update: vi.fn(async () => ({ learnerId, dailyNewWordLimit: 5 }))
    };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learnerSettingsService: service });

    const current = await app.request(`http://localhost/api/learners/${learnerId}/settings`);
    expect(current.status).toBe(200);
    expect(await current.json()).toEqual({ learnerId, dailyNewWordLimit: 10 });

    const updated = await app.request(`http://localhost/api/learners/${learnerId}/settings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dailyNewWordLimit: 5 })
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ learnerId, dailyNewWordLimit: 5 });
    expect(service.update).toHaveBeenCalledWith("parent-1", learnerId, { dailyNewWordLimit: 5 });
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
    expect(parseLearnerSettingsRequest({ dailyNewWordLimit: 0 })).toBe(0);
    expect(parseLearnerSettingsRequest({ dailyNewWordLimit: 100 })).toBe(100);
    expect(() => parseLearnerSettingsRequest({ dailyNewWordLimit: -1 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordLimit: 101 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordLimit: 1.5 })).toThrow("INVALID_REQUEST");
    expect(() => parseLearnerSettingsRequest({ dailyNewWordLimit: "10" })).toThrow("INVALID_REQUEST");
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
        return { rows: [{ learner_id: learnerId, daily_new_word_limit: 10 }] };
      })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return authorizedRows();
      })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{ learner_id: learnerId, daily_new_word_limit: 5 }] };
      });
    const service = createLearnerSettingsService({ execute });

    await expect(service.get("parent-1", learnerId)).resolves.toEqual({ learnerId, dailyNewWordLimit: 10 });
    await expect(service.update("parent-1", learnerId, { dailyNewWordLimit: 5 })).resolves.toEqual({ learnerId, dailyNewWordLimit: 5 });
    expect(queries[1]?.sql).toContain("daily_new_word_limit");
    expect(queries[3]?.sql).toContain("UPDATE");
    expect(queries.map((query) => query.sql).join(" ")).not.toContain("parent-1");
  });
});
