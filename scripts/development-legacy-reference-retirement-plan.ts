import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postgres from "postgres";
import { assertResolvedTargetBeforeMutation, getTarget } from "./runtime-validation";
import { closeLegacySemanticExclusions } from "./development-legacy-semantic-exclusion-closure";
import {
  assertDevelopmentTarget, assertReadOnlySql, captureDatabaseSnapshot, deterministicAuditFingerprint,
  loadLocalDevelopmentEnvironment, readApprovedMasterCorpus, readOwnerReviewedExclusions, sanitizeRuntimeRows,
  type CandidateAnalysis, type CandidateRelation
} from "./development-legacy-vocabulary-cleanup-audit";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PHASE_2G3B_BASELINE = "bc421abf51ddeb0e0213b5f3b7364c11f57c008a";
const ACCEPTED_FINGERPRINT = "5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea";
const INPUT = "vocabflow-dataset/workspaces/legacy-vocabulary-cleanup-audit";
const WORKSPACE = "vocabflow-dataset/workspaces/legacy-vocabulary-retirement-planning";
const REPORT = "vocabflow-dataset/reports/development-legacy-vocabulary-retirement-planning.md";
export const AUTHORIZATION = { cleanup: false, delete: false, disable: false, merge: false, mappingWrites: false, relationshipMigration: false, masterExpansion: false };

export function assertNoPII(value: unknown): void {
  if (typeof value === "string" && /(?:postgres(?:ql)?:\/\/|Bearer\s+[A-Za-z0-9._-]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(value)) throw new Error("PII_SERIALIZATION_REJECTED");
  if (Array.isArray(value)) { value.forEach(assertNoPII); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:learner_?ids?|user_?ids?|household_?ids?|emails?|session_?ids?|tokens?|access_?tokens?|refresh_?tokens?|passwords?|connection_?strings?|database_?urls?)$/i.test(key)) throw new Error("PII_SERIALIZATION_REJECTED");
    assertNoPII(child);
  }
}

export type ReferenceDomain = "LEARNER_HISTORY" | "PRODUCT_RELATIONSHIP" | "MASTER_RELATIONSHIP" | "MASTER_MAPPING" | "OTHER_OR_UNKNOWN";
const KNOWN_REFERENCES = {
  "vocabflow_app.learner_progress.vocabulary_id": ["LEARNER_HISTORY", "learnerProgressReferenceCount"],
  "vocabflow_app.review_events.vocabulary_id": ["LEARNER_HISTORY", "reviewEventReferenceCount"],
  "vocabflow_app.learner_saved_vocabulary.vocabulary_id": ["LEARNER_HISTORY", "savedVocabularyReferenceCount"],
  "vocabflow_app.vocabulary_topics.vocabulary_id": ["PRODUCT_RELATIONSHIP", "topicMembershipReferenceCount"],
  "vocabflow_app.learning_set_items.vocabulary_id": ["PRODUCT_RELATIONSHIP", "learningSetItemReferenceCount"],
  "vocabflow_app.master_vocabulary_topic_memberships.vocabulary_id": ["MASTER_RELATIONSHIP", "masterTopicMembershipReferenceCount"],
  "vocabflow_app.master_learning_set_memberships.vocabulary_id": ["MASTER_RELATIONSHIP", "masterLearningSetMembershipReferenceCount"],
  "vocabflow_app.master_vocabulary_mappings.vocabulary_id": ["MASTER_MAPPING", "masterMappingReferenceCount"]
} as const;
export function referenceDomain(key: string): ReferenceDomain {
  return KNOWN_REFERENCES[key as keyof typeof KNOWN_REFERENCES]?.[0] ?? "OTHER_OR_UNKNOWN";
}
export type SanitizedInventoryRow = {
  runtimeVocabularyId: number; word: string; enabled: boolean; contentVersion: number;
  mappingStatus: string; referenceCounts: Record<string, number>; totalReferenceCount: number; sourceIdentityObligation: boolean;
};
type CatalogColumn = { schema: string; table: string; column: string; canSelect: boolean; [key: string]: unknown };
export type ProductRelationships = { runtimeVocabularyId: number; topicIds: number[]; learningSetItems: Array<{ learningSetId: number; sortOrder: number }> };
type Counts = {
  learnerProgressReferenceCount: number; reviewEventReferenceCount: number; savedVocabularyReferenceCount: number;
  topicMembershipReferenceCount: number; learningSetItemReferenceCount: number;
  masterTopicMembershipReferenceCount: number; masterLearningSetMembershipReferenceCount: number; masterMappingReferenceCount: number; otherReferenceCount: number;
};
export type DecomposedRow = Counts & {
  runtimeVocabularyId: number; word: string; enabled: boolean; contentVersion: number; totalReferenceCount: number;
  hasLearnerHistory: boolean; hasProductRelationships: boolean; hasMasterRelationships: boolean; hasOtherReferences: boolean;
  sourceIdentityObligation: boolean; semanticCandidateRelation: CandidateRelation; ownerReviewedExclusionCount: number;
  referenceDomains: Record<ReferenceDomain, number>; referenceColumns: Array<{ key: string; domain: ReferenceDomain; count: number }>;
};
export type Disposition = "MASTER_SUCCESSOR_REQUIRES_APPROVAL" | "MASTER_COVERAGE_REQUIRED" | "CONTENT_RETIREMENT_REQUIRES_OWNER_APPROVAL";
export function futureDisposition(row: DecomposedRow): Disposition {
  return row.semanticCandidateRelation === "NO_MASTER_CANDIDATE" ? "MASTER_COVERAGE_REQUIRED" :
    row.semanticCandidateRelation === "OWNER_REVIEWED_NOT_SAME_IDENTITY" ? "CONTENT_RETIREMENT_REQUIRES_OWNER_APPROVAL" : "MASTER_SUCCESSOR_REQUIRES_APPROVAL";
}

