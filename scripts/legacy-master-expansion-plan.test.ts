import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AUTHORIZATION, DISPOSITIONS, batchStatistics, buildExpansionArtifacts, classifyContent, expansionBatches, planContentRow, runExpansionPlan, type ContentSnapshot, type PlannedContent } from "./legacy-master-expansion-plan";
import { assertNoPII, type DecomposedRow } from "./development-legacy-reference-retirement-plan";
import { assertDevelopmentTarget, assertReadOnlySql, readOwnerReviewedExclusions, type CandidateAnalysis } from "./development-legacy-vocabulary-cleanup-audit";

const root = process.cwd();
const workspace = path.join(root, "vocabflow-dataset/workspaces/legacy-master-expansion-planning");
const read = <T,>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;
const snapshot = read<ContentSnapshot>(path.join(workspace, "content-snapshot.json"));
const references = read<{ rows: DecomposedRow[] }>(path.join(root, "vocabflow-dataset/workspaces/legacy-vocabulary-retirement-planning/legacy-reference-decomposition.json")).rows;
const candidates = read<{ candidates: CandidateAnalysis[] }>(path.join(root, "vocabflow-dataset/workspaces/legacy-vocabulary-cleanup-audit/legacy-master-candidates.json")).candidates;
const rows = snapshot.rows.map((content) => planContentRow(content, references.find((row) => row.runtimeVocabularyId === content.runtimeVocabularyId)!, candidates.find((row) => row.runtimeVocabularyId === content.runtimeVocabularyId)!));
const ordinary = rows.find((row) => row.disposition === "MASTER_EXPANSION_CANDIDATE")!;
const ordinaryReference = references.find((row) => row.runtimeVocabularyId === ordinary.runtimeVocabularyId)!;

