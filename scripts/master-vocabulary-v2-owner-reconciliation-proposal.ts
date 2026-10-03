type JsonRecord = Record<string, unknown>;

const APPLE_SENSE_ID = "01a0fc13-09ed-70b4-801b-408be3b771e9";
const BANK_FINANCIAL_SENSE_ID = "01a0fc13-09ee-7211-8e5a-784c689a0c7a";
const BANK_RIVER_SENSE_ID = "01a0fc13-09ee-7584-a480-e313e359f744";
const RECORD_NOUN_SENSE_ID = "01a0fc13-09ee-71ff-9a0a-a96e48ef7dac";
const RECORD_VERB_SENSE_ID = "01a0fc13-09ee-7823-95fc-5d1d76f13fa5";
const LOOK_AFTER_SENSE_ID = "01a0fc13-09ee-79c7-85ff-cbe0fc14a249";
const ALGORITHM_SENSE_ID = "01a0fc13-09ef-710c-8e76-753a5cfea69c";
const RESERVATION_SENSE_ID = "01a0fc13-09ef-7d37-a50f-d05db6b1a89c";
const TECHNOLOGY_STARTER_ID = "01a0fc13-09f2-7709-a32d-5bef5b1f7a51";
const RELEASE_HASH = "fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591";

export type AppleIdentityAudit = {
  vocabularyIds: number[];
  learningSetMemberships: Array<{ vocabularyId: number; learningSetId: number; slug: string; name: string; enabled: boolean; sortOrder: number }>;
  normalizedTopicMemberships: Array<{ vocabularyId: number; topicId: number; slug: string; name: string; enabled: boolean }>;
  progressStateCounts: Array<{ vocabularyId: number; status: string; count: number }>;
  reviewSummary: Array<{ vocabularyId: number; count: number; earliest: string | null; latest: string | null }>;
  overlappingLearnerCount: number;
  learningSetAssignmentCounts: Array<{ learningSetId: number; assignmentCount: number; activeAssignmentCount: number }>;
  technologyStarterExactCollisions: Array<{ learningSetId: number; slug: string; name: string }>;
  runtimeLearningSetCount: number;
};

export type OwnerReconciliationProposal = {
  artifactVersion: "runtime-reconciliation-owner-proposal-v2";
  owner: "analysis-only";
  generatedByScan: true;
  analysisOnly: true;
  acceptedByImporter: false;
  requiresHumanDecision: true;
  source: { datasetVersion: "2.1.0"; schemaVersion: "2.0.1"; releaseHash: string; snapshotFingerprint: string; scannedAt: string };
  target: { environment: string; projectId: string; branchId: string; databaseName: string };
  migrationAssessment: JsonRecord;
  senses: JsonRecord[];
  learningSets: JsonRecord[];
  appleIdentityAudit: AppleIdentityAudit;
};

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((entry): entry is JsonRecord => typeof entry === "object" && entry !== null && !Array.isArray(entry)) : [];
}

function record(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : {};
}

function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("OWNER_PROPOSAL_INPUT_INVALID");
  return value;
}

function number(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error("OWNER_PROPOSAL_INPUT_INVALID");
  return parsed;
}

function redactProjectionValue(field: string, value: unknown): unknown {
  if ((field === "imageUrl" || field === "audioUrl") && typeof value === "string" && value.length > 0) {
    return field === "imageUrl" ? "image URL present (Cloudinary)" : "audio URL present (Cloudinary)";
  }
  return value;
}

function candidateDifferences(candidate: JsonRecord): JsonRecord[] {
  return records(candidate.projectionDifferences).map((difference) => ({
    field: difference.field,
    master: redactProjectionValue(String(difference.field), difference.master),
    runtime: redactProjectionValue(String(difference.field), difference.runtime),
  }));
}

function findSense(senses: JsonRecord[], masterSenseId: string): JsonRecord {
  const found = senses.find((sense) => sense.masterSenseId === masterSenseId);
  if (!found) throw new Error("OWNER_PROPOSAL_MASTER_SENSE_MISSING");
  return found;
}

function candidateFor(sense: JsonRecord, id: number): JsonRecord | null {
  return records(sense.runtimeCandidates).find((candidate) => Number(candidate.appVocabularyId) === id) ?? null;
}

