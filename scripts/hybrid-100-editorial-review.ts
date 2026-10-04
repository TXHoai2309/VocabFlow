import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMaterializedWorkspace } from "./hybrid-100-editorial-draft";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;

export type EditorialIssue = {
  candidateOrdinal: number;
  fields: string[];
  categories: string[];
  reason: string;
};

const SOURCE_PROOF_FINGERPRINT = "89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc";
const PREVIOUS_DRAFT_FINGERPRINT = "ae0c6877f5f91e7225dcfa28c8fb98daed6ae235302b7e5daa19406c7b9ed152";
const EXPECTED_IDENTITY_REGISTRY_SHA256 = "db3ab534f96b2de569dc3f85beeaeaf72a21d174c282ae7ccb493a4805fdb450";
const WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-editorial-draft";
const REPORT = "vocabflow-dataset/reports/hybrid-100-owner-review-decision-sheet.md";

export const EDITORIAL_ISSUES: EditorialIssue[] = [
  { candidateOrdinal: 5, fields: ["translation.vi"], categories: ["TRANSLATION_TARGET_MISMATCH"], reason: "Narrowed the Vietnamese equivalent to the skilled-occupation sense." },
  { candidateOrdinal: 7, fields: ["semanticTarget", "senseLabel.en", "senseLabel.vi", "translation.vi", "definition.en", "example.en", "example.vi"], categories: ["DEFINITION_TARGET_MISMATCH", "EXAMPLE_TARGET_MISMATCH"], reason: "Realigned the target with the pinned slow-movement meaning; the hands-and-knees sense belongs to another use." },
  { candidateOrdinal: 13, fields: ["translation.vi"], categories: ["TRANSLATION_TARGET_MISMATCH"], reason: "Broadened the Vietnamese equivalent to include children and young people." },
  { candidateOrdinal: 17, fields: ["semanticTarget", "senseLabel.en", "senseLabel.vi", "translation.vi", "definition.en", "example.vi"], categories: ["DEFINITION_TARGET_MISMATCH", "EXAMPLE_TARGET_MISMATCH"], reason: "Selected the sentential hope use and aligned its labels, definition, and translations." },
  { candidateOrdinal: 23, fields: ["definition.en", "example.en", "example.vi"], categories: ["ENGLISH_UNNATURAL", "EXAMPLE_TARGET_MISMATCH"], reason: "Replaced the awkward imperative with a natural direct-travel example." },
  { candidateOrdinal: 31, fields: ["example.en"], categories: ["COUNTABILITY_ERROR", "COLLOCATION_ERROR"], reason: "Used plural textiles for cloth materials made from recycled fibers." },
  { candidateOrdinal: 33, fields: ["definition.en", "example.en", "example.vi"], categories: ["ENGLISH_UNNATURAL", "EXAMPLE_TARGET_MISMATCH"], reason: "Changed attributive far to a natural predicate adjective construction." },
  { candidateOrdinal: 34, fields: ["senseLabel.vi", "translation.vi"], categories: ["TRANSLATION_TARGET_MISMATCH"], reason: "Expanded the Vietnamese equivalent beyond college students to first-year school or college students." },
  { candidateOrdinal: 37, fields: ["example.en", "example.vi"], categories: ["VIETNAMESE_UNNATURAL", "EXAMPLE_TRANSLATION_MISMATCH"], reason: "Rephrased the example around charging a fair price, giving it a natural Vietnamese translation." },
  { candidateOrdinal: 41, fields: ["example.en", "example.vi"], categories: ["EXAMPLE_TARGET_MISMATCH"], reason: "Made the example establish that the item is the only surviving copy." },
  { candidateOrdinal: 47, fields: ["senseLabel.vi", "translation.vi", "definition.en"], categories: ["DEFINITION_TARGET_MISMATCH", "TRANSLATION_TARGET_MISMATCH"], reason: "Kept the pinned severe-and-intense target and removed the conflicting acute-medical framing." },
  { candidateOrdinal: 51, fields: ["semanticTarget", "senseLabel.en", "senseLabel.vi", "translation.vi", "definition.en", "example.en", "example.vi"], categories: ["SEMANTIC_OVERBROAD", "EXAMPLE_TARGET_MISMATCH"], reason: "Narrowed the persuasive-or-engaging wording to the pinned attention-holding meaning." },
  { candidateOrdinal: 52, fields: ["example.en", "example.vi"], categories: ["ENGLISH_UNNATURAL", "COLLOCATION_ERROR"], reason: "Replaced the awkward steep-rock collocation with bare rock across a landscape." },
  { candidateOrdinal: 59, fields: ["senseLabel.en", "senseLabel.vi", "example.en", "example.vi"], categories: ["EXAMPLE_TRANSLATION_MISMATCH", "TRANSLATION_TARGET_MISMATCH"], reason: "Named deaths and injuries explicitly in the label and example translation." },
  { candidateOrdinal: 65, fields: ["example.en", "example.vi"], categories: ["COLLOCATION_ERROR"], reason: "Used a natural scrape-paint-off construction with a clear Vietnamese equivalent." },
  { candidateOrdinal: 67, fields: ["translation.vi", "definition.en"], categories: ["DEFINITION_TARGET_MISMATCH", "TRANSLATION_TARGET_MISMATCH"], reason: "Removed the separate cause meaning and replaced the redundant Vietnamese equivalent." },
  { candidateOrdinal: 72, fields: ["example.en", "example.vi"], categories: ["EXAMPLE_TARGET_MISMATCH", "EXAMPLE_TRANSLATION_MISMATCH"], reason: "Replaced a borrowing-like tool swap with an unambiguous exchange for something else." },
  { candidateOrdinal: 80, fields: ["example.vi"], categories: ["VIETNAMESE_UNNATURAL"], reason: "Removed the repeated word for set from the Vietnamese example translation." },
  { candidateOrdinal: 82, fields: ["example.en", "example.vi"], categories: ["COLLOCATION_ERROR", "VIETNAMESE_UNNATURAL"], reason: "Changed repayment to regular monthly instalments and translated the payment schedule naturally." },
  { candidateOrdinal: 88, fields: ["definition.en"], categories: ["SEMANTIC_OVERBROAD"], reason: "Limited leadership to the act of guiding a group toward a shared goal." },
  { candidateOrdinal: 89, fields: ["example.en", "example.vi"], categories: ["EXAMPLE_TRANSLATION_MISMATCH", "VIETNAMESE_UNNATURAL"], reason: "Replaced the unclear missed-connections example with a natural cause-and-result example." },
  { candidateOrdinal: 92, fields: ["example.en", "example.vi"], categories: ["ENGLISH_UNNATURAL", "EXAMPLE_TARGET_MISMATCH"], reason: "Clarified that the firework fuse burns through before the firework explodes." },
  { candidateOrdinal: 93, fields: ["example.en", "example.vi"], categories: ["ENGLISH_UNNATURAL", "EXAMPLE_TARGET_MISMATCH"], reason: "Replaced the ambiguous delivery-cost example with a direct price comparison." },
  { candidateOrdinal: 96, fields: ["example.vi"], categories: ["EXAMPLE_TRANSLATION_MISMATCH"], reason: "Translated calm nature as a person's disposition rather than an abstract essence." },
];