export function decomposeLegacyRows(input: {
  inventory: SanitizedInventoryRow[]; candidates: CandidateAnalysis[]; catalog: CatalogColumn[];
  exclusions: ReturnType<typeof readOwnerReviewedExclusions>["exclusions"];
}): DecomposedRow[] {
  const byId = new Map(input.candidates.map((row) => [row.runtimeVocabularyId, row]));
  const catalogKeys = new Set(input.catalog.map((column) => `${column.schema}.${column.table}.${column.column}`));
  if (catalogKeys.size !== input.catalog.length || input.catalog.some((column) => !column.canSelect)) throw new Error("REFERENCE_CATALOG_INCOMPLETE");
  const legacy = input.inventory.filter((row) => row.mappingStatus === "LEGACY_UNMAPPED");
  if (byId.size !== input.candidates.length || byId.size !== legacy.length || new Set(legacy.map((row) => row.runtimeVocabularyId)).size !== legacy.length) throw new Error("SEMANTIC_CANDIDATE_COVERAGE_INVALID");
  return legacy.map((row) => {
    const candidate = byId.get(row.runtimeVocabularyId);
    if (!candidate || Object.keys(row.referenceCounts).length !== catalogKeys.size || Object.keys(row.referenceCounts).some((key) => !catalogKeys.has(key))) throw new Error("REFERENCE_ROW_COVERAGE_INVALID");
    const excludedPairs = input.exclusions.filter((pair) => pair.runtimeVocabularyId === row.runtimeVocabularyId);
    for (const pair of excludedPairs) {
      const evidence = candidate.candidates.find((match) => match.masterSenseId === pair.masterSenseId);
      if (!evidence || evidence.identityClaim !== "NONE" || evidence.ownerReviewedRelation !== "OWNER_REVIEWED_NOT_SAME_IDENTITY") throw new Error("OWNER_REVIEW_EXCLUSION_CONTRADICTED");
    }
    const counts: Counts = { learnerProgressReferenceCount: 0, reviewEventReferenceCount: 0, savedVocabularyReferenceCount: 0,
      topicMembershipReferenceCount: 0, learningSetItemReferenceCount: 0, masterTopicMembershipReferenceCount: 0,
      masterLearningSetMembershipReferenceCount: 0, masterMappingReferenceCount: 0, otherReferenceCount: 0 };
    const domains: Record<ReferenceDomain, number> = { LEARNER_HISTORY: 0, PRODUCT_RELATIONSHIP: 0, MASTER_RELATIONSHIP: 0, MASTER_MAPPING: 0, OTHER_OR_UNKNOWN: 0 };
    const columns = Object.entries(row.referenceCounts).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => {
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("REFERENCE_COUNT_INVALID");
      const known = KNOWN_REFERENCES[key as keyof typeof KNOWN_REFERENCES];
      const domain = referenceDomain(key);
      counts[known?.[1] ?? "otherReferenceCount"] += count;
      domains[domain] += count;
      return { key, domain, count };
    });
    if (Object.values(domains).reduce((sum, count) => sum + count, 0) !== row.totalReferenceCount) throw new Error("REFERENCE_TOTAL_MISMATCH");
    return { runtimeVocabularyId: row.runtimeVocabularyId, word: row.word, enabled: row.enabled, contentVersion: row.contentVersion,
      ...counts, totalReferenceCount: row.totalReferenceCount, hasLearnerHistory: domains.LEARNER_HISTORY > 0,
      hasProductRelationships: domains.PRODUCT_RELATIONSHIP > 0, hasMasterRelationships: domains.MASTER_RELATIONSHIP > 0,
      hasOtherReferences: domains.OTHER_OR_UNKNOWN > 0, sourceIdentityObligation: row.sourceIdentityObligation,
      semanticCandidateRelation: candidate.relation, ownerReviewedExclusionCount: excludedPairs.length,
      referenceDomains: domains, referenceColumns: columns };
  }).sort((a, b) => a.runtimeVocabularyId - b.runtimeVocabularyId);
}

export function planRetirement(rows: DecomposedRow[], relationships: ProductRelationships[]) {
  const relationshipsById = new Map(relationships.map((row) => [row.runtimeVocabularyId, row]));
  if (relationshipsById.size !== relationships.length) throw new Error("PRODUCT_RELATIONSHIP_DUPLICATE_ROW");
  const plans = rows.map((row) => {
    const product = relationshipsById.get(row.runtimeVocabularyId);
    const enumerated = Boolean(product && product.topicIds.every((id) => Number.isSafeInteger(id) && id > 0) &&
      product.learningSetItems.every((item) => Number.isSafeInteger(item.learningSetId) && item.learningSetId > 0 && Number.isSafeInteger(item.sortOrder) && item.sortOrder >= 0) &&
      new Set(product.topicIds).size === row.topicMembershipReferenceCount && product.topicIds.length === row.topicMembershipReferenceCount &&
      new Set(product.learningSetItems.map((item) => item.learningSetId)).size === row.learningSetItemReferenceCount && product.learningSetItems.length === row.learningSetItemReferenceCount);
    if (!enumerated) throw new Error("PRODUCT_RELATIONSHIP_ENUMERATION_MISMATCH");
    const productOnly = !row.hasLearnerHistory && row.hasProductRelationships && !row.hasMasterRelationships && row.masterMappingReferenceCount === 0 && !row.hasOtherReferences;
    const disposition = futureDisposition(row);
    const planningEligible = !row.hasLearnerHistory && !row.hasOtherReferences && !row.hasMasterRelationships && row.masterMappingReferenceCount === 0 && enumerated;
    const blockers = [
      ...(row.hasLearnerHistory ? ["LEARNER_HISTORY_MUST_REMAIN_ON_ORIGINAL_RUNTIME_ID"] : []),
      ...(row.hasProductRelationships ? ["PRODUCT_RELATIONSHIP_MIGRATION_REQUIRES_SEPARATE_APPROVAL"] : []),
      ...(row.hasMasterRelationships ? ["MASTER_RELATIONSHIPS_REQUIRE_SEPARATE_REVIEW"] : []),
      ...(row.masterMappingReferenceCount > 0 ? ["MASTER_MAPPING_BLOCKS_LEGACY_RETIREMENT"] : []),
      ...(row.hasOtherReferences ? ["OTHER_OR_UNKNOWN_REFERENCES_BLOCK_RETIREMENT"] : []),
      ...(row.sourceIdentityObligation ? ["SOURCE_IDENTITY_OBLIGATION_REQUIRES_EXPLICIT_RESOLUTION"] : []),
      ...(row.enabled ? ["ENABLED_RUNTIME_DEPENDENCY_REQUIRES_PRODUCT_REVIEW"] : []),
      ...(row.ownerReviewedExclusionCount > 0 ? ["OWNER_EXCLUDED_MASTER_PAIRS_CANNOT_BE_SUCCESSORS"] : []),
      disposition, "VOCABULARY_DISPOSITION_AND_RETIREMENT_REQUIRE_OWNER_APPROVAL"
    ];
    return { runtimeVocabularyId: row.runtimeVocabularyId, word: row.word, disposition,
      groups: [
        ...(row.hasLearnerHistory ? ["A_LEARNER_HISTORY_PROTECTED"] : []),
        ...(productOnly ? ["B_PRODUCT_RELATIONSHIP_ONLY"] : []),
        row.semanticCandidateRelation === "NO_MASTER_CANDIDATE" ? "C1_MASTER_COVERAGE_REQUIRED" : "C2_EXISTING_MASTER_IDENTITY_REVIEW",
        ...(planningEligible ? ["D_RETIREMENT_AFTER_RELATIONSHIP_MIGRATION_PLANNING"] : [])
      ], blockers, productRelationships: product!, planningOnly: true, currentlyRetireSafe: false, deleteRecommended: false,
      futureRequirements: {
        learnerHistoryPreserved: true, productRelationshipsEnumerated: enumerated,
        approvedVocabularyDisposition: false, approvedRelationshipMigration: false,
        sourceIdentityResolutionRequired: row.sourceIdentityObligation, enabledDependencyReviewRequired: row.enabled,
        finalReadOnlyReferenceRecheckRequired: true, separateRetirementAuthorizationRequired: true
      } };
  });
  const groupNames = ["A_LEARNER_HISTORY_PROTECTED", "B_PRODUCT_RELATIONSHIP_ONLY", "C1_MASTER_COVERAGE_REQUIRED", "C2_EXISTING_MASTER_IDENTITY_REVIEW", "D_RETIREMENT_AFTER_RELATIONSHIP_MIGRATION_PLANNING"];
  const groups = Object.fromEntries(groupNames.map((group) => {
    const ids = plans.filter((row) => row.groups.includes(group)).map((row) => row.runtimeVocabularyId);
    return [group, { count: ids.length, runtimeVocabularyIds: ids }];
  }));
  const relationCounts = Object.fromEntries([...new Set(rows.map((row) => row.semanticCandidateRelation))].sort().map((relation) => [relation, rows.filter((row) => row.semanticCandidateRelation === relation).length]));
  const domainTotals = Object.fromEntries(Object.keys(rows[0]?.referenceDomains ?? {}).map((domain) => [domain, rows.reduce((sum, row) => sum + row.referenceDomains[domain as ReferenceDomain], 0)]));
  return { plans, groups, summary: { legacyRows: rows.length, semanticDistribution: relationCounts, referenceDomainTotals: domainTotals,
    sourceIdentityObligationRows: rows.filter((row) => row.sourceIdentityObligation).length, enabledLegacyRows: rows.filter((row) => row.enabled).length,
    currentlyRetireSafe: 0, deleteRecommendations: 0, groupsOverlap: true } };
}

