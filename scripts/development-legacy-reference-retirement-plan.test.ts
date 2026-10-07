import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTHORIZATION, assertNoPII, buildPlanningArtifacts, decomposeLegacyRows, planRetirement, referenceDomain,
  referenceOverlapMatrix, runLegacyReferenceRetirementPlan, semanticReferenceCrossTab, simulatePostMigration,
  type PlanningSnapshot, type SanitizedInventoryRow, type ProductRelationships
} from "./development-legacy-reference-retirement-plan";
import { assertDevelopmentTarget, assertReadOnlySql, directTablesWithoutRuntimeCode, readOwnerReviewedExclusions, type CandidateAnalysis } from "./development-legacy-vocabulary-cleanup-audit";

const ROOT = process.cwd();
const WORKSPACE = "vocabflow-dataset/workspaces/legacy-vocabulary-retirement-planning";
const read = <T,>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, WORKSPACE, file), "utf8")) as T;
const snapshot = read<PlanningSnapshot>("read-only-snapshot.json");
const candidates = JSON.parse(readFileSync(path.join(ROOT, "vocabflow-dataset/workspaces/legacy-vocabulary-cleanup-audit/legacy-master-candidates.json"), "utf8")).candidates as CandidateAnalysis[];
const exclusions = readOwnerReviewedExclusions().exclusions;
const actualRows = decomposeLegacyRows({ inventory: snapshot.inventory, candidates, catalog: snapshot.schemaInventory.tables, exclusions });

function fixture(references: Record<string, number>, id = 9000, overrides: Partial<SanitizedInventoryRow> = {}) {
  const inventory: SanitizedInventoryRow = { runtimeVocabularyId: id, word: "fixture", enabled: false, contentVersion: 1, mappingStatus: "LEGACY_UNMAPPED",
    referenceCounts: references, totalReferenceCount: Object.values(references).reduce((sum, count) => sum + count, 0), sourceIdentityObligation: false, ...overrides };
  const catalog = Object.keys(references).map((key) => { const [schema, table, column] = key.split("."); return { schema: schema!, table: table!, column: column!, canSelect: true }; });
  const candidate: CandidateAnalysis = { runtimeVocabularyId: id, word: "fixture", normalizedWord: "fixture", relation: "NO_MASTER_CANDIDATE", candidates: [], automaticMappingCreated: false, reviewRequired: false };
  return decomposeLegacyRows({ inventory: [inventory], catalog, candidates: [candidate], exclusions: [] })[0]!;
}
const history = (kind: string, count = 1) => ({ [`vocabflow_app.${kind}.vocabulary_id`]: count });
const product = (row: ReturnType<typeof fixture>): ProductRelationships => ({ runtimeVocabularyId: row.runtimeVocabularyId,
  topicIds: Array.from({ length: row.topicMembershipReferenceCount }, (_, i) => i + 1),
  learningSetItems: Array.from({ length: row.learningSetItemReferenceCount }, (_, i) => ({ learningSetId: i + 1, sortOrder: i })) });
const completeAssumptions = (id: number) => ({ productRelationshipsMigratedOrRemoved: true, ownerApprovedDispositionIds: [id], sourceIdentityResolvedIds: [id], separatelyDisabledIds: [id], preservationPolicyClearedIds: [id] });

