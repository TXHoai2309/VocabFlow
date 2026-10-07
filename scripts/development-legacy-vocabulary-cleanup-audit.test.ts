import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeLegacyCandidate,
  deriveOwnerReviewedExclusions,
  readOwnerReviewedExclusions,
  assertDevelopmentTarget,
  assertReadOnlySql,
  classifyRuntimeVocabulary,
  deterministicAuditFingerprint,
  normalizeWord,
  rejectMutationOptions,
  sanitizeRuntimeRows,
  simulateDeleteImpact
} from "./development-legacy-vocabulary-cleanup-audit";
import { closeLegacySemanticExclusions } from "./development-legacy-semantic-exclusion-closure";

const mapping = (runtimeVocabularyId: number, masterSenseId = "sense-1", masterLexemeId = "lexeme-1") => ({
  masterSenseId, masterLexemeId, runtimeVocabularyId, sourceDatasetId: "dataset-1", sourceDatasetVersion: "2.2.1",
  sourceSchemaVersion: "2.0.1", projectionContractVersion: "projection-1", appliedProjectionFingerprint: "a".repeat(64),
  appliedLexemeRevision: 1, appliedSenseRevision: 1, lastReleaseHash: "b".repeat(64), lastImportRunId: "run-1"
});

function row(overrides: Record<string, unknown> = {}) {
  return {
    runtimeVocabularyId: 9000, word: "obsolete", normalizedWord: "obsolete", enabled: false, contentVersion: 1,
    sourceDataset: null, sourceRecordId: null, mappings: [], referenceCounts: {}, totalReferenceCount: 0,
    hasAnyReference: false, applicationReferenceCount: 0, sourceIdentityObligation: false,
    runtimeDependencyDetected: false, topLevelPartition: "LEGACY_UNMAPPED" as const, mappingAnomalyReasons: [],
    ...overrides
  };
}

function classify(inputRow = row(), candidate = undefined, hybridIds = new Set<number>()) {
  return classifyRuntimeVocabulary({ rows: [inputRow], candidates: candidate ? [candidate] : [], referenceInventoryComplete: true, hybridRuntimeIds: hybridIds })[0]!;
}

const exactMaster = {
  masterSenseId: "sense-1", masterLexemeId: "lexeme-1", normalizedLemma: "obsolete", lemma: "obsolete", partOfSpeech: "NOUN", translations: ["cũ"], aliases: []
};

