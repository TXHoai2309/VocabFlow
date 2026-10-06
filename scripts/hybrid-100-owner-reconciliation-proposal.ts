import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Input files are pinned JSON evidence artifacts.
type JsonObject = Record<string, any>;

export const OWNER_RECONCILIATION_BASELINE = "73e278921e5be6d144cc550bc041df095d454269";
export const OWNER_RECONCILIATION_RELEASE_HASH = "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c";
export const OWNER_RECONCILIATION_RELEASE_TREE = "51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e";
export const OWNER_RECONCILIATION_SNAPSHOT = "89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e";

const WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1";
const RELEASE = "vocabflow-dataset/releases/hybrid-100-v2.2.1";
const PROPOSAL = `${WORKSPACE}/owner-review/owner-reconciliation-proposal.json`;
const REPORT = "vocabflow-dataset/reports/hybrid-100-owner-reconciliation-proposal-2.2.1.md";
const SOURCE_FILES = {
  candidateScan: `${WORKSPACE}/runtime-reconciliation-candidates-development.json`,
  collisionAudit: `${WORKSPACE}/collision-audit.json`,
  runtimeSnapshot: `${WORKSPACE}/runtime-snapshot-summary.json`,
  migrationState: `${WORKSPACE}/migration-state.json`,
  validationSummary: `${WORKSPACE}/validation-summary.json`,
  scanManifest: `${WORKSPACE}/manifest.json`,
  sourceRelease: `${RELEASE}/dataset.json`,
} as const;

const MAP_PROPOSALS: Record<string, { runtimeId: number; reason: string; runtimePosEvidence: string }> = {
  "01a1070c-7c58-76b5-a2a9-78fe16fc29bb": {
    runtimeId: 1836,
    reason: "The lemma is deviate and the runtime definition 'to depart from an established course or norm' is a clear same-sense verb paraphrase of moving away from a planned route, direction, or standard. The Vietnamese wording differs, but it expresses the same departure meaning. Master-authoritative definition, Vietnamese, example, and enabled state require UPDATE_TO_MASTER.",
    runtimePosEvidence: "The runtime row does not store POS; its infinitive definition 'to depart from...' supports the Master VERB classification.",
  },
  "01a1070c-7c58-76b5-a2aa-7e0812b069ae": {
    runtimeId: 1461,
    reason: "The lemma is relief, both records are noun senses, and 'easing of pain or stress' is a clear same-sense paraphrase of reducing pain or discomfort. Runtime #1461 is reserved for this pain-relief Sense only; the separate emergency-aid Sense is proposed CREATE_NEW. Master-authoritative fields require UPDATE_TO_MASTER.",
    runtimePosEvidence: "The runtime row does not store POS; the noun phrase 'easing of pain or stress' supports the Master NOUN classification.",
  },
  "01a1070c-7c59-726e-88d5-882b36643f4e": {
    runtimeId: 948,
    reason: "The lemma and effective Vietnamese match ('stand' / 'đứng'), the runtime definition 'be upright' is a direct same-sense paraphrase, and the Master sense is a verb. Master-authoritative definition and example require UPDATE_TO_MASTER; null Master enrichment must remain preserved.",
    runtimePosEvidence: "The runtime row does not store POS; the predicate definition 'be upright' supports the Master VERB classification.",
  },
};

type Inputs = {
  candidateScan: JsonObject;
  collisionAudit: JsonObject;
  runtimeSnapshot: JsonObject;
  migrationState: JsonObject;
  validationSummary: JsonObject;
  scanManifest: JsonObject;
  sourceRelease: JsonObject;
};

function readJson(root: string, relative: string): JsonObject {
  return JSON.parse(readFileSync(path.join(root, relative), "utf8")) as JsonObject;
}

export function loadOwnerProposalInputs(root: string): Inputs {
  return {
    candidateScan: readJson(root, SOURCE_FILES.candidateScan),
    collisionAudit: readJson(root, SOURCE_FILES.collisionAudit),
    runtimeSnapshot: readJson(root, SOURCE_FILES.runtimeSnapshot),
    migrationState: readJson(root, SOURCE_FILES.migrationState),
    validationSummary: readJson(root, SOURCE_FILES.validationSummary),
    scanManifest: readJson(root, SOURCE_FILES.scanManifest),
    sourceRelease: readJson(root, SOURCE_FILES.sourceRelease),
  };
}

function fail(code: string): never {
  throw new Error(`HYBRID_100_OWNER_RECONCILIATION_${code}`);
}