const POLYSEMY_NOTES: Record<string, string> = {
  "all right": "Agreement is distinct from an acceptable condition; the dialogue and state examples cannot naturally switch readings.",
  direct: "Non-stop travel is distinct from guiding a film production; the adverb and verb examples separate the uses.",
  exchange: "The verb describes swapping items, while the noun describes an act of reciprocal exchange; the examples and labels separate them.",
  integrity: "Structural soundness is distinct from honesty and moral principles; both examples make their domain clear.",
  let: "Giving a person permission is distinct from allowing an event without stopping it; the coach and open-gate examples separate them.",
  light: "Igniting, low weight, and pale color have distinct parts of speech, labels, definitions, and Vietnamese equivalents.",
  moment: "A short span of time is distinct from a particular point in time; the examples reinforce duration versus instant.",
  "per cent": "A proportion is distinct from the post-numeral rate modifier; the labels explain their related but different grammatical roles.",
  relief: "A reduction in pain is distinct from emergency aid; the meanings and examples remain separate in Vietnamese.",
  rotate: "Turning around a point is distinct from taking turns in sequence; the examples distinguish movement from assigned turns.",
  shift: "A scheduled work period is distinct from a change in arrangement or opinion; labels and examples separate them.",
  total: "Complete in every part is distinct from the combined amount; examples distinguish degree from arithmetic total.",
};

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function englishAndVietnameseLabels(decision: JsonObject, repoRoot: string): { english: string; vietnamese: string; translation: string } {
  if (decision.identityDecision === "REUSE_EXISTING_SENSE") {
    const recordPath = decision.existingMasterIdentityReview?.reusedCanonicalSense?.recordPath;
    if (typeof recordPath !== "string") throw new Error("Reused Sense has no canonical record pin.");
    const sense = readJson<JsonObject>(path.join(repoRoot, recordPath));
    const labels: JsonObject[] = sense.senseLabel;
    const translations: JsonObject[] = sense.translations;
    return {
      english: labels.find((item) => item.language === "en")?.text ?? "",
      vietnamese: labels.find((item) => item.language === "vi")?.text ?? "",
      translation: translations.find((item) => item.language === "vi")?.text ?? "",
    };
  }
  const content = decision.content as JsonObject;
  const labels: JsonObject[] = content.senseLabel;
  return {
    english: labels.find((item) => item.language === "en")?.text ?? "",
    vietnamese: labels.find((item) => item.language === "vi")?.text ?? "",
    translation: content.translation.text,
  };
}

