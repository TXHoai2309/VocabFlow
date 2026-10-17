import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { VocabularyDto } from "@vocabflow/contracts";
import { mustWithholdV2Media, withoutUnclearedV2Media } from "./v2-public-media";

const v2: VocabularyDto = {
  id: 100, word: "test", ipa: null, vietnamese: "thử", definitionEn: "A trial.", exampleEn: null,
  imageUrl: "https://res.cloudinary.com/fixture/image/authenticated/fixture.jpg",
  audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1,
  masterSenseIdentity: "fixture:sense", contentHash: "a".repeat(64),
  developmentMedia: { wordAudio: [{ url: "https://res.cloudinary.com/fixture/video/authenticated/fixture.mp3",
    mediaSha256: "b".repeat(64), mimeType: "audio/mpeg", sourceNoteIdentity: "fixture-note",
    reviewStatus: "PROPOSED", rightsStatus: "UNKNOWN_REVIEW_REQUIRED" }] },
};

describe("staged V2 media public delivery gate", () => {
  it("preserves local Development preview and withholds all deployed variants", () => {
    expect(mustWithholdV2Media({ VOCABFLOW_ENV: "development", DATABASE_ENV: "development" })).toBe(false);
    for (const env of [{ VERCEL_ENV: "preview" }, { VERCEL_ENV: "production" }, { VOCABFLOW_ENV: "production" }]) {
      expect(mustWithholdV2Media(env)).toBe(true);
    }
  });

  it("strips V2 media from nested queue/browse/detail shapes while preserving identity and content", () => {
    const original = { items: [{ vocabulary: v2 }], detail: v2 };
    const filtered = withoutUnclearedV2Media(original);
    expect(filtered).toEqual({ items: [{ vocabulary: { ...v2, imageUrl: null, developmentMedia: undefined } }],
      detail: { ...v2, imageUrl: null, developmentMedia: undefined } });
    expect(JSON.stringify(filtered)).not.toContain("res.cloudinary.com");
    expect(original.detail.developmentMedia).toBeDefined();
    expect(withoutUnclearedV2Media({ id: 1, imageUrl: "legacy.jpg" })).toEqual({ id: 1, imageUrl: "legacy.jpg" });
  });

  it("enforces the gate on the actual API boundary without changing authentication or content", async () => {
    const app = createApp({ readSession: async () => ({ user: { id: "fixture-user" } }),
      vocabularyService: { list: async () => [v2] } });
    const productionResponse = await app.request("http://localhost/api/vocabulary", {}, { VERCEL_ENV: "production" });
    expect(productionResponse.status).toBe(200);
    const body = await productionResponse.text();
    expect(body).not.toContain("res.cloudinary.com");
    expect(body).toContain('"masterSenseIdentity":"fixture:sense"');
    const local = await app.request("http://localhost/api/vocabulary", {}, { VOCABFLOW_ENV: "development" });
    expect(await local.text()).toContain("res.cloudinary.com");
  });
});