function candidateEvidence(candidate: JsonRecord, audit?: AppleIdentityAudit): JsonRecord {
  const id = number(candidate.appVocabularyId);
  const setMemberships = audit?.learningSetMemberships.filter((membership) => membership.vocabularyId === id) ?? [];
  const topicMemberships = audit?.normalizedTopicMemberships.filter((membership) => membership.vocabularyId === id) ?? [];
  return {
    appVocabularyId: id,
    currentContent: {
      word: candidate.word,
      vietnamese: candidate.effectiveVietnamese,
      definitionEn: candidate.definition ?? candidate.definitionEn ?? null,
      exampleEn: candidate.example ?? candidate.exampleEn ?? null,
      ipa: candidate.ipa,
      imageUrl: candidate.imageUrl ? "image URL present (Cloudinary)" : null,
      audioUrl: candidate.audioUrl ? "audio URL present (Cloudinary)" : null,
      legacyTopic: candidate.topic,
      level: candidate.level,
      enabled: candidate.enabled,
      contentVersion: candidate.contentVersion,
    },
    source: { sourceDataset: candidate.sourceDataset ?? null, sourceRecordId: candidate.sourceRecordId ?? null },
    history: {
      learnerProgressRows: number(candidate.learnerProgressCount ?? candidate.learnerProgressReferenceCount ?? 0),
      reviewEvents: number(candidate.reviewEventCount ?? candidate.reviewEventReferenceCount ?? 0),
      ...(audit ? {
        progressStates: Object.fromEntries(["NEW", "LEARNING", "MASTERED"].map((status) => [
          status,
          audit.progressStateCounts.find((row) => row.vocabularyId === id && row.status === status)?.count ?? 0,
        ])),
        reviewRange: audit.reviewSummary.find((row) => row.vocabularyId === id) ?? { count: 0, earliest: null, latest: null },
      } : {}),
    },
    memberships: {
      learningSets: setMemberships.map((membership) => {
        const assignments = audit?.learningSetAssignmentCounts.find((row) => row.learningSetId === membership.learningSetId);
        return { ...membership, learnerAssignmentCount: assignments?.assignmentCount ?? 0, activeLearnerAssignmentCount: assignments?.activeAssignmentCount ?? 0 };
      }),
      normalizedTopics: topicMemberships,
    },
    vietnameseOverrideStatus: candidate.vietnameseOverrideStatus,
    imageQuarantineStatus: candidate.imageQuarantineStatus,
    projectionEqualsMaster: candidate.projectionEqualsMaster === true,
    projectionDifferences: candidateDifferences(candidate),
  };
}

function proposedSense(input: {
  master: JsonRecord;
  proposedDecision: string;
  appVocabularyId?: number;
  firstAdoptionPolicy?: string;
  reason: string;
  warnings?: string[];
  audit?: AppleIdentityAudit;
}): JsonRecord {
  const sense = input.master;
  const mappedCandidate = input.appVocabularyId === undefined ? null : candidateFor(sense, input.appVocabularyId);
  if (input.appVocabularyId !== undefined && !mappedCandidate) throw new Error("OWNER_PROPOSAL_MAPPED_CANDIDATE_MISSING");
  const currentContentVersion = mappedCandidate ? number(mappedCandidate.contentVersion) : null;
  return {
    entityType: "SENSE",
    masterSenseId: sense.masterSenseId,
    lemma: sense.lemma,
    masterProjection: sense.masterProjection,
    runtimeCandidateIds: records(sense.runtimeCandidates).map((candidate) => number(candidate.appVocabularyId)),
    proposedDecision: input.proposedDecision,
    proposedAppVocabularyId: input.appVocabularyId ?? null,
    proposedFirstAdoptionPolicy: input.firstAdoptionPolicy ?? null,
    firstAdoptionProjectionImpact: mappedCandidate ? {
      projectionDiffers: mappedCandidate.projectionEqualsMaster !== true,
      currentContentVersion,
      expectedNextContentVersion: currentContentVersion === null ? null
        : mappedCandidate.projectionEqualsMaster === true ? currentContentVersion : currentContentVersion + 1,
    } : null,
    ownerDecision: "UNRESOLVED",
    evidence: {
      reason: input.reason,
      candidates: records(sense.runtimeCandidates).map((candidate) => candidateEvidence(candidate, input.audit)),
    },
    warnings: input.warnings ?? [],
  };
}

