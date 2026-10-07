import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postgres from "postgres";
import { assertResolvedTargetBeforeMutation, getTarget } from "./runtime-validation";
import { assertNoPII, runLegacyReferenceRetirementPlan, type DecomposedRow, type PlanningSnapshot } from "./development-legacy-reference-retirement-plan";
import { assertDevelopmentTarget, assertReadOnlySql, captureDatabaseSnapshot, deterministicAuditFingerprint, loadLocalDevelopmentEnvironment,
  normalizeWord, readApprovedMasterCorpus, readOwnerReviewedExclusions, sanitizeRuntimeRows, type CandidateAnalysis } from "./development-legacy-vocabulary-cleanup-audit";
import { verifyHybrid100SourceRelease } from "./hybrid-100-development-reconciliation-scan";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BASELINE = "ad1aa6813628c73504baa016e9059a9d165a53be";
const SEMANTIC_FINGERPRINT = "5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea";
const RETIREMENT_FINGERPRINT = "04feaa380fa441633ef8a4c84b8d0e5a5aee48d03a7a5ff020866c789eb8cdd1";
const RETIREMENT = "vocabflow-dataset/workspaces/legacy-vocabulary-retirement-planning";
const AUDIT = "vocabflow-dataset/workspaces/legacy-vocabulary-cleanup-audit";
const WORKSPACE = "vocabflow-dataset/workspaces/legacy-master-expansion-planning";
const REPORT = "vocabflow-dataset/reports/legacy-master-expansion-plan.md";
export const AUTHORIZATION = { masterAuthoring: false, masterApply: false, relationshipMigration: false, disable: false, delete: false, production: false };
export const DISPOSITIONS = ["MASTER_EXPANSION_CANDIDATE", "MASTER_IDENTITY_REVIEW", "CONTENT_RETIREMENT_CANDIDATE", "HISTORY_PRESERVATION_ONLY", "CONTENT_OWNER_REVIEW_REQUIRED"] as const;
export type Disposition = typeof DISPOSITIONS[number];
type Topic = { topicId: number; slug: string; name: string; enabled: boolean; sortOrder: number };
type LearningSet = { learningSetId: number; slug: string; name: string; grade: string | null; enabled: boolean; sortOrder: number };
export type RuntimeContent = { runtimeVocabularyId: number; word: string; normalizedWord: string; vietnamese: string; vietnameseOverride: string | null;
  effectiveVietnamese: string; definitionEn: string | null; exampleEn: string | null; level: string | null; enabled: boolean; contentVersion: number;
  sourceDataset: string | null; sourceRecordId: number | null; topics: Topic[]; learningSets: Array<LearningSet & { membershipSortOrder: number }> };
export type ContentSnapshot = { sourceBaseline: string; target: Record<string, unknown>; transaction: { isolation: string; readOnly: boolean };
  databaseIdentity: Record<string, unknown>; rows: RuntimeContent[]; runtimeInventoryFingerprint: string; hybridCheckpoint: Record<string, unknown> };
type OwnerEvidence = { decision: "RETAIN" | "RETIRE_ACTIVE_CATALOG"; reason: string; ownerApproved: true };
const read = <T,>(root: string, file: string): T => JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;

export function classifyContent(content: RuntimeContent, references: DecomposedRow, ownerEvidence?: OwnerEvidence): { disposition: Disposition; reasons: string[] } {
  if (ownerEvidence?.ownerApproved && ownerEvidence.reason.trim() && ownerEvidence.decision === "RETIRE_ACTIVE_CATALOG") {
    return { disposition: references.hasLearnerHistory ? "HISTORY_PRESERVATION_ONLY" : "CONTENT_RETIREMENT_CANDIDATE", reasons: ["EXPLICIT_OWNER_CATALOG_RETIREMENT_EVIDENCE", ownerEvidence.reason] };
  }
  if (references.semanticCandidateRelation !== "NO_MASTER_CANDIDATE") return { disposition: "MASTER_IDENTITY_REVIEW", reasons: [
    references.ownerReviewedExclusionCount > 0 ? "REVIEW_A_DISTINCT_LEGACY_SENSE; OWNER_EXCLUDED_PAIRS_REMAIN_FORBIDDEN" : "EXISTING_MASTER_IDENTITY_OR_POLYSEMY_NEEDS_HUMAN_DECISION"
  ] };
  if (!content.word.trim() || !/\p{L}/u.test(content.word) || !content.effectiveVietnamese.trim() || ["-", "?", "n/a"].includes(content.effectiveVietnamese.trim().toLowerCase())) {
    return { disposition: "CONTENT_OWNER_REVIEW_REQUIRED", reasons: ["INSUFFICIENT_LEMMA_OR_MEANING_EVIDENCE; DO_NOT_INFER_RETIREMENT"] };
  }
  if (!content.topics.length && !content.learningSets.length && !content.enabled && !ownerEvidence) return { disposition: "CONTENT_OWNER_REVIEW_REQUIRED", reasons: ["NO_CURRENT_PRODUCT_RELEVANCE_EVIDENCE"] };
  return { disposition: "MASTER_EXPANSION_CANDIDATE", reasons: ["DEFAULT_TO_FUTURE_MASTER_COVERAGE", "EXISTING_PRODUCT_TAXONOMY_OR_CURATED_SET_SUPPORTS_RELEVANCE", "DISABLED_OR_UNMAPPED_DOES_NOT_MEAN_OBSOLETE"] };
}