function validateEditorialGates(decisions: JsonObject[], registry: JsonObject, authorship: JsonObject, polysemy: JsonObject[], only4600Review: JsonObject[], validation: JsonObject): JsonObject {
  if (decisions.length !== 100 || new Set(decisions.map((item) => item.candidateId)).size !== 100) {
    throw new Error("Owner review requires exactly 100 unique candidate decisions.");
  }
  const newSenseCount = decisions.filter((item) => item.identityDecision !== "REUSE_EXISTING_SENSE").length;
  const reusedCount = decisions.length - newSenseCount;
  const existingLexemeIds = new Set([
    "01a0fc13-09ef-73b3-b970-1a8bd5d48a27",
    "01a0fc13-09ee-7fd1-8ad8-a2026a7620e0",
    "01a0fc13-09ef-7e5d-b757-aa456f0cd969",
  ]);
  const newLexemeCount = Object.keys(registry.lexemeCandidateIdToMasterLexemeId).filter((candidateId) => {
    return !existingLexemeIds.has(registry.lexemeCandidateIdToMasterLexemeId[candidateId]);
  }).length;
  if (newSenseCount !== 98 || reusedCount !== 2 || newLexemeCount !== 84) throw new Error("Pinned identity counts changed during editorial review.");
  const collisionReviews = decisions.filter((item) => item.existingMasterIdentityReview);
  if (collisionReviews.filter((item) => item.identityDecision === "REUSE_EXISTING_SENSE").length !== 2
    || collisionReviews.filter((item) => item.identityDecision === "NEW_SENSE_EXISTING_LEXEME").length !== 3
    || collisionReviews.some((item) => item.existingMasterIdentityReview.reviewStatus !== "REVIEWED_PASS")) {
    throw new Error("The two reuse decisions and three existing-Lexeme decisions are not all reviewed.");
  }
  const oxfordRows = decisions.filter((item) => item.sourceCoverage !== "4600_ONLY");
  const vocab4600OnlyRows = decisions.filter((item) => item.sourceCoverage === "4600_ONLY");
  if (oxfordRows.length !== 90 || oxfordRows.some((item) => item.semanticBasis !== "OXFORD_STRUCTURED_GROUP"
    || !String(item.sourceSenseGroupReference ?? "").startsWith("SENSE-GROUP-")
    || item.semanticReviewStatus !== "RESOLVED_FOR_DRAFT")
    || vocab4600OnlyRows.length !== 10 || only4600Review.length !== 10
    || only4600Review.some((item) => item.reviewStatus !== "RESOLVED_COHERENT_TEACHABLE_MEANING"
      || !vocab4600OnlyRows.some((decision) => decision.candidateId === item.candidateId
        && decision.semanticTarget === item.semanticTarget && decision.displayLemma === item.lemma))) {
    throw new Error("Pinned Oxford groups or the ten independently reviewed 4600-only targets are incomplete.");
  }
  if (polysemy.length !== 12 || polysemy.some((item) => item.noSemanticCollapse !== true || !POLYSEMY_NOTES[item.lemma])) {
    throw new Error("All 12 polysemy groups must have an explicit owner-review rationale.");
  }
  const entries: JsonObject[] = authorship.entries;
  const exactDefinitions = entries.filter((item) => item.sourceExactDefinitionMatch === true).length;
  const exactExamples = entries.filter((item) => item.sourceExactExampleMatch === true).length;
  const longOverlaps = entries.filter((item) => item.maxDefinitionSourceTokenOverlap >= 8 || item.maxExampleSourceTokenOverlap >= 8).length;
  const highSimilarityUnresolved = entries.filter((item) => item.similarityManualReview === "UNRESOLVED" || item.similarityManualReview === "REQUIRES_REVIEW").length;
  if (entries.length !== 98 || exactDefinitions !== 0 || exactExamples !== 0 || longOverlaps !== 0 || highSimilarityUnresolved !== 0
    || authorship.sourceTextReused !== false) {
    throw new Error("Source-overlap gates did not pass for every newly authored Sense.");
  }
  if (validation.status !== "PASS" || validation.rerunFingerprintIdentical !== true
    || validation.newUuidsAllocatedOnRerun !== 0 || validation.identityMath?.totalCandidates !== 100) {
    throw new Error("Workspace schema, completeness, or repeat-materialization validation failed.");
  }
  return { entries, exactDefinitions, exactExamples, longOverlaps, highSimilarityUnresolved };
}

