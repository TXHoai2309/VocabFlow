import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_DRAFT_FINGERPRINT,
  SOURCE_PROOF_FINGERPRINT,
  assertApprovalEvidence,
  assertCanarySnapshotUnchanged,
  assertDependencyHashes,
  assertDraftManifest,
  assertIdentityDecisionCounts,
  assertNoUuidCollisions,
  assertOutputPathAvailable,
  assertSemanticContentPreserved,
  assertSenseOrderAvailable,
  canonicalHash,
  makeProvenanceRecord,
  preparePlan,
  sha256,
  stableAuthoredContent,
  stableUuidV7,
  upsertPins,
} from "./hybrid-100-canonical-promote";

const tempRoots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "vocabflow-promotion-test-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Phase 2F.3 promotion gates", () => {
  it("rejects a changed approved draft fingerprint", () => {
    const approval = { ownerApproved: true, canonicalPromotionAuthorized: true, ownerApprovalScope: "CANONICAL_DRAFT_PROMOTION_ONLY", approvedCandidateCount: 100, approvedDraftFingerprint: APPROVED_DRAFT_FINGERPRINT, sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT };
    expect(() => assertApprovalEvidence(approval, "0".repeat(64), SOURCE_PROOF_FINGERPRINT)).toThrow("APPROVED_DRAFT_PIN_INVALID");
  });

  it("rejects owner approval set to false", () => {
    const approval = { ownerApproved: false, canonicalPromotionAuthorized: true, ownerApprovalScope: "CANONICAL_DRAFT_PROMOTION_ONLY", approvedCandidateCount: 100, approvedDraftFingerprint: APPROVED_DRAFT_FINGERPRINT, sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT };
    expect(() => assertApprovalEvidence(approval, APPROVED_DRAFT_FINGERPRINT, SOURCE_PROOF_FINGERPRINT)).toThrow("OWNER_APPROVAL_PIN_INVALID");
  });

  it("rejects an owner approval count other than 100", () => {
    const approval = { ownerApproved: true, canonicalPromotionAuthorized: true, ownerApprovalScope: "CANONICAL_DRAFT_PROMOTION_ONLY", approvedCandidateCount: 99, approvedDraftFingerprint: APPROVED_DRAFT_FINGERPRINT, sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT };
    expect(() => assertApprovalEvidence(approval, APPROVED_DRAFT_FINGERPRINT, SOURCE_PROOF_FINGERPRINT)).toThrow("OWNER_APPROVAL_COUNT_INVALID");
  });

  it("requires the reviewed decision split and exact promotion deltas", () => {
    const decisions = [
      { identityDecision: "REUSE_EXISTING_SENSE", masterSenseId: "01a0fc13-09ef-75ac-b815-039ab337c01a" },
      { identityDecision: "REUSE_EXISTING_SENSE", masterSenseId: "01a0fc13-09ee-7768-9be6-d20fa32521ee" },
      ...Array.from({ length: 3 }, (_, index) => ({ identityDecision: "NEW_SENSE_EXISTING_LEXEME", masterLexemeId: index < 2 ? "01a0fc13-09ee-7fd1-8ad8-a2026a7620e0" : "01a0fc13-09ef-7e5d-b757-aa456f0cd969" })),
      ...Array.from({ length: 95 }, () => ({ identityDecision: "NEW_SENSE_NEW_LEXEME" })),
    ];
    expect(() => assertIdentityDecisionCounts(decisions, Array.from({ length: 84 }, (_, i) => ({ id: `l${i}` })), Array.from({ length: 98 }, (_, i) => ({ id: `s${i}` })))).not.toThrow();
    expect(() => assertIdentityDecisionCounts(decisions.slice(1), Array.from({ length: 84 }, () => ({})), Array.from({ length: 98 }, () => ({})))).toThrow("IDENTITY_DECISION_COUNTS_INVALID");
  });

  it("detects changed raw bytes in reviewed canonical dependencies", () => {
    const root = tempRoot();
    const refs = [
      ["01a0fc13-09ef-75ac-b815-039ab337c01a", "sense"],
      ["01a0fc13-09ee-7768-9be6-d20fa32521ee", "sense"],
      ["01a0fc13-09ee-7fd1-8ad8-a2026a7620e0", "lexeme"],
      ["01a0fc13-09ef-7e5d-b757-aa456f0cd969", "lexeme"],
      ["01a0fc13-09ef-73b3-b970-1a8bd5d48a27", "lexeme"],
    ].map(([id, type]) => {
      const folder = type === "sense" ? "senses" : "lexemes";
      const idField = type === "sense" ? "masterSenseId" : "masterLexemeId";
      const filePath = `vocabflow-dataset/master/${folder}/${id}-r1.json`;
      const absolute = path.join(root, filePath);
      mkdirSync(path.dirname(absolute), { recursive: true });
      const bytes = `${JSON.stringify({ [idField]: id }, null, 2)}\n`;
      writeFileSync(absolute, bytes);
      return { [idField]: id, revision: 1, recordPath: filePath, contentHash: sha256(bytes) };
    });
    const decisions = [
      { existingMasterIdentityReview: { reusedCanonicalSense: refs[0], comparedCanonicalSenses: [refs[1]], canonicalLexeme: refs[4] } },
      { existingMasterIdentityReview: { reusedCanonicalSense: refs[1], canonicalLexeme: refs[2] } },
      { existingMasterIdentityReview: { canonicalLexeme: refs[3] } },
    ];
    expect(() => assertDependencyHashes(root, { includedLexemes: [], includedSenses: [] }, decisions)).not.toThrow();
    writeFileSync(path.join(root, refs[0].recordPath), "changed\n");
    expect(() => assertDependencyHashes(root, { includedLexemes: [], includedSenses: [] }, decisions)).toThrow("CANONICAL_BASE_STALE");
  });

  it("blocks collisions with existing UUIDs and occupied destination paths", () => {
    const id = "01a1070c-7c56-71df-b6f0-3750741bcfb0";
    const planned = [{ path: `master/lexemes/${id}-r1.json`, record: { masterLexemeId: id }, contentHash: "x" }];
    expect(() => assertNoUuidCollisions(new Map([[id, new Set(["master/lexemes/other-r1.json"])]]), planned)).toThrow("MASTER_ID_COLLISION");
    expect(() => assertNoUuidCollisions(new Map(), [...planned, { ...planned[0], path: "master/lexemes/duplicate-r1.json" }])).toThrow("duplicate planned identity");
    expect(() => assertOutputPathAvailable({ masterLexemeId: "other" }, { masterLexemeId: id }, planned[0].path)).toThrow("MASTER_ID_COLLISION");
  });

  it("blocks Sense order collisions without changing prior order values", () => {
    const orders = new Map([["lexeme-1", new Set([1, 2])]]);
    expect(() => assertSenseOrderAvailable(orders, "lexeme-1", 2)).toThrow("SENSE_ORDER_COLLISION");
    expect([...orders.get("lexeme-1") ?? []]).toEqual([1, 2]);
    expect(() => assertSenseOrderAvailable(orders, "lexeme-1", 3)).not.toThrow();
  });

  it("creates stable UUIDv7 provenance identities and project-authored provenance without external license claims", () => {
    const first = stableUuidV7("PROJECT_AUTHORED|child-1|sense.definitions");
    expect(first).toBe(stableUuidV7("PROJECT_AUTHORED|child-1|sense.definitions"));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const record = makeProvenanceRecord({ provenanceId: first, subjectType: "LINGUISTIC_CHILD", subjectId: "child-1", fieldPath: "sense.definitions", sourceType: "PROJECT_AUTHORED" });
    expect(record.sourceType).toBe("PROJECT_AUTHORED");
    expect(record).not.toHaveProperty("sourceUrl");
    expect(record).not.toHaveProperty("licenseName");
    expect(record).not.toHaveProperty("licenseUrl");
  });

  it("uses OWNER_REVIEW provenance to describe DRAFT promotion scope, not learner release approval", () => {
    const record = makeProvenanceRecord({ provenanceId: stableUuidV7("OWNER_REVIEW|sense-1|candidate-1"), subjectType: "SENSE", subjectId: "sense-1", fieldPath: "sense.editorialDecision", sourceType: "OWNER_REVIEW", candidateId: "candidate-1" });
    expect(record.sourceType).toBe("OWNER_REVIEW");
    expect(record.notes).toContain("canonical DRAFT promotion only");
    expect(record.notes).not.toContain("LICENSED_SOURCE");
    expect(record).not.toHaveProperty("sourceUrl");
    expect(record).not.toHaveProperty("licenseName");
  });

  it("merges manifest pins by identity without duplicate records", () => {
    const pin = { masterLexemeId: "lexeme-1", lexemeRevision: 1, recordPath: "master/lexemes/lexeme-1-r1.json", contentHash: "abc" };
    const result = upsertPins([pin], [pin, { ...pin, masterLexemeId: "lexeme-2", recordPath: "master/lexemes/lexeme-2-r1.json" }], "masterLexemeId");
    expect(result).toHaveLength(2);
    expect(() => upsertPins([pin], [{ ...pin, contentHash: "different" }], "masterLexemeId")).toThrow("MANIFEST_PIN_COLLISION");
  });

  it("keeps the DRAFT manifest free of release hashes", () => {
    expect(() => assertDraftManifest({ status: "DRAFT", datasetVersion: "2.0.0" })).not.toThrow();
    expect(() => assertDraftManifest({ status: "DRAFT", releaseHash: "a".repeat(64) })).toThrow("ROOT_MANIFEST_RELEASE_FIELDS_INVALID");
    expect(() => assertDraftManifest({ status: "APPROVED" })).toThrow("ROOT_MANIFEST_STATUS_INVALID");
  });

  it("verifies canary tree snapshots remain byte-identical", () => {
    const before = [{ path: "releases/canary-v2.1.0/dataset.json", sha256: "abc" }];
    expect(() => assertCanarySnapshotUnchanged(before, structuredClone(before))).not.toThrow();
    expect(() => assertCanarySnapshotUnchanged(before, [{ ...before[0], sha256: "changed" }])).toThrow("CANARY_V2_1_0_CHANGED");
  });

  it("preserves every approved semantic field while adding provenance IDs", () => {
    const workspace = { masterSenseId: "sense-1", senseLabel: [{ language: "en", text: "a test" }], definitions: [{ definitionId: "def-1", text: "A test definition." }] };
    const canonical = { ...structuredClone(workspace), provenanceIds: ["prov-sense"], definitions: [{ ...workspace.definitions[0], provenanceIds: ["prov-def"] }] };
    expect(stableAuthoredContent(canonical)).toEqual(stableAuthoredContent(workspace));
    expect(() => assertSemanticContentPreserved(workspace, canonical)).not.toThrow();
    canonical.definitions[0].text = "Changed definition.";
    expect(() => assertSemanticContentPreserved(workspace, canonical)).toThrow("APPROVED_DRAFT_CONTENT_CHANGED");
  });
});