describe("legacy content disposition before cleanup", () => {
  it("classifies 2018 rows exactly once with conservative coverage, 13 identity gates and 75 history flags", () => {
    expect(rows).toHaveLength(2018);
    expect(new Set(rows.map((row) => row.runtimeVocabularyId)).size).toBe(2018);
    expect(rows.every((row) => DISPOSITIONS.includes(row.disposition))).toBe(true);
    expect(rows.filter((row) => row.disposition === "MASTER_EXPANSION_CANDIDATE")).toHaveLength(2005);
    expect(rows.filter((row) => row.disposition === "MASTER_IDENTITY_REVIEW")).toHaveLength(13);
    expect(rows.filter((row) => row.learnerHistoryProtected)).toHaveLength(75);
    expect(rows.every((row) => !row.mappingCreated && !row.ownerApproved && !row.dependenciesResolved)).toBe(true);
  });
  it("disabled/unmapped content with current taxonomy and meaning is retained provisionally", () => {
    expect(classifyContent({ ...ordinary, enabled: false }, ordinaryReference).disposition).toBe("MASTER_EXPANSION_CANDIDATE");
    expect(classifyContent({ ...ordinary, topics: [], learningSets: [], enabled: false }, ordinaryReference).disposition).toBe("CONTENT_OWNER_REVIEW_REQUIRED");
  });
  it.each(["", "-", "?", "n/a"])("missing meaning %j requires owner review rather than invented retirement", (meaning) => {
    expect(classifyContent({ ...ordinary, effectiveVietnamese: meaning }, ordinaryReference).disposition).toBe("CONTENT_OWNER_REVIEW_REQUIRED");
  });
  it("retirement requires explicit owner evidence and never releases historical identity", () => {
    const evidence = { decision: "RETIRE_ACTIVE_CATALOG" as const, reason: "Owner decided future scope", ownerApproved: true as const };
    expect(classifyContent(ordinary, { ...ordinaryReference, hasLearnerHistory: false }, evidence).disposition).toBe("CONTENT_RETIREMENT_CANDIDATE");
    expect(classifyContent(ordinary, { ...ordinaryReference, hasLearnerHistory: true }, evidence).disposition).toBe("HISTORY_PRESERVATION_ONLY");
    expect(classifyContent(ordinary, ordinaryReference, { ...evidence, reason: " " }).disposition).toBe("MASTER_EXPANSION_CANDIDATE");
  });
  it("preserves exact accepted exclusions as NONE and routes distinct Sense review", () => {
    const legacyPairs = readOwnerReviewedExclusions(root).exclusions.filter((pair) => rows.some((row) => row.runtimeVocabularyId === pair.runtimeVocabularyId));
    expect(new Set(legacyPairs.map((pair) => pair.runtimeVocabularyId)).size).toBe(11);
    for (const pair of legacyPairs) {
      const row = rows.find((row) => row.runtimeVocabularyId === pair.runtimeVocabularyId)!;
      const match = row.masterCandidates.find((candidate) => candidate.masterSenseId === pair.masterSenseId)!;
      expect(match.identityClaim).toBe("NONE");
      expect(row.disposition).toBe("MASTER_IDENTITY_REVIEW");
      expect(row.newMasterSenseNeeded).toBe("DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED");
    }
  });
  it("#295 remains duplicate review and #849 remains noun/verb ambiguous", () => {
    expect(rows.find((row) => row.runtimeVocabularyId === 295)?.semanticReviewDisposition).toBe("EXISTING_MASTER_RUNTIME_DUPLICATE");
    const record = rows.find((row) => row.runtimeVocabularyId === 849)!;
    expect(record.semanticReviewDisposition).toBe("MULTIPLE_MASTER_CANDIDATES");
    expect(record.masterCandidates).toHaveLength(2);
  });
  it("#11 preserves progress/reviews, #284 stays outside all legacy plans, Hybrid is 100/100", () => {
    expect(rows.find((row) => row.runtimeVocabularyId === 11)).toMatchObject({ learnerProgressReferenceCount: 1, reviewEventReferenceCount: 5, learnerHistoryProtected: true, historyRuntimeMustRemain: true });
    expect(rows.some((row) => row.runtimeVocabularyId === 284)).toBe(false);
    expect(snapshot.hybridCheckpoint.hybridMasterMappings).toBe(100);
  });
  it("retains set order and grade separately from CEFR, without translation-derived POS", () => {
    for (const row of rows) {
      expect(row.cefr).toBeNull(); expect(row.gradeEvidence).toBe(row.level); expect(row.posConfirmed).toBe(false);
      expect(row.learningSets).toEqual(snapshot.rows.find((content) => content.runtimeVocabularyId === row.runtimeVocabularyId)!.learningSets);
    }
  });
  it("keeps dependencies unresolved and protects historical/source/product obligations", () => {
    for (const row of rows) {
      if (row.sourceIdentityObligation) expect(row.dependencies).toContain("NEEDS_SOURCE_IDENTITY_RESOLUTION");
      if (row.learnerHistoryProtected) expect(row.dependencies).toContain("NEEDS_HISTORY_PRESERVATION_POLICY");
      if (row.learningSets.length) expect(row.dependencies).toContain("NEEDS_LEARNING_SET_RELATIONSHIP_MIGRATION");
      if (row.topics.length) expect(row.dependencies).toContain("NEEDS_TOPIC_RELATIONSHIP_MIGRATION");
    }
    expect(Object.values(AUTHORIZATION).every((flag) => flag === false)).toBe(true);
  });
  it("does not claim repeated lemmas are confirmed polysemy or allocated Lexemes", () => {
    const statistics = batchStatistics([{ ...ordinary, runtimeVocabularyId: 9001 }, { ...ordinary, runtimeVocabularyId: 9002 }]);
    expect(statistics.estimatedLexemeCount).toBe(1); expect(statistics.repeatedLemmaCount).toBe(1);
    expect(statistics.confirmedPolysemyCount).toBeNull();
  });
  it("batches exhaustively cover A75 B166 C1777 D0, with detailed bounded review units", () => {
    const result = expansionBatches(rows);
    expect(result.phases.map((phase) => phase.rowCount)).toEqual([75, 166, 1777, 0]);
    expect(result.reviewBatches.map((batch) => batch.rowCount)).toEqual([75, 166, 200, 200, 200, 200, 200, 200, 200, 200, 177]);
    expect(new Set(result.reviewBatches.flatMap((batch) => batch.runtimeVocabularyIds)).size).toBe(2018);
    for (const batch of result.reviewBatches) {
      expect(batch.rowCount).toBeLessThanOrEqual(300); expect(batch.topicDistribution.length).toBeGreaterThan(0);
      expect(batch.sourceIdentityObligationRows).toBeGreaterThanOrEqual(0); expect(batch.recommendedAuthoringOrder).toContain("approval");
    }
    expect(result.canonicalMasterIdsAllocated).toBe(0);
  });
  it("keeps same-phase lemma families together and rejects invalid/oversized batches", () => {
    const family = Array.from({ length: 3 }, (_, i) => ({ ...ordinary, runtimeVocabularyId: 9000 + i, learnerHistoryProtected: false, enabled: true } as PlannedContent));
    expect(expansionBatches(family).reviewBatches).toHaveLength(1);
    expect(() => expansionBatches(family, 99)).toThrow("AUTHORING_BATCH_SIZE_INVALID");
    expect(() => expansionBatches(Array.from({ length: 201 }, (_, i) => ({ ...family[0]!, runtimeVocabularyId: 10000 + i })))).toThrow("LEMMA_FAMILY_EXCEEDS_REVIEW_BATCH_SIZE");
  });
  it("rejects changed row/content identity, missing relationships, coverage and transaction drift", () => {
    expect(() => planContentRow({ ...ordinary, contentVersion: ordinary.contentVersion + 1 }, ordinaryReference, candidates.find((candidate) => candidate.runtimeVocabularyId === ordinary.runtimeVocabularyId)!)).toThrow("CONTENT_REFERENCE_ALIGNMENT_INVALID");
    expect(() => buildExpansionArtifacts({ ...snapshot, rows: snapshot.rows.slice(1) })).toThrow("CONTENT_SNAPSHOT_COVERAGE_INVALID");
    expect(() => buildExpansionArtifacts({ ...snapshot, transaction: { isolation: "READ_COMMITTED", readOnly: true } })).toThrow("CONTENT_SNAPSHOT_IDENTITY_INVALID");
    expect(() => buildExpansionArtifacts({ ...snapshot, rows: snapshot.rows.map((row, index) => index === 0 ? { ...row, topics: [] } : row) })).toThrow("CONTENT_RELATIONSHIPS_INCOMPLETE");
  });
  it("rejects Production, mutation SQL/CLI and sensitive serialization", async () => {
    expect(() => assertDevelopmentTarget({ ...snapshot.target, environment: "production" } as Parameters<typeof assertDevelopmentTarget>[0])).toThrow();
    expect(() => assertReadOnlySql("DELETE FROM vocabflow_app.vocabularies")).toThrow();
    for (const arg of ["--apply", "--delete", "--disable", "--production", "--migrate"]) await expect(runExpansionPlan([arg])).rejects.toThrow("UNSUPPORTED_EXPANSION_PLANNING_ARGUMENT");
    expect(() => assertNoPII({ learnerId: "sensitive" })).toThrow();
    expect(() => assertNoPII({ word: "person@example.com" })).toThrow();
    expect(() => assertNoPII(snapshot)).not.toThrow();
  });
  it("offline deterministic replay includes frozen release validation and changes fingerprint on content drift", async () => {
    const first = buildExpansionArtifacts(snapshot); const second = buildExpansionArtifacts(structuredClone(snapshot));
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.summary.frozenReleaseCheck).toMatchObject({ status: "PASS", errors: 0, warnings: 0 });
    const changed = structuredClone(snapshot); changed.rows[0]!.effectiveVietnamese += " (review evidence)";
    expect(buildExpansionArtifacts(changed).fingerprint).not.toBe(first.fingerprint);
    expect(await runExpansionPlan(["--check"])).toMatchObject({ status: "PASS", fingerprint: first.fingerprint, databaseConnection: "NONE" });
  }, 60000);
});