export function planContentRow(content: RuntimeContent, references: DecomposedRow, candidate: CandidateAnalysis) {
  if (content.runtimeVocabularyId !== references.runtimeVocabularyId || candidate.runtimeVocabularyId !== references.runtimeVocabularyId ||
      content.normalizedWord !== normalizeWord(content.word) || content.word !== references.word || content.enabled !== references.enabled || content.contentVersion !== references.contentVersion) throw new Error("CONTENT_REFERENCE_ALIGNMENT_INVALID");
  const classification = classifyContent(content, references);
  const dependencies = [
    ...(classification.disposition === "MASTER_EXPANSION_CANDIDATE" ? ["NEEDS_MASTER_AUTHORING"] : []),
    ...(classification.disposition === "MASTER_IDENTITY_REVIEW" ? ["NEEDS_MASTER_IDENTITY_DECISION"] : []),
    ...(["CONTENT_RETIREMENT_CANDIDATE", "HISTORY_PRESERVATION_ONLY", "CONTENT_OWNER_REVIEW_REQUIRED"].includes(classification.disposition) ? ["NEEDS_CONTENT_RETIREMENT_APPROVAL"] : []),
    ...(references.hasLearnerHistory ? ["NEEDS_HISTORY_PRESERVATION_POLICY"] : []),
    ...(references.topicMembershipReferenceCount > 0 ? ["NEEDS_TOPIC_RELATIONSHIP_MIGRATION"] : []),
    ...(references.learningSetItemReferenceCount > 0 ? ["NEEDS_LEARNING_SET_RELATIONSHIP_MIGRATION"] : []),
    ...(references.sourceIdentityObligation ? ["NEEDS_SOURCE_IDENTITY_RESOLUTION"] : [])
  ];
  const likelyPos = /^\s*to\s+[a-z]/i.test(content.definitionEn ?? "") ? "VERB_CUE_REQUIRES_REVIEW" : "UNDETERMINED";
  return { ...content, ...classification, learnerHistoryProtected: references.hasLearnerHistory,
    learnerProgressReferenceCount: references.learnerProgressReferenceCount, reviewEventReferenceCount: references.reviewEventReferenceCount,
    savedVocabularyReferenceCount: references.savedVocabularyReferenceCount, sourceIdentityObligation: references.sourceIdentityObligation,
    semanticReviewDisposition: references.semanticCandidateRelation, ownerReviewedExclusionCount: references.ownerReviewedExclusionCount,
    masterCandidates: candidate.candidates, planningOnly: true, ownerApproved: false, mappingCreated: false,
    gradeEvidence: content.level, cefr: null, cefrEvidence: "NO_RUNTIME_CEFR; SCHOOL_GRADE_IS_NOT_CEFR",
    schoolLearnerRelevance: content.level?.startsWith("GRADE_") ? "EXISTING_REVIEWED_SCHOOL_GRADE" :
      content.enabled || content.learningSets.some((set) => set.enabled) ? "CURRENT_ACTIVE_PRODUCT_OR_CURATED_SET" : "EXISTING_TOPIC_COVERAGE; FUTURE_AUDIENCE_REVIEW_REQUIRED",
    lexicalFamily: content.normalizedWord, lexicalFamilyMethod: "NORMALIZED_LEMMA_ONLY; NO_STEMMING_OR_SENSE_MERGE",
    likelyPos, posConfirmed: false, dependencies, dependenciesResolved: false,
    contentGaps: [
      ...(!content.definitionEn?.trim() ? ["ENGLISH_DEFINITION_AUTHORING_REQUIRED"] : []),
      ...(!content.exampleEn?.trim() ? ["ENGLISH_EXAMPLE_AUTHORING_REQUIRED"] : []),
      ...(!content.level ? ["SCHOOL_LEVEL_UNCLASSIFIED"] : []), "SENSE_POS_REVIEW_REQUIRED", "CEFR_REVIEW_OPTIONAL_AND_SEPARATE",
      "SOURCE_TEXT_AND_MEDIA_RIGHTS_NOT_ESTABLISHED_BY_RUNTIME_IMPORT"
    ], newMasterSenseNeeded: references.semanticCandidateRelation === "OWNER_REVIEWED_NOT_SAME_IDENTITY" ? "DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED" :
      references.semanticCandidateRelation === "NO_MASTER_CANDIDATE" ? "PROPOSED_NEW_COVERAGE_SUBJECT_TO_CORPUS_IDENTITY_REVIEW" : "OWNER_DECISION_REQUIRED; EXISTING_SENSE_REUSE_OR_NEW_SENSE",
    historyRuntimeMustRemain: references.hasLearnerHistory };
}
export type PlannedContent = ReturnType<typeof planContentRow>;