describe("materialized Phase 2F.3 promotion", () => {
  it("has the exact 84/98 delta, does not duplicate reused identities, and is idempotent", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const plan = preparePlan(root);
    expect(plan.required).toBe(0);
    expect(plan.records.lexemes).toHaveLength(84);
    expect(plan.records.senses).toHaveLength(98);
    expect(plan.records.provenance).toHaveLength(590);
    expect(plan.summary.canonicalLexemeTotal).toBe(103);
    expect(plan.summary.canonicalSenseTotal).toBe(123);
    expect(plan.summary.sourceTypes).toEqual({ PROJECT_AUTHORED: 490, OWNER_REVIEW: 100, LICENSED_SOURCE: 0, PUBLIC_DOMAIN_SOURCE: 0 });
    expect(plan.records.senses.some((item: { record: { masterSenseId: string } }) => item.record.masterSenseId === "01a0fc13-09ef-75ac-b815-039ab337c01a")).toBe(false);
    expect(plan.records.senses.some((item: { record: { masterSenseId: string } }) => item.record.masterSenseId === "01a0fc13-09ee-7768-9be6-d20fa32521ee")).toBe(false);
    expect(plan.records.lexemes.some((item: { record: { masterLexemeId: string } }) => ["01a0fc13-09ee-7fd1-8ad8-a2026a7620e0", "01a0fc13-09ef-7e5d-b757-aa456f0cd969", "01a0fc13-09ef-73b3-b970-1a8bd5d48a27"].includes(item.record.masterLexemeId))).toBe(false);
    expect(plan.manifest.datasetVersion).toBe("2.0.0");
    expect(plan.manifest.status).toBe("DRAFT");
    expect(plan.manifest.releaseHash).toBeUndefined();
    expect(plan.manifest.includedClassifications).toEqual(plan.verified.datasetManifest.includedClassifications);
    expect(plan.manifest.includedMediaAssets).toEqual(plan.verified.datasetManifest.includedMediaAssets);
    expect(plan.manifest.includedMediaAssetVersions).toEqual(plan.verified.datasetManifest.includedMediaAssetVersions);
    expect(plan.summary.canaryChanged).toBe(false);
    expect(canonicalHash(plan.registry.provenancePurposeToId)).toBe(canonicalHash(preparePlan(root).registry.provenancePurposeToId));
    const expectedSenseIds = new Set(plan.records.senses.map((item: { record: { masterSenseId: string } }) => item.record.masterSenseId));
    expect(plan.manifest.includedSenses.filter((pin: { masterSenseId: string }) => expectedSenseIds.has(pin.masterSenseId))).toHaveLength(98);
    const expectedLexemeIds = new Set(plan.records.lexemes.map((item: { record: { masterLexemeId: string } }) => item.record.masterLexemeId));
    expect(plan.manifest.includedLexemes.filter((pin: { masterLexemeId: string }) => expectedLexemeIds.has(pin.masterLexemeId))).toHaveLength(84);
    const expectedProvenanceIds = new Set(plan.records.provenance.map((item: { record: { provenanceId: string } }) => item.record.provenanceId));
    expect(plan.manifest.includedProvenance.filter((pin: { provenanceId: string }) => expectedProvenanceIds.has(pin.provenanceId))).toHaveLength(590);
    const authored = plan.records.senses[0];
    expect(authored.record.status).toBe("DRAFT");
    expect(authored.record.pronunciationOverrides).toEqual([]);
    expect(authored.record.examples[0].audioAssetIds).toEqual([]);
    const canaryBefore = readFileSync(path.join(root, "vocabflow-dataset/workspaces/hybrid-100-editorial-draft/canonical-promotion.json"), "utf8");
    expect(JSON.parse(canaryBefore).canaryTreeFingerprintBefore).toBeDefined();
  });
});
