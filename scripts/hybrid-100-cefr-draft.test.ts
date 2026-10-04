import { describe, expect, it } from "vitest";
import { version as uuidVersion } from "uuid";
import {
  APPROVED_SEMANTIC_DRAFT_FINGERPRINT,
  FRAMEWORK_CODE,
  FRAMEWORK_VERSION,
  TAXONOMY_ID,
  TAXONOMY_VERSION,
  assertNoDuplicatePrimaryCefr,
  assertPinnedSense,
  assertRightsSafe,
  assertTaxonomyContract,
  auditExistingCefr,
  buildReadiness,
  buildRegistryMappings,
  canonicalHash,
  createClassificationProvenance,
  createClassificationRecord,
  decideClassification,
  stableUuidV7,
} from "./hybrid-100-cefr-draft";

const emptyAudit = auditExistingCefr([], "B1");

describe("hybrid 100 CEFR editorial draft", () => {
  it("reuses an existing primary classification when the pilot value agrees", () => {
    const existing = {
      classificationId: "00000000-0000-7000-8000-000000000001",
      classificationRevision: 1,
      valueCode: "A2",
      frameworkCode: FRAMEWORK_CODE,
      frameworkVersion: FRAMEWORK_VERSION,
      isPrimary: true,
      status: "IN_REVIEW",
      sourceProvenanceIds: ["00000000-0000-7000-8000-000000000002"],
      contentHash: "a".repeat(64),
    };
    const audit = auditExistingCefr([existing], "A2");
    const decision = decideClassification({ valueCode: "A2", confidence: 0.8, sourceCefrEvidence: ["A2"], existingAudit: audit });
    expect(audit.records[0]).toMatchObject({ classificationId: existing.classificationId, revision: 1, valueCode: "A2", contentHash: existing.contentHash });
    expect(decision.decisionType).toBe("REUSE_EXISTING_CLASSIFICATION");
    expect(auditExistingCefr([existing, { ...existing, classificationId: "00000000-0000-7000-8000-000000000003" }], "A2").category).toBe("CONFLICTING_EXISTING_CEFR");
  });

  it("blocks duplicate or conflicting primary CEFR decisions on one Sense", () => {
    const row = (masterSenseId: string, valueCode: string, candidateId: string) => ({ masterSenseId, candidateId, editorialDecision: { decisionType: "NEW_EDITORIAL_CLASSIFICATION", valueCode } });
    expect(() => assertNoDuplicatePrimaryCefr([row("sense-1", "A1", "a"), row("sense-1", "A1", "b")])).toThrow("DUPLICATE_PRIMARY_CEFR");
    expect(() => assertNoDuplicatePrimaryCefr([row("sense-1", "A1", "a"), row("sense-1", "B2", "b")])).toThrow("CONFLICTING_PRIMARY_CEFR");
    expect(() => assertNoDuplicatePrimaryCefr([row("sense-1", "A1", "a"), row("sense-2", "B2", "b")])).not.toThrow();
  });

  it("stores a classification against one Master Sense rather than a Lexeme", () => {
    const record = createClassificationRecord({ classificationId: stableUuidV7("class-shape"), masterSenseId: "sense-1", valueCode: "B1", confidence: 0.8, sourceProvenanceIds: [stableUuidV7("prov-shape")] });
    expect(record).toMatchObject({ masterSenseId: "sense-1", dimension: "CEFR", frameworkCode: FRAMEWORK_CODE, frameworkVersion: FRAMEWORK_VERSION, isPrimary: true, status: "DRAFT" });
    expect(Object.hasOwn(record, "masterLexemeId")).toBe(false);
  });

  it("allows sibling Senses of the same Lexeme to have different levels", () => {
    expect(() => assertNoDuplicatePrimaryCefr([
      { masterSenseId: "sense-light-adj", lemma: "light", editorialDecision: { decisionType: "NEW_EDITORIAL_CLASSIFICATION", valueCode: "A1" } },
      { masterSenseId: "sense-light-noun", lemma: "light", editorialDecision: { decisionType: "NEW_EDITORIAL_CLASSIFICATION", valueCode: "B2" } },
    ])).not.toThrow();
  });

  it("uses source CEFR evidence as evidence rather than copying it", () => {
    const decision = decideClassification({ valueCode: "B1", confidence: 0.8, sourceCefrEvidence: ["B2"], existingAudit: emptyAudit });
    expect(decision).toMatchObject({ decisionType: "NEW_EDITORIAL_CLASSIFICATION", agreementStatus: "EDITORIALLY_ADJUSTED" });
  });

  it("requires an independent editorial decision for a 4600-only row", () => {
    const independent = decideClassification({ valueCode: "B1", confidence: 0.8, sourceCefrEvidence: [], existingAudit: emptyAudit });
    const insufficient = decideClassification({ valueCode: null, confidence: 0.52, sourceCefrEvidence: [], existingAudit: auditExistingCefr([], null) });
    expect(independent).toMatchObject({ decisionType: "NEW_EDITORIAL_CLASSIFICATION", agreementStatus: null });
    expect(insufficient.decisionType).toBe("UNCLASSIFIED_INSUFFICIENT_EVIDENCE");
  });

  it("creates only project-authored provenance while source rights are unverified", () => {
    const provenance = createClassificationProvenance(stableUuidV7("provenance-test"), stableUuidV7("classification-test"));
    expect(provenance.sourceType).toBe("PROJECT_AUTHORED");
    expect(provenance.notes).toContain("not represented as official or licensed");
    expect(() => assertRightsSafe(provenance)).not.toThrow();
    expect(() => assertRightsSafe({ sourceType: "LICENSED_SOURCE" })).toThrow("UNVERIFIED_SOURCE_PROVENANCE_FORBIDDEN");
  });

  it("leaves low-confidence decisions unclassified or in the owner queue", () => {
    const result = decideClassification({ valueCode: "B2", confidence: 0.52, sourceCefrEvidence: [], existingAudit: emptyAudit });
    expect(result.decisionType).toBe("UNCLASSIFIED_INSUFFICIENT_EVIDENCE");
  });

  it("keeps registry IDs stable across a rerun and allocates no new IDs", () => {
    const rows = [
      { masterSenseId: "sense-new", editorialDecision: { decisionType: "NEW_EDITORIAL_CLASSIFICATION", valueCode: "B1" }, existingClassificationAudit: { records: [] } },
      { masterSenseId: "sense-existing", editorialDecision: { decisionType: "REUSE_EXISTING_CLASSIFICATION", valueCode: "A2" }, existingClassificationAudit: { records: [{ frameworkCode: FRAMEWORK_CODE, frameworkVersion: FRAMEWORK_VERSION, classificationId: "existing-class", sourceProvenanceIds: ["existing-provenance"] }] } },
    ];
    const first = buildRegistryMappings(rows);
    const rerun = buildRegistryMappings(rows, first.registry);
    expect(first.allocatedIdCount).toBe(2);
    expect(rerun.allocatedIdCount).toBe(0);
    expect(rerun.registry).toEqual(first.registry);
    const newMapping = first.registry.mappings.find((item) => item.masterSenseId === "sense-new")!;
    expect(uuidVersion(newMapping.classificationId as string)).toBe(7);
    expect(uuidVersion(newMapping.provenanceIds[0] as string)).toBe(7);
  });

  it("rejects raw source content, absolute paths, and source URLs", () => {
    expect(() => assertRightsSafe({ sourceDefinition: "raw copied definition" })).toThrow("RAW_SOURCE_CONTENT_FORBIDDEN");
    expect(() => assertRightsSafe({ evidencePath: "D:\\private\\source.apkg" })).toThrow("ABSOLUTE_PATH_OR_SOURCE_URL_FORBIDDEN");
    expect(() => assertRightsSafe({ sourceUrl: "https://example.com/entry" })).toThrow("ABSOLUTE_PATH_OR_SOURCE_URL_FORBIDDEN");
  });

  it("blocks a wrong taxonomy or framework contract", () => {
    const taxonomy = { taxonomyId: TAXONOMY_ID, taxonomyVersion: TAXONOMY_VERSION, status: "DRAFT", cefrFrameworks: [{ frameworkCode: FRAMEWORK_CODE, frameworkVersion: FRAMEWORK_VERSION, labels: [{ language: "en", text: "CEFR band labels for editorial pilot estimates" }], status: "ACTIVE" }] };
    const pin = { taxonomyId: TAXONOMY_ID, taxonomyVersion: TAXONOMY_VERSION, recordPath: `taxonomy/${TAXONOMY_ID}-${TAXONOMY_VERSION}.json`, contentHash: canonicalHash(taxonomy) };
    expect(() => assertTaxonomyContract(taxonomy, pin)).not.toThrow();
    expect(() => assertTaxonomyContract({ ...taxonomy, cefrFrameworks: [{ frameworkCode: "CEFR_GLOBAL", frameworkVersion: FRAMEWORK_VERSION, status: "ACTIVE" }] }, pin)).toThrow("TAXONOMY_HASH_STALE");
    const wrongFramework = { ...taxonomy, cefrFrameworks: [{ frameworkCode: "CEFR_GLOBAL", frameworkVersion: FRAMEWORK_VERSION, status: "ACTIVE" }] };
    expect(() => assertTaxonomyContract(wrongFramework, { ...pin, contentHash: canonicalHash(wrongFramework) })).toThrow("CEFR_FRAMEWORK_CONTRACT_INVALID");
    const wrongSemantics = { ...taxonomy, cefrFrameworks: [{ ...taxonomy.cefrFrameworks[0], labels: [{ language: "en", text: "Official CEFR classifications" }] }] };
    expect(() => assertTaxonomyContract(wrongSemantics, { ...pin, contentHash: canonicalHash(wrongSemantics) })).toThrow("CEFR_FRAMEWORK_EDITORIAL_SEMANTICS_INVALID");
  });

  it("blocks stale canonical Sense content", () => {
    const sense = { masterSenseId: "sense-1", senseRevision: 1, label: "original" };
    const pin = { masterSenseId: "sense-1", senseRevision: 1, recordPath: "master/senses/sense-1-r1.json", contentHash: canonicalHash(sense) };
    expect(() => assertPinnedSense(sense, pin, "sense-1")).not.toThrow();
    expect(() => assertPinnedSense({ ...sense, label: "changed" }, pin, "sense-1")).toThrow("CANONICAL_HYBRID_BASE_STALE");
  });

  it("keeps content readiness separate from approved release readiness", () => {
    const result = buildReadiness({ candidateCount: 100, decisionCounts: { NEW_EDITORIAL_CLASSIFICATION: 94, REUSE_EXISTING_CLASSIFICATION: 1, OWNER_REVIEW_REQUIRED: 4, UNCLASSIFIED_INSUFFICIENT_EVIDENCE: 1 }, valueCount: 99, existingClassificationConflictCount: 1, duplicatePrimaryCount: 0, canaryFingerprint: "b".repeat(64), correctionRate: 24 / 98 });
    expect(result.readiness).toEqual({ HYBRID_100_CONTENT_COHORT_READY: "YES", HYBRID_100_APPROVED_RELEASE_READY: "NO" });
    expect(result.gates.CEFR.status).toBe("OWNER_REVIEW_REQUIRED");
    expect(result.gates.RELEASE_APPROVAL.status).toBe("NOT_AUTHORIZED");
    expect(result.cohort).toBe("HYBRID_100_OWNER_APPROVED_SEMANTIC_COHORT");
    expect(APPROVED_SEMANTIC_DRAFT_FINGERPRINT).toMatch(/^[a-f0-9]{64}$/);
  });
});