function groupedCoverage(rows: PlannedContent[], key: (row: PlannedContent) => string) {
  const groups = new Map<string, PlannedContent[]>();
  for (const row of rows) { const label = key(row); groups.set(label, [...(groups.get(label) ?? []), row]); }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, group]) => ({ label, rowCount: group.length,
    normalizedLemmaCountEstimate: new Set(group.map((row) => row.normalizedWord)).size,
    historyProtectedRows: group.filter((row) => row.learnerHistoryProtected).length,
    dispositionCounts: Object.fromEntries(DISPOSITIONS.map((disposition) => [disposition, group.filter((row) => row.disposition === disposition).length])),
    runtimeVocabularyIds: group.map((row) => row.runtimeVocabularyId) }));
}

export function batchStatistics(rows: PlannedContent[]) {
  const repeated = groupedCoverage(rows, (row) => row.normalizedWord).filter((group) => group.rowCount > 1);
  return { rowCount: rows.length, estimatedLexemeCount: new Set(rows.map((row) => row.normalizedWord)).size,
    estimateMethod: "DISTINCT_NORMALIZED_LEMMAS; NOT_NEW_MASTER_IDS_OR_CONFIRMED_SENSE_COUNT", proposedSenseReviewUnits: rows.length,
    repeatedLemmaCount: repeated.length, repeatedLemmaGroups: repeated, confirmedPolysemyCount: null,
    polysemyEvidence: "REPEATED_LEMMAS_NEED_REVIEW; DUPLICATE_ROWS_ARE_NOT_CONFIRMED_POLYSEMY",
    sourceIdentityObligationRows: rows.filter((row) => row.sourceIdentityObligation).length,
    identityDecisionRows: rows.filter((row) => row.disposition === "MASTER_IDENTITY_REVIEW").length,
    contentOwnerReviewRows: rows.filter((row) => row.disposition === "CONTENT_OWNER_REVIEW_REQUIRED").length,
    immediateExpansionCandidates: rows.filter((row) => row.disposition === "MASTER_EXPANSION_CANDIDATE").length,
    definitionGaps: rows.filter((row) => row.contentGaps.includes("ENGLISH_DEFINITION_AUTHORING_REQUIRED")).length,
    exampleGaps: rows.filter((row) => row.contentGaps.includes("ENGLISH_EXAMPLE_AUTHORING_REQUIRED")).length,
    topicDistribution: summarizeTopics(rows), learningSetImpact: summarizeLearningSets(rows),
    levelDistribution: groupedCoverage(rows, (row) => row.level ?? "UNCLASSIFIED"),
    runtimeVocabularyIds: rows.map((row) => row.runtimeVocabularyId) };
}

function summarizeTopics(rows: PlannedContent[]) {
  const topics = new Map<number, Topic>(); rows.forEach((row) => row.topics.forEach((topic) => topics.set(topic.topicId, topic)));
  return [...topics.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.topicId - b.topicId).map((topic) => ({ ...topic,
    ...groupedCoverage(rows.filter((row) => row.topics.some((match) => match.topicId === topic.topicId)), () => topic.slug)[0] }));
}
function summarizeLearningSets(rows: PlannedContent[]) {
  const sets = new Map<number, LearningSet>(); rows.forEach((row) => row.learningSets.forEach((set) => sets.set(set.learningSetId, {
    learningSetId: set.learningSetId, slug: set.slug, name: set.name, grade: set.grade, enabled: set.enabled, sortOrder: set.sortOrder
  })));
  return [...sets.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.learningSetId - b.learningSetId).map((set) => ({ ...set,
    ...groupedCoverage(rows.filter((row) => row.learningSets.some((match) => match.learningSetId === set.learningSetId)), () => set.slug)[0],
    membershipSortOrders: rows.flatMap((row) => row.learningSets.filter((match) => match.learningSetId === set.learningSetId).map((match) => ({ runtimeVocabularyId: row.runtimeVocabularyId, sortOrder: match.membershipSortOrder }))),
    migrationImpact: "PRESERVE_MEMBERSHIP_AND_ORDER; OWNER_SUCCESSOR_AND_ASSIGNED_SET_REVIEW_REQUIRED; NO_MIGRATION_AUTHORIZED" }));
}

