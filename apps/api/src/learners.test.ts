import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { LearnerServiceError, authorizeLearnerOwnership, createLearnerService, requireLearnerOwnership } from "./learners";
import type { LearnerDto } from "@vocabflow/contracts";

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function appWithSession(session: { user: { id: string } } | null, service = {
  list: vi.fn(async () => [learner]),
  create: vi.fn(async () => learner),
  authorize: vi.fn()
}) {
  return createApp({
    readSession: async () => session,
    learnerService: service
  });
}

describe("US-03 learner API boundary", () => {
  it("returns 401 for learner list without a session", async () => {
    const service = { list: vi.fn(), create: vi.fn(), authorize: vi.fn() };
    const response = await appWithSession(null, service).request("http://localhost/api/learners");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Đăng nhập để tiếp tục." } });
    expect(service.list).not.toHaveBeenCalled();
  });

  it("lists learners from the authenticated household", async () => {
    const service = { list: vi.fn(async () => [learner]), create: vi.fn(), authorize: vi.fn() };
    const response = await appWithSession({ user: { id: "parent-1" } }, service).request("http://localhost/api/learners");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ learners: [learner] });
    expect(service.list).toHaveBeenCalledWith("parent-1");
  });

  it("returns an empty canonical list", async () => {
    const service = { list: vi.fn(async () => []), create: vi.fn(), authorize: vi.fn() };
    const response = await appWithSession({ user: { id: "parent-1" } }, service).request("http://localhost/api/learners");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ learners: [] });
  });

  it("returns 401 for create without a session", async () => {
    const service = { list: vi.fn(), create: vi.fn(), authorize: vi.fn() };
    const response = await appWithSession(null, service).request("http://localhost/api/learners", {
      method: "POST",
      body: JSON.stringify({ displayName: "An" })
    });
    expect(response.status).toBe(401);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("creates a learner from the session-owned household", async () => {
    const service = { list: vi.fn(), create: vi.fn(async () => learner), authorize: vi.fn() };
    const response = await appWithSession({ user: { id: "parent-1" } }, service).request("http://localhost/api/learners", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "An" })
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(learner);
    expect(service.create).toHaveBeenCalledWith("parent-1", { displayName: "An" });
  });

  it("maps strict extra fields to INVALID_REQUEST without leaking internals", async () => {
    const service = {
      list: vi.fn(),
      create: vi.fn(async () => { throw new LearnerServiceError("INVALID_REQUEST", 400); }),
      authorize: vi.fn()
    };
    const response = await appWithSession({ user: { id: "parent-1" } }, service).request("http://localhost/api/learners", {
      method: "POST",
      body: JSON.stringify({ displayName: "An", householdId: "attacker" })
    });
    expect(response.status).toBe(400);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ error: { code: "INVALID_REQUEST", message: "Dữ liệu gửi lên không hợp lệ." } });
    expect(body).not.toContain("attacker");
  });

  it("maps household authorization failures to safe 403", async () => {
    const service = {
      list: vi.fn(async () => { throw new LearnerServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }),
      create: vi.fn(),
      authorize: vi.fn()
    };
    const response = await appWithSession({ user: { id: "parent-1" } }, service).request("http://localhost/api/learners");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "HOUSEHOLD_ACCESS_DENIED", message: "Bạn không có quyền truy cập household này." } });
  });

  it("maps unexpected learner failures to a safe 503 without leaking internals", async () => {
    const service = {
      list: vi.fn(async () => { throw new Error("SQL connection secret"); }),
      create: vi.fn(),
      authorize: vi.fn()
    };
    const response = await appWithSession({ user: { id: "parent-1" } }, service).request("http://localhost/api/learners");
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain('"code":"INTERNAL_ERROR"');
    expect(body).not.toContain("SQL connection secret");
  });
});