describe("Phase 2G.3A cleanup classification safety", () => {
  it("1. keeps a valid Master-mapped row", () => {
    expect(classify(row({ mappings: [mapping(9000)], topLevelPartition: "MASTER_MANAGED" })).cleanupClass).toBe("KEEP_MASTER_MANAGED");
  });

  it("2. never marks a row with learner progress as delete-safe", () => {
    expect(classify(row({ totalReferenceCount: 1, hasAnyReference: true, referenceCounts: { "vocabflow_app.learner_progress.vocabulary_id": 1 } })).cleanupClass).toBe("KEEP_REFERENCED_LEGACY");
  });

  it("3. never marks a row with review events as delete-safe", () => {
    expect(classify(row({ totalReferenceCount: 2, hasAnyReference: true, referenceCounts: { "vocabflow_app.review_events.vocabulary_id": 2 } })).cleanupClass).toBe("KEEP_REFERENCED_LEGACY");
  });

  it("4. treats any discovered foreign-key reference as a blocker", () => {
    expect(classify(row({ totalReferenceCount: 1, hasAnyReference: true, referenceCounts: { "vocabflow_app.learning_set_items.vocabulary_id": 1 } })).cleanupClass).toBe("KEEP_REFERENCED_LEGACY");
  });

  it("5. treats an application-level reference as a blocker", () => {
    expect(classify(row({ totalReferenceCount: 1, hasAnyReference: true, applicationReferenceCount: 1 })).cleanupClass).toBe("KEEP_REFERENCED_LEGACY");
  });

  it("6. considers deletion only for disabled, zero-reference, unambiguous, source-free rows", () => {
    expect(classify(row()).cleanupClass).toBe("DELETE_SAFE_CANDIDATE");
    expect(classify(row({ totalReferenceCount: 1, hasAnyReference: true })).cleanupClass).not.toBe("DELETE_SAFE_CANDIDATE");
  });

  it("7. records exact candidates without creating a Master mapping", () => {
    const result = analyzeLegacyCandidate({ ...row(), vietnameseForAnalysis: "khác" }, [exactMaster], new Map(), new Map());
    expect(result.relation).toBe("POSSIBLE_SAME_IDENTITY");
    expect(result.automaticMappingCreated).toBe(false);
    expect(row().mappings).toHaveLength(0);
  });

  it("8. treats an alias/synonym match as related, not same identity", () => {
    const aliasCandidate = { ...exactMaster, normalizedLemma: "distinct", lemma: "distinct", aliases: ["obsolete"] };
    const result = analyzeLegacyCandidate({ ...row(), vietnameseForAnalysis: "khác" }, [aliasCandidate], new Map(), new Map());
    expect(result.relation).toBe("SEMANTIC_RELATED_NOT_SAME_IDENTITY");
    expect(result.candidates[0]?.identityClaim).toBe("NONE");
  });

  it("9. keeps homonym/polysemy candidates ambiguous when multiple Senses share a lemma", () => {
    const secondSense = { ...exactMaster, masterSenseId: "sense-2", partOfSpeech: "VERB" };
    const result = analyzeLegacyCandidate({ ...row(), vietnameseForAnalysis: "khác" }, [exactMaster, secondSense], new Map(), new Map());
    expect(result.relation).toBe("MULTIPLE_MASTER_CANDIDATES");
  });

  it("10. flags an exact lemma already mapped to another Sense as a polysemy conflict", () => {
    const result = analyzeLegacyCandidate({ ...row(), vietnameseForAnalysis: "khác" }, [exactMaster], new Map(), new Map([[8000, "obsolete"]]));
    expect(result.relation).toBe("HOMONYM_OR_POLYSEMY_CONFLICT");
    expect(result.automaticMappingCreated).toBe(false);
  });

  it("10b. identifies an existing same-Sense runtime row as a review candidate", () => {
    const result = analyzeLegacyCandidate({ ...row(), vietnameseForAnalysis: "khác" }, [exactMaster], new Map([["sense-1", mapping(7000)]]), new Map());
    expect(result.relation).toBe("EXISTING_MASTER_RUNTIME_DUPLICATE");
    expect(result.automaticMappingCreated).toBe(false);
  });

  it("11. never makes historical #11 delete-safe while its history exists", () => {
    const result = classify(row({ runtimeVocabularyId: 11, totalReferenceCount: 6, hasAnyReference: true,
      referenceCounts: { "vocabflow_app.learner_progress.vocabulary_id": 1, "vocabflow_app.review_events.vocabulary_id": 5 } }));
    expect(result.cleanupClass).toBe("KEEP_REFERENCED_LEGACY");
  });

  it("12. keeps #284 protected by its existing booking Master mapping", () => {
    const result = classify(row({ runtimeVocabularyId: 284, word: "reservation", normalizedWord: "reservation", mappings: [mapping(284, "booking-sense")], topLevelPartition: "MASTER_MANAGED" }));
    expect(result.cleanupClass).toBe("KEEP_MASTER_MANAGED");
  });

  it("13. keeps current Hybrid-100 mapped rows outside cleanup classes", () => {
    const result = classify(row({ mappings: [mapping(9000)], topLevelPartition: "MASTER_MANAGED" }), undefined, new Set([9000]));
    expect(result.cleanupClass).toBe("KEEP_MASTER_MANAGED");
    expect(result.reasons).toContain("HYBRID_100_CURRENT_COHORT");
  });

  it("14. classifies every supplied runtime row exactly once", () => {
    const rows = [row({ runtimeVocabularyId: 1 }), row({ runtimeVocabularyId: 2 }), row({ runtimeVocabularyId: 3, mappings: [mapping(3)], topLevelPartition: "MASTER_MANAGED" })];
    const result = classifyRuntimeVocabulary({ rows, candidates: [], referenceInventoryComplete: true, hybridRuntimeIds: new Set([3]) });
    expect(result).toHaveLength(rows.length);
    expect(new Set(result.map((entry) => entry.runtimeVocabularyId)).size).toBe(rows.length);
  });

  it("15. assigns one and only one top-level cleanup class per row", () => {
    const result = classifyRuntimeVocabulary({ rows: [row()], candidates: [], referenceInventoryComplete: true, hybridRuntimeIds: new Set() });
    expect(result[0]?.cleanupClass).toBe("DELETE_SAFE_CANDIDATE");
    expect(result[0]).toHaveProperty("cleanupClass");
  });

  it("16. proves hypothetical DELETE_SAFE removal affects zero references", () => {
    const simulation = simulateDeleteImpact({ candidates: [{ runtimeVocabularyId: 7, cleanupClass: "DELETE_SAFE_CANDIDATE" }], references: [], totalRuntimeRows: 10 });
    expect(simulation).toMatchObject({ hypotheticalRowsRemoved: 1, remainingRuntimeRows: 9, allDiscoveredReferencesAffected: 0 });
  });

  it("17. fails closed if a DELETE_SAFE simulation discovers any reference", () => {
    const references = [{ schema: "vocabflow_app", table: "learner_progress", column: "vocabulary_id", columnType: "integer", applicationLevel: false, foreignKeys: [], canSelect: true, referenceCountByVocabularyId: { 7: 1 } }];
    expect(() => simulateDeleteImpact({ candidates: [{ runtimeVocabularyId: 7, cleanupClass: "DELETE_SAFE_CANDIDATE" }], references, totalRuntimeRows: 10 })).toThrow("DELETE_SAFE_CLASSIFICATION_HAS_REFERENCES");
  });

  it("18. serializes only vocabulary and aggregate reference fields, without learner PII", () => {
    const json = JSON.stringify(sanitizeRuntimeRows([row({ word: "safe" })]));
    for (const forbidden of ["learner_id", "learnerId", "householdId", "email", "sessionId", "userId"]) expect(json).not.toContain(forbidden);
    expect(json).toContain("runtimeVocabularyId");
  });

  it("19. rejects Production target identity before database use", () => {
    expect(() => assertDevelopmentTarget({ environment: "production", provider: "neon", projectId: "shy-hill-72364426", branchId: "br-rough-silence-b3gbqjcb", databaseName: "neondb", roleName: "vocabflow_runtime" })).toThrow("DEVELOPMENT_RUNTIME_TARGET_MISMATCH");
  });

  it("20. has no database write statement in the audit execution source", () => {
    const source = readFileSync(path.join(process.cwd(), "scripts/development-legacy-vocabulary-cleanup-audit.ts"), "utf8");
    expect(source).toMatch(/SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/);
    expect(source).toMatch(/assertReadOnlySql\(sqlText\);\s*return await tx\.unsafe/);
    expect(() => assertReadOnlySql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")).not.toThrow();
    expect(() => assertReadOnlySql("INSERT INTO vocabflow_app.vocabularies VALUES (1)" )).toThrow("NON_READ_ONLY_SQL_REJECTED");
    expect(() => assertReadOnlySql("UPDATE vocabflow_app.vocabularies SET enabled = false" )).toThrow("NON_READ_ONLY_SQL_REJECTED");
    expect(() => assertReadOnlySql("DELETE FROM vocabflow_app.vocabularies" )).toThrow("NON_READ_ONLY_SQL_REJECTED");
  });

  it.each(["--apply", "--delete", "--disable", "--cleanup", "--merge"])("21. rejects mutation option %s", (option) => {
    expect(() => rejectMutationOptions([option])).toThrow("MUTATION_OPTIONS_NOT_AUTHORIZED");
  });

  it("22. produces the same SHA-256 fingerprint from the same snapshot payload", () => {
    const payload = { target: { environment: "development", branch: "dev" }, ids: [1, 2], count: 3 };
    expect(deterministicAuditFingerprint(payload)).toBe(deterministicAuditFingerprint(payload));
  });

  it("23. normalizes Unicode and whitespace deterministically for exact lexical checks", () => {
    expect(normalizeWord("  ＬＩＧＨＴ\t Word ")).toBe("light word");
  });

  it("24. gives reviewed light exclusions precedence over exact lemma", () => {
    const result = analyzeLegacyCandidate({ ...row({ runtimeVocabularyId: 1260, word: "light", normalizedWord: "light" }), vietnameseForAnalysis: "nhẹ" }, [], new Map(), new Map());
    expect(result.relation).toBe("OWNER_REVIEWED_NOT_SAME_IDENTITY");
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0]?.identityClaim).toBe("NONE");
    expect(result.automaticMappingCreated).toBe(false);
  });

  it("25. keeps uncertain reference inventory rows out of DELETE_SAFE", () => {
    const result = classifyRuntimeVocabulary({ rows: [row()], candidates: [], referenceInventoryComplete: false, hybridRuntimeIds: new Set() });
    expect(result[0]?.cleanupClass).toBe("ANOMALY_REVIEW_REQUIRED");
  });

  it("26. preserves source identity obligations from hard-delete recommendations", () => {
    const result = classify(row({ sourceDataset: "legacy-import", sourceRecordId: 18, sourceIdentityObligation: true }));
    expect(result.cleanupClass).toBe("DISABLE_CANDIDATE");
  });
});

