import test from "node:test";
import assert from "node:assert/strict";
import { verifyReceiptReviewedGloss } from "./short-meanings-v2-receipt-evidence.mjs";

const snapshotRow = {
  proposalIdentity: "sense:above:spatial",
  vocabularyId: 41,
  sourceContentHash: "a".repeat(64),
  headword: "above",
  partOfSpeech: "ADVERB",
  definitionEn: "At a higher level.",
  vietnameseExplanation: "ở vị trí cao hơn.",
  examples: [{ en: "The lamp is above the table.", vi: "Đèn ở phía trên bàn." }],
  contentReviewDecision: "PASS",
  editorialStatus: "DRAFT"
};

const result = {
  vocabularyId: 41,
  proposalIdentity: snapshotRow.proposalIdentity,
  sourceContentHash: snapshotRow.sourceContentHash,
  headword: "above",
  partOfSpeech: "ADVERB",
  shortMeaningVi: "phía trên",
  sourceType: "VERIFIED_SOURCE_GLOSS",
  confidence: "MEDIUM",
  validationStatus: "REVIEW_REQUIRED",
  evidenceRef: "source:OXFORD_5000:1:pin:inventory#/Vietnamese[0]",
  candidateAlternatives: [{ text: "phía trên", evidenceRefs: ["source:OXFORD_5000:1:pin:inventory#/Vietnamese[0]"] }]
};

const receipt = {
  checkpointCreatedAtUtc: "2026-10-18T00:00:00Z",
  entries: [{
    proposalKey: snapshotRow.proposalIdentity,
    effectiveContentHash: snapshotRow.sourceContentHash,
    decision: "PASS",
    reviewerIdentity: "independent-reviewer-b",
    finding: "Relevant source gloss: phía trên. Sense content checked and passed.",
    evidence: {
      displayForm: snapshotRow.headword,
      partOfSpeech: snapshotRow.partOfSpeech,
      definitionEn: snapshotRow.definitionEn,
      meaningVi: snapshotRow.vietnameseExplanation,
      examples: snapshotRow.examples,
      sourceRecords: [{ recordPinVerified: true, sourceMeaningFieldRaw: "phía trên" }]
    }
  }]
};

test("promotes only the single gloss supported by a matching independent PASS receipt", () => {
  const enriched = verifyReceiptReviewedGloss({ result, snapshotRow, receipt, receiptPath: "receipt.json", receiptSha256: "b".repeat(64) });
  assert.equal(enriched?.validationStatus, "VERIFIED");
  assert.equal(enriched?.reviewerIdentity, "independent-reviewer-b");
  assert.equal(enriched?.reviewedAt, receipt.checkpointCreatedAtUtc);
  assert.equal(enriched?.shortMeaningReviewReceipt.effectiveContentHash, snapshotRow.sourceContentHash);
});

test("does not promote a stale content hash, a non-PASS receipt, or missing source pins", () => {
  const stale = structuredClone(receipt);
  stale.entries[0].effectiveContentHash = "c".repeat(64);
  assert.equal(verifyReceiptReviewedGloss({ result, snapshotRow, receipt: stale, receiptPath: "receipt.json", receiptSha256: "b".repeat(64) }), null);

  const fail = structuredClone(receipt);
  fail.entries[0].decision = "REVIEW_REQUIRED";
  assert.equal(verifyReceiptReviewedGloss({ result, snapshotRow, receipt: fail, receiptPath: "receipt.json", receiptSha256: "b".repeat(64) }), null);

  const unpinned = structuredClone(receipt);
  unpinned.entries[0].evidence.sourceRecords[0].recordPinVerified = false;
  assert.equal(verifyReceiptReviewedGloss({ result, snapshotRow, receipt: unpinned, receiptPath: "receipt.json", receiptSha256: "b".repeat(64) }), null);
});

test("keeps ambiguous candidate sets pending", () => {
  const ambiguous = { ...result, candidateAlternatives: [...result.candidateAlternatives, { text: "ở trên" }] };
  assert.equal(verifyReceiptReviewedGloss({ result: ambiguous, snapshotRow, receipt, receiptPath: "receipt.json", receiptSha256: "b".repeat(64) }), null);
});