function normalized(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

function candidateRows(sense: JsonObject): JsonObject[] {
  return Array.isArray(sense.runtimeCandidates) ? sense.runtimeCandidates as JsonObject[] : [];
}

function mappedSenseId(candidate: JsonObject): string | null {
  const mapping = candidate.existingMasterSenseMapping;
  return mapping && typeof mapping.masterSenseId === "string" ? mapping.masterSenseId : null;
}

function rejectReason(sense: JsonObject, candidate: JsonObject): string {
  const id = Number(candidate.appVocabularyId);
  if (id === 1463) return "The runtime lemma is 'precise', while the Master lemma is 'exact'. Their meanings overlap, but English lexical identity differs; matching Vietnamese does not justify reuse.";
  if (id === 1482) return "The runtime lemma is 'muster', while the Master lemma is 'rally'. Gathering may overlap, but these are different English lexical identities.";
  if (id === 944) return "Runtime #944 is 'kick' = strike with the foot. Its Vietnamese 'đá' is a translation homonym for Master 'rock' = natural stone; it is not the same English identity or Sense.";
  if (id === 846) return "Both use 'fuse', but runtime #846 is an electrical safety device and the Master Sense is a slow-burning cord for an explosive or firework.";
  if (id === 1796) return "Runtime #1796 combines responsibility with likelihood of doing something bad, and its effective Vietnamese is 'có trách nhiệm'. That mixed row does not establish the narrower Master Sense 'likely to experience something undesirable'; preserve it and propose a separate row.";
  if (id === 1461 && sense.masterSenseId === "01a1070c-7c5a-7542-a093-116a29fa3a72") return "Runtime #1461 is pain/stress relief, not emergency aid. It is proposed exclusively for the separate pain-relief Master Sense.";
  if (id === 1260) return "Runtime #1260 is the noun 'light' meaning visible brightness. It is not low weight, pale color, or the verb 'ignite'; matching lemma alone is insufficient.";
  if (id === 284) return "Runtime #284 means an advance booking and is already mapped to Master Sense 01a0fc13-09ef-7d37-a50f-d05db6b1a89c. The Hybrid Sense means doubt/hesitation, so the existing mapping must remain unchanged.";
  if (id === 11) return "Runtime #11 is noun/liquid 'water', not the verb meaning to supply water to a plant. Its progress and review history remain attached to #11.";
  if (id === 405) return "Runtime #405 is noun/liquid 'water', not the verb meaning to supply water to a plant.";
  if (id === 1313) return "Runtime #1313 defines a 'difficult or strenuous effort' as a noun-like entry; the Master is the verb 'try very hard to do something difficult'. No clear same-POS/same-Sense basis supports reuse.";
  if (id === 1330) return "Runtime #1330 is the different lemma 'grapple'. A matching Vietnamese translation does not make it the identity 'struggle'.";
  if (id === 1477) return "Runtime #1477 defines struggle as 'fight or battle', a different sense from trying very hard to do something difficult.";
  return `Candidate #${id} does not establish the same English lemma and intended Sense as '${String(sense.lemma)}'; preserve it unchanged.`;
}

function diffValue(field: string, value: unknown): unknown {
  if (["ipa", "imageUrl", "audioUrl", "topic", "level"].includes(field)) {
    return value === null || value === undefined || value === "" ? null : "NON_NULL_VALUE_PRESENT";
  }
  return value ?? null;
}

function projectionDiffs(candidates: JsonObject[]): JsonObject[] {
  return candidates.flatMap((candidate) => {
    const diffs = Array.isArray(candidate.projectionDifferences) ? candidate.projectionDifferences as JsonObject[] : [];
    return diffs.map((diff) => ({
      runtimeId: candidate.appVocabularyId,
      field: diff.field,
      action: diff.action,
      masterValue: diffValue(String(diff.field), diff.master),
      runtimeValue: diffValue(String(diff.field), diff.runtime),
    }));
  });
}

const ENRICHMENT_FIELDS = ["ipa", "imageUrl", "audioUrl", "topic", "level"] as const;

function runtimeEnrichmentEvidence(candidates: JsonObject[], selectedRuntimeId: number | null): JsonObject[] {
  return candidates.map((candidate) => {
    const fields: JsonObject = {};
    for (const field of ENRICHMENT_FIELDS) {
      const value = candidate[field];
      fields[field] = {
        nonNullValuePresent: value !== null && value !== undefined && value !== "",
        policy: field === "ipa" || field === "imageUrl" || field === "audioUrl" || field === "topic" || field === "level"
          ? "PRESERVE_WHEN_MASTER_NULL_OR_ABSENT"
          : "PRESERVE",
      };
    }
    return {
      runtimeId: candidate.appVocabularyId,
      selectedForMapProposal: selectedRuntimeId === Number(candidate.appVocabularyId),
      rowMutationInThisPhase: "NONE",
      fields,
    };
  });
}

function runtimeSource(candidate: JsonObject): JsonObject {
  return {
    sourceDataset: candidate.sourceDataset ?? null,
    sourceRecordId: candidate.sourceRecordId ?? null,
  };
}

function candidateReview(candidate: JsonObject): JsonObject {
  const mapping = candidate.existingMasterSenseMapping ?? null;
  return {
    runtimeId: candidate.appVocabularyId,
    word: candidate.word,
    effectiveVietnamese: candidate.effectiveVietnamese,
    definitionEn: candidate.definitionEn,
    runtimeEnabled: candidate.enabled,
    contentVersion: candidate.contentVersion,
    learnerProgressReferenceCount: candidate.learnerProgressReferenceCount ?? 0,
    reviewEventReferenceCount: candidate.reviewEventReferenceCount ?? 0,
    existingMasterSenseMapping: mapping,
    matchingSignals: candidate.matchingSignals ?? [],
    candidateClassification: candidate.candidateClassification,
    candidatePosEvidence: "The legacy runtime row stores no POS; any POS compatibility is inferred from lemma and definition and is recorded separately for proposed maps.",
    polysemyAmbiguous: Boolean(candidate.polysemyAmbiguous),
    sameRuntimeIdCandidateForMasterSenses: candidate.sameRuntimeIdCandidateForMasterSenses ?? [],
    sourceIdentity: runtimeSource(candidate),
  };
}

function buildSenseProposal(sense: JsonObject): JsonObject {
  const candidates = candidateRows(sense);
  const map = MAP_PROPOSALS[String(sense.masterSenseId)];
  let proposedDecision: "MAP_EXISTING" | "CREATE_NEW" | "OWNER_CHOICE_REQUIRED" = "CREATE_NEW";
  let proposedAppVocabularyId: number | null = null;
  let proposedFirstAdoptionPolicy: "UPDATE_TO_MASTER" | null = null;
  let selectedCandidate: JsonObject | null = null;
  let semanticIdentityReason: string;
  let rejectedCandidateReasons: JsonObject[] = [];

  if (map) {
    selectedCandidate = candidates.find((candidate) => Number(candidate.appVocabularyId) === map.runtimeId) ?? null;
    if (!selectedCandidate) fail(`EXPECTED_MAP_CANDIDATE_MISSING_${sense.masterSenseId}`);
    if (normalized(selectedCandidate.word) !== normalized(sense.lemma)) fail(`MAP_LEMMA_MISMATCH_${sense.masterSenseId}`);
    if (mappedSenseId(selectedCandidate) !== null) fail(`MAP_CANDIDATE_ALREADY_MAPPED_${sense.masterSenseId}`);
    proposedDecision = "MAP_EXISTING";
    proposedAppVocabularyId = map.runtimeId;
    proposedFirstAdoptionPolicy = "UPDATE_TO_MASTER";
    semanticIdentityReason = map.reason;
  } else {
    semanticIdentityReason = candidates.length === 0
      ? "The committed Phase 2G.1C scan found no runtime candidate for this Master Sense. Apply the conservative zero-candidate default CREATE_NEW; the integer ID will be assigned only in a future authorized importer transaction."
      : "No discovered runtime row establishes both the same English lexical identity and the same intended Sense with sufficient evidence. CREATE_NEW preserves each candidate's existing identity and history; no candidate ID is selected.";
    rejectedCandidateReasons = candidates.map((candidate) => ({
      runtimeId: candidate.appVocabularyId,
      runtimeWord: candidate.word,
      reason: rejectReason(sense, candidate),
    }));
  }

  const competingIds = new Set<string>(Array.isArray(sense.identityReviewCompetingSenseIds) ? sense.identityReviewCompetingSenseIds : []);
  for (const candidate of candidates) {
    for (const id of Array.isArray(candidate.sameRuntimeIdCandidateForMasterSenses) ? candidate.sameRuntimeIdCandidateForMasterSenses : []) {
      if (id !== sense.masterSenseId) competingIds.add(String(id));
    }
  }
  const mappingConflicts = candidates.flatMap((candidate) => {
    const mapping = candidate.existingMasterSenseMapping;
    return mapping && mapping.masterSenseId !== sense.masterSenseId ? [{
      runtimeId: candidate.appVocabularyId,
      mappedMasterSenseId: mapping.masterSenseId,
      mapping,
    }] : [];
  });
  const history = candidates.map((candidate) => ({
    runtimeId: candidate.appVocabularyId,
    learnerProgressReferences: candidate.learnerProgressReferenceCount ?? 0,
    reviewEventReferences: candidate.reviewEventReferenceCount ?? 0,
  }));
  const evidence = {
    semanticIdentityReason,
    rejectedCandidateReasons,
    mappingConflict: {
      present: mappingConflicts.length > 0,
      conflictingRuntimeMappings: mappingConflicts,
    },
    polysemyConflict: {
      present: competingIds.size > 0 || candidates.some((candidate) => Boolean(candidate.polysemyAmbiguous)),
      competingMasterSenseIds: [...competingIds].sort(),
      sharedRuntimeCandidateIds: candidates.filter((candidate) => Boolean(candidate.polysemyAmbiguous)).map((candidate) => candidate.appVocabularyId),
    },
    learnerProgressReferences: history.map(({ runtimeId, learnerProgressReferences }) => ({ runtimeId, count: learnerProgressReferences })),
    reviewEventReferences: history.map(({ runtimeId, reviewEventReferences }) => ({ runtimeId, count: reviewEventReferences })),
    projectionDifferences: projectionDiffs(candidates),
    preservedRuntimeEnrichment: runtimeEnrichmentEvidence(candidates, proposedAppVocabularyId),
    sourceIdentity: {
      master: { datasetVersion: "2.2.1", releaseHash: OWNER_RECONCILIATION_RELEASE_HASH },
      runtimeCandidates: candidates.map((candidate) => ({ runtimeId: candidate.appVocabularyId, ...runtimeSource(candidate) })),
    },
    candidateReviews: candidates.map(candidateReview),
    proposedMapRuntimePosEvidence: map ? map.runtimePosEvidence : null,
    proposedMapContentVersion: selectedCandidate ? {
      current: selectedCandidate.contentVersion,
      expectedNext: Number(selectedCandidate.contentVersion) + 1,
      basis: "UPDATE_TO_MASTER changes the learner-facing projection; the importer derives exactly current contentVersion + 1 if this proposal is later authorized and planned against a current snapshot.",
    } : null,
  };
  const warnings: string[] = [];
  if (mappingConflicts.length) warnings.push("Do not alter the existing Master/runtime mapping shown in evidence.");
  if (competingIds.size) warnings.push("This runtime candidate is shared by multiple Hybrid-100 Senses; only the explicitly selected same-Sense map proposal may claim it.");
  for (const item of history) {
    if (item.learnerProgressReferences || item.reviewEventReferences) warnings.push(`Runtime #${item.runtimeId} has learner history; progress and reviews remain attached to that runtime ID.`);
  }
  if (proposedDecision === "CREATE_NEW") warnings.push("No runtime integer ID is allocated by this proposal.");

  return {
    masterSenseId: sense.masterSenseId,
    masterLexemeId: sense.masterLexemeId,
    lemma: sense.lemma,
    partOfSpeech: sense.partOfSpeech,
    reviewedMeaning: sense.reviewedMeaning,
    reviewedVietnamese: sense.reviewedVietnamese,
    runtimeCandidateIds: candidates.map((candidate) => candidate.appVocabularyId),
    proposedDecision,
    proposedAppVocabularyId,
    proposedFirstAdoptionPolicy,
    analysisStatus: "PROPOSAL_READY_FOR_OWNER_REVIEW",
    ownerDecision: "UNRESOLVED",
    evidence,
    warnings,
  };
}

function validateInputs(inputs: Inputs): void {
  const { candidateScan, collisionAudit, runtimeSnapshot, migrationState, validationSummary, scanManifest, sourceRelease } = inputs;
  const releaseHashInput = { ...sourceRelease };
  delete releaseHashInput.releaseHash;
  if (sourceRelease.datasetVersion !== "2.2.1" || sourceRelease.schemaVersion !== "2.0.1" || sourceRelease.status !== "APPROVED") fail("SOURCE_RELEASE_IDENTITY_MISMATCH");
  if (sourceRelease.releaseHash !== OWNER_RECONCILIATION_RELEASE_HASH || canonicalJsonSha256(releaseHashInput) !== OWNER_RECONCILIATION_RELEASE_HASH) fail("SOURCE_RELEASE_HASH_MISMATCH");
  if (scanManifest.snapshotFingerprint !== OWNER_RECONCILIATION_SNAPSHOT
    || runtimeSnapshot.snapshotFingerprint !== OWNER_RECONCILIATION_SNAPSHOT
    || candidateScan.snapshotFingerprint !== OWNER_RECONCILIATION_SNAPSHOT) fail("SNAPSHOT_FINGERPRINT_MISMATCH");
  if (scanManifest.sourceReleaseHash !== OWNER_RECONCILIATION_RELEASE_HASH
    || candidateScan.sourceReleaseHash !== OWNER_RECONCILIATION_RELEASE_HASH
    || validationSummary.sourceReleaseHash !== OWNER_RECONCILIATION_RELEASE_HASH) fail("SCAN_SOURCE_RELEASE_HASH_MISMATCH");
  if (scanManifest.releaseTreeFingerprint !== OWNER_RECONCILIATION_RELEASE_TREE
    || validationSummary.releaseTreeFingerprint !== OWNER_RECONCILIATION_RELEASE_TREE) fail("SOURCE_RELEASE_TREE_MISMATCH");
  if (candidateScan.masterSensesScanned !== 100 || candidateScan.existingMasterMappings !== 0
    || candidateScan.zeroRuntimeCandidates !== 85 || candidateScan.exactlyOneCandidate !== 13
    || candidateScan.multipleCandidates !== 2 || candidateScan.totalRuntimeCandidateRows !== 18) fail("DISCOVERY_COUNTS_MISMATCH");
  if (candidateScan.ownerDecisionsFinalized !== 0 || candidateScan.ownerDecisionsUnresolved !== 100
    || candidateScan.analysisOnly !== true || candidateScan.acceptedByImporter !== false) fail("SCAN_OWNER_STATE_INVALID");
  if (runtimeSnapshot.candidateRuntimeIds?.length !== 15 || runtimeSnapshot.runtimeRowsSerialized !== 18
    || runtimeSnapshot.historyEvidence !== "AGGREGATE_COUNTS_ONLY" || runtimeSnapshot.learnerIdentitiesQueried !== false) fail("RUNTIME_SNAPSHOT_EVIDENCE_MISMATCH");
  if (validationSummary.status !== "PASS" || validationSummary.releaseUnchanged !== true
    || validationSummary.runtimeIdsAllocated !== 0 || validationSummary.bridgeMappingsCreated !== 0
    || validationSummary.databaseWrites !== "NONE" || validationSummary.importerApplyExecuted !== false
    || validationSummary.migrationsExecuted !== "NONE" || validationSummary.productionMutation !== false) fail("SCAN_VALIDATION_NOT_PASS");
  if (migrationState.migrationReady !== true || migrationState.bridgeSchema?.ready !== true) fail("MIGRATION_EVIDENCE_MISMATCH");
  if (collisionAudit.existingMappingToMissingRuntimeRow?.length !== 0 || collisionAudit.bridgeIdentityConflicts?.length !== 0) fail("COLLISION_AUDIT_INVALID");
}

export function buildOwnerReconciliationProposal(root: string): JsonObject {
  const inputs = loadOwnerProposalInputs(root);
  validateInputs(inputs);
  const senses = Array.isArray(inputs.candidateScan.senses) ? inputs.candidateScan.senses as JsonObject[] : [];
  if (senses.length !== 100) fail("MASTER_SENSE_COVERAGE_MISMATCH");
  const proposals = senses.map(buildSenseProposal);
  const mapIds = proposals.filter((row) => row.proposedDecision === "MAP_EXISTING").map((row) => Number(row.proposedAppVocabularyId));
  if (mapIds.length !== new Set(mapIds).size) fail("RUNTIME_ID_SELECTED_MORE_THAN_ONCE");
  if (proposals.some((row) => row.ownerDecision !== "UNRESOLVED")) fail("OWNER_DECISION_FINALIZED");
  if (proposals.some((row) => row.proposedDecision === "MAP_EXISTING" && !row.proposedFirstAdoptionPolicy)) fail("MAP_FIRST_ADOPTION_POLICY_MISSING");
  if (proposals.some((row) => row.proposedDecision === "CREATE_NEW" && row.proposedAppVocabularyId !== null)) fail("CREATE_NEW_PREALLOCATED_ID");

  const decisionCounts = {
    CREATE_NEW: proposals.filter((row) => row.proposedDecision === "CREATE_NEW").length,
    MAP_EXISTING: proposals.filter((row) => row.proposedDecision === "MAP_EXISTING").length,
    OWNER_CHOICE_REQUIRED: proposals.filter((row) => row.proposedDecision === "OWNER_CHOICE_REQUIRED").length,
  };
  const allCandidateRows = senses.flatMap((sense) => candidateRows(sense).map((candidate) => ({ senseId: sense.masterSenseId, candidate })));
  const historyIds = [...new Set(allCandidateRows.filter(({ candidate }) => Number(candidate.learnerProgressReferenceCount ?? 0) > 0 || Number(candidate.reviewEventReferenceCount ?? 0) > 0).map(({ candidate }) => Number(candidate.appVocabularyId)))].sort((a, b) => a - b);
  const mappingConflictIds = [...new Set(allCandidateRows.filter(({ senseId, candidate }) => mappedSenseId(candidate) !== null && mappedSenseId(candidate) !== senseId).map(({ candidate }) => Number(candidate.appVocabularyId)))].sort((a, b) => a - b);
  const polysemyRuntimeIds = [...new Set(allCandidateRows.filter(({ candidate }) => Boolean(candidate.polysemyAmbiguous)).map(({ candidate }) => Number(candidate.appVocabularyId)))].sort((a, b) => a - b);

  return {
    artifactType: "HYBRID_100_OWNER_RECONCILIATION_PROPOSAL",
    artifactVersion: 1,
    generatedBy: "hybrid-100-owner-reconciliation-proposal-2.2.1-v1",
    sourceRelease: {
      datasetVersion: "2.2.1",
      schemaVersion: "2.0.1",
      status: "APPROVED",
      releaseHash: OWNER_RECONCILIATION_RELEASE_HASH,
      releaseTreeFingerprint: OWNER_RECONCILIATION_RELEASE_TREE,
    },
    sourceSnapshot: {
      phase: "2G.1C",
      snapshotFingerprint: OWNER_RECONCILIATION_SNAPSHOT,
      discovery: {
        masterSenses: 100,
        existingMasterMappings: 0,
        zeroCandidateSenses: 85,
        oneCandidateSenses: 13,
        multiCandidateSenses: 2,
        candidateRows: 18,
        distinctRuntimeCandidateIds: 15,
      },
      evidencePaths: Object.values(SOURCE_FILES).filter((file) => file !== SOURCE_FILES.sourceRelease),
    },
    decisionModel: {
      importerIdentityDecisionValues: ["MAP_EXISTING", "CREATE_NEW", "SKIP", "UNRESOLVED"],
      proposalDecisionValues: ["MAP_EXISTING", "CREATE_NEW", "OWNER_CHOICE_REQUIRED"],
      firstAdoptionPolicyValues: ["ADOPT_EXISTING_AS_BASELINE", "UPDATE_TO_MASTER"],
      analysisStatusValues: ["OWNER_CHOICE_REQUIRED", "IDENTITY_REVIEW_REQUIRED"],
      plannerResultValues: ["CREATE", "UPDATE", "NOOP", "BLOCKED", "CONFLICT"],
      note: "NOOP is a planner result, not an identity decision. OWNER_CHOICE_REQUIRED and IDENTITY_REVIEW_REQUIRED are analysis statuses, not importer identity decisions.",
    },
    ownership: {
      analysisOnly: true,
      acceptedByImporter: false,
      requiresHumanDecision: true,
      ownerReviewed: false,
      ownerDecisionValue: "UNRESOLVED",
      ownerDecisionsFinalized: 0,
      ownerDecisionsUnresolved: 100,
      importerApplyAuthorized: false,
    },
    counts: {
      masterSenses: proposals.length,
      ...decisionCounts,
      MAP_EXISTING_UPDATE_TO_MASTER: proposals.filter((row) => row.proposedDecision === "MAP_EXISTING" && row.proposedFirstAdoptionPolicy === "UPDATE_TO_MASTER").length,
      MAP_EXISTING_ADOPT_EXISTING_AS_BASELINE: proposals.filter((row) => row.proposedDecision === "MAP_EXISTING" && row.proposedFirstAdoptionPolicy === "ADOPT_EXISTING_AS_BASELINE").length,
      historySensitiveRuntimeIds: historyIds.length,
      historySensitiveRuntimeIdValues: historyIds,
      mappingConflictRuntimeIds: mappingConflictIds.length,
      mappingConflictRuntimeIdValues: mappingConflictIds,
      polysemyCollisionRuntimeIds: polysemyRuntimeIds.length,
      polysemyCollisionRuntimeIdValues: polysemyRuntimeIds,
    },
    activity: {
      databaseConnection: "NONE",
      databaseWrites: "NONE",
      runtimeIdsAllocated: 0,
      bridgeMappingsCreated: 0,
      learnerRowsMutated: 0,
      importerApplyExecuted: false,
      migrationsExecuted: "NONE",
      productionConnection: "NONE",
      productionMutation: false,
    },
    senses: proposals,
  };
}

function tableRow(cells: unknown[]): string {
  return `| ${cells.map((cell) => String(cell ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")).join(" | ")} |`;
}

function renderReport(proposal: JsonObject): string {
  const rows = proposal.senses as JsonObject[];
  const create = rows.filter((row) => row.proposedDecision === "CREATE_NEW");
  const maps = rows.filter((row) => row.proposedDecision === "MAP_EXISTING");
  const choices = rows.filter((row) => row.proposedDecision === "OWNER_CHOICE_REQUIRED");
  const empty = create.filter((row) => (row.runtimeCandidateIds as number[]).length === 0);
  const rejected = create.filter((row) => (row.runtimeCandidateIds as number[]).length > 0);
  const lines: string[] = [
    "# Hybrid-100 Owner Reconciliation Proposal — 2.2.1",
    "",
    "**Status:** proposal only; every actual `ownerDecision` remains `UNRESOLVED`. This artifact is analysis-only and is not accepted by the importer.",
    "",
    `- Frozen source: \`${proposal.sourceRelease.datasetVersion} / ${proposal.sourceRelease.status}\`; releaseHash \`${proposal.sourceRelease.releaseHash}\`; release tree \`${proposal.sourceRelease.releaseTreeFingerprint}\`.`,
    `- Phase 2G.1C snapshot fingerprint: \`${proposal.sourceSnapshot.snapshotFingerprint}\` (100 Senses; 0 existing mappings; 85 zero-candidate; 13 one-candidate; 2 multi-candidate; 18 candidate rows; 15 distinct runtime IDs).`,
    `- Proposed counts: CREATE_NEW ${proposal.counts.CREATE_NEW}; MAP_EXISTING ${proposal.counts.MAP_EXISTING}; OWNER_CHOICE_REQUIRED ${proposal.counts.OWNER_CHOICE_REQUIRED}.`,
    "- All MAP_EXISTING proposals use `UPDATE_TO_MASTER`; no baseline-adoption proposal is made.",
    "",
    "## Decision dimensions",
    "",
    "The importer identity choices are `MAP_EXISTING`, `CREATE_NEW`, `SKIP`, and `UNRESOLVED`. `ADOPT_EXISTING_AS_BASELINE` and `UPDATE_TO_MASTER` are first-adoption policies used only with MAP_EXISTING. `OWNER_CHOICE_REQUIRED` and `IDENTITY_REVIEW_REQUIRED` are analysis statuses. `CREATE`, `UPDATE`, `NOOP`, `BLOCKED`, and `CONFLICT` are planner outcomes; NOOP is not an identity decision.",
    "",
    "## 1. HIGH-CONFIDENCE CREATE_NEW",
    "",
    `### No runtime candidate (${empty.length})`,
    "",
    "Each listed Sense follows the required zero-candidate default. No integer ID is allocated; `proposedAppVocabularyId` is null.",
    "",
    tableRow(["Master Sense", "POS", "Meaning", "Sense ID"]),
    tableRow(["---", "---", "---", "---"]),
    ...empty.map((row) => tableRow([`${row.lemma}`, row.partOfSpeech, row.reviewedMeaning, `\`${row.masterSenseId}\``])),
    "",
    `### Runtime candidates rejected (${rejected.length})`,
    "",
    "Candidate identity is not established by Vietnamese overlap, synonyms, or a related concept. Runtime candidate rows and their mappings, source identity, history counts, projection differences, and enrichment-preservation evidence are captured in the JSON proposal.",
    "",
    tableRow(["Master Sense / meaning", "Candidate(s)", "Reason for CREATE_NEW"]),
    tableRow(["---", "---", "---"]),
    ...rejected.map((row) => tableRow([
      `${row.lemma} / ${row.partOfSpeech}: ${row.reviewedMeaning} (${row.masterSenseId})`,
      (row.evidence.rejectedCandidateReasons as JsonObject[]).map((candidate) => `#${candidate.runtimeId} ${candidate.runtimeWord}`).join("; "),
      (row.evidence.rejectedCandidateReasons as JsonObject[]).map((candidate) => candidate.reason).join(" "),
    ])),
    "",
    "## 2. HIGH-CONFIDENCE MAP_EXISTING + UPDATE_TO_MASTER",
    "",
    "These are proposal-only identity matches. Each mapped runtime ID is selected once, has no existing Master mapping in the scan, and requires explicit first-adoption policy `UPDATE_TO_MASTER`. The importer would derive the next contentVersion from a future verified current snapshot; no version is changed here.",
    "",
    tableRow(["Master Sense", "Runtime ID / word", "Semantic justification", "Content version", "History", "Existing mapping"]),
    tableRow(["---", "---", "---", "---", "---", "---"]),
    ...maps.map((row) => {
      const runtime = (row.evidence.candidateReviews as JsonObject[]).find((candidate) => candidate.runtimeId === row.proposedAppVocabularyId)!;
      const version = row.evidence.proposedMapContentVersion;
      return tableRow([
        `${row.lemma} / ${row.partOfSpeech}: ${row.reviewedMeaning} (${row.masterSenseId})`,
        `#${row.proposedAppVocabularyId} ${runtime.word}`,
        row.evidence.semanticIdentityReason,
        `${version.current} → ${version.expectedNext}`,
        `${runtime.learnerProgressReferenceCount} progress / ${runtime.reviewEventReferenceCount} reviews`,
        runtime.existingMasterSenseMapping ? JSON.stringify(runtime.existingMasterSenseMapping) : "none",
      ]);
    }),
    "",
    "For every map, `ipa`, `imageUrl`, `audioUrl`, `topic`, and `level` are runtime enrichment. A null or absent Master value means preserve; the proposal requests no clearing. This is particularly relevant to #1836 (IPA/image/audio/topic) and #948 (runtime IPA).",
    "",
    "## 3. OWNER_CHOICE_REQUIRED",
    "",
    choices.length ? choices.map((row) => `- **${row.lemma} / ${row.partOfSpeech}** (${row.masterSenseId}): ${row.evidence.semanticIdentityReason}`).join("\n") : "No Sense meets the threshold for OWNER_CHOICE_REQUIRED after applying conservative CREATE_NEW to ambiguous candidates and selecting only clear same-Sense paraphrases for MAP_EXISTING. Owner decisions themselves remain unresolved on all 100 rows.",
    "",
    "## 4. IDENTITY COLLISIONS / HISTORY-SENSITIVE CASES",
    "",
    "- **Reservation / #284:** runtime #284 is the booking Sense and its existing mapping to Master Sense `01a0fc13-09ef-7d37-a50f-d05db6b1a89c` remains untouched. The Hybrid doubt/hesitation Sense is CREATE_NEW.",
    "- **Water / #11 and #405:** both discovered rows mean noun/liquid water, not the Master verb 'supply water to a plant'. Runtime #11 has 1 learner progress reference and 5 review-event references; neither row is selected and no history moves.",
    "- **Light / #1260:** one brightness noun candidate is shared by three Master Senses (low-weight adjective, pale-color adjective, ignite verb). All three are CREATE_NEW; #1260 remains untouched.",
    "- **Relief / #1461:** one runtime pain/stress-relief candidate was discovered for two Master noun Senses. It is proposed only for pain/discomfort reduction (#1461, UPDATE_TO_MASTER); emergency aid is CREATE_NEW. This proposal does not map #1461 twice.",
    "- **Struggle:** #1313 is a noun-like 'difficult effort' definition, #1477 is fight/battle, and #1330 is the different lemma grapple. None establishes the Master verb Sense; CREATE_NEW is the conservative proposal.",
    "- **False semantic candidates:** `exact` → `precise` and `rally` → `muster` are CREATE_NEW because lexical identity differs. `rock` → `kick` is explicitly rejected as a Vietnamese translation homonym (`đá`).",
    "- **Liable / #1796:** the row mixes responsibility with a likelihood sense, and its effective Vietnamese points to responsibility. CREATE_NEW preserves that legacy identity while separating the narrower Master Sense.",
    "",
    "## Integrity and execution boundary",
    "",
    `- Phase 2G.1C candidate, snapshot summary, and manifest all pin \`${proposal.sourceSnapshot.snapshotFingerprint}\`; no database scan was rerun.`,
    `- Current proposal rows: ${rows.length}; owner decisions finalized: 0; unresolved: ${rows.filter((row) => row.ownerDecision === "UNRESOLVED").length}.`,
    "- `analysisOnly=true`, `acceptedByImporter=false`, `requiresHumanDecision=true`, `ownerReviewed=false`; this is not an APPLY-authorized reconciliation.",
    "- This phase: database connection NONE; database writes NONE; IDs allocated 0; bridge mappings created 0; learner rows mutated 0; importer APPLY not executed; migrations NONE; production untouched.",
    "- The 2.2.1 release and all Phase 2G.1C scan artifacts are inputs only and remain unchanged.",
    "",
    `Machine-readable proposal: \`${PROPOSAL}\`.`,
    "",
  ];
  return lines.join("\n");
}

export function materializeOwnerProposal(root: string, mode: "--check" | "--write"): JsonObject {
  const proposal = buildOwnerReconciliationProposal(root);
  const report = renderReport(proposal);
  const proposalPath = path.join(root, PROPOSAL);
  const reportPath = path.join(root, REPORT);
  const serialized = `${JSON.stringify(proposal, null, 2)}\n`;
  if (mode === "--check") {
    if (!existsSync(proposalPath) || readFileSync(proposalPath, "utf8") !== serialized) fail("PROPOSAL_NOT_MATERIALIZED_OR_STALE");
    if (!existsSync(reportPath) || readFileSync(reportPath, "utf8") !== report) fail("REPORT_NOT_MATERIALIZED_OR_STALE");
  } else {
    mkdirSync(path.dirname(proposalPath), { recursive: true });
    mkdirSync(path.dirname(reportPath), { recursive: true });
    writeFileSync(proposalPath, serialized, "utf8");
    writeFileSync(reportPath, report, "utf8");
  }
  return {
    status: mode === "--check" ? "PASS_MATERIALIZED_PROPOSAL_CURRENT" : "PASS_PROPOSAL_MATERIALIZED",
    writesPerformed: mode === "--write",
    sourceReleaseHash: OWNER_RECONCILIATION_RELEASE_HASH,
    releaseTreeFingerprint: OWNER_RECONCILIATION_RELEASE_TREE,
    snapshotFingerprint: OWNER_RECONCILIATION_SNAPSHOT,
    counts: proposal.counts,
    ownerDecisionsFinalized: 0,
    ownerDecisionsUnresolved: 100,
    databaseConnection: "NONE",
    databaseWrites: "NONE",
  };
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (mode !== "--check" && mode !== "--write") fail("USAGE_EXPECTED_--CHECK_OR_--WRITE");
  process.stdout.write(`${JSON.stringify(materializeOwnerProposal(ROOT, mode), null, 2)}\n`);
}
