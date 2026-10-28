/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevelopmentSenseMediaPreview } from "./development-sense-media-preview";

const image = {
  mediaSha256: "1".repeat(64), mimeType: "image/jpeg", rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
  url: `/api/dev/media-review/assets/${"1".repeat(64)}/preview`, mappingKey: "2".repeat(64),
  mappingStatus: "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW", mappingConfidence: 0.85,
  sourceNoteIdentity: { sourceRecordId: "note-1", sourceNoteGuid: "guid-1", recordEvidenceSha256: "3".repeat(64) },
  sourceContentHash: "1".repeat(64), targetContentFingerprint: "4".repeat(64), targetSnapshotFingerprint: "5".repeat(64),
  targetPartOfSpeech: "NOUN", reviewStatus: "PROPOSED", mappingEvidence: { sourceNoteIdentityVerified: true },
};
const wordAudio = {
  ...image, mediaSha256: "6".repeat(64), mimeType: "audio/mpeg", url: `/api/dev/media-review/assets/${"6".repeat(64)}/preview`,
  targetLexemeIdentity: "NORMALIZED_HEADWORD:tear", pronunciation: "/tɛː/", sourcePosClasses: ["VERB"],
  candidatePosMatchesSense: false, lexemePronunciationReviewSignal: "MULTIPLE_SOURCE_IPA_FORMS_REVIEW",
};

function response(includeProposed: boolean) {
  return {
    proposalKey: "SENSE:tear", contentFingerprint: "4".repeat(64), targetSnapshotFingerprint: "5".repeat(64),
    source: "ENGLISH_VOCAB_4600" as const,
    rightsNotice: "UNKNOWN_REVIEW_REQUIRED is not rights clearance.",
    previewMode: includeProposed ? "ACCEPTED_AND_PROPOSED" as const : "ACCEPTED_ONLY" as const,
    images: [], proposedImages: includeProposed ? [image] : [], ambiguousImages: [],
    wordPronunciations: [], proposedWordPronunciations: [],
    ambiguousWordPronunciations: includeProposed ? [wordAudio] : [],
    examples: [{ exampleKey: "SENSE:tear:example-1", index: 0, text: "Tear the paper carefully.", audio: null }],
  };
}

describe("Development Sense media preview", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const includeProposed = String(input).includes("includeProposed=1");
      return Promise.resolve({ ok: true, json: async () => response(includeProposed) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("defaults to Accepted only and fetches proposed previews only after the opt-in toggle", async () => {
    render(<DevelopmentSenseMediaPreview proposalKey="SENSE:tear" contentFingerprint={"4".repeat(64)} headword="tear" />);
    const toggle = screen.getByRole("checkbox", { name: /Include proposed/ });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(toggle).not.toBeChecked();
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("includeProposed=1");
    expect(screen.getByText(/Chưa có ảnh được xác nhận/)).toBeInTheDocument();

    fireEvent.click(toggle);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain("includeProposed=1");
    expect(screen.getByRole("img", { name: /Development PROPOSED image preview for tear/ })).toHaveAttribute("src", image.url);
    expect(screen.getAllByText(/Source note note-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Target Sense content hash/).length).toBeGreaterThan(0);
    expect(screen.getByText(/LEXEME VARIANT KHÁC POS/)).toBeInTheDocument();
    expect(within(screen.getByLabelText("Audio câu ví dụ đã xác nhận")).queryByRole("audio")).not.toBeInTheDocument();
    expect(document.querySelectorAll("audio")).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
});
