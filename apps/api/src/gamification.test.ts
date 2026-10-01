import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createGamificationService, GamificationServiceError, XP_PER_LEVEL } from "./gamification";

const learnerId = "00000000-0000-4000-8000-000000000010";
const otherLearnerId = "00000000-0000-4000-8000-000000000011";
const householdId = "00000000-0000-4000-8000-000000000001";

function authorized(id = learnerId) {
  return { rows: [{ learner_id: id, household_id: householdId }] };
}

describe("US-39 + US-40 gamification API", () => {
  it("requires authentication and blocks cross-household reads", async () => {
    const service = { get: vi.fn() };
    expect((await createApp({ readSession: async () => null, gamificationService: service })
      .request(`http://localhost/api/learners/${learnerId}/gamification`)).status).toBe(401);

    const denied = createApp({
      readSession: async () => ({ user: { id: "parent-1" } }),
      gamificationService: { get: vi.fn(async () => { throw new GamificationServiceError("HOUSEHOLD_ACCESS_DENIED", 403); }) }
    });
    expect((await denied.request(`http://localhost/api/learners/${learnerId}/gamification`)).status).toBe(403);
  });

  it("derives learner-scoped XP, levels, and deterministic locked/unlocked achievement rows", async () => {
    const queries: string[] = [];
    const execute = vi.fn(async (query) => {
      queries.push(new PgDialect().sqlToQuery(query).sql);
      if (queries.length === 1) return authorized();
      if (queries.length === 2) return { rows: [] };
      if (queries.length === 3) return { rows: [{ total_xp: "250" }] };
      return { rows: [
        { code: "FIRST_REVIEW", name: "Bắt đầu học", description: "Hoàn thành lần ôn tập đầu tiên.", unlocked_at: "2026-09-21T00:00:00.000Z" },
        { code: "TEN_WORDS_LEARNED", name: "10 từ đã học", description: "Đã bắt đầu học ít nhất 10 từ.", unlocked_at: null }
      ] };
    });
    const response = await createGamificationService({ execute }).get("parent-1", learnerId);

    expect(response).toMatchObject({
      learnerId,
      xp: { total: 250, level: 3, xpIntoLevel: 50, xpPerLevel: 100, xpToNextLevel: 50 },
      achievements: [{ code: "FIRST_REVIEW", unlockedAt: "2026-09-21T00:00:00.000Z" }, { code: "TEN_WORDS_LEARNED", unlockedAt: null }]
    });
    expect(queries[1]).toContain('INSERT INTO "vocabflow_app"."learner_achievements"');
    expect(queries[1]).toContain("ON CONFLICT (learner_id, achievement_id) DO NOTHING");
    expect(queries[1]).toContain("longest_streak >= 7");
    expect(queries[2]).toContain('SUM(points)');
    expect(queries[3]).toContain('ORDER BY a.sort_order ASC, a.id ASC');
  });

  it("keeps Level 1 at zero XP and applies the 100-XP boundary", async () => {
    expect(XP_PER_LEVEL).toBe(100);
    const rows = (total_xp: string) => [authorized(), { rows: [] }, { rows: [{ total_xp }] }, { rows: [] }];
    for (const [total, level, into, next] of [["0", 1, 0, 100], ["99", 1, 99, 1], ["100", 2, 0, 100], ["200", 3, 0, 100]] as const) {
      const values = rows(total);
      const service = createGamificationService({ execute: vi.fn(async () => values.shift() ?? { rows: [] }) });
      await expect(service.get("parent-1", learnerId)).resolves.toMatchObject({ xp: { total: Number(total), level, xpIntoLevel: into, xpToNextLevel: next } });
    }
  });

  it("does not use another learner's rewards or achievements", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorized(otherLearnerId))
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_xp: "10" }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(createGamificationService({ execute }).get("parent-1", otherLearnerId)).resolves.toMatchObject({ learnerId: otherLearnerId, xp: { total: 10 } });
    const summaryQuery = new PgDialect().sqlToQuery(execute.mock.calls[2]?.[0]);
    expect(summaryQuery.params).toContain(otherLearnerId);
  });
});
