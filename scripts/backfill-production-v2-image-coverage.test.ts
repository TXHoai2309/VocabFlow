import { describe, expect, it } from "vitest";
import { mergeCurrentImages, semanticDice } from "./backfill-production-v2-image-coverage";

const target = (images: Record<string, unknown>[] = []) => ({
  proposal_key: "EDITORIAL:word:sense",
  vocabulary_id: 101,
  part_of_speech: "NOUN",
  content_sha256: "a".repeat(64),
  content_review_decision: "PASS",
  editorial_status: "DRAFT",
  rights_status: "UNKNOWN_REVIEW_REQUIRED",
  source_provenance: {},
  development_media: { images, wordAudio: [{ sentinel: true }], exampleAudio: [{ sentinel: true }] },
  word: "word",
  definition_en: "A word definition",
  enabled: true,
});

const proposed = (hash = "b".repeat(64)) => ({
  mappingKey: "mapping-1",
  sourceNoteIdentity: "note-1:guid-1",
  mediaSha256: hash,
  targetProposalKey: "EDITORIAL:word:sense",
  targetContentSha256: "a".repeat(64),
  reviewStatus: "PROPOSED",
  rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
});

describe("production V2 image coverage backfill", () => {
  it("scores meaning against only the pinned current definition tokens", () => {
    expect(semanticDice("A thing used for measuring", "A device used for measuring length", "ruler")).toBeGreaterThan(0.22);
    expect(semanticDice("A kind of fruit", "A person who is not cruel", "kind")).toBe(0);
    expect(semanticDice("", "some definition", "word")).toBe(0);
  });

  it("adds target and content pins without touching other media fields", () => {
    const current = target();
    const result = mergeCurrentImages(current, [proposed()]);
    expect(result.blocked).toBeNull();
    expect(result.changed).toBe(true);
    expect(result.images).toEqual([proposed()]);
    expect(current.development_media.wordAudio).toEqual([{ sentinel: true }]);
    expect(current.development_media.exampleAudio).toEqual([{ sentinel: true }]);
  });

  it("keeps multiple distinct image hashes unresolved for one target", () => {
    const result = mergeCurrentImages(target(), [proposed("b".repeat(64)), proposed("c".repeat(64))]);
    expect(result.blocked).toBe("MULTIPLE_DISTINCT_CURRENT_IMAGE_HASHES");
    expect(result.changed).toBe(false);
    expect(result.images).toEqual([]);
  });

  it("does not replace an existing current mapping decision or rights status", () => {
    const current = target([{ ...proposed(), reviewStatus: "AMBIGUOUS" }]);
    const result = mergeCurrentImages(current, [proposed()]);
    expect(result.blocked).toBe("EXACT_CURRENT_MAPPING_HAS_OTHER_REVIEW_OR_RIGHTS_STATUS");
    expect(result.images).toEqual(current.development_media.images);
  });
});
