import { describe, it, expect, vi } from "vitest";
import { createApp } from "./index";
import { readPublicLearningCatalog } from "./public-learning-catalog";

describe("public learning content boundary", () => {
  it("serves content without reading or provisioning a session", async () => {
    const readSession = vi.fn().mockResolvedValue(null);
    const app = createApp({ readSession, publicLearningCatalog: async () => ({ vocabulary: [], learningSets: [], topics: [] }) });
    const response = await app.request("/api/public/learning-catalog");
    expect(response.status).toBe(200); expect(readSession).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ vocabulary: [], learningSets: [], topics: [] });
    expect((await app.request("/api/learners/00000000-0000-4000-8000-000000000058/progress-summary")).status).toBe(401);
    expect((await app.request("/api/reviews", { method: "POST", body: "{}" })).status).toBe(401);
  });
  it("rejects public query parameters and returns a safe failure", async () => {
    const app = createApp({ publicLearningCatalog: async () => { throw new Error("private connection detail"); } });
    expect((await app.request("/api/public/learning-catalog?learnerId=private")).status).toBe(400);
    const response = await app.request("/api/public/learning-catalog");
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private connection");
  });
  it("applies public media withholding even on an unconfigured local runtime", async () => {
    const app = createApp({ publicLearningCatalog: async () => ({ vocabulary: [{
      id: 1, word: "hello", vietnamese: "xin chào", ipa: null, definitionEn: null, exampleEn: null,
      imageUrl: "https://example.com/internal-image", audioUrl: "https://example.com/internal-audio",
      topic: null, level: null, enabled: true, contentVersion: 1, masterSenseIdentity: "private-sense",
      developmentMedia: {}
    }], learningSets: [], topics: [] }) });
    const response = await app.request("/api/public/learning-catalog");
    const body = await response.json() as { vocabulary: Record<string, unknown>[] };
    expect(body.vocabulary[0]?.imageUrl).toBeNull();
    expect(body.vocabulary[0]?.audioUrl).toBeNull();
    expect(body.vocabulary[0]).not.toHaveProperty("developmentMedia");
    expect(response.headers.get("Cache-Control")).toContain("public");
  });
  it("reads enabled catalog queries only, filtering membership through enabled dataset IDs", async () => {
    const execute = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: 1, slug: "disabled-content", name: "Excluded", description: "Excluded", grade: null, sort_order: 0, vocabulary_ids: [999] }
    ]).mockResolvedValueOnce([]);
    expect(await readPublicLearningCatalog({ execute }, "legacy")).toEqual({ vocabulary: [], learningSets: [], topics: [] });
    expect(execute).toHaveBeenCalledTimes(3);
  });
});