export function expansionBatches(rows: PlannedContent[], size = 200) {
  if (!Number.isSafeInteger(size) || size < 100 || size > 300) throw new Error("AUTHORING_BATCH_SIZE_INVALID");
  const retired = (row: PlannedContent) => ["CONTENT_RETIREMENT_CANDIDATE", "HISTORY_PRESERVATION_ONLY"].includes(row.disposition);
  const groups = {
    A_HISTORY_ACTIVE_PRODUCT_REVIEW: rows.filter((row) => row.learnerHistoryProtected && !retired(row)),
    B_ACTIVE_TOPIC_SET_NO_HISTORY: rows.filter((row) => !row.learnerHistoryProtected && !retired(row) && (row.enabled || row.learningSets.some((set) => set.enabled))),
    C_REMAINING_COVERAGE_REVIEW: rows.filter((row) => !row.learnerHistoryProtected && !retired(row) && !row.enabled && !row.learningSets.some((set) => set.enabled)),
    D_CONTENT_RETIREMENT_REVIEW: rows.filter(retired)
  };
  const chunks: Array<ReturnType<typeof batchStatistics> & { reviewBatch: string; phase: string; humanReviewComplexity: string; recommendedAuthoringOrder: string }> = [];
  const phases = Object.entries(groups).map(([phase, cohort]) => {
    const families = groupedCoverage(cohort, (row) => row.normalizedWord);
    let buffer: number[] = [];
    const emit = () => {
      if (!buffer.length) return;
      const selected = cohort.filter((row) => buffer.includes(row.runtimeVocabularyId));
      chunks.push({ reviewBatch: `${phase.split("_")[0]}-${String(chunks.filter((chunk) => chunk.phase === phase).length + 1).padStart(2, "0")}`,
        phase, ...batchStatistics(selected),
        humanReviewComplexity: selected.some((row) => row.learnerHistoryProtected || row.disposition !== "MASTER_EXPANSION_CANDIDATE") ? "HIGH; HISTORY_AND_IDENTITY_GATES" : "STANDARD_EDITORIAL_REVIEW",
        recommendedAuthoringOrder: "Identity/scope approval; rights; POS; original definitions/examples; editorial validation; separate promotion/import approval" });
      buffer = [];
    };
    for (const family of families) {
      if (family.rowCount > size) throw new Error("LEMMA_FAMILY_EXCEEDS_REVIEW_BATCH_SIZE");
      if (buffer.length + family.rowCount > size) emit();
      buffer.push(...family.runtimeVocabularyIds);
    }
    emit();
    return { phase, ...batchStatistics(cohort), humanReviewComplexity: cohort.some((row) => row.learnerHistoryProtected || row.disposition !== "MASTER_EXPANSION_CANDIDATE") ? "HIGH; HISTORY_AND_IDENTITY_GATES" : "STANDARD_EDITORIAL_REVIEW; RIGHTS_POS_DEFINITIONS_AND_EXAMPLES_REQUIRED",
      recommendedAuthoringOrder: "Resolve special identity/owner review first, then scope/rights and POS; write original definitions/examples; review classification; validate draft; seek separate promotion/reconciliation/import approval",
      blockedUntilHumanReview: cohort.filter((row) => row.disposition !== "MASTER_EXPANSION_CANDIDATE").map((row) => row.runtimeVocabularyId),
      authoringAuthorized: false, batchMembershipIsNotSenseIdentity: true };
  });
  if (chunks.reduce((sum, chunk) => sum + chunk.rowCount, 0) !== rows.length || new Set(chunks.flatMap((chunk) => chunk.runtimeVocabularyIds)).size !== rows.length) throw new Error("EXPANSION_BATCH_COVERAGE_INVALID");
  return { phases, reviewBatches: chunks, maximumReviewUnits: size,
    smallBatchPolicy: "History cohort and final remainder may be below 100; never pad with unrelated words", canonicalMasterIdsAllocated: 0,
    identityReviewGate: "All thirteen special rows need owner decisions before authoring or reconciliation. No excluded pair can be chosen as successor.",
    preservationOrder: "Batch A first; B follows for current active/set value; C in topic/lemma cohorts; D only when evidence supports retirement. Rights and original authoring precede any import." };
}

