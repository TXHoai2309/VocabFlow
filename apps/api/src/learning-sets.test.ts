import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index";
import { createLearningSetService, LearningSetServiceError } from "./learning-sets";

const learnerId = "00000000-0000-4000-8000-000000000010";
const householdId = "00000000-0000-4000-8000-000000000001";

const summaryRow = {
  id: 1,
  slug: "starter-vocabulary",
  name: "VocabFlow Starter",
  description: "Starter words.",
  grade: null,
  enabled: true,
  sort_order: 10,
  vocabulary_count: "2"
};

const vocabularyRow = (id: number) => ({
  id,
  word: id === 1 ? "apple" : "book",
  ipa: null,
  vietnamese: id === 1 ? "quả táo" : "sách",
  definition_en: null,
  example_en: null,
  image_url: null,
  audio_url: null,
  topic: null,
  level: null,
  enabled: true,
  content_version: 1,
  sort_order: id - 1
});

function authorizedRows() {
  return { rows: [{ learner_id: learnerId, household_id: householdId }] };
}

describe("US-28/29 learning set API boundary", () => {
  it("requires authentication for the catalog and assignment routes", async () => {
    const service = {
      list: vi.fn(), detail: vi.fn(), listForLearner: vi.fn(), assign: vi.fn(), unassign: vi.fn()
    };
    const app = createApp({ readSession: async () => null, learningSetService: service });
    expect((await app.request("http://localhost/api/learning-sets")).status).toBe(401);
    expect((await app.request(`http://localhost/api/learners/${learnerId}/learning-sets`)).status).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
    expect(service.listForLearner).not.toHaveBeenCalled();
  });

  it("lists and details learning sets through the canonical service", async () => {
    const detail = { id: 1, slug: "starter-vocabulary", name: "VocabFlow Starter", description: "Starter words.", grade: null, enabled: true, sortOrder: 10, vocabularyCount: 2, items: [{ sortOrder: 0, vocabulary: {
      id: 1, word: "apple", ipa: null, vietnamese: "quả táo", definitionEn: null,
      exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1
    } }] };
    const service = {
      list: vi.fn(async () => [{ id: 1, slug: "starter-vocabulary", name: "VocabFlow Starter", description: "Starter words.", grade: null, enabled: true, sortOrder: 10, vocabularyCount: 1 }]),
      detail: vi.fn(async () => detail), listForLearner: vi.fn(), assign: vi.fn(), unassign: vi.fn()
    };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learningSetService: service });
    const list = await app.request("http://localhost/api/learning-sets");
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual({ learningSets: [expect.objectContaining({ slug: "starter-vocabulary" })] });
    const response = await app.request("http://localhost/api/learning-sets/1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ learningSet: detail });
    expect(service.detail).toHaveBeenCalledWith("parent-1", 1);
  });

  it("validates set ids and maps unavailable sets to 404", async () => {
    const service = { list: vi.fn(), detail: vi.fn(async () => { throw new LearningSetServiceError("LEARNING_SET_NOT_FOUND", 404); }), listForLearner: vi.fn(), assign: vi.fn(), unassign: vi.fn() };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learningSetService: service });
    expect((await app.request("http://localhost/api/learning-sets/nope")).status).toBe(400);
    const missing = await app.request("http://localhost/api/learning-sets/999");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: { code: "LEARNING_SET_NOT_FOUND", message: "Learning set không khả dụng." } });
  });

  it("keeps assignment mutations learner-scoped and idempotent", async () => {
    const result = { learnerId, learningSetId: 1, active: true };
    const service = {
      list: vi.fn(), detail: vi.fn(), listForLearner: vi.fn(async () => []),
      assign: vi.fn(async () => result), unassign: vi.fn(async () => ({ ...result, active: false }))
    };
    const app = createApp({ readSession: async () => ({ user: { id: "parent-1" } }), learningSetService: service });
    const list = await app.request(`http://localhost/api/learners/${learnerId}/learning-sets`);
    expect(list.status).toBe(200);
    const assigned = await app.request(`http://localhost/api/learners/${learnerId}/learning-sets/1`, { method: "PUT" });
    expect(assigned.status).toBe(200);
    expect(await assigned.json()).toEqual(result);
    const unassigned = await app.request(`http://localhost/api/learners/${learnerId}/learning-sets/1`, { method: "DELETE" });
    expect(unassigned.status).toBe(200);
    expect(service.assign).toHaveBeenCalledWith("parent-1", learnerId, 1);
    expect(service.unassign).toHaveBeenCalledWith("parent-1", learnerId, 1);
  });
});

describe("US-28/29 learning set service", () => {
  it("returns ordered catalog detail and enabled vocabulary only", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [{ household_id: householdId }] })
      .mockResolvedValueOnce({ rows: [summaryRow] })
      .mockResolvedValueOnce({ rows: [vocabularyRow(1), vocabularyRow(2)] });
    const service = createLearningSetService({ execute });
    await expect(service.detail("parent-1", 1)).resolves.toMatchObject({
      slug: "starter-vocabulary",
      items: [{ sortOrder: 0, vocabulary: { id: 1 } }, { sortOrder: 1, vocabulary: { id: 2 } }]
    });
  });

  it("returns active assignment state for every enabled set", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [{ ...summaryRow, active: true }] });
    await expect(createLearningSetService({ execute }).listForLearner("parent-1", learnerId)).resolves.toEqual([{
      learningSet: expect.objectContaining({ slug: "starter-vocabulary" }),
      active: true
    }]);
  });

  it("blocks cross-household access before reading or mutating assignment rows", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const service = createLearningSetService({ execute });
    await expect(service.listForLearner("outsider", learnerId)).rejects.toMatchObject({ code: "HOUSEHOLD_ACCESS_DENIED", status: 403 });
    await expect(service.assign("outsider", learnerId, 1)).rejects.toMatchObject({ code: "HOUSEHOLD_ACCESS_DENIED", status: 403 });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("uses an upsert for reassign and deletes only the assignment row on unassign", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [summaryRow] })
      .mockResolvedValueOnce({ rows: [{ learner_id: learnerId, learning_set_id: 1, active: true }] })
      .mockResolvedValueOnce(authorizedRows())
      .mockResolvedValueOnce({ rows: [summaryRow] })
      .mockResolvedValueOnce({ rows: [] });
    const service = createLearningSetService({ execute });
    await expect(service.assign("parent-1", learnerId, 1)).resolves.toEqual({ learnerId, learningSetId: 1, active: true });
    await expect(service.unassign("parent-1", learnerId, 1)).resolves.toEqual({ learnerId, learningSetId: 1, active: false });
  });
});