// The scenario is an explicit assumption record, never an authorization or
// successor mapping. Excluded pairs cannot be reintroduced as successors.
export function simulatePostMigration(rows: DecomposedRow[], scenario: {
  productRelationshipsMigratedOrRemoved: boolean; ownerApprovedDispositionIds: number[];
  sourceIdentityResolvedIds: number[]; separatelyDisabledIds: number[]; preservationPolicyClearedIds: number[];
}) {
  const retirement = new Set(scenario.ownerApprovedDispositionIds);
  const source = new Set(scenario.sourceIdentityResolvedIds);
  const disabled = new Set(scenario.separatelyDisabledIds);
  const preservation = new Set(scenario.preservationPolicyClearedIds);
  const ids = new Set(rows.map((row) => row.runtimeVocabularyId));
  if ([...retirement, ...source, ...disabled, ...preservation].some((id) => !ids.has(id))) throw new Error("HYPOTHETICAL_SCENARIO_ROW_UNKNOWN");
  const results = rows.map((row) => {
    const remainingReferenceCount = row.totalReferenceCount - (scenario.productRelationshipsMigratedOrRemoved ? row.referenceDomains.PRODUCT_RELATIONSHIP : 0);
    const blockers = [
      ...(row.hasLearnerHistory ? ["LEARNER_HISTORY_PROTECTED"] : []),
      ...(remainingReferenceCount > 0 ? ["REMAINING_REFERENCES"] : []),
      ...(row.hasOtherReferences ? ["OTHER_OR_UNKNOWN_REFERENCE"] : []),
      ...(row.sourceIdentityObligation && !source.has(row.runtimeVocabularyId) ? ["UNRESOLVED_SOURCE_IDENTITY"] : []),
      ...(!disabled.has(row.runtimeVocabularyId) ? ["NOT_CONFIRMED_DISABLED_BY_SEPARATELY_AUTHORIZED_PHASE"] : []),
      ...(!preservation.has(row.runtimeVocabularyId) ? ["PRESERVATION_POLICY_NOT_ASSUMED_CLEARED"] : []),
      ...(!retirement.has(row.runtimeVocabularyId) ? ["NO_ASSUMED_OWNER_APPROVED_DISPOSITION"] : []),
      ...(row.runtimeVocabularyId === 11 || row.runtimeVocabularyId === 284 ? ["OWNER_PRESERVED_HISTORICAL_RUNTIME_ID"] : [])
    ];
    return { runtimeVocabularyId: row.runtimeVocabularyId, disposition: futureDisposition(row), remainingReferenceCount, hypotheticalCandidate: blockers.length === 0, blockers };
  });
  return { scenario, offlineSimulationOnly: true, authorization: AUTHORIZATION,
    hypotheticalCandidateCount: results.filter((row) => row.hypotheticalCandidate).length,
    hypotheticalCandidateIds: results.filter((row) => row.hypotheticalCandidate).map((row) => row.runtimeVocabularyId),
    zeroReferenceRowsAfterAssumedProductMigration: results.filter((row) => row.remainingReferenceCount === 0).length,
    stillProtectedByLearnerHistory: rows.filter((row) => row.hasLearnerHistory).length,
    stillBlockedByMasterReferences: rows.filter((row) => row.hasMasterRelationships || row.masterMappingReferenceCount > 0).length,
    stillBlockedByOtherReferences: rows.filter((row) => row.hasOtherReferences).length,
    dispositionCounts: Object.fromEntries(["MASTER_SUCCESSOR_REQUIRES_APPROVAL", "MASTER_COVERAGE_REQUIRED", "CONTENT_RETIREMENT_REQUIRES_OWNER_APPROVAL"].map((disposition) => [disposition, {
      totalRows: results.filter((row) => row.disposition === disposition).length,
      zeroReferenceRows: results.filter((row) => row.disposition === disposition && row.remainingReferenceCount === 0).length,
      hypotheticalCandidates: results.filter((row) => row.disposition === disposition && row.hypotheticalCandidate).length
    }])),
    remainingReferenceTotal: results.reduce((sum, row) => sum + row.remainingReferenceCount, 0), results };
}

