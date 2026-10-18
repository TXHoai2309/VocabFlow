import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { VocabularyDto } from "@vocabflow/contracts";
import {
  hasV2PublicMediaOwnerAuthorization,
  mustSanitizeV2MediaResponse,
  mustWithholdV2Media,
  V2_PUBLIC_MEDIA_OWNER_ATTESTATION_ID,
  withoutUnclearedV2Media
} from "./v2-public-media";

const imageUrl = "https://res.cloudinary.com/vocabflow/image/authenticated/s--Abc_def1--/v1729000000/Vocab/v2/images/advertise.jpg";
const audioUrl = "https://res.cloudinary.com/vocabflow/video/authenticated/s--Audio_12--/v1729000000/Vocab/v2/audio/abandon.mp3";
const exampleAudioUrl = "https://res.cloudinary.com/vocabflow/video/authenticated/s--Exmpl_12--/v1729000000/Vocab/v2/audio/equivalent-example.mp3";
const ownerEnv = { VERCEL_ENV: "production", VOCABFLOW_V2_PUBLIC_MEDIA_ATTESTATION_ID: V2_PUBLIC_MEDIA_OWNER_ATTESTATION_ID };

const v2: VocabularyDto = {
  id: 100, word: "abandon", ipa: "/əˈbændən/", vietnamese: "từ bỏ", definitionEn: "to leave permanently", exampleEn: null,
  imageUrl: "https://legacy.invalid/image.jpg", audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1,
  masterSenseIdentity: "sense:abandon:verb", contentHash: "a".repeat(64), contentReviewStatus: "PASS", editorialStatus: "DRAFT",
  rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
  examples: [{ exampleKey: "sense:abandon:example-1", en: "They abandoned the plan.", vi: "Họ đã từ bỏ kế hoạch." }],
  developmentMedia: {
    images: [{ url: imageUrl.replace("advertise.jpg", "abandon.jpg"), mediaSha256: "b".repeat(64), mimeType: "image/jpeg",
      sourceNoteIdentity: "note:abandon", reviewStatus: "PROPOSED", rightsStatus: "UNKNOWN_REVIEW_REQUIRED" }],
    wordAudio: [{ url: audioUrl, mediaSha256: "c".repeat(64), mimeType: "audio/mpeg", sourceNoteIdentity: "note:abandon",
      reviewStatus: "PROPOSED", rightsStatus: "UNKNOWN_REVIEW_REQUIRED", pronunciation: "əˈbændən", pronunciationEvidence: "same lemma/POS/IPA" }],
    exampleAudio: []
  }
};

const equivalent: VocabularyDto = {
  ...v2,
  id: 101,
  word: "equivalent",
  ipa: "/ɪˈkwɪvələnt/",
  masterSenseIdentity: "sense:equivalent:adjective",
  examples: [{ exampleKey: "sense:equivalent:example-1", en: "The two values are equivalent.", vi: "Hai giá trị tương đương." }],
  developmentMedia: {
    exampleAudio: [{ url: exampleAudioUrl, mediaSha256: "d".repeat(64), mimeType: "audio/mpeg", sourceNoteIdentity: "note:equivalent",
      reviewStatus: "ACCEPTED_MAPPING", rightsStatus: "UNKNOWN_REVIEW_REQUIRED", exampleKey: "sense:equivalent:example-1" }]
  }
};