export function assertBaseline(root = ROOT) {
  execFileSync("git", ["fetch", "origin"], { cwd: root, stdio: "pipe" });
  if (execFileSync("git", ["rev-parse", "origin/TXH"], { cwd: root, encoding: "utf8" }).trim() !== BASELINE ||
      execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim() !== BASELINE) throw new Error("PHASE_2G3C_REMOTE_BASELINE_MISMATCH");
}
async function captureContent(): Promise<ContentSnapshot> {
  loadLocalDevelopmentEnvironment(); const target = getTarget("development", "runtime"); assertDevelopmentTarget(target);
  const verified = await assertResolvedTargetBeforeMutation({ context: "local-development", source: "dev-launcher", environment: "development", purpose: "runtime", operation: "db-check", target });
  const client = postgres(verified.url, { max: 1, connect_timeout: 10, idle_timeout: 5, prepare: false, onnotice: () => undefined });
  try { return await client.begin(async (tx) => {
    const database = await captureDatabaseSnapshot(tx as unknown as ReturnType<typeof postgres>, target, readApprovedMasterCorpus(ROOT));
    const runtimeInventoryFingerprint = deterministicAuditFingerprint(sanitizeRuntimeRows(database.runtimeRows));
    const accepted = read<PlanningSnapshot>(ROOT, `${RETIREMENT}/read-only-snapshot.json`);
    if (runtimeInventoryFingerprint !== deterministicAuditFingerprint(accepted.inventory)) throw new Error("ACCEPTED_RUNTIME_REFERENCE_DRIFT");
    const query = async (statement: string) => { assertReadOnlySql(statement); return tx.unsafe(statement); };
    const content = await query('SELECT id, word, vietnamese, vietnamese_override, definition_en, example_en, level, enabled, content_version, source_dataset, source_record_id FROM "vocabflow_app"."vocabularies" ORDER BY id');
    const topics = await query('SELECT vt.vocabulary_id, t.id, t.slug, t.name, t.enabled, t.sort_order FROM "vocabflow_app"."vocabulary_topics" vt JOIN "vocabflow_app"."topics" t ON t.id=vt.topic_id ORDER BY vt.vocabulary_id, t.sort_order, t.id');
    const sets = await query('SELECT li.vocabulary_id, li.sort_order AS membership_sort_order, s.id, s.slug, s.name, s.grade, s.enabled, s.sort_order FROM "vocabflow_app"."learning_set_items" li JOIN "vocabflow_app"."learning_sets" s ON s.id=li.learning_set_id ORDER BY li.vocabulary_id, s.sort_order, s.id');
    const ids = new Set(database.runtimeRows.filter((row) => row.topLevelPartition === "LEGACY_UNMAPPED").map((row) => row.runtimeVocabularyId));
    const textOrNull = (value: unknown) => typeof value === "string" ? value : null;
    const rows: RuntimeContent[] = content.filter((row) => ids.has(Number(row.id))).map((row) => ({ runtimeVocabularyId: Number(row.id), word: String(row.word), normalizedWord: normalizeWord(row.word),
      vietnamese: String(row.vietnamese), vietnameseOverride: textOrNull(row.vietnamese_override), effectiveVietnamese: textOrNull(row.vietnamese_override)?.trim() ? String(row.vietnamese_override) : String(row.vietnamese),
      definitionEn: textOrNull(row.definition_en), exampleEn: textOrNull(row.example_en), level: textOrNull(row.level), enabled: row.enabled === true, contentVersion: Number(row.content_version),
      sourceDataset: textOrNull(row.source_dataset), sourceRecordId: row.source_record_id === null ? null : Number(row.source_record_id),
      topics: topics.filter((link) => Number(link.vocabulary_id) === Number(row.id)).map((link) => ({ topicId: Number(link.id), slug: String(link.slug), name: String(link.name), enabled: link.enabled === true, sortOrder: Number(link.sort_order) })),
      learningSets: sets.filter((link) => Number(link.vocabulary_id) === Number(row.id)).map((link) => ({ learningSetId: Number(link.id), slug: String(link.slug), name: String(link.name), grade: textOrNull(link.grade), enabled: link.enabled === true, sortOrder: Number(link.sort_order), membershipSortOrder: Number(link.membership_sort_order) })) }));
    const result = { sourceBaseline: BASELINE, target: database.target, transaction: database.transaction, databaseIdentity: database.databaseIdentity, rows, runtimeInventoryFingerprint, hybridCheckpoint: database.hybridCheckpoint };
    assertNoPII(result); return result;
  }); } finally { await client.end({ timeout: 5 }); }
}