export function referenceOverlapMatrix(rows: DecomposedRow[]) {
  const flags = {
    learnerProgress: (row: DecomposedRow) => row.learnerProgressReferenceCount > 0,
    reviewEvents: (row: DecomposedRow) => row.reviewEventReferenceCount > 0,
    savedVocabulary: (row: DecomposedRow) => row.savedVocabularyReferenceCount > 0,
    learnerHistory: (row: DecomposedRow) => row.hasLearnerHistory,
    topic: (row: DecomposedRow) => row.topicMembershipReferenceCount > 0,
    learningSet: (row: DecomposedRow) => row.learningSetItemReferenceCount > 0,
    masterRelationship: (row: DecomposedRow) => row.hasMasterRelationships,
    masterMapping: (row: DecomposedRow) => row.masterMappingReferenceCount > 0,
    otherOrUnknown: (row: DecomposedRow) => row.hasOtherReferences
  };
  const cohort = (predicate: (row: DecomposedRow) => boolean) => {
    const runtimeVocabularyIds = rows.filter(predicate).map((row) => row.runtimeVocabularyId);
    return { count: runtimeVocabularyIds.length, runtimeVocabularyIds };
  };
  const overlaps = {
    learnerProgressOnlyAmongHistory: cohort((row) => flags.learnerProgress(row) && !flags.reviewEvents(row) && !flags.savedVocabulary(row)),
    reviewEventsOnlyAmongHistory: cohort((row) => flags.reviewEvents(row) && !flags.learnerProgress(row) && !flags.savedVocabulary(row)),
    learnerProgressAndReviewEvents: cohort((row) => flags.learnerProgress(row) && flags.reviewEvents(row)),
    savedVocabulary: cohort(flags.savedVocabulary),
    learnerHistoryAndTopic: cohort((row) => flags.learnerHistory(row) && flags.topic(row)),
    learnerHistoryAndLearningSet: cohort((row) => flags.learnerHistory(row) && flags.learningSet(row)),
    topicWithoutLearningSet: cohort((row) => flags.topic(row) && !flags.learningSet(row)),
    learningSetWithoutTopic: cohort((row) => flags.learningSet(row) && !flags.topic(row)),
    topicOnlyAllDomains: cohort((row) => flags.topic(row) && row.totalReferenceCount === row.topicMembershipReferenceCount),
    learningSetOnlyAllDomains: cohort((row) => flags.learningSet(row) && row.totalReferenceCount === row.learningSetItemReferenceCount),
    topicAndLearningSet: cohort((row) => flags.topic(row) && flags.learningSet(row)),
    masterRelationship: cohort(flags.masterRelationship), otherOrUnknown: cohort(flags.otherOrUnknown)
  };
  const pairwise = Object.fromEntries(Object.entries(flags).map(([left, leftPredicate]) => [left,
    Object.fromEntries(Object.entries(flags).map(([right, rightPredicate]) => [right, cohort((row) => leftPredicate(row) && rightPredicate(row))]))]));
  const exactSignatures = new Map<string, number[]>();
  for (const row of rows) {
    const signature = Object.entries(flags).filter(([name, predicate]) => name !== "learnerHistory" && predicate(row)).map(([name]) => name).join("+") || "ZERO_REFERENCE";
    exactSignatures.set(signature, [...(exactSignatures.get(signature) ?? []), row.runtimeVocabularyId]);
  }
  return { semantics: "onlyAmongHistory excludes other history domains, not topic/set links; onlyAllDomains excludes every other reference domain; pairwise intersections may overlap", overlaps, pairwise,
    exactSignatures: [...exactSignatures].sort(([a], [b]) => a.localeCompare(b)).map(([signature, ids]) => ({ signature, count: ids.length, runtimeVocabularyIds: ids })),
    exactSignatureRowTotal: [...exactSignatures.values()].reduce((sum, ids) => sum + ids.length, 0) };
}

export function semanticReferenceCrossTab(rows: DecomposedRow[]) {
  return ["NO_MASTER_CANDIDATE", "OWNER_REVIEWED_NOT_SAME_IDENTITY", "EXISTING_MASTER_RUNTIME_DUPLICATE", "MULTIPLE_MASTER_CANDIDATES"].map((relation) => {
    const cohort = rows.filter((row) => row.semanticCandidateRelation === relation);
    const history = cohort.filter((row) => row.hasLearnerHistory);
    const productOnly = cohort.filter((row) => !row.hasLearnerHistory && row.hasProductRelationships && !row.hasMasterRelationships && row.masterMappingReferenceCount === 0 && !row.hasOtherReferences);
    return { relation, totalRows: cohort.length, learnerHistoryRows: history.length, learnerHistoryRuntimeIds: history.map((row) => row.runtimeVocabularyId),
      productOnlyRows: productOnly.length, productOnlyRuntimeIds: productOnly.map((row) => row.runtimeVocabularyId),
      masterReferenceRows: cohort.filter((row) => row.hasMasterRelationships || row.masterMappingReferenceCount > 0).length,
      otherReferenceRows: cohort.filter((row) => row.hasOtherReferences).length,
      sourceIdentityObligationRows: cohort.filter((row) => row.sourceIdentityObligation).length };
  });
}

function relationshipMigrationReadiness(snapshot: PlanningSnapshot) {
  const crossCheck = snapshot.schemaInventory.crossCheck as { runtimeCode: { evidenceByTable: Record<string, string[]>; directTablesWithoutRuntimeCode: string[] } };
  return { analysisOnly: true, executableMigrationSqlCreated: false, databaseConstraints: snapshot.relationshipSchemaConstraints, relationships: [
    { table: "vocabflow_app.vocabulary_topics", key: ["vocabulary_id", "topic_id"], payload: [],
      vocabularyFkDeleteAction: "CASCADE", topicFkDeleteAction: "CASCADE", masterInfrastructure: "vocabflow_app.master_vocabulary_topic_memberships",
      masterKey: ["master_sense_id", "master_topic_id"], masterRuntimePair: ["vocabulary_id", "topic_id"],
      runtimeUsage: ["topic browse", "topic progress", "continue learning", "global search"],
      runtimeEvidence: crossCheck.runtimeCode.evidenceByTable.vocabulary_topics ?? [],
      cautions: ["Cascade is a storage constraint, not retirement approval", "Master membership ownership has composite runtime-link FKs with NO ACTION"] },
    { table: "vocabflow_app.learning_set_items", key: ["learning_set_id", "vocabulary_id"], payload: ["sort_order"],
      vocabularyFkDeleteAction: "NO ACTION", learningSetFkDeleteAction: "CASCADE", masterInfrastructure: "vocabflow_app.master_learning_set_memberships",
      masterKey: ["master_learning_set_item_id"], masterRuntimePair: ["learning_set_id", "vocabulary_id"],
      runtimeUsage: ["active assigned-set study eligibility", "review queue", "weak words", "progress", "continue learning", "global search"],
      runtimeEvidence: crossCheck.runtimeCode.evidenceByTable.learning_set_items ?? [],
      cautions: ["Preserve set membership and sort_order", "Successor collisions require an explicit order/deduplication policy", "Master ownership has composite runtime-link FKs with NO ACTION"] }
  ].map((relationship) => ({ ...relationship, schemaEvidence: "apps/api/src/db/schema.ts", toolingEvidence: "scripts/master-vocabulary-v2-import-store.ts",
    equivalentMasterInfrastructureExists: true, successorRuntimeVocabularyIdRequiredForMigration: true,
    successorRuntimeVocabularyIdRequiredForApprovedRelationshipRemoval: false, currentlyDeterministic: false,
    deterministicOnlyAfter: ["Owner approves precise vocabulary disposition and successor identity", "Successor is materialized under separate approval", "Topic/set identity is approved and mapping exists if Master ownership is required", "Resolve duplicate keys, sort order and enabled-set assignment impact", "Approve relationship migration/removal separately"],
    ownerContentDecisionsRequired: true, authorization: AUTHORIZATION })) };
}

