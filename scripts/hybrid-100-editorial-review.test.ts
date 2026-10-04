import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildOwnerReview, validateOwnerReview } from "./hybrid-100-editorial-review";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = path.join(REPO_ROOT, "vocabflow-dataset/workspaces/hybrid-100-editorial-draft");

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

describe("hybrid 100 owner review", () => {
  const decisions: JsonObject[] = readJson<JsonObject>(path.join(WORKSPACE, "editorial-decisions.json")).decisions;
  const { ownerReview, decisionSheet } = buildOwnerReview(REPO_ROOT);

  it("covers exactly the 100 pinned candidate identities with valid editorial recommendations", () => {
    expect(ownerReview.candidateDecisions).toHaveLength(100);
    expect(new Set(ownerReview.candidateDecisions.map((item: JsonObject) => item.candidateId)).size).toBe(100);
    expect(ownerReview.summary).toMatchObject({
      candidates: 100,
      approveDraft: 100,
      requestChanges: 0,
      rejectIdentity: 0,
      blocked: 0,
      existingSenseReuseReviewed: 2,
      newSenseExistingLexemeReviewed: 3,
      oxfordStructuredGroupsReviewed: 90,
      vocab4600OnlyMeaningsReviewed: 10,
      semanticSourceCheck: "PASS",
      polysemyBlocksReviewed: 12,
    });
    for (const row of ownerReview.candidateDecisions as JsonObject[]) {
      expect(row.editorialReviewStatus).toBe("APPROVE_DRAFT");
      if (row.identityDecision === "REUSE_EXISTING_SENSE") {
        expect(row.semanticIdentityExactEnough).toBe(true);
      } else {
        expect(row).toMatchObject({
          semanticTargetApproved: true,
          partOfSpeechApproved: true,
          englishDefinitionApproved: true,
          vietnameseTranslationApproved: true,
          englishExampleApproved: true,
          vietnameseExampleApproved: true,
          polysemyApproved: true,
        });
      }
    }
  });

  it("records every editorial finding with its candidate ID, field, and correction", () => {
    expect(ownerReview.editorialIssues).toHaveLength(24);
    for (const issue of ownerReview.editorialIssues as JsonObject[]) {
      expect(decisions.some((item) => item.candidateId === issue.candidateId)).toBe(true);
      expect(issue.fields.length).toBeGreaterThan(0);
      expect(issue.status).toBe("CORRECTED");
      expect(issue.reason).toBeTruthy();
    }
    expect(decisionSheet.match(/^\| \d+ \|/gm)).toHaveLength(100);
  });

  it("aligns slow-moving crawl and attention-holding compelling with their pinned targets", () => {
    const crawl = decisions.find((item) => item.candidateOrdinal === 7)!;
    const compelling = decisions.find((item) => item.candidateOrdinal === 51)!;
    expect(crawl.semanticTarget).toBe("move very slowly");
    expect(crawl.content.definition.text).toContain("very slowly");
    expect(crawl.content.example.text).toContain("Traffic crawled");
    expect(compelling.semanticTarget).toBe("very interesting and holding attention");
    expect(compelling.content.senseLabel[0].text).toBe("captivating");
    expect(compelling.content.definition.text).toContain("holds someone's attention");
  });

  it("keeps every polysemy review block distinct and explicit", () => {
    expect(ownerReview.polysemyOwnerReview.status).toBe("PASS");
    expect(ownerReview.polysemyOwnerReview.blocks).toHaveLength(12);
    expect(ownerReview.polysemyOwnerReview.blocks.every((block: JsonObject) => block.noDuplicateMeaning
      && block.labelsDistinguishMeanings && block.definitionsDistinguishMeanings && block.examplesDisambiguate
      && block.vietnameseLabelsPreserveDistinction && block.rationale)).toBe(true);
  });

  it("keeps the human owner gate pending even when every draft recommendation passes", () => {
    expect(ownerReview.ownerFinalApproval).toBe("PENDING");
    expect(ownerReview.canonicalPromotionAuthorized).toBe(false);
    expect(decisionSheet).toContain("OWNER_FINAL_APPROVAL = PENDING");
    expect(decisionSheet).toContain("CANONICAL_PROMOTION_AUTHORIZED = NO");
  });

  it("rejects incomplete new-Sense reviews and any attempt to treat recommendations as owner approval", () => {
    const incomplete = JSON.parse(JSON.stringify(ownerReview)) as JsonObject;
    const decisionsCopy = JSON.parse(JSON.stringify(decisions)) as JsonObject[];
    const newSense = incomplete.candidateDecisions.find((item: JsonObject) => item.identityDecision !== "REUSE_EXISTING_SENSE");
    newSense.englishExampleApproved = false;
    expect(() => validateOwnerReview(incomplete, decisionsCopy)).toThrow(/required editorial approval recommendations/i);

    const promoted = JSON.parse(JSON.stringify(ownerReview)) as JsonObject;
    promoted.ownerFinalApproval = "YES";
    expect(() => validateOwnerReview(promoted, decisionsCopy)).toThrow(/human owner gate pending/i);
  });
});
