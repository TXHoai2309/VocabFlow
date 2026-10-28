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
  masterSenseIdentity: "sense:abandon:verb", partOfSpeech: "VERB", contentHash: "a".repeat(64), contentReviewStatus: "PASS", editorialStatus: "DRAFT",
  rightsStatus: "UNKNOWN_REVIEW_REQUIRED", imageMediaStatus: "PROPOSED",
  examples: [{ exampleKey: "sense:abandon:example-1", en: "They abandoned the plan.", vi: "Họ đã từ bỏ kế hoạch." }],
  developmentMedia: {
    images: [{ url: imageUrl.replace("advertise.jpg", "abandon.jpg"), mediaSha256: "b".repeat(64), mimeType: "image/jpeg",
      sourceNoteIdentity: "note:abandon", reviewStatus: "PROPOSED", rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
      targetProposalKey: "sense:abandon:verb", targetContentSha256: "a".repeat(64) }],
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

  it("keeps explicitly local public catalog media visible while withholding the same payload on Preview", async () => {
    const testApp = createApp({ publicVocabularyBatch: async () => [v2] });
    const local = await testApp.request("http://localhost/api/public/vocabulary?ids=100", {}, {
      VOCABFLOW_ENV: "development",
      DATABASE_ENV: "development",
      EXECUTION_CONTEXT: "local-development",
    });
    const localBody = await local.json() as { vocabulary: VocabularyDto[] };
    expect(localBody.vocabulary[0]?.developmentMedia?.images).toHaveLength(1);
    expect(localBody.vocabulary[0]?.imageMediaStatus).toBe("PROPOSED");

    const preview = await testApp.request("http://localhost/api/public/vocabulary?ids=100", {}, {
      VOCABFLOW_ENV: "development",
      DATABASE_ENV: "development",
      VERCEL_ENV: "preview",
    });
    const previewBody = await preview.json() as { vocabulary: VocabularyDto[] };
    expect(previewBody.vocabulary[0]?.imageUrl).toBeNull();
    expect(previewBody.vocabulary[0]).not.toHaveProperty("developmentMedia");
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

  it("accepts Cloudinary SDK analytics on signed delivery URLs while rejecting arbitrary query parameters", () => {
    const withAnalytics = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...v2.developmentMedia,
      images: [{ ...v2.developmentMedia!.images![0]!, url: `${imageUrl}?_a=CloudinarySDK1` }],
      wordAudio: [{ ...v2.developmentMedia!.wordAudio![0]!, url: `${audioUrl}?_a=CloudinarySDK1` }]
    } }, ownerEnv) as VocabularyDto;
    expect(withAnalytics.imageUrl).toBe(`${imageUrl}?_a=CloudinarySDK1`);
    expect(withAnalytics.audioUrl).toBe(`${audioUrl}?_a=CloudinarySDK1`);

    const arbitraryQuery = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...v2.developmentMedia,
      images: [{ ...v2.developmentMedia!.images![0]!, url: `${imageUrl}?redirect=https://example.com` }],
      wordAudio: [{ ...v2.developmentMedia!.wordAudio![0]!, url: `${audioUrl}?_a=CloudinarySDK1&redirect=https://example.com` }]
    } }, ownerEnv) as VocabularyDto;
    expect(arbitraryQuery.imageUrl).toBeNull();
    expect(arbitraryQuery.audioUrl).toBeNull();
  });

  it("publishes IPA-null word audio only with a unique source-note pronunciation proof bound to this lemma, POS, and Sense hash", () => {
    const sourceWordAudio = v2.developmentMedia!.wordAudio![0]!;
    const ipaNull = withoutUnclearedV2Media({
      ...v2,
      ipa: null,
      contentHash: "b".repeat(64),
      developmentMedia: {
        ...v2.developmentMedia,
        wordAudio: [{
          ...sourceWordAudio,
          sourceNoteIdentity: "source-note-1:source-guid-1",
          pronunciationEvidence: "SOURCE_NOTE_FIELD_SOUND_AND_IPA",
          mappingEvidence: `Source-note Sound/IPA and lemma/POS verified for Lexeme source:abandon|VERB; target hash set ${"a".repeat(64)}.`
        }]
      }
    }, ownerEnv) as VocabularyDto;
    expect(ipaNull.audioUrl).toBe(audioUrl);
    expect(ipaNull.ipa).toBeNull();

    const wrongHomograph = withoutUnclearedV2Media({
      ...v2,
      word: "tear",
      ipa: null,
      partOfSpeech: "VERB",
      developmentMedia: {
        ...v2.developmentMedia,
        wordAudio: [{
          ...sourceWordAudio,
          sourceNoteIdentity: "source-note-2:source-guid-2",
          pronunciationEvidence: "SOURCE_NOTE_FIELD_SOUND_AND_IPA",
          mappingEvidence: `Source-note Sound/IPA and lemma/POS verified for Lexeme source:tear|NOUN; target hash set ${"a".repeat(64)}.`
        }]
      }
    }, ownerEnv) as VocabularyDto;
    expect(wrongHomograph.audioUrl).toBeNull();

    const ambiguousPronunciation = withoutUnclearedV2Media({
      ...v2,
      ipa: null,
      developmentMedia: {
        ...v2.developmentMedia,
        wordAudio: [
          {
            ...sourceWordAudio,
            sourceNoteIdentity: "source-note-3:source-guid-3",
            pronunciationEvidence: "SOURCE_NOTE_FIELD_SOUND_AND_IPA",
            mappingEvidence: `Source-note Sound/IPA and lemma/POS verified for Lexeme source:abandon|VERB; target hash set ${"a".repeat(64)}.`
          },
          {
            ...sourceWordAudio,
            pronunciation: "əˈbændɒn",
            sourceNoteIdentity: "source-note-4:source-guid-4",
            pronunciationEvidence: "SOURCE_NOTE_FIELD_SOUND_AND_IPA",
            mappingEvidence: `Source-note Sound/IPA and lemma/POS verified for Lexeme source:abandon|VERB; target hash set ${"a".repeat(64)}.`
          }
        ]
      }
    }, ownerEnv) as VocabularyDto;
    expect(ambiguousPronunciation.audioUrl).toBeNull();
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

  it("does not choose ambiguous, mismatched, unsigned, wrong-namespace, wrong-type, or stale media", () => {
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

    const duplicateSameAsset = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...media,
      images: [media.images![0], media.images![0]],
      wordAudio: [media.wordAudio![0], media.wordAudio![0]]
    } }, ownerEnv) as VocabularyDto;
    expect(duplicateSameAsset.imageUrl).toBe(imageUrl.replace("advertise.jpg", "abandon.jpg"));
    expect(duplicateSameAsset.audioUrl).toBeNull();

    const distinctImages = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...media,
      images: [media.images![0], { ...media.images![0]!, mediaSha256: "e".repeat(64) }]
    } }, ownerEnv) as VocabularyDto;
    expect(distinctImages.imageUrl).toBeNull();

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

    const webp = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      images: [{ ...v2.developmentMedia!.images![0]!, url: "https://res.cloudinary.com/vocabflow/image/authenticated/s--Webp_123--/Vocab/v2/images/illustration.webp", mimeType: "image/webp" }],
      wordAudio: []
    } }, ownerEnv) as VocabularyDto;
    expect(webp.imageUrl).toContain("/images/illustration.webp");

    const mismatch = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      images: [{ ...v2.developmentMedia!.images![0]!, mimeType: "image/png" }],
      wordAudio: [{ ...v2.developmentMedia!.wordAudio![0]!, mimeType: "audio/mpeg", pronunciation: "tɪər" }]
    } }, ownerEnv) as VocabularyDto;
    expect(mismatch.imageUrl).toBeNull();
    expect(mismatch.audioUrl).toBeNull();
  });

  it("rejects image mappings pinned to a different Sense identity or content hash", () => {
    const staleHash = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...v2.developmentMedia,
      images: [{ ...v2.developmentMedia!.images![0]!, targetContentSha256: "f".repeat(64) }]
    } }, ownerEnv) as VocabularyDto;
    const wrongIdentity = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...v2.developmentMedia,
      images: [{ ...v2.developmentMedia!.images![0]!, targetProposalKey: "sense:other:verb" }]
    } }, ownerEnv) as VocabularyDto;
    expect(staleHash.imageUrl).toBeNull();
    expect(wrongIdentity.imageUrl).toBeNull();

    const staleAndCurrent = withoutUnclearedV2Media({ ...v2, developmentMedia: {
      ...v2.developmentMedia,
      images: [
        { ...v2.developmentMedia!.images![0]!, targetContentSha256: "f".repeat(64) },
        v2.developmentMedia!.images![0]!
      ]
    } }, ownerEnv) as VocabularyDto;
    expect(staleAndCurrent.imageUrl).toBe(imageUrl.replace("advertise.jpg", "abandon.jpg"));
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