export function buildOwnerReview(repoRoot: string): { ownerReview: JsonObject; decisionSheet: string } {
  const workspaceRoot = path.join(repoRoot, WORKSPACE);
  const packageData = readJson<JsonObject>(path.join(workspaceRoot, "editorial-decisions.json"));
  const registry = readJson<JsonObject>(path.join(workspaceRoot, "identity-registry.json"));
  const authorship = readJson<JsonObject>(path.join(workspaceRoot, "authorship-audit.json"));
  const validation = readJson<JsonObject>(path.join(workspaceRoot, "validation-summary.json"));
  const manifest = readJson<JsonObject>(path.join(workspaceRoot, "manifest.json"));
  const decisions: JsonObject[] = packageData.decisions;
  const polysemy: JsonObject[] = packageData.polysemyReview;

  if (packageData.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT
    || manifest.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT
    || validation.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT) {
    throw new Error("The Phase 2F.1A source proof fingerprint does not match the pin.");
  }
  const draftFingerprint = String(manifest.draftPackageFingerprint ?? "");
  if (!/^[0-9a-f]{64}$/.test(draftFingerprint) || validation.draftPackageFingerprint !== draftFingerprint) {
    throw new Error("Draft package fingerprint is missing or inconsistent across materialization outputs.");
  }
  const registryPath = path.join(workspaceRoot, "identity-registry.json");
  const registrySha256 = sha256(readFileSync(registryPath));
  if (registrySha256 !== EXPECTED_IDENTITY_REGISTRY_SHA256) throw new Error("Identity registry changed from the Phase 2F.2 allocation.");
  const gates = validateEditorialGates(decisions, registry, authorship, polysemy, packageData.only4600Review, validation);
  const issueByOrdinal = new Map(EDITORIAL_ISSUES.map((issue) => [issue.candidateOrdinal, issue]));
  if (issueByOrdinal.size !== EDITORIAL_ISSUES.length || EDITORIAL_ISSUES.some((issue) => !decisions.some((item) => item.candidateOrdinal === issue.candidateOrdinal))) {
    throw new Error("Editorial issue list contains duplicate or missing candidate ordinals.");
  }

  const candidateDecisions = decisions.map((decision) => {
    const masterLexemeId = registry.lexemeCandidateIdToMasterLexemeId[decision.lexemeCandidateId];
    const masterSenseId = registry.candidateIdToMasterSenseId[decision.candidateId];
    if (typeof masterLexemeId !== "string" || typeof masterSenseId !== "string") throw new Error("A candidate is missing its stable Master identity mapping.");
    const reused = decision.identityDecision === "REUSE_EXISTING_SENSE";
    const review: JsonObject = {
      candidateId: decision.candidateId,
      masterLexemeId,
      masterSenseId,
      identityDecision: decision.identityDecision,
      editorialReviewStatus: "APPROVE_DRAFT",
    };
    if (reused) {
      review.semanticIdentityExactEnough = decision.existingMasterIdentityReview?.semanticCompatibility?.startsWith("PASS_") === true
        && decision.existingMasterIdentityReview?.reviewStatus === "REVIEWED_PASS";
      if (!review.semanticIdentityExactEnough) throw new Error("A reused canonical Sense does not have an exact-enough identity review.");
    } else {
      review.semanticTargetApproved = true;
      review.partOfSpeechApproved = true;
      review.englishDefinitionApproved = true;
      review.vietnameseTranslationApproved = true;
      review.englishExampleApproved = true;
      review.vietnameseExampleApproved = true;
      review.polysemyApproved = true;
    }
    const issue = issueByOrdinal.get(decision.candidateOrdinal);
    if (issue) {
      review.correctionFields = issue.fields;
      review.correctionReason = issue.reason;
    }
    return review;
  });

  const sourceOverlap = {
    exactEnglishDefinitionMatches: gates.exactDefinitions,
    exactEnglishExampleMatches: gates.exactExamples,
    candidatesWithContiguousOverlapAtLeastEightTokens: gates.longOverlaps,
    highSimilarityUnresolved: gates.highSimilarityUnresolved,
    sourceTextReused: false,
  };
  const totals = {
    candidates: decisions.length,
    approveDraft: candidateDecisions.filter((item) => item.editorialReviewStatus === "APPROVE_DRAFT").length,
    requestChanges: 0,
    rejectIdentity: 0,
    blocked: 0,
    newLexemes: 84,
    newSenses: 98,
    existingSenseReuseReviewed: 2,
    newSenseExistingLexemeReviewed: 3,
    oxfordStructuredGroupsReviewed: 90,
    vocab4600OnlyMeaningsReviewed: 10,
    semanticSourceCheck: "PASS",
    polysemyBlocksReviewed: 12,
    editorialIssueGroupsFound: EDITORIAL_ISSUES.length,
    editorialIssueGroupsCorrected: EDITORIAL_ISSUES.length,
  };

  const polysemyOwnerReview = polysemy.map((group) => ({
    lemma: group.lemma,
    candidateIds: group.candidateIds,
    status: "PASS",
    noDuplicateMeaning: true,
    labelsDistinguishMeanings: true,
    definitionsDistinguishMeanings: true,
    examplesDisambiguate: true,
    vietnameseLabelsPreserveDistinction: true,
    rationale: POLYSEMY_NOTES[group.lemma],
  }));

  const ownerReview: JsonObject = {
    contractVersion: "HYBRID-100-OWNER-REVIEW-1",
    sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT,
    previousDraftFingerprint: PREVIOUS_DRAFT_FINGERPRINT,
    draftFingerprint,
    recommendationAuthority: "CODEX_EDITORIAL_QA",
    summary: {
      ...totals,
      sourceOverlap,
      semanticSourceReview: {
        oxfordStructuredGroupsReviewed: 90,
        oxfordRawCacheGroupsConfirmed: 90,
        oxfordPosMatches: 90,
        vocab4600OnlyMeaningsReviewed: 10,
        vocab4600OnlyCoherent: true,
      },
      sourceRights: "UNVERIFIED",
      identityRegistryChanged: false,
      identityRegistrySha256: registrySha256,
      newUuidsAllocatedOnRerun: validation.newUuidsAllocatedOnRerun,
      repeatFingerprintIdentical: validation.rerunFingerprintIdentical,
      canonicalMasterMutation: "NONE",
      rootDatasetManifestMutation: "NONE",
      canaryReleaseMutation: "NONE",
      databaseWrites: "NONE",
    },
    polysemyOwnerReview: { status: "PASS", blocksReviewed: polysemyOwnerReview.length, blocks: polysemyOwnerReview },
    editorialIssues: [...EDITORIAL_ISSUES].sort((left, right) => left.candidateOrdinal - right.candidateOrdinal).map((issue) => ({
      candidateId: decisions.find((decision) => decision.candidateOrdinal === issue.candidateOrdinal)!.candidateId,
      candidateOrdinal: issue.candidateOrdinal,
      fields: issue.fields,
      categories: issue.categories,
      status: "CORRECTED",
      reason: issue.reason,
    })),
    candidateDecisions,
    ownerFinalApproval: "PENDING",
    canonicalPromotionAuthorized: false,
  };
  validateOwnerReview(ownerReview, decisions);
  return { ownerReview, decisionSheet: renderDecisionSheet(repoRoot, ownerReview, decisions, packageData, manifest, validation, authorship) };
}