describe("Phase 2G.3B decomposition, protection and overlaps", () => {
  it("1. exhaustively decomposes 2018 unique legacy rows and balances all domain counts", () => {
    expect(actualRows).toHaveLength(2018);
    expect(new Set(actualRows.map((row) => row.runtimeVocabularyId)).size).toBe(2018);
    for (const row of actualRows) expect(Object.values(row.referenceDomains).reduce((sum, value) => sum + value, 0)).toBe(row.totalReferenceCount);
    expect(referenceOverlapMatrix(actualRows).exactSignatureRowTotal).toBe(2018);
  });
  it.each(["learner_progress", "review_events", "learner_saved_vocabulary"])("2–4. protects %s from planning and hypothetical deletion", (table) => {
    const row = fixture(history(table));
    expect(row.hasLearnerHistory).toBe(true);
    const planning = planRetirement([row], [product(row)]);
    expect(planning.plans[0]?.groups).toContain("A_LEARNER_HISTORY_PROTECTED");
    expect(planning.plans[0]?.groups).not.toContain("D_RETIREMENT_AFTER_RELATIONSHIP_MIGRATION_PLANNING");
    expect(simulatePostMigration([row], completeAssumptions(9000)).hypotheticalCandidateCount).toBe(0);
  });
  it("5. computes progress/review intersections instead of assuming equal marginals imply equal cohorts", () => {
    const rows = [fixture(history("learner_progress"), 9001), fixture(history("review_events"), 9002), fixture({ ...history("learner_progress"), ...history("review_events") }, 9003)];
    const overlaps = referenceOverlapMatrix(rows).overlaps;
    expect(overlaps.learnerProgressOnlyAmongHistory.count).toBe(1);
    expect(overlaps.reviewEventsOnlyAmongHistory.count).toBe(1);
    expect(overlaps.learnerProgressAndReviewEvents).toEqual({ count: 1, runtimeVocabularyIds: [9003] });
    expect(referenceOverlapMatrix(actualRows).overlaps.learnerProgressAndReviewEvents.count).toBe(75);
  });
  it.each(["vocabulary_topics", "learning_set_items"])("6–7. classifies %s only as product-only planning, never retire-safe", (table) => {
    const row = fixture(history(table));
    const result = planRetirement([row], [product(row)]);
    expect(result.plans[0]?.groups).toContain("B_PRODUCT_RELATIONSHIP_ONLY");
    expect(result.plans[0]?.currentlyRetireSafe).toBe(false);
    expect(result.plans[0]?.deleteRecommended).toBe(false);
    expect(referenceOverlapMatrix([row]).overlaps[table === "vocabulary_topics" ? "topicOnlyAllDomains" : "learningSetOnlyAllDomains"].count).toBe(1);
  });
  it("8. counts topic/set overlap exactly", () => {
    const overlaps = referenceOverlapMatrix(actualRows).overlaps;
    expect(overlaps.topicAndLearningSet.count).toBe(241);
    expect(overlaps.topicOnlyAllDomains.count).toBe(1777);
    expect(overlaps.learningSetOnlyAllDomains.count).toBe(0);
  });
  it("9. fails closed for unknown references or incomplete catalog coverage", () => {
    const row = fixture(history("unexpected_table"));
    expect(referenceDomain("vocabflow_app.unexpected_table.vocabulary_id")).toBe("OTHER_OR_UNKNOWN");
    expect(row.hasOtherReferences).toBe(true);
    expect(planRetirement([row], [product(row)]).plans[0]?.groups).not.toContain("D_RETIREMENT_AFTER_RELATIONSHIP_MIGRATION_PLANNING");
    expect(simulatePostMigration([row], completeAssumptions(9000)).hypotheticalCandidateCount).toBe(0);
    expect(() => decomposeLegacyRows({ inventory: snapshot.inventory, candidates, catalog: snapshot.schemaInventory.tables.map((column) => ({ ...column, canSelect: false })), exclusions })).toThrow("REFERENCE_CATALOG_INCOMPLETE");
  });
  it("10. keeps all reviewed exclusions non-identity and rejects an identityClaim regression", () => {
    expect(actualRows.filter((row) => row.semanticCandidateRelation === "OWNER_REVIEWED_NOT_SAME_IDENTITY")).toHaveLength(11);
    const changed = structuredClone(candidates);
    changed.find((row) => row.runtimeVocabularyId === 11)!.candidates[0]!.identityClaim = "POSSIBLE";
    expect(() => decomposeLegacyRows({ inventory: snapshot.inventory, candidates: changed, catalog: snapshot.schemaInventory.tables, exclusions })).toThrow("OWNER_REVIEW_EXCLUSION_CONTRADICTED");
  });
  it("11–13. preserves #295 duplicate review, #849 multiple candidates and #11 history", () => {
    expect(actualRows.find((row) => row.runtimeVocabularyId === 295)).toMatchObject({ semanticCandidateRelation: "EXISTING_MASTER_RUNTIME_DUPLICATE", hasLearnerHistory: true });
    expect(actualRows.find((row) => row.runtimeVocabularyId === 849)).toMatchObject({ semanticCandidateRelation: "MULTIPLE_MASTER_CANDIDATES", hasLearnerHistory: false });
    expect(actualRows.find((row) => row.runtimeVocabularyId === 11)).toMatchObject({ learnerProgressReferenceCount: 1, reviewEventReferenceCount: 5, hasLearnerHistory: true });
  });
  it("14–15. keeps #284 booking unchanged and real DELETE_SAFE at zero", () => {
    expect(snapshot.inventory.find((row) => row.runtimeVocabularyId === 284)).toMatchObject({ mappingStatus: "MASTER_MANAGED", mappedMasterSenseId: "01a0fc13-09ef-7d37-a50f-d05db6b1a89c" });
    expect(buildPlanningArtifacts(snapshot, candidates).summary.currentDeleteSafeCandidate).toBe(0);
  });
  it("16–17. simulations do not mutate real classes and S1 removes only product references", () => {
    const row = fixture({ ...history("learner_progress", 2), ...history("vocabulary_topics", 3), ...history("learning_set_items", 4), ...history("master_learning_set_memberships", 5), ...history("unexpected", 6) });
    const before = JSON.stringify(row);
    const result = simulatePostMigration([row], completeAssumptions(9000));
    expect(result.results[0]?.remainingReferenceCount).toBe(13);
    expect(result.hypotheticalCandidateCount).toBe(0);
    expect(JSON.stringify(row)).toBe(before);
  });
  it("18. source identity, separate disable and preservation clearance are independent hypothetical gates", () => {
    const row = fixture(history("vocabulary_topics"), 9000, { sourceIdentityObligation: true, enabled: true });
    expect(simulatePostMigration([row], { ...completeAssumptions(9000), sourceIdentityResolvedIds: [] }).hypotheticalCandidateCount).toBe(0);
    expect(simulatePostMigration([row], { ...completeAssumptions(9000), separatelyDisabledIds: [] }).hypotheticalCandidateCount).toBe(0);
    expect(simulatePostMigration([row], { ...completeAssumptions(9000), preservationPolicyClearedIds: [] }).hypotheticalCandidateCount).toBe(0);
    expect(simulatePostMigration([row], completeAssumptions(9000)).hypotheticalCandidateCount).toBe(1);
    const alreadyDisabled = { ...row, enabled: false };
    expect(simulatePostMigration([alreadyDisabled], { ...completeAssumptions(9000), separatelyDisabledIds: [] }).hypotheticalCandidateCount).toBe(0);
  });
  it("19. rejects Production and incorrect Development target/session identity", () => {
    expect(() => assertDevelopmentTarget({ ...snapshot.target, environment: "production" } as Parameters<typeof assertDevelopmentTarget>[0])).toThrow("DEVELOPMENT_RUNTIME_TARGET_MISMATCH");
    for (const changed of [
      { ...snapshot, transaction: { isolation: "READ_COMMITTED", readOnly: true } },
      { ...snapshot, transaction: { isolation: "REPEATABLE_READ", readOnly: false } },
      { ...snapshot, databaseIdentity: { ...snapshot.databaseIdentity, currentRole: "vocabflow_migration" } }
    ]) expect(() => buildPlanningArtifacts(changed, candidates)).toThrow("PLANNING_SNAPSHOT_IDENTITY_INVALID");
  });
  it.each(["INSERT INTO x VALUES (1)", "UPDATE x SET y=1", "DELETE FROM x", "ALTER TABLE x ADD y int"])("20. rejects mutation SQL: %s", (sql) => {
    expect(() => assertReadOnlySql(sql)).toThrow("NON_READ_ONLY_SQL_REJECTED");
  });
  it.each(["--apply", "--delete", "--disable", "--production", "--migrate", "--write-db"])("21. rejects mutation/Production CLI argument %s before any connection", async (arg) => {
    await expect(runLegacyReferenceRetirementPlan([arg])).rejects.toThrow("UNSUPPORTED_RETIREMENT_PLANNING_ARGUMENT");
  });
  it("22. rejects PII or connection strings and emits sanitized artifacts", () => {
    expect(() => assertNoPII({ learnerId: "private" })).toThrow("PII_SERIALIZATION_REJECTED");
    expect(() => assertNoPII({ value: "postgres://example" })).toThrow("PII_SERIALIZATION_REJECTED");
    expect(() => assertNoPII({ email: "private@example.com" })).toThrow("PII_SERIALIZATION_REJECTED");
    for (const artifact of buildPlanningArtifacts(snapshot, candidates).artifacts.values()) expect(() => assertNoPII(artifact)).not.toThrow();
  });
  it("23. replays the deterministic fingerprint and all artifacts twice without DB access", async () => {
    const first = await runLegacyReferenceRetirementPlan(["--check"]);
    const second = await runLegacyReferenceRetirementPlan(["--check"]);
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(first.acceptedSemanticFingerprint).toBe("5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea");
    expect(first.databaseConnection).toBe("NONE");
  });
  it("24. uses consistent runtime-code keys and detects genuinely missing evidence", () => {
    expect(directTablesWithoutRuntimeCode(["learner_progress", "review_events", "missing_table"], { learner_progress: ["progress.ts"], review_events: ["reviews.ts"] })).toEqual(["missing_table"]);
    const check = snapshot.schemaInventory.crossCheck as { runtimeCode: { evidenceByTable: Record<string, string[]>; directTablesWithoutRuntimeCode: string[] } };
    expect(check.runtimeCode.evidenceByTable.learner_progress!.length).toBeGreaterThan(0);
    expect(check.runtimeCode.directTablesWithoutRuntimeCode).not.toContain("learner_progress");
  });
  it("25. requires the Hybrid checkpoint to remain 100/100 and #284 unchanged", () => {
    expect(snapshot.hybridCheckpoint.hybridMasterMappings).toBe(100);
    expect(() => buildPlanningArtifacts({ ...snapshot, hybridCheckpoint: { ...snapshot.hybridCheckpoint, hybridMasterMappings: 99 } }, candidates)).toThrow("PLANNING_SNAPSHOT_IDENTITY_INVALID");
    expect(() => buildPlanningArtifacts({ ...snapshot, hybridCheckpoint: { ...snapshot.hybridCheckpoint, runtime284MappingSenseId: "different" } }, candidates)).toThrow("PLANNING_SNAPSHOT_IDENTITY_INVALID");
  });
  it("cross-tabs semantic protection and distinguishes conditional S3 from actual retirement safety", () => {
    const table = semanticReferenceCrossTab(actualRows);
    expect(table.find((row) => row.relation === "NO_MASTER_CANDIDATE")).toMatchObject({ learnerHistoryRows: 73, productOnlyRows: 1932 });
    expect(table.find((row) => row.relation === "OWNER_REVIEWED_NOT_SAME_IDENTITY")).toMatchObject({ learnerHistoryRows: 1, productOnlyRows: 10 });
    const summary = buildPlanningArtifacts(snapshot, candidates).summary;
    expect(summary.scenarioResults.S3).toEqual({ disableOnlyCandidates: 0, allPrerequisitesAssumedCandidates: 1943 });
    expect(Object.values(AUTHORIZATION).every((flag) => flag === false)).toBe(true);
  });
  it("requires exact product relationship enumeration and preserves ordering evidence", () => {
    const row = fixture(history("learning_set_items"));
    expect(() => planRetirement([row], [{ runtimeVocabularyId: 9000, topicIds: [], learningSetItems: [] }])).toThrow("PRODUCT_RELATIONSHIP_ENUMERATION_MISMATCH");
    expect(planRetirement([row], [product(row)]).plans[0]?.productRelationships.learningSetItems[0]).toEqual({ learningSetId: 1, sortOrder: 0 });
  });
});