export type PlanningSnapshot = {
  sourceBaseline: string; acceptedSemanticFingerprint: string;
  target: Record<string, unknown>; transaction: { isolation: string; readOnly: boolean }; databaseIdentity: Record<string, unknown>;
  inventory: SanitizedInventoryRow[]; schemaInventory: { tables: CatalogColumn[]; [key: string]: unknown };
  productRelationships: ProductRelationships[]; hybridCheckpoint: Record<string, unknown>;
  relationshipSchemaConstraints: Array<{ table: string; name: string; type: string; definition: string }>;
};
function readJson<T>(root: string, file: string): T { return JSON.parse(readFileSync(path.join(root, file), "utf8")) as T; }
function assertAcceptedSemantics(root: string): CandidateAnalysis[] {
  if (closeLegacySemanticExclusions(true, root) !== ACCEPTED_FINGERPRINT) throw new Error("ACCEPTED_SEMANTIC_FINGERPRINT_MISMATCH");
  return readJson<{ candidates: CandidateAnalysis[] }>(root, `${INPUT}/legacy-master-candidates.json`).candidates;
}
export function assertRemoteBaseline(root = ROOT): void {
  execFileSync("git", ["fetch", "origin"], { cwd: root, stdio: "pipe" });
  const remote = execFileSync("git", ["rev-parse", "origin/TXH"], { cwd: root, encoding: "utf8" }).trim();
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  if (remote !== PHASE_2G3B_BASELINE || head !== PHASE_2G3B_BASELINE) throw new Error("PHASE_2G3B_REMOTE_BASELINE_MISMATCH");
}

async function capturePlanningSnapshot(): Promise<PlanningSnapshot> {
  loadLocalDevelopmentEnvironment();
  const target = getTarget("development", "runtime");
  assertDevelopmentTarget(target);
  const verified = await assertResolvedTargetBeforeMutation({ context: "local-development", source: "dev-launcher", environment: "development", purpose: "runtime", operation: "db-check", target });
  const masterSource = readApprovedMasterCorpus(ROOT);
  const client = postgres(verified.url, { max: 1, connect_timeout: 10, idle_timeout: 5, prepare: false, onnotice: () => undefined });
  try {
    return await client.begin(async (tx) => {
      const database = await captureDatabaseSnapshot(tx as unknown as ReturnType<typeof postgres>, target, masterSource);
      const read = async (sqlText: string) => { assertReadOnlySql(sqlText); return tx.unsafe(sqlText); };
      const topicRows = await read('SELECT vocabulary_id, topic_id FROM "vocabflow_app"."vocabulary_topics" ORDER BY vocabulary_id, topic_id');
      const setRows = await read('SELECT vocabulary_id, learning_set_id, sort_order FROM "vocabflow_app"."learning_set_items" ORDER BY vocabulary_id, learning_set_id');
      const constraints = await read(`SELECT rel.relname AS table_name, c.conname AS constraint_name, c.contype::text AS constraint_type, pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c JOIN pg_class rel ON rel.oid = c.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = 'vocabflow_app' AND rel.relname IN ('vocabulary_topics', 'learning_set_items', 'master_vocabulary_topic_memberships', 'master_learning_set_memberships')
        ORDER BY rel.relname, c.conname`);
      const productRelationships = database.runtimeRows.filter((row) => row.topLevelPartition === "LEGACY_UNMAPPED").map((row) => ({
        runtimeVocabularyId: row.runtimeVocabularyId,
        topicIds: topicRows.filter((link) => Number(link.vocabulary_id) === row.runtimeVocabularyId).map((link) => Number(link.topic_id)),
        learningSetItems: setRows.filter((link) => Number(link.vocabulary_id) === row.runtimeVocabularyId).map((link) => ({ learningSetId: Number(link.learning_set_id), sortOrder: Number(link.sort_order) }))
      }));
      return { sourceBaseline: PHASE_2G3B_BASELINE, acceptedSemanticFingerprint: ACCEPTED_FINGERPRINT,
        target: database.target, transaction: database.transaction, databaseIdentity: database.databaseIdentity,
        inventory: sanitizeRuntimeRows(database.runtimeRows) as SanitizedInventoryRow[],
        schemaInventory: database.schemaInventory as PlanningSnapshot["schemaInventory"], productRelationships, hybridCheckpoint: database.hybridCheckpoint,
        relationshipSchemaConstraints: constraints.map((constraint) => ({ table: String(constraint.table_name), name: String(constraint.constraint_name), type: String(constraint.constraint_type), definition: String(constraint.definition) })) };
    });
  } finally { await client.end({ timeout: 5 }); }
}