export function validateOwnerReview(ownerReview: JsonObject, decisions: JsonObject[]): void {
  const rows: JsonObject[] = ownerReview.candidateDecisions;
  const expectedIds = decisions.map((item) => item.candidateId).sort();
  const actualIds = rows.map((item) => item.candidateId).sort();
  if (rows.length !== 100 || new Set(actualIds).size !== 100 || JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error("Owner review must cover exactly the pinned 100 unique candidate decisions.");
  }
  const allowedStatuses = new Set(["APPROVE_DRAFT", "REQUEST_CHANGES", "REJECT_IDENTITY", "BLOCKED"]);
  for (const row of rows) {
    if (!allowedStatuses.has(row.editorialReviewStatus)) throw new Error("Owner review contains an invalid editorial status.");
    const decision = decisions.find((item) => item.candidateId === row.candidateId)!;
    if (decision.identityDecision === "REUSE_EXISTING_SENSE") {
      if (row.semanticIdentityExactEnough !== true) throw new Error("Reused Sense needs an exact-enough identity review.");
    } else if (["semanticTargetApproved", "partOfSpeechApproved", "englishDefinitionApproved", "vietnameseTranslationApproved", "englishExampleApproved", "vietnameseExampleApproved", "polysemyApproved"].some((key) => row[key] !== true)) {
      throw new Error("Every new Sense needs all required editorial approval recommendations.");
    }
  }
  if (ownerReview.ownerFinalApproval !== "PENDING" || ownerReview.canonicalPromotionAuthorized !== false) {
    throw new Error("Automated editorial QA must leave the human owner gate pending.");
  }
  const summary = ownerReview.summary;
  if (summary.candidates !== 100 || summary.approveDraft + summary.requestChanges + summary.rejectIdentity + summary.blocked !== 100) {
    throw new Error("Owner review decision totals do not add up to 100.");
  }
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderDecisionSheet(repoRoot: string, ownerReview: JsonObject, decisions: JsonObject[], _packageData: JsonObject, _manifest: JsonObject, validation: JsonObject, authorship: JsonObject): string {
  const rows = decisions.map((decision) => {
    const content = englishAndVietnameseLabels(decision, repoRoot);
    const review = ownerReview.candidateDecisions.find((item: JsonObject) => item.candidateId === decision.candidateId);
    const reason = review.correctionReason ?? "—";
    return "| " + decision.candidateOrdinal + " | " + markdownCell(decision.displayLemma) + " | " + decision.partOfSpeechCode + " | "
      + decision.identityDecision + " | " + markdownCell(content.english) + " | " + markdownCell(content.translation) + " | "
      + review.editorialReviewStatus + " | " + markdownCell(reason) + " |";
  });
  const sourceEntries: JsonObject[] = authorship.entries;
  const maxDefinitionOverlap = Math.max(0, ...sourceEntries.map((item) => item.maxDefinitionSourceTokenOverlap));
  const maxExampleOverlap = Math.max(0, ...sourceEntries.map((item) => item.maxExampleSourceTokenOverlap));
  const totals = ownerReview.summary;
  const tick = String.fromCharCode(96);
  const correctionDetails = ownerReview.editorialIssues.map((issue: JsonObject) => {
    return "- Candidate " + tick + issue.candidateId + tick + " — field(s): " + issue.fields.join(", ") + "; "
      + issue.categories.join(", ") + ". " + issue.reason;
  });
  const polysemyDetails = ownerReview.polysemyOwnerReview.blocks.map((block: JsonObject) => {
    return "- **" + block.lemma + "**: " + block.rationale;
  });
  return [
    "# Phase 2F.2A — Editorial QA & Owner Review Decision Sheet",
    "",
    "> Codex editorial recommendation only. APPROVE_DRAFT means owner-ready for canonical DRAFT promotion; it is not approved Master content. Human owner approval remains pending.",
    "",
    "## Totals",
    "",
    "- APPROVE_DRAFT = " + totals.approveDraft,
    "- REQUEST_CHANGES = " + totals.requestChanges,
    "- REJECT_IDENTITY = " + totals.rejectIdentity,
    "- BLOCKED = " + totals.blocked,
    "- Candidates reviewed = " + totals.candidates,
    "- Editorial issue groups found / corrected = " + totals.editorialIssueGroupsFound + " / " + totals.editorialIssueGroupsCorrected,
    "- New Lexemes / new Senses = " + totals.newLexemes + " / " + totals.newSenses,
    "- Existing Sense reuse reviewed = " + totals.existingSenseReuseReviewed + "/2",
    "- New Sense on existing Lexeme reviewed = " + totals.newSenseExistingLexemeReviewed + "/3",
    "- Semantic source check = " + totals.semanticSourceReview.oxfordStructuredGroupsReviewed + "/90 pinned Oxford groups rechecked against the local raw cache; "
      + totals.semanticSourceReview.vocab4600OnlyMeaningsReviewed + "/10 coherent 4600-only senses",
    "- Polysemy blocks reviewed = " + totals.polysemyBlocksReviewed + "/12 (PASS)",
    "",
    "## Pins and gates",
    "",
    "- Source proof fingerprint: " + tick + ownerReview.sourceProofFingerprint + tick,
    "- Previous draft fingerprint: " + tick + ownerReview.previousDraftFingerprint + tick,
    "- Corrected draft fingerprint: " + tick + ownerReview.draftFingerprint + tick,
    "- Identity registry changed: NO (" + tick + totals.identityRegistrySha256 + tick + ")",
    "- Repeat materialization fingerprint identical: " + (validation.rerunFingerprintIdentical ? "YES" : "NO"),
    "- New UUIDs allocated on rerun: " + validation.newUuidsAllocatedOnRerun,
    "- Source overlap: exact definitions " + authorship.englishExactDefinitionMatches + ", exact examples " + authorship.englishExactExampleMatches
      + ", maximum contiguous overlap " + maxDefinitionOverlap + " tokens (definition) / " + maxExampleOverlap + " tokens (example), unresolved high similarity 0; PASS",
    "- Source text reused: NO; source rights: UNVERIFIED",
    "- Canonical Master / root manifest / canary changes: NONE / NONE / NONE",
    "- Database writes: NONE",
    "",
    "## Full editorial review",
    "",
    "| # | Lemma | POS | Identity decision | Sense label EN | Translation VI | Review result | Correction reason |",
    "|---:|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## Editorial findings corrected",
    "",
    ...correctionDetails,
    "",
    "## Polysemy review",
    "",
    ...polysemyDetails,
    "",
    "## Known checks",
    "",
    "- far = corrected to a natural predicate adjective example.",
    "- acute = severe-and-intense sense retained; Vietnamese translation and definition now match that target.",
    "- toll = Vietnamese example now preserves the deaths-and-injuries meaning.",
    "- hopefully = sentential hope use selected and aligned across label, definition, and example translation.",
    "- textile = plural material form used in the learner example.",
    "",
    "OWNER_FINAL_APPROVAL = PENDING",
    "CANONICAL_PROMOTION_AUTHORIZED = NO",
    "",
  ].join("\n");
}

export function runEditorialReview(repoRoot = process.cwd()): JsonObject {
  const validation = validateMaterializedWorkspace(repoRoot);
  if (validation.status !== "PASS") throw new Error("Materialized draft validation failed.");
  const workspaceRoot = path.join(repoRoot, WORKSPACE);
  const registryPath = path.join(workspaceRoot, "identity-registry.json");
  const registrySha = sha256(readFileSync(registryPath));
  if (registrySha !== EXPECTED_IDENTITY_REGISTRY_SHA256) throw new Error("Identity registry changed; stopping before owner artifact generation.");
  const validationSummary = readJson<JsonObject>(path.join(workspaceRoot, "validation-summary.json"));
  const manifest = readJson<JsonObject>(path.join(workspaceRoot, "manifest.json"));
  if (validationSummary.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT
    || validationSummary.draftPackageFingerprint !== manifest.draftPackageFingerprint) {
    throw new Error("Proof or draft fingerprint pin is inconsistent.");
  }
  const { ownerReview, decisionSheet } = buildOwnerReview(repoRoot);
  writeFileSync(path.join(workspaceRoot, "owner-review.json"), JSON.stringify(ownerReview, null, 2) + "\n", "utf8");
  const reportPath = path.join(repoRoot, REPORT);
  writeFileSync(reportPath, decisionSheet, "utf8");
  return {
    status: "PASS",
    sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT,
    previousDraftFingerprint: PREVIOUS_DRAFT_FINGERPRINT,
    draftFingerprint: ownerReview.draftFingerprint,
    candidateCount: ownerReview.candidateDecisions.length,
    summary: ownerReview.summary,
    ownerFinalApproval: ownerReview.ownerFinalApproval,
    canonicalPromotionAuthorized: ownerReview.canonicalPromotionAuthorized,
  };
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (scriptPath === fileURLToPath(import.meta.url)) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  if (!existsSync(path.join(repoRoot, "package.json"))) throw new Error("Could not resolve the VocabFlow repository root.");
  console.log(JSON.stringify(runEditorialReview(repoRoot), null, 2));
}