function appleOption(candidate: JsonRecord, other: JsonRecord, audit: AppleIdentityAudit) {
  const id = number(candidate.appVocabularyId);
  const otherId = number(other.appVocabularyId);
  return {
    decision: "MAP_EXISTING",
    appVocabularyId: id,
    firstAdoptionPolicy: "OWNER_CHOICE_REQUIRED",
    progressRowsPreservedOnChosenId: number(candidate.learnerProgressCount),
    reviewEventsPreservedOnChosenId: number(candidate.reviewEventCount),
    progressRowsRemainingOnOtherId: number(other.learnerProgressCount),
    reviewEventsRemainingOnOtherId: number(other.reviewEventCount),
    membershipsOnChosenId: audit.learningSetMemberships.filter((membership) => membership.vocabularyId === id),
    membershipsOnOtherId: audit.learningSetMemberships.filter((membership) => membership.vocabularyId === otherId),
    normalizedTopicsOnChosenId: audit.normalizedTopicMemberships.filter((membership) => membership.vocabularyId === id),
    expectedIfUpdateToMaster: {
      currentContentVersion: number(candidate.contentVersion),
      projectionDiffers: candidate.projectionEqualsMaster !== true,
      nextContentVersion: candidate.projectionEqualsMaster === true ? number(candidate.contentVersion) : number(candidate.contentVersion) + 1,
      fields: candidateDifferences(candidate),
    },
    futureDuplicateHandling: `The other apple row (#${otherId}) remains a distinct runtime ID with its own progress/review history and needs a separate owner decision; the importer must not map both to this one Master Sense.`,
  };
}