describe("US-03 learner service", () => {
  it("resolves household membership server-side and returns deterministic DTOs", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: learner.householdId }] })
      .mockResolvedValueOnce({ rows: [{
        id: learner.id,
        household_id: learner.householdId,
        display_name: learner.displayName,
        avatar_key: null,
        enabled: true,
        created_at: learner.createdAt,
        updated_at: learner.updatedAt
      }] });
    const service = createLearnerService({ execute });
    await expect(service.list("parent-1")).resolves.toEqual([learner]);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("fails with household access denied when membership resolution is empty", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    await expect(createLearnerService({ execute }).list("parent-1")).rejects.toThrow("HOUSEHOLD_ACCESS_DENIED");
  });

  it("serializes household and learner relation values as typed binds", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{ household_id: learner.householdId }] };
      })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [] };
      });

    await expect(createLearnerService({ execute }).list("parent-1")).resolves.toEqual([]);
    expect(queries[0]?.sql).toContain("$1::text");
    expect(queries[0]?.sql).toContain("$2::text");
    expect(queries[1]?.sql).toContain("$1::uuid");
    expect(queries[1]?.params).toEqual([learner.householdId]);
    expect(queries.map((query) => query.sql).join(" ")).not.toContain("parent-1");
  });

  it("validates names and rejects household/learner/avatar fields", async () => {
    const service = createLearnerService({ execute: vi.fn() });
    await expect(service.create("parent-1", { displayName: "   " })).rejects.toThrow("LEARNER_DISPLAY_NAME_INVALID");
    await expect(service.create("parent-1", { displayName: "An", householdId: "attacker" })).rejects.toThrow("INVALID_REQUEST");
    await expect(service.create("parent-1", { displayName: "An", learnerId: learner.id })).rejects.toThrow("INVALID_REQUEST");
    await expect(service.create("parent-1", { displayName: "An", avatarKey: "preset" })).rejects.toThrow("INVALID_REQUEST");
  });

  it("returns ALLOW only when membership and learner household match", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ learner_id: learner.id, household_id: learner.householdId }] });
    await expect(authorizeLearnerOwnership({ execute }, "parent-1", learner.id)).resolves.toEqual({
      decision: "ALLOW",
      learnerId: learner.id,
      householdId: learner.householdId
    });
    execute.mockResolvedValue({ rows: [] });
    await expect(authorizeLearnerOwnership({ execute }, "parent-1", learner.id)).resolves.toEqual({ decision: "FORBIDDEN" });
    await expect(requireLearnerOwnership({ execute }, "parent-1", learner.id)).rejects.toMatchObject({
      code: "HOUSEHOLD_ACCESS_DENIED",
      status: 403
    });
  });

  it("rejects malformed learner identifiers without touching the database", async () => {
    const execute = vi.fn();
    await expect(authorizeLearnerOwnership({ execute }, "parent-1", "not-a-uuid")).resolves.toEqual({ decision: "FORBIDDEN" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("allows duplicate display names because no uniqueness policy is enforced", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: learner.householdId }] })
      .mockResolvedValueOnce({ rows: [{
        id: learner.id,
        household_id: learner.householdId,
        display_name: learner.displayName,
        avatar_key: null,
        enabled: true,
        created_at: learner.createdAt,
        updated_at: learner.updatedAt
      }] })
      .mockResolvedValueOnce({ rows: [{ household_id: learner.householdId }] })
      .mockResolvedValueOnce({ rows: [{
        id: "00000000-0000-4000-8000-000000000011",
        household_id: learner.householdId,
        display_name: learner.displayName,
        avatar_key: null,
        enabled: true,
        created_at: learner.createdAt,
        updated_at: learner.updatedAt
      }] });
    const service = createLearnerService({ execute });
    await expect(service.create("parent-1", { displayName: "An" })).resolves.toMatchObject({ displayName: "An" });
    await expect(service.create("parent-1", { displayName: "An" })).resolves.toMatchObject({ displayName: "An" });
  });

  it("assigns the compatibility starter set in the canonical create statement", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: learner.householdId }] })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{
          id: learner.id,
          household_id: learner.householdId,
          display_name: learner.displayName,
          avatar_key: null,
          enabled: true,
          created_at: learner.createdAt,
          updated_at: learner.updatedAt
        }] };
      });
    await expect(createLearnerService({ execute }).create("parent-1", { displayName: "An" })).resolves.toMatchObject({ id: learner.id });
    expect(queries[0]?.sql).toContain('"learner_learning_sets"');
    expect(queries[0]?.sql).toContain("starter-vocabulary");
    expect(queries[0]?.sql).toContain("ON CONFLICT");
  });

  it("creates a learner with default daily goals without requiring goal input", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: learner.householdId }] })
      .mockImplementationOnce(async (query) => {
        queries.push(new PgDialect().sqlToQuery(query));
        return { rows: [{
          id: learner.id,
          household_id: learner.householdId,
          display_name: learner.displayName,
          avatar_key: null,
          enabled: true,
          created_at: learner.createdAt,
          updated_at: learner.updatedAt
        }] };
      });

    await expect(createLearnerService({ execute }).create("parent-1", { displayName: "An" })).resolves.toMatchObject({ id: learner.id });
    expect(queries[0]?.sql).toContain("daily_new_word_goal");
    expect(queries[0]?.sql).toContain("daily_review_word_goal");
    expect(queries[0]?.params).toContain(10);
    expect(queries[0]?.params).toContain(20);
  });
});