describe("V2 public media authorization gate", () => {
  it("keeps deployed delivery default-deny unless the exact owner attestation ID is configured", () => {
    expect(mustSanitizeV2MediaResponse({ VOCABFLOW_ENV: "development", DATABASE_ENV: "development" })).toBe(false);
    expect(mustSanitizeV2MediaResponse({ VERCEL_ENV: "preview" })).toBe(true);
    expect(mustWithholdV2Media({ VERCEL_ENV: "preview" })).toBe(true);
    expect(hasV2PublicMediaOwnerAuthorization({ ...ownerEnv, VOCABFLOW_V2_PUBLIC_MEDIA_ATTESTATION_ID: "other" })).toBe(false);
    expect(mustWithholdV2Media(ownerEnv)).toBe(false);
  });

  it("preserves local Development preview while withholding deployed media without owner authorization", () => {
    const local = withoutUnclearedV2Media(v2, { VOCABFLOW_ENV: "development" }) as VocabularyDto;
    expect(local.developmentMedia?.wordAudio).toHaveLength(1);
    expect(local.imageUrl).toBe("https://legacy.invalid/image.jpg");

    const blocked = withoutUnclearedV2Media(v2, { VERCEL_ENV: "production" }) as VocabularyDto;
    expect(blocked.imageUrl).toBeNull();
    expect(blocked.audioUrl).toBeNull();
    expect(blocked).not.toHaveProperty("developmentMedia");
    expect(blocked).not.toHaveProperty("imageMediaStatus");
  });

  it("publishes only unique signed V2 mappings from the current PASS/DRAFT Sense projection", () => {
    const published = withoutUnclearedV2Media(v2, ownerEnv) as VocabularyDto;
    expect(published.imageUrl).toBe(imageUrl.replace("advertise.jpg", "abandon.jpg"));
    expect(published.audioUrl).toBe(audioUrl);
    expect(published.examples?.[0]).toMatchObject({ en: "They abandoned the plan." });
    expect(published.examples?.[0]).not.toHaveProperty("audioUrl");
    expect(published).not.toHaveProperty("developmentMedia");
    expect(published).not.toHaveProperty("imageMediaStatus");
    expect(published.rightsStatus).toBe("UNKNOWN_REVIEW_REQUIRED");
    expect(JSON.stringify(published)).not.toContain("note:abandon");
    expect(JSON.stringify(published)).not.toContain("pronunciationEvidence");
  });

  it("attaches only the accepted example clip whose stable key is on that Sense's current example", () => {
    const published = withoutUnclearedV2Media(equivalent, ownerEnv) as VocabularyDto;
    expect(published.examples?.[0]).toMatchObject({
      en: "The two values are equivalent.",
      audioUrl: exampleAudioUrl
    });

    const mismatch = withoutUnclearedV2Media({
      ...equivalent,
      examples: [{ exampleKey: "sense:equivalent:example-2", en: "A different sentence.", vi: null }]
    }, ownerEnv) as VocabularyDto;
    expect(mismatch.examples?.[0]).not.toHaveProperty("audioUrl");
  });

  it("does not choose ambiguous, duplicate, mismatched, unsigned, wrong-namespace, wrong-type, or stale media", () => {
    const media = v2.developmentMedia!;
    const ambiguous = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...media,
      images: [{ ...media.images![0]!, reviewStatus: "AMBIGUOUS" }],
      wordAudio: [{ ...media.wordAudio![0]!, pronunciation: "tɪər", pronunciationEvidence: "another pronunciation" }],
      exampleAudio: []
    } }, ownerEnv) as VocabularyDto;
    expect(ambiguous.imageUrl).toBeNull();
    expect(ambiguous.audioUrl).toBeNull();
    expect(ambiguous.examples?.[0]).not.toHaveProperty("audioUrl");

    const duplicate = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...media,
      images: [media.images![0], media.images![0]],
      wordAudio: [media.wordAudio![0], media.wordAudio![0]]
    } }, ownerEnv) as VocabularyDto;
    expect(duplicate.imageUrl).toBeNull();
    expect(duplicate.audioUrl).toBeNull();

    const unsigned = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...media,
      images: [{ ...media.images![0]!, url: "https://res.cloudinary.com/vocabflow/image/authenticated/Vocab/v2/images/a.jpg" }],
      wordAudio: [{ ...media.wordAudio![0]!, url: "https://res.cloudinary.com/vocabflow/video/authenticated/Vocab/v2/audio/a.mp3" }]
    } }, ownerEnv) as VocabularyDto;
    expect(unsigned.imageUrl).toBeNull();
    expect(unsigned.audioUrl).toBeNull();

    const stale = withoutUnclearedV2Media({ ...v2, contentHash: undefined }, ownerEnv) as VocabularyDto;
    expect(stale.imageUrl).toBeNull();
    expect(stale.audioUrl).toBeNull();
  });

  it("supports signed image, raw GIF and MP3 Cloudinary resource types while rejecting mismatches", () => {
    const gif = withoutUnclearedV2Media({ ...v2, imageUrl: null, developmentMedia: {
      images: [{ ...v2.developmentMedia!.images![0]!, url: "https://res.cloudinary.com/vocabflow/raw/authenticated/s--Gif__123--/Vocab/v2/images/illustration.gif", mimeType: "image/gif" }],
      wordAudio: []
    } }, ownerEnv) as VocabularyDto;
    expect(gif.imageUrl).toContain("/raw/authenticated/");

    const mismatch = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      images: [{ ...v2.developmentMedia!.images![0]!, mimeType: "image/png" }],
      wordAudio: [{ ...v2.developmentMedia!.wordAudio![0]!, mimeType: "audio/mpeg", pronunciation: "tɪər" }]
    } }, ownerEnv) as VocabularyDto;
    expect(mismatch.imageUrl).toBeNull();
    expect(mismatch.audioUrl).toBeNull();
  });

  it("enforces sanitization and owner authorization at the actual API boundary", async () => {
    const app = createApp({ readSession: async () => ({ user: { id: "fixture-user" } }),
      vocabularyService: { list: async () => [v2, equivalent] } });

    const blocked = await app.request("http://localhost/api/vocabulary", {}, { VERCEL_ENV: "production" });
    const blockedBody = await blocked.text();
    expect(blocked.status).toBe(200);
    expect(blockedBody).not.toContain("res.cloudinary.com");
    expect(blockedBody).toContain('"imageUrl":null');

    const allowed = await app.request("http://localhost/api/vocabulary", {}, ownerEnv);
    const allowedBody = await allowed.text();
    expect(allowed.status).toBe(200);
    expect(allowedBody).toContain(imageUrl.replace("advertise.jpg", "abandon.jpg"));
    expect(allowedBody).toContain(audioUrl);
    expect(allowedBody).toContain('"audioUrl":"' + exampleAudioUrl + '"');
    expect(allowedBody).not.toContain("developmentMedia");
    expect(allowedBody).not.toContain("note:abandon");

    const local = await app.request("http://localhost/api/vocabulary", {}, { VOCABFLOW_ENV: "development" });
    expect(await local.text()).toContain("developmentMedia");
  });
});
