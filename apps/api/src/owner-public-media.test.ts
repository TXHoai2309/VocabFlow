import { describe, expect, it } from "vitest";
import { withoutUnclearedV2Media } from "./v2-public-media";
import { createApp } from "./index";

const env = { VOCAB_DATASET_VERSION: "owner-production", VERCEL_ENV: "production", VOCABFLOW_ENV: "production", DATABASE_ENV: "production", EXECUTION_CONTEXT: "vercel-production", DATABASE_URL: "postgres://vocabflow_runtime:fixture@ep-twilight-firefly-a1dugz2x-pooler.ap-southeast-1.aws.neon.tech/neondb" };
const root = "https://res.cloudinary.com/fixture";
const folder = "vocabflow/owner/production-1547-20261030-r0001";
const image = `${root}/image/upload/c_limit,f_auto,q_auto,w_960/v123/${folder}/images/${"a".repeat(64)}.png`;
const audio = `${root}/video/upload/v123/${folder}/audio/${"b".repeat(64)}.mp3`;
const word = { masterSenseIdentity: "owner-publication:fixture-1", contentHash: "c".repeat(64), imageUrl: image, audioUrl: audio, developmentMedia: {}, examples: [{ en: "A cat.", vi: "Một con mèo.", audioUrl: audio }] };
describe("owner publication media at the actual deployed response boundary", () => {
  it("keeps new media through the real Hono Production middleware", async () => {
    const app = createApp({ publicLearningCatalog: async () => ({
      vocabulary: [{ id: 1, word: "cat", vietnamese: "mèo", ipa: null, definitionEn: null, exampleEn: "A cat.",
        topic: null, level: null, enabled: true, contentVersion: 1, ...word }], learningSets: [], topics: []
    }) });
    const response = await app.request("/api/public/learning-catalog", {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.vocabulary[0]).toMatchObject({ imageUrl: image, audioUrl: audio, examples: word.examples });
    expect(body.vocabulary[0]).not.toHaveProperty("developmentMedia");
  });
  it.each(["/api/public/vocabulary?ids=1", "/api/public/vocabulary/matches?q=cat"])("does not cache retired detail/search content across the cutover: %s", async (path) => {
    const app = createApp({ publicVocabularyBatch: async () => [], publicVocabularyMatches: async () => [] });
    const response = await app.request(path, {}, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("preserves only the new namespace without requiring a fabricated independent PASS", () => {
    const result = withoutUnclearedV2Media(word, env);
    expect(result).toMatchObject({ imageUrl: image, audioUrl: audio, examples: word.examples });
    expect(result).not.toHaveProperty("developmentMedia");
    expect(result).not.toHaveProperty("contentReviewStatus");
  });
  it("publishes images, word and example audio from the explicit 4,997-word expansion", async () => {
    const expansion = "vocabflow/owner/production-expansion-4997-20261101-r0001";
    const expandedImage = image.replace(folder, expansion);
    const expandedAudio = audio.replace(folder, expansion);
    const expandedWord = { ...word, imageUrl: expandedImage, audioUrl: expandedAudio,
      examples: [{ en: "A relative.", vi: "Một người họ hàng.", audioUrl: expandedAudio }] };
    const app = createApp({ publicLearningCatalog: async () => ({
      vocabulary: [{ id: 8000, word: "relative", vietnamese: "người họ hàng", ipa: null, definitionEn: null, exampleEn: "A relative.",
        topic: null, level: null, enabled: true, contentVersion: 1, ...expandedWord }], learningSets: [], topics: []
    }) });
    const response = await app.request("/api/public/learning-catalog", {}, env);
    expect(response.status).toBe(200);
    expect((await response.json()).vocabulary[0]).toMatchObject({ imageUrl: expandedImage, audioUrl: expandedAudio, examples: expandedWord.examples });
  });
  it("does not broaden the media authority to another expansion or date", () => {
    for (const disallowed of ["production-expansion-5000-20261101-r0001", "production-expansion-4997-20261102-r0001", "production-expansion-4997-20261101-r0002"]) {
      const otherFolder = `vocabflow/owner/${disallowed}`;
      expect(withoutUnclearedV2Media({ ...word, imageUrl: image.replace(folder, otherFolder), audioUrl: audio.replace(folder, otherFolder) }, env))
        .toMatchObject({ imageUrl: null, audioUrl: null });
    }
  });
  it("does not publish owner media on another environment or an arbitrary identity", () => {
    expect(withoutUnclearedV2Media(word, { ...env, VOCAB_DATASET_VERSION: "v2" })).toMatchObject({ imageUrl: null, audioUrl: null });
    expect(withoutUnclearedV2Media({ ...word, masterSenseIdentity: "other" }, env)).toMatchObject({ imageUrl: null, audioUrl: null });
  });
  it("keeps the same pinned publication media in explicitly configured canonical Dev", () => {
    const dev = { ...env, VOCAB_DATASET_VERSION: "owner-development", VERCEL_ENV: "preview", VOCABFLOW_ENV: "development", DATABASE_ENV: "development", EXECUTION_CONTEXT: "vercel-preview", DATABASE_URL: "postgres://vocabflow_runtime:fixture@ep-ancient-tree-a15xogc1.ap-southeast-1.aws.neon.tech/neondb" };
    expect(withoutUnclearedV2Media(word, dev)).toMatchObject({ imageUrl: image, audioUrl: audio, examples: word.examples });
    expect(withoutUnclearedV2Media(word, { ...dev, VERCEL_ENV: "production" })).toMatchObject({ imageUrl: null, audioUrl: null });
  });
  it("withholds localhost, foreign namespaces and unapproved example audio", () => {
    expect(withoutUnclearedV2Media({ ...word, imageUrl: "/api/local-owner-editorial-media/a.png", audioUrl: "https://example.com/word.mp3", examples: [{ en: "A cat.", audioUrl: "https://example.com/sentence.mp3" }] }, env))
      .toMatchObject({ imageUrl: null, audioUrl: null, examples: [{ en: "A cat." }] });
  });
  it("accepts the SDK analytics parameter on the exact publication URL, with no arbitrary query parameters", () => {
    expect(withoutUnclearedV2Media({ ...word, imageUrl: image + "?_a=BAMAMiZS0" }, env)).toMatchObject({ imageUrl: image + "?_a=BAMAMiZS0" });
    expect(withoutUnclearedV2Media({ ...word, imageUrl: image + "?download=1" }, env)).toMatchObject({ imageUrl: null });
  });
});
