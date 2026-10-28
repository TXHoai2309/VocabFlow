import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deriveDifficulty, matchPinnedCefrEvidence, resolveCefr } from "./lib/master-v2-learning-metadata-enrichment.mjs";

const ROOT = process.cwd();
const WORKSPACE = path.join(ROOT, "vocabflow-dataset/workspaces/master-v2-development-sync");
const BASE_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-v1.json");
const BASE_HASH_PATH = `${BASE_PATH}.sha256`;
const QUEUE_PATH = path.join(WORKSPACE, "independent-content-review-queue-v1.json");
const CANDIDATE_PATH = path.join(WORKSPACE, "master-v2-release-candidate-v9.json");
const OXFORD_PATH = path.resolve(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe/oxford-normalized-inventory.json");
const VOCAB4600_PATH = path.resolve(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe/vocab4600-normalized-inventory.json");
const OUTPUT_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-enrichment-v1.json");
const OUTPUT_HASH_PATH = `${OUTPUT_PATH}.sha256`;
const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function readPinned(file) {
  const bytes = readFileSync(file);
  return { bytes, value: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) };
}
function assert(condition, code) { if (!condition) throw new Error(code); }
function relative(file) { return path.relative(ROOT, file).replaceAll("\\", "/"); }

const baseFile = readPinned(BASE_PATH);
const baseSidecar = readFileSync(BASE_HASH_PATH, "utf8").trim().split(/\s+/u);
assert(baseSidecar[0] === baseFile.sha256 && baseSidecar[1] === path.basename(BASE_PATH), "BASE_METADATA_SHA256_MISMATCH");
const queueFile = readPinned(QUEUE_PATH);
const candidateFile = readPinned(CANDIDATE_PATH);
const oxfordFile = readPinned(OXFORD_PATH);
const vocab4600File = readPinned(VOCAB4600_PATH);
const base = baseFile.value;
const queue = queueFile.value;
const candidate = candidateFile.value;
const oxford = oxfordFile.value;
const vocab4600 = vocab4600File.value;

assert(base.artifactType === "master-v2-development-learning-metadata" && base.artifactVersion === "1.0.0"
  && base.status === "DEVELOPMENT_ONLY_METADATA_OVERLAY" && base.doesNotChangeContentOrReviewHash === true
  && base.doesNotApproveOrClearRights === true && base.senses?.length === 7311, "BASE_METADATA_SCOPE_OR_GATE_FAILURE");
assert(queueFile.sha256 === base.sourcePins.queueSha256 && candidateFile.sha256 === base.sourcePins.candidateSha256
  && oxfordFile.sha256 === base.sourcePins.oxfordInventorySha256
  && vocab4600.records?.length === 4673 && queue.entries?.length === 7320
  && candidate.senseDispositions?.length === 7320, "ENRICHMENT_SOURCE_PIN_OR_SCOPE_FAILURE");
assert(candidate.currentContentReviewDecisionCounts?.PASS === 7311 && candidate.releaseApproved === false
  && candidate.runtimeImported === false && vocab4600.statistics?.sourceSenseIdentity?.startsWith("CANDIDATE_ONLY") === true,
"CURRENT_PASS_OR_SOURCE_IDENTITY_GATE_FAILURE");

const entryByKey = new Map(queue.entries.map((entry) => [entry.proposalKey, entry]));
const dispositionByKey = new Map(candidate.senseDispositions.map((row) => [row.proposalKey, row]));
const baseByKey = new Map(base.senses.map((sense) => [sense.proposalKey, sense]));
const revisionsByKey = new Map();
for (const overlayRef of candidate.revisionOverlays ?? []) {
  const overlayPath = path.resolve(ROOT, overlayRef.path);
  assert(overlayPath.startsWith(`${ROOT}${path.sep}`), "REVISION_OVERLAY_OUTSIDE_REPOSITORY");
  const overlay = readPinned(overlayPath);
  assert(overlay.sha256 === overlayRef.sha256, "REVISION_OVERLAY_PIN_MISMATCH");
  for (const revision of overlay.value.revisions ?? []) {
    const entry = entryByKey.get(revision.proposalKey);
    const previous = revisionsByKey.get(revision.proposalKey);
    if (entry && revision.parentContentHash === (previous?.contentSha256 ?? entry.effectiveContentHash)) {
      revisionsByKey.set(revision.proposalKey, {
        contentSha256: revision.effectiveContentHash,
        sourceProvenance: revision.sourceProvenance ?? previous?.sourceProvenance ?? entry.sourceProvenance
      });
    }
  }
}

const recordsByCorpus = {
  OXFORD_5000: new Map(oxford.records.map((row) => [String(row.sourceRecordId), row])),
  ENGLISH_VOCAB_4600: new Map(vocab4600.records.map((row) => [String(row.sourceRecordId), row]))
};
const levelsWithCefr = new Map();
const senseRows = [];
for (const baseSense of base.senses) {
  const entry = entryByKey.get(baseSense.proposalKey);
  const disposition = dispositionByKey.get(baseSense.proposalKey);
  const revision = revisionsByKey.get(baseSense.proposalKey);
  const sourceProvenance = revision?.sourceProvenance ?? entry?.sourceProvenance;
  assert(entry && disposition?.contentReviewDecision === "PASS" && disposition.identityAndSourceValid === true
    && disposition.versionSelectionResolved === true && disposition.effectiveContentHash === baseSense.contentSha256
    && (revision?.contentSha256 ?? entry.effectiveContentHash) === baseSense.contentSha256,
  "SENSE_NOT_CURRENT_PASS_OR_HASH_MISMATCH");
  const vocab4600RefExists = (sourceProvenance?.sourceEvidenceReferences ?? []).some((ref) => ref.corpus === "ENGLISH_VOCAB_4600");
  if (vocab4600RefExists) {
    assert((sourceProvenance?.sourceInventoryFilePins ?? []).some((pin) => pin.corpus === "ENGLISH_VOCAB_4600"
      && pin.sha256 === vocab4600File.sha256), "VOCAB4600_SOURCE_FILE_PIN_MISMATCH");
  }
  const evidence = matchPinnedCefrEvidence({ entry, sourceProvenance, recordsByCorpus });
  const cefr = resolveCefr({ baselineCefr: baseSense.cefr, evidence });
  if (cefr.value) levelsWithCefr.set(cefr.value, (levelsWithCefr.get(cefr.value) ?? 0) + 1);

  const assignmentBlock = (assignments, category, rule) => assignments.length
    ? { status: "DERIVED", rule, sourceManifestSha256: baseFile.sha256,
        assignments: assignments.map((assignment) => ({ ...assignment, classificationStatus: "DERIVED" })) }
    : { status: "UNKNOWN", reason: "NO_MATCHING_CUE_IN_PINNED_CURRENT_METADATA", sourceManifestSha256: baseFile.sha256 };
  const topics = assignmentBlock(baseSense.topics ?? [], "topics", base.ruleset.id);
  const subtopics = assignmentBlock(baseSense.subtopics ?? [], "subtopics", "taxonomy-parent-of-derived-topic-v1");
  const domains = assignmentBlock(baseSense.domains ?? [], "domains", base.ruleset.id);
  const difficulty = deriveDifficulty(cefr);
  const unknown = (reason) => ({ status: "UNKNOWN", reason });
  senseRows.push({
    proposalKey: baseSense.proposalKey,
    contentSha256: baseSense.contentSha256,
    cefr,
    topics,
    subtopics,
    domains,
    difficulty,
    ageGroup: unknown("NO_SOURCE_EVIDENCE_OR_APPROVED_DERIVATION_RULE"),
    schoolGrade: unknown("NO_SOURCE_EVIDENCE_OR_APPROVED_DERIVATION_RULE"),
    examTags: unknown("NO_SOURCE_EVIDENCE_OR_APPROVED_DERIVATION_RULE")
  });
}
assert(senseRows.length === 7311 && new Set(senseRows.map((row) => row.proposalKey)).size === 7311,
  "ENRICHMENT_SENSE_IDENTITY_FAILURE");

const baselineLearningSetBySlug = new Map(base.learningSets.map((set) => [set.slug, set]));
const membershipAddsBySlug = new Map();
for (const row of senseRows) {
  const prior = baseByKey.get(row.proposalKey);
  if (prior?.cefr || row.cefr.status !== "SOURCE_VERIFIED") continue;
  const slug = `v2-cefr-${row.cefr.value.toLowerCase().replaceAll("_", "-")}`;
  const additions = membershipAddsBySlug.get(slug) ?? [];
  additions.push({ proposalKey: row.proposalKey, contentSha256: row.contentSha256 });
  membershipAddsBySlug.set(slug, additions);
}

const maxSortOrder = Math.max(...base.learningSets.map((set) => set.sortOrder));
const learningSetDefinitionsAdded = [];
const learningSetMembershipAdditions = [];
for (const [slug, members] of [...membershipAddsBySlug.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  members.sort((a, b) => a.proposalKey.localeCompare(b.proposalKey));
  const level = slug.slice("v2-cefr-".length).toUpperCase().replaceAll("-", "_");
  const priorSet = baselineLearningSetBySlug.get(slug);
  if (!priorSet) {
    learningSetDefinitionsAdded.push({
      slug,
      name: `CEFR ${level.replace("PRE_A1", "Pre-A1")}`,
      description: "Development-only learning set from source-verified CEFR evidence. A CEFR level is not a school grade.",
      grade: null,
      enabled: true,
      sortOrder: maxSortOrder + 10
    });
  }
  const start = priorSet?.members.length ?? 0;
  members.forEach((member, index) => learningSetMembershipAdditions.push({
    slug, proposalKey: member.proposalKey, contentSha256: member.contentSha256, sortOrder: start + index
  }));
}

const count = (predicate) => senseRows.filter(predicate).length;
const cefrAssigned = count((row) => row.cefr.status === "SOURCE_VERIFIED");
const counts = {
  senses: senseRows.length,
  cefrSourceVerifiedBaseline: base.counts.sourceVerifiedCefr,
  cefrSourceVerifiedFromVocab4600: count((row) => row.cefr.authority === "PINNED_VOCAB4600_TAG_WHERE_BASELINE_WAS_UNKNOWN"),
  cefrSourceVerifiedTotal: cefrAssigned,
  cefrUnknown: senseRows.length - cefrAssigned,
  cefrSecondarySourceDisagreementSenses: count((row) => row.cefr.secondarySourceConflicts?.length > 0),
  cefrUnresolvedConflictSenses: count((row) => row.cefr.status === "UNKNOWN" && row.cefr.reason?.includes("CONFLICT")),
  topicCoverage: count((row) => row.topics.status === "DERIVED"),
  topicMemberships: senseRows.reduce((sum, row) => sum + (row.topics.assignments?.length ?? 0), 0),
  subtopicCoverage: count((row) => row.subtopics.status === "DERIVED"),
  subtopicAssignments: senseRows.reduce((sum, row) => sum + (row.subtopics.assignments?.length ?? 0), 0),
  domainCoverage: count((row) => row.domains.status === "DERIVED"),
  domainMemberships: senseRows.reduce((sum, row) => sum + (row.domains.assignments?.length ?? 0), 0),
  difficultyDerived: count((row) => row.difficulty.status === "DERIVED"),
  ageGroupSourceVerified: 0,
  schoolGradeSourceVerified: 0,
  examTagSourceVerified: 0,
  learningSetsBefore: base.learningSets.length,
  learningSetMembershipsBefore: base.counts.learningSetMemberships,
  learningSetsAdded: learningSetDefinitionsAdded.length,
  learningSetMembershipsAdded: learningSetMembershipAdditions.length,
  learningSetsAfter: base.learningSets.length + learningSetDefinitionsAdded.length,
  learningSetMembershipsAfter: base.counts.learningSetMemberships + learningSetMembershipAdditions.length
};

assert(counts.cefrSourceVerifiedTotal + counts.cefrUnknown === 7311
  && counts.cefrSourceVerifiedBaseline === 5539
  && counts.learningSetsAfter >= counts.learningSetsBefore
  && counts.learningSetMembershipsAfter === counts.learningSetMembershipsBefore + learningSetMembershipAdditions.length,
"ENRICHMENT_COUNT_INTEGRITY_FAILURE");

const payload = {
  artifactType: "MASTER_V2_DEVELOPMENT_LEARNING_METADATA_ENRICHMENT",
  artifactVersion: "1.0.0",
  status: "DEVELOPMENT_ONLY_METADATA_ENRICHMENT",
  rules: {
    cefr: "Preserve an existing Oxford-pinned value. Fill only a baseline-unknown Sense when an exact pinned ENGLISH_VOCAB_4600 note supplies one unique CEFR value and no exact pinned Oxford evidence contradicts it. Preserve secondary disagreements and unresolved conflicts as evidence; never choose by recency.",
    cefrIdentityContract: "PASS_RECORD_PIN plus sourceRecordId, sourceNoteGuid, recordEvidenceSha256, normalized headword and normalized POS equality.",
    difficulty: "CEFR_ORDERED_PROXY_V1: PRE_A1/A1=FOUNDATION, A2=BASIC, B1=INTERMEDIATE, B2=UPPER_INTERMEDIATE, C1=ADVANCED, C2=PROFICIENT. Derived proxy only; not independently calibrated.",
    topicsAndDomains: "Reuse the current taxonomy and pinned v1 cue assignments as DERIVED; do not elevate them to source-verified.",
    schoolAndExam: "No inference; UNKNOWN without explicit source evidence or an approved derivation rule."
  },
  sourcePins: {
    baseManifestPath: relative(BASE_PATH), baseManifestSha256: baseFile.sha256,
    queuePath: relative(QUEUE_PATH), queueSha256: queueFile.sha256,
    candidatePath: relative(CANDIDATE_PATH), candidateSha256: candidateFile.sha256,
    oxfordInventoryPath: relative(OXFORD_PATH), oxfordInventorySha256: oxfordFile.sha256,
    vocab4600InventoryPath: relative(VOCAB4600_PATH), vocab4600InventorySha256: vocab4600File.sha256,
    taxonomyPath: base.sourcePins.taxonomyPath, taxonomySha256: base.sourcePins.taxonomySha256,
    taxonomyId: base.sourcePins.taxonomyId, taxonomyVersion: base.sourcePins.taxonomyVersion
  },
  scope: { senseCount: senseRows.length, identitySource: "current effective PASS/DRAFT V2 snapshot", contentChanged: false,
    reviewStatusChanged: false, rightsStatusChanged: false, mediaChanged: false },
  counts,
  existingLearningSets: base.learningSets.map((set) => ({ slug: set.slug, name: set.name,
    sortOrder: set.sortOrder, memberCount: set.members.length })),
  learningSetDefinitionsAdded,
  learningSetMembershipAdditions,
  senses: senseRows
};
const body = `${JSON.stringify(payload, null, 2)}\n`;
const digest = sha256(body);
writeFileSync(OUTPUT_PATH, body);
writeFileSync(OUTPUT_HASH_PATH, `${digest}  ${path.basename(OUTPUT_PATH)}\n`);
console.log(JSON.stringify({ status: "OFFLINE_ENRICHMENT_BUILT", path: relative(OUTPUT_PATH), sha256: digest, counts }, null, 2));