describe("Phase 2G.3A.1 owner-reviewed semantic precedence", () => {
  const excluded = readOwnerReviewedExclusions().exclusions;
  it.each([11, 405, 846, 1313, 1330, 1477, 1796, 944, 1260, 1463, 1482])("excludes reviewed pairs for runtime #%i even when already mapped", (id) => {
    const pairs = excluded.filter((pair) => pair.runtimeVocabularyId === id);
    expect(pairs.length).toBeGreaterThan(0);
    const corpus = pairs.map((pair) => ({ ...exactMaster, ...pair, normalizedLemma: normalizeWord(pair.lemma), aliases: ["test"], translations: ["test"] }));
    const result = analyzeLegacyCandidate({ ...row({ runtimeVocabularyId: id, normalizedWord: corpus[0]!.normalizedLemma }), vietnameseForAnalysis: "test" }, corpus,
      new Map(pairs.map((pair) => [pair.masterSenseId, mapping(9999, pair.masterSenseId)])), new Map());
    expect(result.relation).toBe("OWNER_REVIEWED_NOT_SAME_IDENTITY");
    expect(result.candidates.every((candidate) => candidate.identityClaim === "NONE")).toBe(true);
    expect(result.automaticMappingCreated).toBe(false);
  });

  it("uses finalized decisions rather than proposal recommendations and preserves adopted rows", () => {
    const proposal = { senses: [{ masterSenseId: "other-sense", masterLexemeId: "lexeme", lemma: "test", partOfSpeech: "VERB", runtimeCandidateIds: [9001, 9001], proposedDecision: "MAP_EXISTING", evidence: { semanticIdentityReason: "reviewed" } }] };
    expect(deriveOwnerReviewedExclusions(proposal, { vocabulary: [{ masterSenseId: "other-sense", decision: "CREATE_NEW", appVocabularyId: null }] })).toHaveLength(1);
    expect(deriveOwnerReviewedExclusions(proposal, { vocabulary: [{ masterSenseId: "other-sense", decision: "MAP_EXISTING", appVocabularyId: 9001 }] })).toEqual([]);
    expect(excluded.some((pair) => [1836, 948].includes(pair.runtimeVocabularyId))).toBe(false);
    expect(excluded.filter((pair) => pair.runtimeVocabularyId === 1461)).toHaveLength(1); // emergency aid only, not adopted pain relief
    expect(() => deriveOwnerReviewedExclusions(proposal, { vocabulary: [] })).toThrow("OWNER_REVIEW_DECISION_COVERAGE_INVALID");
  });

  it("does not suppress a different, unreviewed Master Sense sharing the lemma", () => {
    const pair = excluded.find((pair) => pair.runtimeVocabularyId === 11)!;
    const corpus = [{ ...exactMaster, ...pair, normalizedLemma: "water" }, { ...exactMaster, masterSenseId: "unreviewed-water", normalizedLemma: "water" }];
    const result = analyzeLegacyCandidate({ ...row({ runtimeVocabularyId: 11, normalizedWord: "water" }), vietnameseForAnalysis: "" }, corpus, new Map(), new Map());
    expect(result.relation).toBe("MULTIPLE_MASTER_CANDIDATES");
    expect(result.candidates.find((candidate) => candidate.masterSenseId === pair.masterSenseId)?.identityClaim).toBe("NONE");
    expect(result.candidates.find((candidate) => candidate.masterSenseId === "unreviewed-water")?.identityClaim).toBe("POSSIBLE");
  });

  it.each(["alias", "translation", "absent"])("preserves owner evidence even with %s discovery", (kind) => {
    const pair = excluded.find((pair) => pair.runtimeVocabularyId === 11)!;
    const corpus = kind === "absent" ? [] : [{ ...exactMaster, ...pair, normalizedLemma: "different", aliases: kind === "alias" ? ["obsolete"] : [], translations: ["match"] }];
    const result = analyzeLegacyCandidate({ ...row({ runtimeVocabularyId: 11 }), vietnameseForAnalysis: "match" }, corpus, new Map(), new Map());
    expect(result.relation).toBe("OWNER_REVIEWED_NOT_SAME_IDENTITY");
    expect(result.candidates[0]?.identityClaim).toBe("NONE");
  });

  it("replays the persisted fingerprint and closure twice without database access or artifact drift", () => {
    const fingerprint = closeLegacySemanticExclusions(true);
    expect(closeLegacySemanticExclusions(true)).toBe(fingerprint);
    const workspace = path.join(process.cwd(), "vocabflow-dataset/workspaces/legacy-vocabulary-cleanup-audit");
    const payload = JSON.parse(readFileSync(path.join(workspace, "semantic-fingerprint-payload.json"), "utf8"));
    expect(deterministicAuditFingerprint(payload)).toBe(fingerprint);
    expect(fingerprint).not.toBe("6b3af8b7db4e8262b8a04751de8641a86bf4c5273baf8e07344d9e6687ab4c36");
    const candidates = JSON.parse(readFileSync(path.join(workspace, "legacy-master-candidates.json"), "utf8")).candidates as Array<{ runtimeVocabularyId: number; relation: string; candidates: Array<{ identityClaim: string }> }>;
    expect(payload.candidateAnalysis).toBe(deterministicAuditFingerprint(candidates));
    expect(candidates).toHaveLength(2018);
    expect(candidates.find((candidate) => candidate.runtimeVocabularyId === 295)?.relation).toBe("EXISTING_MASTER_RUNTIME_DUPLICATE");
    expect(candidates.find((candidate) => candidate.runtimeVocabularyId === 849)?.relation).toBe("MULTIPLE_MASTER_CANDIDATES");
  });
});
