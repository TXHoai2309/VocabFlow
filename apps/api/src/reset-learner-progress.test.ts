import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import type { ResetLearnerProgressResponse } from "@vocabflow/contracts";
import { createApp } from "./index";
import {
  createResetLearnerProgressService,
  ResetLearnerProgressServiceError
} from "./reset-learner-progress";

const learnerId = "00000000-0000-4000-8000-000000000010";
const otherLearnerId = "00000000-0000-4000-8000-000000000011";
const householdId = "00000000-0000-4000-8000-000000000001";

function authorizedRows(id = learnerId, household = householdId) {
  return { rows: [{ learner_id: id, household_id: household }] };
}

describe("US-24 reset progress API boundary", () => {
  it("returns 401 before invoking the reset service", async () => {
    const service = { reset: vi.fn() };
    const app = createApp({ readSession: async () => null, resetLearnerProgressService: service });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/reset-progress`, { method: "POST" });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Đăng nhập để tiếp tục." } });
    expect(service.reset).not.toHaveBeenCalled();
  });

  it("returns the canonical reset response for the authenticated learner", async () => {
    const reset: ResetLearnerProgressResponse = { learnerId, deletedProgressCount: 3 };
    const service = { reset: vi.fn(async () => reset) };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), resetLearnerProgressService: service });
    const response = await app.request(`http://localhost/api/learners/${learnerId}/reset-progress`, { method: "POST" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(reset);
    expect(service.reset).toHaveBeenCalledWith("parent-1", learnerId);
  });

  it("maps authorization and database failures to safe errors", async () => {
    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      resetLearnerProgressService: {
        reset: vi.fn(async () => { throw new ResetLearnerProgressServiceError("HOUSEHOLD_ACCESS_DENIED", 403); })
      }
    });
    const deniedResponse = await denied.request(`http://localhost/api/learners/${learnerId}/reset-progress`, { method: "POST" });
    expect(deniedResponse.status).toBe(403);
    expect(await deniedResponse.json()).toEqual({
      error: { code: "HOUSEHOLD_ACCESS_DENIED", message: "Bạn không có quyền truy cập learner này." }
    });

    const failed = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      resetLearnerProgressService: { reset: vi.fn(async () => { throw new Error("database secret"); }) }
    });
    const failedResponse = await failed.request(`http://localhost/api/learners/${learnerId}/reset-progress`, { method: "POST" });
    const body = await failedResponse.text();
    expect(failedResponse.status).toBe(503);
    expect(body).toContain('"code":"INTERNAL_ERROR"');
    expect(body).not.toContain("database secret");
  });
});

describe("US-24 reset progress service", () => {
  it("deletes only the selected learner progress and preserves the history table", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ vocabulary_id: 1 }, { vocabulary_id: 2 }] });
    const service = createResetLearnerProgressService({
      execute: async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return execute();
      }
    });

    await expect(service.reset("parent-1", learnerId)).resolves.toEqual({
      learnerId,
      deletedProgressCount: 2
    });
    expect(queries).toHaveLength(2);
    expect(queries[0]?.sql).toContain("household_members");
    expect(queries[1]?.sql).toContain('DELETE FROM "vocabflow_app"."learner_progress"');
    expect(queries[1]?.sql).toContain("WHERE learner_id = $1::uuid");
    expect(queries[1]?.sql).toContain("RETURNING vocabulary_id");
    expect(queries[1]?.params).toEqual([learnerId]);
    expect(queries[1]?.sql).not.toContain("review_events");
    expect(queries[1]?.sql).not.toMatch(/DELETE\s+FROM[\s\S]+household/i);
  });

  it("is safe for zero progress and an idempotent repeat", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [] });
    const service = createResetLearnerProgressService({ execute });

    await expect(service.reset("parent-1", learnerId)).resolves.toEqual({ learnerId, deletedProgressCount: 0 });
    await expect(service.reset("parent-1", learnerId)).resolves.toEqual({ learnerId, deletedProgressCount: 0 });
  });

  it("denies a cross-household learner before executing the delete", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const service = createResetLearnerProgressService({ execute });

    await expect(service.reset("parent-1", otherLearnerId)).rejects.toMatchObject({
      code: "HOUSEHOLD_ACCESS_DENIED",
      status: 403
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the delete result is malformed or the database fails", async () => {
    const malformed = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ count: 2 });
    await expect(createResetLearnerProgressService({ execute: malformed }).reset("parent-1", learnerId))
      .rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 });

    const failed = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockRejectedValueOnce(new Error("secret database detail"));
    await expect(createResetLearnerProgressService({ execute: failed }).reset("parent-1", learnerId))
      .rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 });
  });
});