export function buildPlanningArtifacts(snapshot: PlanningSnapshot, candidates: CandidateAnalysis[], root = ROOT) {
  assertNoPII(snapshot);
  assertDevelopmentTarget(snapshot.target as Parameters<typeof assertDevelopmentTarget>[0]);
  if (snapshot.sourceBaseline !== PHASE_2G3B_BASELINE || snapshot.acceptedSemanticFingerprint !== ACCEPTED_FINGERPRINT ||
      snapshot.transaction.isolation !== "REPEATABLE_READ" || !snapshot.transaction.readOnly || snapshot.databaseIdentity.currentRole !== "vocabflow_runtime" ||
      snapshot.databaseIdentity.transactionReadOnly !== true || snapshot.databaseIdentity.transactionIsolation !== "repeatable read" || snapshot.databaseIdentity.databaseName !== "neondb" ||
      snapshot.databaseIdentity.environment !== "development" || snapshot.databaseIdentity.provider !== "neon" || snapshot.databaseIdentity.projectId !== "shy-hill-72364426" ||
      snapshot.databaseIdentity.branchId !== "br-square-grass-b3af0nte" || snapshot.hybridCheckpoint.status !== "VERIFIED" || snapshot.hybridCheckpoint.hybridMasterMappings !== 100 ||
      snapshot.hybridCheckpoint.runtime284MappingSenseId !== "01a0fc13-09ef-7d37-a50f-d05db6b1a89c") throw new Error("PLANNING_SNAPSHOT_IDENTITY_INVALID");
  const rows = decomposeLegacyRows({ inventory: snapshot.inventory, candidates, catalog: snapshot.schemaInventory.tables, exclusions: readOwnerReviewedExclusions(root).exclusions });
  const planning = planRetirement(rows, snapshot.productRelationships);
  const sum = (key: keyof Counts) => rows.reduce((total, row) => total + row[key], 0);
  const partitions = { total: snapshot.inventory.length, masterManaged: snapshot.inventory.filter((row) => row.mappingStatus === "MASTER_MANAGED").length,
    legacyUnmapped: rows.length, mappingAnomaly: snapshot.inventory.filter((row) => row.mappingStatus === "MAPPING_ANOMALY").length };
  const totals = { learnerProgress: sum("learnerProgressReferenceCount"), reviewEvents: sum("reviewEventReferenceCount"), savedVocabulary: sum("savedVocabularyReferenceCount"),
    topicMemberships: sum("topicMembershipReferenceCount"), learningSetItems: sum("learningSetItemReferenceCount"), masterTopics: sum("masterTopicMembershipReferenceCount"),
    masterLearningSets: sum("masterLearningSetMembershipReferenceCount"), masterMappings: sum("masterMappingReferenceCount"), other: sum("otherReferenceCount") };
  const distribution = planning.summary.semanticDistribution;
  if (partitions.total !== 2126 || partitions.masterManaged !== 108 || partitions.legacyUnmapped !== 2018 || partitions.mappingAnomaly !== 0 ||
      totals.learnerProgress !== 84 || totals.reviewEvents !== 221 || totals.savedVocabulary !== 0 || totals.topicMemberships !== 2026 || totals.learningSetItems !== 279 ||
      totals.masterTopics !== 0 || totals.masterLearningSets !== 0 || totals.masterMappings !== 0 || totals.other !== 0 ||
      rows.filter((row) => row.learnerProgressReferenceCount > 0).length !== 75 || rows.filter((row) => row.reviewEventReferenceCount > 0).length !== 75 ||
      rows.some((row) => row.totalReferenceCount === 0) || distribution.NO_MASTER_CANDIDATE !== 2005 || distribution.OWNER_REVIEWED_NOT_SAME_IDENTITY !== 11 ||
      distribution.EXISTING_MASTER_RUNTIME_DUPLICATE !== 1 || distribution.MULTIPLE_MASTER_CANDIDATES !== 1 ||
      rows.find((row) => row.runtimeVocabularyId === 11)?.learnerProgressReferenceCount !== 1 || rows.find((row) => row.runtimeVocabularyId === 11)?.reviewEventReferenceCount !== 5) throw new Error("ACCEPTED_INVENTORY_DRIFT_REQUIRES_REVIEW");
  const baselineInventory = readJson<{ rows: SanitizedInventoryRow[] }>(root, `${INPUT}/runtime-vocabulary-inventory.json`).rows;
  if (deterministicAuditFingerprint(snapshot.inventory) !== deterministicAuditFingerprint(baselineInventory)) throw new Error("ACCEPTED_RUNTIME_OR_REFERENCE_DRIFT");
  const overlapMatrix = referenceOverlapMatrix(rows);
  const semanticCrossTab = semanticReferenceCrossTab(rows);
  const readiness = relationshipMigrationReadiness(snapshot);
  const emptyScenario = { productRelationshipsMigratedOrRemoved: false, ownerApprovedDispositionIds: [] as number[], sourceIdentityResolvedIds: [] as number[], separatelyDisabledIds: [] as number[], preservationPolicyClearedIds: [] as number[] };
  const allIds = rows.map((row) => row.runtimeVocabularyId);
  const noHistoryIds = rows.filter((row) => !row.hasLearnerHistory).map((row) => row.runtimeVocabularyId);
  const scenarios = {
    S0_CURRENT_STATE: simulatePostMigration(rows, emptyScenario),
    S1_REMOVE_ONLY_PRODUCT_RELATIONSHIPS: simulatePostMigration(rows, { ...emptyScenario, productRelationshipsMigratedOrRemoved: true }),
    S2_RELATIONSHIP_MIGRATION_AND_IDENTITY_DISPOSITION: simulatePostMigration(rows, { ...emptyScenario, productRelationshipsMigratedOrRemoved: true, ownerApprovedDispositionIds: allIds }),
    S3_POST_DISABLE: {
      disableOnly: simulatePostMigration(rows, { ...emptyScenario, productRelationshipsMigratedOrRemoved: true, ownerApprovedDispositionIds: allIds, separatelyDisabledIds: allIds }),
      allRemainingPrerequisitesAssumed: simulatePostMigration(rows, { ...emptyScenario, productRelationshipsMigratedOrRemoved: true, ownerApprovedDispositionIds: allIds,
        separatelyDisabledIds: allIds, sourceIdentityResolvedIds: noHistoryIds, preservationPolicyClearedIds: noHistoryIds }),
      note: "Disable alone does not resolve source identity or preservation policy. The second branch explicitly assumes both have been resolved for no-history rows; it is a conditional ceiling, not an approved cohort or real cleanup class. No excluded Master pair is adopted by either branch."
    }
  };
  const simulation = scenarios.S1_REMOVE_ONLY_PRODUCT_RELATIONSHIPS;
  planning.groups.E_HYPOTHETICAL_POST_MIGRATION_DELETE_CANDIDATE = {
    count: scenarios.S3_POST_DISABLE.allRemainingPrerequisitesAssumed.hypotheticalCandidateCount,
    runtimeVocabularyIds: scenarios.S3_POST_DISABLE.allRemainingPrerequisitesAssumed.hypotheticalCandidateIds
  };
  const catalog = snapshot.schemaInventory.tables.map((column) => ({ ...column, domain: referenceDomain(`${column.schema}.${column.table}.${column.column}`),
    legacyReferenceTotal: rows.reduce((sum, row) => sum + (row.referenceColumns.find((reference) => reference.key === `${column.schema}.${column.table}.${column.column}`)?.count ?? 0), 0) }));
  const interesting = rows.filter((row) => row.semanticCandidateRelation !== "NO_MASTER_CANDIDATE");
  const summary = { status: "PASS", sourceBaseline: PHASE_2G3B_BASELINE, acceptedSemanticFingerprint: ACCEPTED_FINGERPRINT,
    partitions, referenceTotals: totals, ...planning.summary,
    groups: Object.fromEntries(Object.entries(planning.groups).map(([name, group]) => [name, group.count])),
    hypotheticalPostMigrationDeleteCandidates: scenarios.S3_POST_DISABLE.allRemainingPrerequisitesAssumed.hypotheticalCandidateCount,
    currentDeleteSafeCandidate: 0,
    referenceOverlaps: Object.fromEntries(Object.entries(overlapMatrix.overlaps).map(([key, cohort]) => [key, cohort.count])),
    semanticReferenceCrossTab: semanticCrossTab.map((row) => ({ relation: row.relation, totalRows: row.totalRows, learnerHistoryRows: row.learnerHistoryRows,
      productOnlyRows: row.productOnlyRows, masterReferenceRows: row.masterReferenceRows, otherReferenceRows: row.otherReferenceRows, sourceIdentityObligationRows: row.sourceIdentityObligationRows })),
    scenarioResults: { S0: { zeroReference: scenarios.S0_CURRENT_STATE.zeroReferenceRowsAfterAssumedProductMigration, hypotheticalCandidates: 0 },
      S1: { zeroReference: simulation.zeroReferenceRowsAfterAssumedProductMigration, historyProtected: simulation.stillProtectedByLearnerHistory, masterBlocked: simulation.stillBlockedByMasterReferences, otherBlocked: simulation.stillBlockedByOtherReferences, remainingReferences: simulation.remainingReferenceTotal, hypotheticalCandidates: simulation.hypotheticalCandidateCount },
      S2: { zeroReference: scenarios.S2_RELATIONSHIP_MIGRATION_AND_IDENTITY_DISPOSITION.zeroReferenceRowsAfterAssumedProductMigration, dispositionCounts: scenarios.S2_RELATIONSHIP_MIGRATION_AND_IDENTITY_DISPOSITION.dispositionCounts, hypotheticalCandidates: scenarios.S2_RELATIONSHIP_MIGRATION_AND_IDENTITY_DISPOSITION.hypotheticalCandidateCount },
      S3: { disableOnlyCandidates: scenarios.S3_POST_DISABLE.disableOnly.hypotheticalCandidateCount, allPrerequisitesAssumedCandidates: scenarios.S3_POST_DISABLE.allRemainingPrerequisitesAssumed.hypotheticalCandidateCount } },
    runtime11History: { progress: 1, reviews: 5 }, runtime284BookingMapping: "UNCHANGED_FROM_ACCEPTED_INVENTORY",
    databaseWrites: "NONE", production: "NOT_CONNECTED / NOT_QUERIED / NOT_MUTATED", authorization: AUTHORIZATION };
  const evidence = { snapshot, rows, planning, scenarios, catalog, overlapMatrix, semanticCrossTab, readiness, summary, authorization: AUTHORIZATION };
  assertNoPII(evidence);
  const fingerprint = deterministicAuditFingerprint(evidence);
  const common = { phase: "2G.3B", planningOnly: true, fingerprint, legacyRetirementPlanningFingerprint: fingerprint, authorization: AUTHORIZATION };
  const artifacts = new Map<string, unknown>([
    ["read-only-snapshot.json", snapshot], ["reference-domain-inventory.json", { ...common, databaseCatalogIsPrimaryTruth: true, columns: catalog }],
    ["development-target.json", { ...common, target: snapshot.target, transaction: snapshot.transaction, databaseIdentity: snapshot.databaseIdentity, databaseConnection: "READ_ONLY_DEVELOPMENT", databaseWrites: "NONE", production: "NOT_CONNECTED" }],
    ["legacy-reference-decomposition.json", { ...common, rows }], ["retirement-groups.json", { ...common, groups: planning.groups }],
    ["retirement-planning.json", { ...common, rows: planning.plans }], ["hypothetical-retirement-scenarios.json", { ...common, scenarios }],
    ["reference-overlap-matrix.json", { ...common, ...overlapMatrix }], ["semantic-reference-cross-tab.json", { ...common, rows: semanticCrossTab }],
    ["relationship-migration-readiness.json", { ...common, ...readiness }],
    ["validation-summary.json", { ...summary, fingerprint, legacyRetirementPlanningFingerprint: fingerprint }],
    ["manifest.json", { artifactType: "DEVELOPMENT_LEGACY_REFERENCE_RETIREMENT_PLANNING", artifactVersion: 1, ...common,
      sourceBaseline: PHASE_2G3B_BASELINE, acceptedSemanticFingerprint: ACCEPTED_FINGERPRINT, databaseTransaction: snapshot.transaction,
      fingerprintEvidenceHashes: Object.fromEntries(Object.entries(evidence).map(([key, value]) => [key, deterministicAuditFingerprint(value)])),
      files: ["development-target.json", "read-only-snapshot.json", "reference-domain-inventory.json", "legacy-reference-decomposition.json", "retirement-groups.json", "retirement-planning.json", "hypothetical-retirement-scenarios.json", "reference-overlap-matrix.json", "semantic-reference-cross-tab.json", "relationship-migration-readiness.json", "validation-summary.json", "manifest.json", `../../reports/${path.basename(REPORT)}`] }]
  ]);
  const groupsTable = Object.entries(summary.groups).map(([name, count]) => `| ${name} | ${count} |`).join("\n");
  const catalogTable = catalog.map((column) => `| ${column.schema}.${column.table}.${column.column} | ${column.domain} | ${column.legacyReferenceTotal} |`).join("\n");
  const interestingTable = interesting.map((row) => `| #${row.runtimeVocabularyId} ${row.word} | ${row.semanticCandidateRelation} | ${row.ownerReviewedExclusionCount} | ${row.referenceDomains.LEARNER_HISTORY} | ${row.topicMembershipReferenceCount} / ${row.learningSetItemReferenceCount} |`).join("\n");
  const overlapTable = Object.entries(overlapMatrix.overlaps).map(([name, cohort]) => `| ${name} | ${cohort.count} |`).join("\n");
  const crossTabTable = semanticCrossTab.map((row) => `| ${row.relation} | ${row.totalRows} | ${row.learnerHistoryRows} | ${row.productOnlyRows} | ${row.sourceIdentityObligationRows} |`).join("\n");
  const dispositionTable = Object.entries(scenarios.S2_RELATIONSHIP_MIGRATION_AND_IDENTITY_DISPOSITION.dispositionCounts).map(([name, counts]) => `| ${name} | ${counts.totalRows} | ${counts.zeroReferenceRows} |`).join("\n");
  const report = `# Phase 2G.3B — Legacy reference decomposition and retirement planning\n\n` +
    `Status: PASS — read-only analysis and planning only. Source baseline: \`${PHASE_2G3B_BASELINE}\`. Accepted semantic fingerprint: \`${ACCEPTED_FINGERPRINT}\`.\n\n` +
    `Development: neon / shy-hill-72364426 / br-square-grass-b3af0nte / neondb / vocabflow_runtime. Provider preconnect identity verified; transaction REPEATABLE READ, READ ONLY. Production not connected, queried or mutated. Database writes NONE.\n\n` +
    `## Reference decomposition\n\nAll 2018 legacy rows are protected. The runtime partition remains 2126 total, 108 Master-managed and zero mapping anomalies. Catalog discovery is primary truth; each reference column is counted once, including application-level Master relationship columns. No learner IDs, user IDs, household IDs, emails, sessions, tokens or connection strings are serialized.\n\n` +
    `| Catalog column | Domain | Legacy references |\n|---|---|---:|\n${catalogTable}\n\n` +
    `## Overlapping planning groups\n\n| Group | Rows |\n|---|---:|\n${groupsTable}\n\n` +
    `Groups overlap; their counts must not be summed as a partition. A preserves learner progress, review events and saved-word references. B means only understood product links exist, not permission to delete. C1 requires future Master coverage or an explicit owner-approved content retirement. C2 preserves the specific reviewed identity questions; excluded Sense pairs are never Master successors. D records the product links and future disposition gates for rows with no learner history, Master links or unknown references. D is planning only.\n\n` +
    `${planning.summary.sourceIdentityObligationRows} legacy rows have source identity obligations and ${planning.summary.enabledLegacyRows} are enabled. These are additional gates even after taxonomy relationships change. Every planning row records source and enabled dependency review requirements, the required vocabulary disposition, and a final reference recheck.\n\n` +
    `## Existing Master and reviewed identity cases\n\n| Runtime | Relation | Excluded Sense pairs | History refs | Topic / set refs |\n|---|---|---:|---:|---:|\n${interestingTable}\n\n` +
    `## Exact reference overlaps\n\n| Overlap | Rows |\n|---|---:|\n${overlapTable}\n\n` +
    `The learner progress/review intersection is computed from per-row counts, not inferred from equal marginal counts. "Only among history" excludes other history types but may include product links; "only all domains" excludes every other reference type. The artifact includes the full pairwise matrix and disjoint exact signatures covering ${overlapMatrix.exactSignatureRowTotal} rows.\n\n` +
    `## Semantic/reference cross-tab\n\n| Relation | Total | Learner history | Product-only | Source identity |\n|---|---:|---:|---:|---:|\n${crossTabTable}\n\n` +
    `#11 retains 1 progress and 5 review references. #284 booking remains Master-managed. #295 apple remains POSSIBLE review evidence, with no mapping created; #849 record remains ambiguous. All Phase 2G.3A.1 owner exclusions remain authoritative.\n\n` +
    `## Offline scenarios and group E\n\nS1 assumes only that product relationships have been migrated or removed. It assumes no content-retirement approval, no source identity resolution and no enabled-dependency resolution. It migrates nothing.\n\n` +
    `After that assumption, ${simulation.zeroReferenceRowsAfterAssumedProductMigration} rows have zero database references, but ${simulation.remainingReferenceTotal} history references remain. S1 hypothetical delete candidates: ${simulation.hypotheticalCandidateCount}. Missing Master coverage and identity review are vocabulary disposition gates, not reference counts; zero references alone does not settle them. No row is currently retire-safe and no delete is recommended. A future positive scenario requires an explicitly assumed approved semantic/content disposition, resolved source identity, separately authorized disable, cleared preservation policy, and zero history, saved-word, Master, mapping and unknown references. Excluded Master pairs cannot be used as successors.\n\n` +
    `| Scenario | Zero references | Hypothetical candidates | Additional assumptions |\n|---|---:|---:|---|\n` +
    `| S0 current | ${summary.scenarioResults.S0.zeroReference} | 0 | none |\n` +
    `| S1 product references removed | ${simulation.zeroReferenceRowsAfterAssumedProductMigration} | ${simulation.hypotheticalCandidateCount} | no other prerequisites inferred |\n` +
    `| S2 approved future disposition | ${summary.scenarioResults.S2.zeroReference} | ${summary.scenarioResults.S2.hypotheticalCandidates} | identity/content decisions approved; source obligations and policy unresolved |\n` +
    `| S3 disable only | ${simulation.zeroReferenceRowsAfterAssumedProductMigration} | ${summary.scenarioResults.S3.disableOnlyCandidates} | S2 plus future separately authorized disable |\n` +
    `| S3 all remaining prerequisites assumed / group E | ${simulation.zeroReferenceRowsAfterAssumedProductMigration} | ${summary.scenarioResults.S3.allPrerequisitesAssumedCandidates} | source obligations resolved and preservation policy cleared for no-history rows |\n\n` +
    `S2 separates the pending disposition paths even while assuming their future approval:\n\n| Disposition path | Total rows | Zero-reference rows in S1/S2 |\n|---|---:|---:|\n${dispositionTable}\n\n` +
    `S3's full-assumption branch is a theoretical upper bound, never an approved cohort; it leaves learner history protected and never changes the real cleanup class. Current DELETE_SAFE_CANDIDATE remains 0.\n\n` +
    `## Relationship migration readiness\n\nTopic membership uses (vocabulary_id, topic_id); its vocabulary FK has CASCADE delete. Set items use (learning_set_id, vocabulary_id) and preserve sort_order; their vocabulary FK has NO ACTION. Database constraint definitions are included in the readiness artifact. Master ownership infrastructure exists for both, with composite runtime-link FKs that prevent silent ownership drift. Runtime topic browse/progress/search use topic links; active assigned-set eligibility, queues, weak words and progress use set items.\n\n` +
    `A migration requires an owner-approved successor runtime ID; explicit relationship removal is an alternative requiring separate approval. Existing infrastructure does not establish a successor identity for legacy rows. Migration becomes deterministic only after successor/content and taxonomy identity decisions, duplicate-key and order policies, and assigned-set product impact are reviewed. No executable migration SQL is created. The cross-check helper now uses the same unqualified table key for both evidence storage and lookup; historical reference counts and accepted fingerprints are unchanged.\n\n` +
    `## Future approval sequence\n\n1. Preserve all learner history on original runtime IDs; do not move it based on lexical or translation similarity.\n2. Resolve vocabulary disposition: separately approve a Master successor, expand Master coverage, or approve content retirement. An excluded Sense cannot serve as that row's successor.\n3. Review the enumerated topic IDs and learning-set IDs/sort orders, including product discovery and assignment impact. Migration/removal requires separate authorization.\n4. Resolve source identity obligations and enabled runtime dependencies. No source identity is cleared by this plan.\n5. Recheck catalog/reference completeness in a new read-only snapshot. Any Master, history or unknown reference blocks a hypothetical retirement cohort.\n6. Obtain explicit retirement authorization before any disabling or deletion. No execution plan or SQL mutation is supplied here.\n\n` +
    `All seven authorization flags are NO: cleanup, delete, disable, merge, mapping writes, relationship migration and Master expansion. No approvals were inferred.\n\n` +
    `LEGACY_RETIREMENT_PLANNING_FINGERPRINT: \`${fingerprint}\`. Reproduce artifacts offline with \`pnpm audit:legacy-reference-retirement-plan --check\`; this check reads the persisted sanitized snapshot and never connects to a database. Historical Phase 2G.3A/2G.3A.1 artifacts and finalized reconciliation remain unchanged.\n`;
  return { artifacts, report, summary, fingerprint };
}