export function buildExpansionArtifacts(snapshot: ContentSnapshot, root = ROOT) {
  assertNoPII(snapshot); assertDevelopmentTarget(snapshot.target as Parameters<typeof assertDevelopmentTarget>[0]);
  if (snapshot.sourceBaseline !== BASELINE || !snapshot.transaction.readOnly || snapshot.transaction.isolation !== "REPEATABLE_READ" || snapshot.databaseIdentity.currentRole !== "vocabflow_runtime" ||
      snapshot.databaseIdentity.transactionReadOnly !== true || snapshot.databaseIdentity.transactionIsolation !== "repeatable read" || snapshot.hybridCheckpoint.hybridMasterMappings !== 100 ||
      ["environment", "provider", "projectId", "branchId", "databaseName"].some((key) => snapshot.databaseIdentity[key] !== snapshot.target[key]) ||
      snapshot.hybridCheckpoint.runtime284MappingSenseId !== "01a0fc13-09ef-7d37-a50f-d05db6b1a89c") throw new Error("CONTENT_SNAPSHOT_IDENTITY_INVALID");
  const references = read<{ rows: DecomposedRow[] }>(root, `${RETIREMENT}/legacy-reference-decomposition.json`).rows;
  const candidates = read<{ candidates: CandidateAnalysis[] }>(root, `${AUDIT}/legacy-master-candidates.json`).candidates;
  const accepted = read<PlanningSnapshot>(root, `${RETIREMENT}/read-only-snapshot.json`);
  if (deterministicAuditFingerprint(snapshot.hybridCheckpoint) !== deterministicAuditFingerprint(accepted.hybridCheckpoint)) throw new Error("HYBRID_CHECKPOINT_CHANGED");
  if (snapshot.runtimeInventoryFingerprint !== deterministicAuditFingerprint(accepted.inventory) || snapshot.rows.length !== 2018 || new Set(snapshot.rows.map((row) => row.runtimeVocabularyId)).size !== 2018 || snapshot.rows.some((row) => row.runtimeVocabularyId === 284)) throw new Error("CONTENT_SNAPSHOT_COVERAGE_INVALID");
  const byId = new Map(references.map((row) => [row.runtimeVocabularyId, row])); const candidateById = new Map(candidates.map((row) => [row.runtimeVocabularyId, row]));
  const exclusionPackage = readOwnerReviewedExclusions(root);
  const rows = snapshot.rows.map((content) => {
    const reference = byId.get(content.runtimeVocabularyId); const candidate = candidateById.get(content.runtimeVocabularyId);
    if (!reference || !candidate || content.topics.length !== reference.topicMembershipReferenceCount || content.learningSets.length !== reference.learningSetItemReferenceCount) throw new Error("CONTENT_RELATIONSHIPS_INCOMPLETE");
    const links = accepted.productRelationships.find((row) => row.runtimeVocabularyId === content.runtimeVocabularyId)!;
    if (new Set(content.topics.map((topic) => topic.topicId)).size !== content.topics.length || new Set(content.learningSets.map((set) => set.learningSetId)).size !== content.learningSets.length ||
        content.topics.some((topic) => !links.topicIds.includes(topic.topicId)) || content.learningSets.some((set) => !links.learningSetItems.some((link) => link.learningSetId === set.learningSetId && link.sortOrder === set.membershipSortOrder))) throw new Error("CONTENT_RELATIONSHIPS_CHANGED");
    for (const pair of exclusionPackage.exclusions.filter((pair) => pair.runtimeVocabularyId === content.runtimeVocabularyId)) {
      const match = candidate.candidates.find((candidate) => candidate.masterSenseId === pair.masterSenseId);
      if (!match || match.identityClaim !== "NONE" || match.ownerReviewedRelation !== "OWNER_REVIEWED_NOT_SAME_IDENTITY") throw new Error("OWNER_EXCLUSION_CONTRADICTED");
    }
    return planContentRow(content, reference, candidate);
  }).sort((a, b) => a.runtimeVocabularyId - b.runtimeVocabularyId);
  if (rows.filter((row) => row.learnerHistoryProtected).length !== 75 || rows.find((row) => row.runtimeVocabularyId === 11)?.reviewEventReferenceCount !== 5 || rows.find((row) => row.runtimeVocabularyId === 11)?.learnerProgressReferenceCount !== 1) throw new Error("HISTORY_PRESERVATION_FAILED");
  const specialRows = rows.filter((row) => row.semanticReviewDisposition !== "NO_MASTER_CANDIDATE"); if (specialRows.length !== 13) throw new Error("SPECIAL_IDENTITY_COHORT_INVALID");
  const batches = expansionBatches(rows); const topicCoverage = summarizeTopics(rows); const learningSetImpact = summarizeLearningSets(rows);
  const productCoverage = { gradeLevels: groupedCoverage(rows, (row) => row.level ?? "UNCLASSIFIED"), cefr: { availableRows: 0, inferredFromGrade: false },
    schoolLearnerRelevance: groupedCoverage(rows, (row) => row.schoolLearnerRelevance), normalizedLemmaFamilies: groupedCoverage(rows, (row) => row.normalizedWord), likelyPos: groupedCoverage(rows, (row) => row.likelyPos) };
  const dependencyMatrix = rows.map((row) => ({ runtimeVocabularyId: row.runtimeVocabularyId, disposition: row.disposition, learnerHistoryProtected: row.learnerHistoryProtected, dependencies: row.dependencies, allApplicableDependenciesResolved: false, deleteAuthorized: false }));
  const frozen = verifyHybrid100SourceRelease(root);
  const frozenReleaseCheck = { releaseHash: frozen.manifest.releaseHash, releaseTreeFingerprint: frozen.releaseTreeFingerprint, ...frozen.releaseValidation };
  const summary = { status: "PASS", sourceBaseline: BASELINE, totalLegacy: rows.length, dispositionCounts: Object.fromEntries(DISPOSITIONS.map((disposition) => [disposition, rows.filter((row) => row.disposition === disposition).length])),
    historyProtected: 75, specialIdentityRows: 13, runtime11History: { progress: 1, reviews: 5 }, runtime284: "MASTER_MANAGED_OUTSIDE_LEGACY_PLAN",
    semanticFingerprint: SEMANTIC_FINGERPRINT, retirementFingerprint: RETIREMENT_FINGERPRINT, reviewBatchCount: batches.reviewBatches.length, reviewBatchSizes: batches.reviewBatches.map((batch) => batch.rowCount),
    canonicalMasterIdsAllocated: 0, databaseWrites: "NONE", mappingWrites: "NONE", relationshipMigration: "NONE", production: "UNTOUCHED / NOT_CONNECTED", frozenReleaseCheck, authorization: AUTHORIZATION };
  const evidence = { snapshot, rows, specialRows, batches, topicCoverage, learningSetImpact, productCoverage, dependencyMatrix, summary }; assertNoPII(evidence);
  const fingerprint = deterministicAuditFingerprint(evidence); const common = { phase: "2G.3C", planningOnly: true, fingerprint, authorization: AUTHORIZATION };
  const artifacts = new Map<string, unknown>([
    ["content-snapshot.json", snapshot], ["content-disposition.json", { ...common, rows }], ["special-identity-review.json", { ...common, rows: specialRows }],
    ["master-expansion-batches.json", { ...common, ...batches }], ["topic-coverage-summary.json", { ...common, rows: topicCoverage }],
    ["learning-set-impact-summary.json", { ...common, rows: learningSetImpact }], ["product-coverage-analysis.json", { ...common, ...productCoverage }],
    ["retirement-dependency-matrix.json", { ...common, rows: dependencyMatrix }], ["validation-summary.json", { ...summary, fingerprint }],
    ["manifest.json", { ...common, artifactType: "LEGACY_MASTER_EXPANSION_PLANNING", artifactVersion: 1, sourceBaseline: BASELINE,
      acceptedInputs: { semanticFingerprint: SEMANTIC_FINGERPRINT, retirementFingerprint: RETIREMENT_FINGERPRINT },
      fingerprintMethod: "SHA256_CANONICAL_JSON; NO_TIMESTAMPS", evidenceHashes: Object.fromEntries(Object.entries(evidence).map(([key, value]) => [key, deterministicAuditFingerprint(value)])),
      files: ["content-snapshot.json", "content-disposition.json", "special-identity-review.json", "master-expansion-batches.json", "topic-coverage-summary.json", "learning-set-impact-summary.json", "product-coverage-analysis.json", "retirement-dependency-matrix.json", "validation-summary.json", "manifest.json", "../../reports/legacy-master-expansion-plan.md"] }]
  ]);
  const dispositionTable = Object.entries(summary.dispositionCounts).map(([name, count]) => `| ${name} | ${count} |`).join("\n");
  const specialTable = specialRows.map((row) => `| #${row.runtimeVocabularyId} ${row.word} | ${row.learnerProgressReferenceCount}/${row.reviewEventReferenceCount}/${row.savedVocabularyReferenceCount} | ${row.topics.map((topic) => topic.slug).join(", ")} | ${row.learningSets.map((set) => `${set.slug}:${set.membershipSortOrder}`).join(", ") || "none"} | ${row.semanticReviewDisposition}; ${row.ownerReviewedExclusionCount} exclusions | ${row.masterCandidates.map((match) => `${match.masterSenseId} (${match.partOfSpeech}, ${match.identityClaim})`).join("; ")} | ${row.disposition} | ${row.newMasterSenseNeeded} | ${row.historyRuntimeMustRemain ? "YES" : "No history; other gates remain"} |`).join("\n");
  const batchTable = batches.phases.map((batch) => `| ${batch.phase} | ${batch.rowCount} | ${batch.immediateExpansionCandidates} | ${batch.estimatedLexemeCount} | ${batch.repeatedLemmaCount} | ${batch.sourceIdentityObligationRows} | ${batch.identityDecisionRows} |`).join("\n");
  const topicTable = topicCoverage.map((topic) => `| ${topic.slug} | ${topic.rowCount} | ${topic.historyProtectedRows} |`).join("\n");
  const report = `# Phase 2G.3C — Legacy content disposition and Master expansion plan\n\n` +
    `Status: PASS — planning only. Baseline: \`${BASELINE}\`. All 2018 legacy rows are assigned exactly one content disposition; learner history protection is an independent flag, not a reason to discard useful content.\n\n` +
    `## Dispositions\n\n| Disposition | Rows |\n|---|---:|\n${dispositionTable}\n\n` +
    `NO_MASTER_CANDIDATE is a coverage gap, not evidence of obsolete content. Current canonical topics, existing Vietnamese, active product and curated-set membership support provisional expansion; disabled rows are not classified as obsolete. Missing definitions/examples require original future authoring. No explicit owner catalog-retirement evidence was supplied, so no retirement or history-only disposition is invented. Insufficient lemma/meaning evidence is routed to owner review.\n\n` +
    `## Product coverage\n\n| Current topic | Legacy rows | History protected |\n|---|---:|---:|\n${topicTable}\n\n` +
    `Topic counts overlap. Runtime levels are GRADE_1–GRADE_5/GENERAL or null, never CEFR. CEFR remains unclassified for all legacy rows here. Existing school grade and set grade are evidence, not newly assigned classifications. Definition-leading "to" supplies only a verb cue; every POS requires review. Normalized lemma families identify lexical review groups, not merged Lexemes or Senses. All source text/media rights remain unverified; copied runtime text is review evidence and is not promoted to canonical Master.\n\n` +
    `## Special owner identity review\n\n| Runtime | Progress/review/saved refs | Topics | Sets:order | Accepted state | Master candidates | Disposition | New Sense requirement | Preserve history runtime? |\n|---|---|---|---|---|---|---|---|---|\n${specialTable}\n\n` +
    `Accepted exclusions remain non-identity for their precise reviewed pairs. Those eleven rows may represent useful distinct legacy Senses; they require fresh owner identity decisions, not adoption of the rejected Hybrid Sense. #295 apple stays duplicate review; #849 record stays noun/verb ambiguous. #11 retains 1 progress and 5 review references. #284 booking remains Master-managed and is excluded from every legacy batch.\n\n` +
    `## Proposed expansion phases\n\n| Phase | Review rows | Expansion candidates | Estimated lemma/Lexeme groups | Repeated lemmas | Source obligations | Identity gates |\n|---|---:|---:|---:|---:|---:|---:|\n${batchTable}\n\n` +
    `Review batches: ${batches.reviewBatches.length}; sizes: ${batches.reviewBatches.map((batch) => `${batch.reviewBatch}=${batch.rowCount}`).join(", ")}. Target is 200 review units, within a 100–300 limit; the small 75-row history cohort is not padded. Repeated lemma families stay together within a phase. Estimated Lexemes count distinct normalized lemmas only; existing Master reuse, homographs, duplicate rows and true polysemy still require human decisions. Confirmed polysemy count is unknown. A row is a review unit, not a newly allocated Sense.\n\n` +
    `A reviews history-protected useful content first. B covers enabled runtime or enabled-set relevance without history. Generic topic membership alone does not make all disabled content immediately high priority; C retains that coverage for later controlled authoring. D is reserved for evidence-backed retirement review and is empty without such evidence. The 13 special identity cases are gates within their phases; owner-review rows cannot proceed automatically.\n\n` +
    `For each phase: settle identity and product scope; establish rights and author original definitions/examples; resolve POS and optional CEFR separately; validate an editorial draft; obtain separate owner approval for canonical promotion, runtime reconciliation and import. Topic/set migration follows approved successors. No Master IDs, content revisions, releases, mappings or import artifacts are created here.\n\n` +
    `## Retirement dependencies\n\nEach row records applicable NEEDS_MASTER_AUTHORING, NEEDS_MASTER_IDENTITY_DECISION, NEEDS_CONTENT_RETIREMENT_APPROVAL, NEEDS_HISTORY_PRESERVATION_POLICY, NEEDS_TOPIC_RELATIONSHIP_MIGRATION, NEEDS_LEARNING_SET_RELATIONSHIP_MIGRATION and NEEDS_SOURCE_IDENTITY_RESOLUTION gates. None is marked resolved. History remains on original runtime IDs regardless of future active-catalog retirement. No row may move toward deletion merely because it is inactive, lacks Master coverage or later loses taxonomy links.\n\n` +
    `Development content was read in REPEATABLE READ, READ ONLY as vocabflow_runtime, with provider/DB identity verified and inventory/reference content unchanged from 2G.3B. The 75 history rows, 108 Master-managed rows and 100/100 Hybrid checkpoint remain protected. Production was not connected or queried. No DB writes, mapping writes, relationship migration, disable, deletion, Master authoring or apply occurred. All six authorization flags are NO. Frozen release check PASS.\n\n` +
    `PLANNING_FINGERPRINT: \`${fingerprint}\`. No timestamps occur in its payload. Accepted semantic and retirement fingerprints remain \`${SEMANTIC_FINGERPRINT}\` and \`${RETIREMENT_FINGERPRINT}\`. Offline verification: \`pnpm plan:legacy-master-expansion --check\`.\n`;
  return { artifacts, report, summary, fingerprint };
}