export function buildOwnerReconciliationProposal(input: {
  candidateArtifact: JsonRecord;
  appleIdentityAudit: AppleIdentityAudit;
  scannedAt: string;
}): OwnerReconciliationProposal {
  const scan = input.candidateArtifact;
  const target = record(scan.target);
  const migration = record(scan.migrationState);
  if (scan.sourceReleaseHash !== RELEASE_HASH || scan.analysisOnly !== true || scan.owner !== "analysis-only"
    || target.environment !== "development" || target.projectId !== "shy-hill-72364426"
    || target.branchId !== "br-square-grass-b3af0nte" || target.databaseName !== "neondb"
    || migration.current !== true || typeof scan.snapshotFingerprint !== "string" || scan.snapshotFingerprint.length !== 64) {
    throw new Error("OWNER_PROPOSAL_SOURCE_OR_TARGET_MISMATCH");
  }
  const senses = records(scan.senses);
  const apple = findSense(senses, APPLE_SENSE_ID);
  const bankFinancial = findSense(senses, BANK_FINANCIAL_SENSE_ID);
  const bankRiver = findSense(senses, BANK_RIVER_SENSE_ID);
  const recordNoun = findSense(senses, RECORD_NOUN_SENSE_ID);
  const recordVerb = findSense(senses, RECORD_VERB_SENSE_ID);
  const lookAfter = findSense(senses, LOOK_AFTER_SENSE_ID);
  const algorithm = findSense(senses, ALGORITHM_SENSE_ID);
  const reservation = findSense(senses, RESERVATION_SENSE_ID);
  const apple1 = candidateFor(apple, 1);
  const apple295 = candidateFor(apple, 295);
  const bank871 = candidateFor(bankFinancial, 871);
  const bankRiver871 = candidateFor(bankRiver, 871);
  const record849Noun = candidateFor(recordNoun, 849);
  const record849Verb = candidateFor(recordVerb, 849);
  const reservation284 = candidateFor(reservation, 284);
  if (!apple1 || !apple295 || !bank871 || !bankRiver871 || !record849Noun || !record849Verb || !reservation284
    || records(lookAfter.runtimeCandidates).length !== 0 || records(algorithm.runtimeCandidates).length !== 0
    || input.appleIdentityAudit.overlappingLearnerCount < 0
    || input.appleIdentityAudit.vocabularyIds.join(",") !== "1,295") {
    throw new Error("OWNER_PROPOSAL_CANDIDATE_SNAPSHOT_MISMATCH");
  }

  const proposedSenses = [
    {
      ...proposedSense({ master: apple, proposedDecision: "OWNER_CHOICE_REQUIRED", reason: "Both runtime rows currently represent apple = quả táo; the available evidence does not identify one canonical runtime identity.", audit: input.appleIdentityAudit,
        warnings: ["Do not map both runtime rows to this Master Sense.", "No option is ranked or selected.", input.appleIdentityAudit.overlappingLearnerCount > 0 ? "DUPLICATE_LEARNER_HISTORY" : "No learner is currently evidenced with progress on both rows."] }),
      identityClassification: "DUPLICATE_RUNTIME_ROWS_SAME_MASTER_SENSE",
      ownerOptions: [
        { option: "A", ...appleOption(apple1, apple295, input.appleIdentityAudit) },
        { option: "B", ...appleOption(apple295, apple1, input.appleIdentityAudit) },
        {
          option: "C", decision: "CREATE_NEW", appVocabularyId: null, firstAdoptionPolicy: null,
          consequence: "Creates a third apple runtime identity at apply time while IDs 1 and 295 and their separate history/memberships remain; this is likely undesirable if all three rows mean apple = quả táo.",
          initialContentVersion: 1,
        },
      ],
      duplicateLearnerHistory: input.appleIdentityAudit.overlappingLearnerCount > 0,
      overlappingLearnerCount: input.appleIdentityAudit.overlappingLearnerCount,
      sourceHistoryEvidence: {
        runtimeId1: "Migration 0003 seeds ID 1 in the project-authored Starter V1 catalog; the checked-in starter dataset also labels its provenance PROJECT_AUTHORED. This predates the current 2000 Common English V1 importer rows. The enrichment allowlist later references legacy source record 265, but the enrichment path does not assign source_dataset/source_record_id, consistent with the current null source identity.",
        runtimeId295: "Current runtime metadata identifies 2000_COMMON_ENGLISH_VOCABULARY_V1 record 265.",
      },
    },
    proposedSense({ master: bankFinancial, proposedDecision: "MAP_EXISTING", appVocabularyId: 871, firstAdoptionPolicy: "UPDATE_TO_MASTER", reason: "Runtime #871 is the financial-institution sense; the row has no progress/review history, Vietnamese override, existing Master mapping, or image quarantine.", warnings: ["UPDATE_TO_MASTER clears existing Cloudinary image/audio, legacy topic, and changes enabled/content fields to the approved projection."] }),
    proposedSense({ master: bankRiver, proposedDecision: "CREATE_NEW", reason: "The only runtime candidate is #871 and its Vietnamese/definition identify the financial sense, not a river bank; no second suitable runtime candidate was found.", warnings: ["Do not reuse financial row #871 for the river sense.", "Planned initial contentVersion = 1."] }),
    proposedSense({ master: recordNoun, proposedDecision: "CREATE_NEW", reason: "Runtime #849 is a physical grooved/vinyl disc sense, while Master represents recorded music or speech more generally; it has zero progress and review references but remains a distinct physical-object meaning.", warnings: ["Do not repurpose #849 based only on zero history.", "Planned initial contentVersion = 1."] }),
    proposedSense({ master: recordVerb, proposedDecision: "CREATE_NEW", reason: "Runtime #849 is a noun and cannot also identify the verb sense; no other runtime candidate was found.", warnings: ["Planned initial contentVersion = 1."] }),
    proposedSense({ master: lookAfter, proposedDecision: "CREATE_NEW", reason: "No suitable runtime candidate was found.", warnings: ["Planned initial contentVersion = 1."] }),
    proposedSense({ master: algorithm, proposedDecision: "CREATE_NEW", reason: "No suitable runtime candidate was found.", warnings: ["Planned initial contentVersion = 1."] }),
    proposedSense({ master: reservation, proposedDecision: "MAP_EXISTING", appVocabularyId: 284, firstAdoptionPolicy: "UPDATE_TO_MASTER", reason: "Runtime #284 represents the booking/reservation sense and has zero progress/review history, no Vietnamese override, no existing Master mapping, and no image quarantine.", warnings: ["UPDATE_TO_MASTER clears existing Cloudinary image/audio and legacy topic, and changes Vietnamese/definition/example/enabled fields to the approved projection."] }),
  ];
  const setScan = records(scan.learningSets).find((row) => row.masterLearningSetId === TECHNOLOGY_STARTER_ID);
  if (!setScan || records(setScan.runtimeCandidates).length !== 0) throw new Error("OWNER_PROPOSAL_LEARNING_SET_SCAN_MISMATCH");
  const learningSetProposal = {
    entityType: "LEARNING_SET",
    masterLearningSetId: TECHNOLOGY_STARTER_ID,
    code: "TECHNOLOGY_STARTER",
    slug: "technology-starter",
    name: "Technology starter",
    runtimeCandidateIds: [],
    exactSlugOrNameCollisionCount: input.appleIdentityAudit.technologyStarterExactCollisions.length,
    runtimeLearningSetCount: input.appleIdentityAudit.runtimeLearningSetCount,
    proposedDecision: "CREATE_NEW",
    ownerDecision: "UNRESOLVED",
    evidence: { reason: "No existing runtime Learning Set candidate or exact slug/name collision was found in the current development snapshot." },
    warnings: ["Do not allocate an integer ID during proposal preparation; a new ID is allocated only during an approved apply.", "No learner assignments are proposed."],
  };
  const mismatches = records(migration.historicalHashMismatches);
  return {
    artifactVersion: "runtime-reconciliation-owner-proposal-v2",
    owner: "analysis-only",
    generatedByScan: true,
    analysisOnly: true,
    acceptedByImporter: false,
    requiresHumanDecision: true,
    source: {
      datasetVersion: "2.1.0",
      schemaVersion: "2.0.1",
      releaseHash: RELEASE_HASH,
      snapshotFingerprint: string(scan.snapshotFingerprint),
      scannedAt: input.scannedAt,
    },
    target: { environment: "development", projectId: "shy-hill-72364426", branchId: "br-square-grass-b3af0nte", databaseName: "neondb" },
    migrationAssessment: {
      classification: "HISTORICAL_MIGRATION_HASH_DRIFT",
      appliedRows: migration.appliedCount,
      localRows: migration.localMigrationCount,
      historicalHashMismatchCount: mismatches.length,
      mismatchedTags: mismatches.map((row) => row.tag),
      requiredBridgeMigrationsMatched: records(migration.requiredMigrations).every((row) => row.applied === true),
      importPlannerGate: "The current Master import planner does not read or compare the Drizzle migration ledger when computing canApply. This drift is therefore not an automatic planner blocker, but remains a separate migration-history integrity issue and is not classified as harmless.",
    },
    senses: proposedSenses,
    learningSets: [learningSetProposal],
    appleIdentityAudit: input.appleIdentityAudit,
  };
}

