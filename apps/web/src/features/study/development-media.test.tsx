import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { VocabularyDto } from "@vocabflow/contracts";
import { DevelopmentExampleAudio } from "./development-media";

const clip = { url: "/api/bounded-media/clip.mp3", mediaSha256: "b".repeat(64), mimeType: "audio/mpeg", sourceNoteIdentity: "job:1", reviewStatus: "PROPOSED" as const, rightsStatus: "UNKNOWN_REVIEW_REQUIRED" as const,
  originType: "GENERATED_EDITORIAL_LOCAL_PREVIEW", targetProposalKey: "sense:accident:mishap", targetContentSha256: "a".repeat(64), exampleIndex: 0, spokenText: "It was a minor accident." };
type ExampleClip = NonNullable<NonNullable<VocabularyDto["developmentMedia"]>["exampleAudio"]>[number];
function html(overrides: Partial<ExampleClip> = {}, key?: string, contentHash = "a".repeat(64)) {
  return renderToStaticMarkup(<DevelopmentExampleAudio vocabulary={{ word: "accident", masterSenseIdentity: "sense:accident:mishap", contentHash, developmentMedia: { exampleAudio: [{ ...clip, ...overrides }] } }} exampleIndex={0} exampleText="It was a minor accident." exampleKey={key} />);
}
describe("exact example audio binding", () => {
  it("supports a frozen keyless example with matching sense/hash/index/spoken text", () => { expect(html()).toContain("<audio"); });
  it("preserves matching historical example keys", () => { expect(html({ exampleKey: "example:1" }, "example:1")).toContain("<audio"); });
  it.each([
    { targetProposalKey: "sense:accident:chance" }, { targetContentSha256: "c".repeat(64) },
    { exampleIndex: 1 }, { spokenText: "A different sentence." }, { originType: "UNVERIFIED" },
    { exampleKey: "unrelated-example" }
  ])("withholds an incorrectly pinned keyless clip: %j", (override) => { expect(html(override)).not.toContain("<audio"); });
  it("does not substitute text matching when an existing example key disagrees", () => { expect(html({}, "example:1")).not.toContain("<audio"); });
  it("requires a current content pin for a keyless source", () => { expect(html({}, undefined, "")).not.toContain("<audio"); });
});