export async function runExpansionPlan(args = process.argv.slice(2), root = ROOT) {
  if (args.length > 1 || args.some((arg) => arg !== "--check")) throw new Error("UNSUPPORTED_EXPANSION_PLANNING_ARGUMENT");
  const check = args.includes("--check"); if (!check) assertBaseline(root);
  const accepted = await runLegacyReferenceRetirementPlan(["--check"], root); if (accepted.fingerprint !== RETIREMENT_FINGERPRINT || accepted.acceptedSemanticFingerprint !== SEMANTIC_FINGERPRINT) throw new Error("ACCEPTED_PLANNING_INPUT_CHANGED");
  const snapshot = check ? read<ContentSnapshot>(root, `${WORKSPACE}/content-snapshot.json`) : await captureContent();
  const result = buildExpansionArtifacts(snapshot, root); const outputs = [...result.artifacts].map(([name, value]) => [path.join(root, WORKSPACE, name), `${JSON.stringify(value, null, 2)}\n`] as [string, string]); outputs.push([path.join(root, REPORT), result.report]);
  if (!check) mkdirSync(path.join(root, WORKSPACE), { recursive: true });
  for (const [file, value] of outputs) { if (check) { if (readFileSync(file, "utf8") !== value) throw new Error("EXPANSION_PLANNING_ARTIFACT_DRIFT"); } else writeFileSync(file, value, "utf8"); }
  return { ...result.summary, fingerprint: result.fingerprint, databaseConnection: check ? "NONE" : "READ_ONLY_DEVELOPMENT" };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) runExpansionPlan().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: unknown) => {
  console.error(JSON.stringify({ status: "BLOCKED", code: error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "EXPANSION_PLANNING_BLOCKED", databaseWrites: "NONE" })); process.exitCode = 1;
});