function md(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return JSON.stringify(value).replaceAll("|", "\\|");
}

function formatDifferences(differences: JsonRecord[]): string {
  return differences.length
    ? differences.map((row) => `\`${md(row.field)}\`: ${md(row.runtime)} → ${md(row.master)}`).join("; ")
    : "No effective projection differences.";
}

function formatCandidate(candidate: JsonRecord): string {
  const content = record(candidate.currentContent);
  const history = record(candidate.history);
  const states = record(history.progressStates);
  const range = record(history.reviewRange);
  const memberships = record(candidate.memberships);
  const stateSummary = Object.keys(states).length
    ? ` (NEW ${md(states.NEW ?? 0)}, LEARNING ${md(states.LEARNING ?? 0)}, MASTERED ${md(states.MASTERED ?? 0)})`
    : "";
  return [
    `### Runtime #${md(candidate.appVocabularyId)}`,
    `- Current content: Vietnamese **${md(content.vietnamese)}**; definition “${md(content.definitionEn)}”; example “${md(content.exampleEn)}”; IPA ${md(content.ipa)}.`,
    `- Visibility fields: enabled=${md(content.enabled)}, level=${md(content.level)}, legacy topic=${md(content.legacyTopic)}, image=${content.imageUrl ? "Cloudinary URL present" : "none"}, audio=${content.audioUrl ? "Cloudinary URL present" : "none"}; contentVersion=${md(content.contentVersion)}.`,
    `- Source: ${md(record(candidate.source).sourceDataset)} / ${md(record(candidate.source).sourceRecordId)}.`,
    `- History: progress=${md(history.learnerProgressRows)}${stateSummary}; reviews=${md(history.reviewEvents)}; review range ${md(range.earliest)} to ${md(range.latest)}.`,
    `- Learning Set memberships: ${records(memberships.learningSets).length ? records(memberships.learningSets).map((set) => `#${md(set.learningSetId)} ${md(set.slug)} / ${md(set.name)} (enabled=${md(set.enabled)}, sortOrder=${md(set.sortOrder)}, assignments=${md(set.learnerAssignmentCount)}, active=${md(set.activeLearnerAssignmentCount)})`).join("; ") : "none"}.`,
    `- Normalized Topic memberships: ${records(memberships.normalizedTopics).length ? records(memberships.normalizedTopics).map((topic) => `${md(topic.slug)} / ${md(topic.name)} (enabled=${md(topic.enabled)})`).join("; ") : "none"}; Vietnamese override=${md(candidate.vietnameseOverrideStatus)}; image quarantine=${md(candidate.imageQuarantineStatus)}.`,
    `- Projection changes if updated: ${formatDifferences(records(candidate.projectionDifferences))}`,
  ].join("\n");
}