export async function runLegacyReferenceRetirementPlan(args = process.argv.slice(2), root = ROOT) {
  if (args.some((arg) => arg !== "--check") || args.length > 1) throw new Error("UNSUPPORTED_RETIREMENT_PLANNING_ARGUMENT");
  const check = args.includes("--check");
  if (!check) assertRemoteBaseline(root);
  const candidates = assertAcceptedSemantics(root);
  const snapshot = check ? readJson<PlanningSnapshot>(root, `${WORKSPACE}/read-only-snapshot.json`) : await capturePlanningSnapshot();
  const result = buildPlanningArtifacts(snapshot, candidates, root);
  const output = [...result.artifacts].map(([file, value]) => [path.join(root, WORKSPACE, file), `${JSON.stringify(value, null, 2)}\n`] as [string, string]);
  output.push([path.join(root, REPORT), result.report]);
  if (!check) mkdirSync(path.join(root, WORKSPACE), { recursive: true });
  for (const [file, text] of output) {
    if (check) { if (readFileSync(file, "utf8") !== text) throw new Error("RETIREMENT_PLANNING_ARTIFACT_DRIFT"); }
    else writeFileSync(file, text, "utf8");
  }
  return { fingerprint: result.fingerprint, legacyRetirementPlanningFingerprint: result.fingerprint, ...result.summary, databaseConnection: check ? "NONE" : "READ_ONLY_DEVELOPMENT" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runLegacyReferenceRetirementPlan().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: unknown) => {
    // Never pass provider, postgres or environment error text through to logs.
    const code = error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "RETIREMENT_PLANNING_BLOCKED";
    console.error(JSON.stringify({ status: "BLOCKED", code, databaseWrites: "NONE" })); process.exitCode = 1;
  });
}