export function renderOwnerReconciliationReview(proposal: OwnerReconciliationProposal): string {
  const sections = proposal.senses.map((sense) => {
    const candidates = records(record(sense.evidence).candidates);
    const optionRows = records(sense.ownerOptions);
    const options = optionRows.length ? `\n\nOwner options (unranked):\n${optionRows.map((option) => {
      const key = string(option.option);
      if (key === "C") return `- **Option C — CREATE_NEW:** ${md(option.consequence)} Initial contentVersion=${md(option.initialContentVersion)}.`;
      const progressRows = number(option.progressRowsPreservedOnChosenId);
      const reviews = number(option.reviewEventsPreservedOnChosenId);
      const otherProgressRows = number(option.progressRowsRemainingOnOtherId);
      const otherReviews = number(option.reviewEventsRemainingOnOtherId);
      return `- **Option ${key} — MAP_EXISTING #${md(option.appVocabularyId)}:** preserves ${progressRows} progress ${progressRows === 1 ? "row" : "rows"} and ${reviews} review ${reviews === 1 ? "event" : "events"} on the chosen ID; the other apple keeps ${otherProgressRows} progress ${otherProgressRows === 1 ? "row" : "rows"} and ${otherReviews} review ${otherReviews === 1 ? "event" : "events"}, plus its memberships. No Learning Set or Topic membership changes are proposed here; existing links remain attached to their IDs. If UPDATE_TO_MASTER is selected, contentVersion ${md(record(option.expectedIfUpdateToMaster).currentContentVersion)} → ${md(record(option.expectedIfUpdateToMaster).nextContentVersion)} and it removes/replaces the listed media/topic/level projection values. ${md(option.futureDuplicateHandling)}`;
    }).join("\n")}` : "";
    return [
      `## ${md(sense.lemma)} — ${md(sense.proposedDecision)}`,
      `- Master Sense: \`${md(sense.masterSenseId)}\`; owner decision: **UNRESOLVED**.`,
      `- Runtime candidates: ${records(record(sense.evidence).candidates).map((candidate) => `#${md(candidate.appVocabularyId)}`).join(", ") || "none"}.`,
      ...candidates.map(formatCandidate),
      `- Proposal: ${md(record(sense.evidence).reason)}${sense.proposedAppVocabularyId !== null ? ` Proposed ${md(sense.proposedDecision)} #${md(sense.proposedAppVocabularyId)} with ${md(sense.proposedFirstAdoptionPolicy)}; effective projection differs=${md(record(sense.firstAdoptionProjectionImpact).projectionDiffers)}; contentVersion ${md(record(sense.firstAdoptionProjectionImpact).currentContentVersion)} → ${md(record(sense.firstAdoptionProjectionImpact).expectedNextContentVersion)} under UPDATE_TO_MASTER.` : ""}`,
      ...(Array.isArray(sense.warnings) ? sense.warnings.map((warning) => `- Warning: ${md(warning)}`) : []),
      options,
      "- Final owner decision: ____________________",
    ].filter(Boolean).join("\n" );
  });
  const audit = proposal.appleIdentityAudit;
  const overlap = audit.overlappingLearnerCount;
  return `# Development Canary Owner Reconciliation Review — Master V2 2.1.0

Generated: ${proposal.source.scannedAt}

## Verified scope

- Approved release 2.1.0; schema 2.0.1; release hash \`${proposal.source.releaseHash}\`.
- Read-only development target: project \`${proposal.target.projectId}\`, branch \`${proposal.target.branchId}\`, database \`${proposal.target.databaseName}\`.
- Snapshot fingerprint: \`${proposal.source.snapshotFingerprint}\`.
- This is analysis-only. It is not the human-owned reconciliation file, is rejected by the import planner, and does not authorize APPLY.

## Apple identity audit

- Runtime rows #1 and #295 both currently mean **apple = quả táo**. The snapshot supports \`DUPLICATE_RUNTIME_ROWS_SAME_MASTER_SENSE\`; no evidence identifies a separate lexical Sense.
- Same learner progress overlap: **${overlap}** ${overlap > 0 ? "— DUPLICATE_LEARNER_HISTORY" : "— no same-learner overlap found"}. Learner identifiers were not selected or recorded.
- Source history: ID 1 is seeded by migration \`0003_lazy_lady_deathstrike.sql\` from the project-authored Starter V1 catalog, predating the current legacy V1 importer rows. Later enrichment references source record 265 without writing source identity fields, consistent with ID 1's current null source metadata. ID 295 explicitly records \`2000_COMMON_ENGLISH_VOCABULARY_V1 / 265\`.
- Runtime API behavior: the vocabulary catalog and learner vocabulary endpoint return enabled rows; both are enabled and therefore can appear in the unfiltered catalog. The API applies an optional level filter; #1 has no level and #295 has GRADE_1, so level-filtered views can show #295 while excluding #1. The catalog endpoint does not filter by topic. Topic pages and topic-scoped Study Setup use normalized vocabulary_topics links; both rows have the enabled Food topic link. Learning Set detail uses learning_set_items and enabled rows; both rows have enabled-set memberships. Unscoped Study Setup/review queue requires the learner to have an active assignment to an enabled set containing the row; #1 belongs to three sets with 11 active assignment rows in aggregate, while #295 belongs to one set with one active assignment row (these are per-set assignment totals, not unique learners). Review then selects due progress rows or rows NEW for that learner; saved scopes use each learner's saved membership, and saved-all includes all enabled saved rows. Both apple IDs are reachable in current learner flows; #1 is more structurally connected through Learning Sets, while #295 carries legacy source identity and GRADE_1. Neither row is unreachable, and these signals do not select a canonical ID.
- No API behavior was changed. Evidence paths: \`apps/api/src/vocabulary.ts\`, \`apps/api/src/learner-vocabulary.ts\`, \`apps/api/src/topics.ts\`, \`apps/api/src/learning-sets.ts\`, \`apps/api/src/review-queue.ts\`, and \`apps/web/src/features/study/study-setup-page.tsx\`.

${sections.join("\n\n---\n\n")}

## Technology Starter Learning Set

- Master Learning Set: \`${TECHNOLOGY_STARTER_ID}\` (slug \`technology-starter\`, name “Technology starter”). Runtime Learning Sets checked: ${audit.runtimeLearningSetCount}; exact slug/name collisions: ${audit.technologyStarterExactCollisions.length}; candidate rows: 0.
- Proposal: CREATE_NEW; do not allocate an integer ID now and do not assign learners. Owner decision: **UNRESOLVED**.
- Final owner decision: ____________________

## Historical migration hash drift

- \`HISTORICAL_MIGRATION_HASH_DRIFT\`: ${md(record(proposal.migrationAssessment).historicalHashMismatchCount)} historical file hashes differ (${md(record(proposal.migrationAssessment).mismatchedTags)}); migration rows are ${md(record(proposal.migrationAssessment).appliedRows)}/${md(record(proposal.migrationAssessment).localRows)} present, while 0015/0016/0017 match exactly.
- Assessment: ${md(record(proposal.migrationAssessment).importPlannerGate)}
- Older migration files were not changed. This remains separate from Sense identity decisions.

## Read-only and approval state

- Database transaction mode: REPEATABLE READ, READ ONLY; no learner UUIDs were selected; no INSERT/UPDATE/DELETE, import APPLY, mapping edit, history merge, row disable/delete, ID allocation, or media operation occurred.
- All owner decisions remain **UNRESOLVED**. The final human-owned reconciliation remains unchanged.
`;
}

export function proposalHasOnlyUnresolvedOwnerDecisions(proposal: OwnerReconciliationProposal): boolean {
  return proposal.senses.every((sense) => sense.ownerDecision === "UNRESOLVED")
    && proposal.learningSets.every((set) => set.ownerDecision === "UNRESOLVED");
}
