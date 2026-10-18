import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { reviewedShortMeaningsArtifact, repositoryRoot, resolveRepositoryPath } from "./short-meaning-v2-paths.mjs";

const expectedCount = 7311;
const expectedFingerprint = "9abf453175f3cb48fdf46c779e6bdcbb5cad8ba659df3321893a777a539cb367";
const artifactDir = resolveRepositoryPath(process.env.SHORT_MEANING_ARTIFACT_DIR ?? reviewedShortMeaningsArtifact);
const sourceRepoRoot = resolveRepositoryPath(process.env.SHORT_MEANING_SOURCE_REPO ?? repositoryRoot);
const portable = process.env.SHORT_MEANING_PORTABLE !== "0";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, code) => { if (!condition) throw new Error(code); };
const normalizeReceiptPath = (value) => String(value ?? "").replaceAll("\\", "/");
const normalizeSourceText = (value) => String(value ?? "").replace(/<[^>]*>/gu, " ")
  .replace(/&nbsp;/giu, " ").replace(/&amp;/giu, "&").normalize("NFKC").toLocaleLowerCase("vi").replace(/\s+/gu, " ").trim();
const containsWholeSourcePhrase = (source, phrase) => {
  const normalizedSource = normalizeSourceText(source);
  const normalizedPhrase = normalizeSourceText(phrase);
  if (!normalizedSource || !normalizedPhrase) return false;
  const escaped = normalizedPhrase.split(/\s+/u).map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "u").test(normalizedSource);
};

const manifestBytes = await readFile(path.join(artifactDir, "manifest.json"));
const earlyManifest = JSON.parse(manifestBytes.toString("utf8"));
const isReceiptEnriched = earlyManifest.artifactVersion === "short-meanings-v2-offline-manifest-v2";
const filenames = ["input-snapshot.json", "results.jsonl", "candidate-review-queue.jsonl", ...(isReceiptEnriched ? ["review-evidence.jsonl", "pending-review-queue.jsonl"] : []), "manifest.json", "report.json", "report.md"];
const bytes = Object.fromEntries(await Promise.all(filenames.map(async (filename) => [filename, await readFile(path.join(artifactDir, filename))])));
const checksumLines = (await readFile(path.join(artifactDir, "SHA256SUMS.txt"), "utf8")).trim().split(/\r?\n/u);
const pinnedHashes = new Map(checksumLines.map((line) => {
  const [filename, hash] = line.split(/\s+/u);
  return [filename, hash];
}));
assert(pinnedHashes.size === filenames.length, "CHECKSUM_FILE_SET_MISMATCH");
for (const filename of filenames) assert(pinnedHashes.get(filename) === sha256(bytes[filename]), `ARTIFACT_HASH_MISMATCH_${filename}`);

if (portable) {
  const bundleBytes = await readFile(path.join(artifactDir, "PORTABLE_BUNDLE.json"));
  const bundle = JSON.parse(bundleBytes.toString("utf8"));
  assert(bundle.format === "vocabflow-short-meanings-portable-bundle-v1", "PORTABLE_BUNDLE_FORMAT_MISMATCH");
  assert(bundle.sourceArchive?.includedInBundle === false
    && bundle.sourceArchive.sha256 === "41258717a13dad47d804ec7cb605738a6ded42a334b2a158bf3fe9cf5679845f", "SOURCE_ARCHIVE_PIN_INVALID");
  assert(bundle.artifactManifestSha256 === sha256(manifestBytes), "PORTABLE_MANIFEST_HASH_MISMATCH");
  assert(bundle.parentArtifact?.manifestSha256 === earlyManifest.parentArtifact?.manifestSha256
    && bundle.parentArtifact?.resultSha256 === earlyManifest.parentArtifact?.resultSha256
    && bundle.parentArtifact?.verifiedBefore === earlyManifest.parentArtifact?.verifiedBefore, "PORTABLE_PARENT_PIN_MISMATCH");
  const bundleChecksumLines = (await readFile(path.join(artifactDir, "BUNDLE-SHA256SUMS.txt"), "utf8")).trim().split(/\r?\n/u);
  const bundleHashes = new Map(bundleChecksumLines.map((line) => {
    const [filename, hash] = line.split(/\s+/u);
    return [filename, hash];
  }));
  const requiredBundleFiles = [...filenames, "SHA256SUMS.txt", "PORTABLE_BUNDLE.json", "parent-v2/manifest.json", "parent-v2/results.jsonl"];
  assert(bundleHashes.size === bundleChecksumLines.length && requiredBundleFiles.every((filename) => bundleHashes.has(filename)), "PORTABLE_CHECKSUM_SET_INVALID");
  for (const [filename, expectedHash] of bundleHashes) {
    const resolved = path.resolve(artifactDir, filename);
    const relative = path.relative(artifactDir, resolved);
    assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "PORTABLE_CHECKSUM_PATH_OUTSIDE_ARTIFACT");
    assert(sha256(await readFile(resolved)) === expectedHash, `PORTABLE_BUNDLE_HASH_MISMATCH_${filename}`);
  }
}

const snapshot = JSON.parse(bytes["input-snapshot.json"].toString("utf8"));
const manifest = JSON.parse(bytes["manifest.json"].toString("utf8"));
const report = JSON.parse(bytes["report.json"].toString("utf8"));
const resultsText = bytes["results.jsonl"].toString("utf8");
const results = resultsText.trimEnd().split(/\r?\n/u).map((line) => JSON.parse(line));
const snapshotBody = { ...snapshot };
delete snapshotBody.snapshotFingerprint;
assert(snapshot.snapshotFingerprint === sha256(JSON.stringify(snapshotBody)), "SNAPSHOT_FINGERPRINT_MISMATCH");
assert(manifest.snapshotFingerprint === snapshot.snapshotFingerprint, "MANIFEST_SNAPSHOT_FINGERPRINT_MISMATCH");
assert(manifest.contentFingerprint === expectedFingerprint && snapshot.contentFingerprint === expectedFingerprint, "SOURCE_CONTENT_FINGERPRINT_MISMATCH");
assert(snapshot.rowCount === expectedCount && snapshot.rows.length === expectedCount && results.length === expectedCount, "SENSE_COUNT_MISMATCH");
assert(manifest.rowCount === expectedCount && manifest.resultSha256 === sha256(bytes["results.jsonl"]), "RESULT_MANIFEST_MISMATCH");

const sourcePins = manifest.sourcePins;
const sourceFiles = [
  [report.developmentDumpPath, sourcePins.developmentDumpSha256, "DEVELOPMENT_DUMP"],
  [report.offlineRowsPath, sourcePins.offlineRowsSha256, "OFFLINE_SOURCE_ROWS"],
  [report.runtimeManifestPath, sourcePins.runtimeManifestSha256, "RUNTIME_MANIFEST"],
  [path.join(report.sourceRoot, "oxford-normalized-inventory.json"), sourcePins.sourceInventories.OXFORD_5000, "OXFORD_INVENTORY"],
  [path.join(report.sourceRoot, "vocab4600-normalized-inventory.json"), sourcePins.sourceInventories.ENGLISH_VOCAB_4600, "VOCAB4600_INVENTORY"]
];
if (portable) {
  for (const [, expectedHash, label] of sourceFiles) assert(/^[0-9a-f]{64}$/u.test(expectedHash ?? ""), `SOURCE_FILE_PIN_MISSING_${label}`);
} else {
  for (const [filename, expectedHash, label] of sourceFiles) {
    assert(filename && expectedHash && sha256(await readFile(filename)) === expectedHash, `SOURCE_FILE_PIN_MISMATCH_${label}`);
  }
  const runtimeSidecar = (await readFile(`${report.runtimeManifestPath}.sha256`, "utf8")).trim().split(/\s+/u)[0];
  assert(runtimeSidecar === sourcePins.runtimeManifestSha256, "RUNTIME_MANIFEST_SIDECAR_MISMATCH");
}

const receiptHashes = new Map();
const receiptDocuments = new Map();
for (const row of snapshot.rows) {
  const relativeReceiptPath = row.localDockerRestoreLineage?.contentReviewReceiptPath;
  const expectedReceiptHash = row.reviewReceiptSha256;
  assert(relativeReceiptPath && expectedReceiptHash, "CONTENT_REVIEW_RECEIPT_REFERENCE_MISSING");
  const receiptPath = portable ? normalizeReceiptPath(relativeReceiptPath) : path.resolve(sourceRepoRoot, relativeReceiptPath);
  if (!portable) {
    const relativeToRoot = path.relative(sourceRepoRoot, receiptPath);
    assert(relativeToRoot && !relativeToRoot.startsWith("..") && !path.isAbsolute(relativeToRoot), "CONTENT_REVIEW_RECEIPT_PATH_OUTSIDE_SOURCE_ROOT");
  }
  const priorHash = receiptHashes.get(receiptPath);
  assert(!priorHash || priorHash === expectedReceiptHash, "CONTENT_REVIEW_RECEIPT_HASH_CONFLICT");
  receiptHashes.set(receiptPath, expectedReceiptHash);
}
if (!portable) {
  for (const [receiptPath, expectedHash] of receiptHashes) {
    const receiptBytes = await readFile(receiptPath);
    assert(sha256(receiptBytes) === expectedHash, "CONTENT_REVIEW_RECEIPT_FILE_HASH_MISMATCH");
    if (isReceiptEnriched) receiptDocuments.set(receiptPath, JSON.parse(receiptBytes.toString("utf8")));
  }
}

const fingerprintRows = snapshot.rows.map((row) => [row.proposalIdentity, row.sourceContentHash])
  .sort((a, b) => a[0].localeCompare(b[0]));
assert(new Set(fingerprintRows.map(([identity]) => identity)).size === expectedCount, "DUPLICATE_SOURCE_IDENTITY");
assert(new Set(snapshot.rows.map((row) => row.vocabularyId)).size === expectedCount, "DUPLICATE_VOCABULARY_ID");
assert(sha256(JSON.stringify(fingerprintRows)) === expectedFingerprint, "RECOMPUTED_CONTENT_FINGERPRINT_MISMATCH");
const sourceByIdentity = new Map(snapshot.rows.map((row) => [row.proposalIdentity, row]));
const resultIds = new Set();
for (const row of results) {
  const source = sourceByIdentity.get(row.proposalIdentity);
  assert(source && source.vocabularyId === row.vocabularyId && source.sourceContentHash === row.sourceContentHash, "RESULT_SOURCE_HASH_MISMATCH");
  assert(!resultIds.has(row.proposalIdentity), "DUPLICATE_RESULT_IDENTITY");
  resultIds.add(row.proposalIdentity);
  assert(["VERIFIED", "REVIEW_REQUIRED", "UNRESOLVED"].includes(row.validationStatus), "INVALID_RESULT_STATUS");
  if (row.validationStatus === "VERIFIED") assert(row.shortMeaningVi && row.evidenceRef && row.sourceType && row.confidence, "VERIFIED_RESULT_MISSING_EVIDENCE");
  if (row.validationStatus === "UNRESOLVED") assert(row.shortMeaningVi === null, "UNRESOLVED_RESULT_HAS_GLOSS");
  assert(row.sourceType !== "AI_DERIVED", "AI_GLOSS_PRESENT");
}
assert(resultIds.size === expectedCount, "RESULT_IDENTITY_COVERAGE_MISMATCH");
const candidatesText = bytes["candidate-review-queue.jsonl"].toString("utf8");
const expectedCandidates = results.filter((row) => row.validationStatus !== "VERIFIED" && row.candidateAlternatives.length > 0);
const expectedCandidatesText = expectedCandidates.length ? `${expectedCandidates.map((row) => JSON.stringify(row)).join("\n")}\n` : "";
assert(candidatesText === expectedCandidatesText, "CANDIDATE_QUEUE_MISMATCH");
assert(manifest.candidateQueueSha256 === sha256(bytes["candidate-review-queue.jsonl"]), "CANDIDATE_QUEUE_HASH_MISMATCH");

if (isReceiptEnriched) {
  const evidenceRows = bytes["review-evidence.jsonl"].toString("utf8").trimEnd().split(/\r?\n/u).map((line) => JSON.parse(line));
  const pendingRows = bytes["pending-review-queue.jsonl"].toString("utf8").trimEnd().split(/\r?\n/u).map((line) => JSON.parse(line));
  const resultByIdentity = new Map(results.map((row) => [row.proposalIdentity, row]));
  const snapshotByIdentity = new Map(snapshot.rows.map((row) => [row.proposalIdentity, row]));
  assert(sha256(bytes["review-evidence.jsonl"]) === manifest.reviewEvidenceSha256, "REVIEW_EVIDENCE_HASH_MISMATCH");
  assert(sha256(bytes["pending-review-queue.jsonl"]) === manifest.pendingReviewQueueSha256, "PENDING_REVIEW_QUEUE_HASH_MISMATCH");
  assert(evidenceRows.length === manifest.receiptEnrichment.newlyVerified, "REVIEW_EVIDENCE_COUNT_MISMATCH");
  assert(pendingRows.length === results.filter((row) => row.validationStatus !== "VERIFIED").length, "PENDING_REVIEW_QUEUE_COUNT_MISMATCH");
  for (const evidenceRow of evidenceRows) {
    const result = resultByIdentity.get(evidenceRow.proposalIdentity);
    const source = snapshotByIdentity.get(evidenceRow.proposalIdentity);
    assert(result && source && result.validationStatus === "VERIFIED", "REVIEW_EVIDENCE_TARGET_MISSING");
    assert(result.sourceContentHash === evidenceRow.sourceContentHash && source.sourceContentHash === evidenceRow.sourceContentHash, "REVIEW_EVIDENCE_HASH_PIN_MISMATCH");
    assert(result.shortMeaningVi === evidenceRow.candidateText, "REVIEW_EVIDENCE_GLOSS_MISMATCH");
    assert(result.reviewerIdentity === evidenceRow.reviewerIdentity && result.reviewedAt === evidenceRow.reviewedAt, "REVIEW_EVIDENCE_REVIEWER_MISMATCH");
    const receiptPath = portable ? normalizeReceiptPath(evidenceRow.receiptPath) : path.resolve(sourceRepoRoot, evidenceRow.receiptPath);
    const expectedReceiptHash = receiptHashes.get(receiptPath);
    assert(expectedReceiptHash && expectedReceiptHash === evidenceRow.receiptSha256, "REVIEW_EVIDENCE_RECEIPT_PIN_MISMATCH");
    assert(evidenceRow.decision === "PASS" && evidenceRow.proposalIdentity === source.proposalIdentity
      && evidenceRow.receiptPath === source.localDockerRestoreLineage.contentReviewReceiptPath
      && evidenceRow.receiptSha256 === source.reviewReceiptSha256, "REVIEW_EVIDENCE_RECEIPT_BINDING_INVALID");
    assert(/relevant source gloss/iu.test(evidenceRow.finding ?? ""), "REVIEW_EVIDENCE_FINDING_MISSING");
    const pinnedSources = evidenceRow.sourceRecords ?? [];
    assert(pinnedSources.length > 0 && pinnedSources.every((item) => item.recordPinVerified === true), "REVIEW_EVIDENCE_SOURCE_PIN_MISSING");
    assert(pinnedSources.some((item) => containsWholeSourcePhrase(item.sourceMeaningFieldRaw, evidenceRow.candidateText)), "REVIEW_EVIDENCE_GLOSS_NOT_IN_PINNED_SOURCE");
    if (!portable) {
      const receipt = receiptDocuments.get(receiptPath);
      const entry = receipt.entries?.find((candidate) => candidate.proposalKey === evidenceRow.proposalIdentity
        && candidate.effectiveContentHash === evidenceRow.sourceContentHash);
      assert(entry && entry.decision === "PASS" && entry.reviewerIdentity === evidenceRow.reviewerIdentity, "REVIEW_EVIDENCE_RECEIPT_DECISION_MISMATCH");
      assert(receipt.checkpointCreatedAtUtc === evidenceRow.reviewedAt, "REVIEW_EVIDENCE_TIMESTAMP_MISMATCH");
      assert(entry.finding === evidenceRow.finding, "REVIEW_EVIDENCE_FINDING_MISMATCH");
      assert(entry.evidence?.displayForm === source.headword && entry.evidence?.partOfSpeech === source.partOfSpeech
        && entry.evidence?.definitionEn === source.definitionEn && entry.evidence?.meaningVi === source.vietnameseExplanation
        && JSON.stringify(entry.evidence?.examples ?? []) === JSON.stringify(source.examples ?? []), "REVIEW_EVIDENCE_CONTENT_BINDING_MISMATCH");
      const receiptPinnedSources = entry.evidence?.sourceRecords ?? [];
      assert(receiptPinnedSources.length > 0 && receiptPinnedSources.every((item) => item.recordPinVerified === true), "REVIEW_EVIDENCE_SOURCE_PIN_MISSING");
      assert(receiptPinnedSources.some((item) => containsWholeSourcePhrase(item.sourceMeaningFieldRaw, evidenceRow.candidateText)), "REVIEW_EVIDENCE_GLOSS_NOT_IN_PINNED_SOURCE");
    }
  }
  for (const pending of pendingRows) {
    const result = resultByIdentity.get(pending.proposalIdentity);
    const source = snapshotByIdentity.get(pending.proposalIdentity);
    assert(result && source && result.validationStatus !== "VERIFIED", "PENDING_REVIEW_TARGET_MISSING");
    assert(pending.contentHash === result.sourceContentHash && pending.contentHash === source.sourceContentHash, "PENDING_REVIEW_HASH_MISMATCH");
    assert(pending.headword === source.headword && pending.partOfSpeech === source.partOfSpeech
      && pending.definitionEn === source.definitionEn && pending.vietnameseExplanation === source.vietnameseExplanation
      && JSON.stringify(pending.examples) === JSON.stringify(source.examples), "PENDING_REVIEW_CONTEXT_MISMATCH");
    assert(pending.reviewReceiptSha256 === source.reviewReceiptSha256
      && pending.reviewReceiptPath === source.localDockerRestoreLineage.contentReviewReceiptPath, "PENDING_REVIEW_RECEIPT_PIN_MISMATCH");
  }
  const counts = {
    total: results.length,
    verified: results.filter((row) => row.validationStatus === "VERIFIED").length,
    verifiedSourceGlosses: results.filter((row) => row.validationStatus === "VERIFIED" && row.sourceType === "VERIFIED_SOURCE_GLOSS").length,
    verifiedExistingTranslations: results.filter((row) => row.validationStatus === "VERIFIED" && row.sourceType === "EXISTING_APPROVED_TRANSLATION").length,
    reviewRequired: results.filter((row) => row.validationStatus === "REVIEW_REQUIRED").length,
    unresolved: results.filter((row) => row.validationStatus === "UNRESOLVED").length,
    candidatesPendingReview: expectedCandidates.length,
    pendingReviewQueue: pendingRows.length,
    newlyVerifiedFromIndependentReceipts: evidenceRows.length
  };
  for (const [key, value] of Object.entries(counts)) assert(manifest.counts?.[key] === value, `RECEIPT_ENRICHED_COUNT_MISMATCH_${key}`);
  assert(manifest.contentFingerprint === expectedFingerprint && report.artifactVersion === "short-meanings-v2-offline-report-v2", "RECEIPT_ENRICHED_MANIFEST_VERSION_MISMATCH");
  const parentDir = portable ? path.join(artifactDir, "parent-v2") : path.resolve(process.cwd(), manifest.parentArtifact?.path ?? "");
  assert(parentDir && manifest.parentArtifact?.manifestSha256 && manifest.parentArtifact?.resultSha256, "PARENT_ARTIFACT_REFERENCE_MISSING");
  const parentManifestBytes = await readFile(path.join(parentDir, "manifest.json"));
  const parentResultsBytes = await readFile(path.join(parentDir, "results.jsonl"));
  assert(sha256(parentManifestBytes) === manifest.parentArtifact.manifestSha256, "PARENT_MANIFEST_HASH_MISMATCH");
  assert(sha256(parentResultsBytes) === manifest.parentArtifact.resultSha256, "PARENT_RESULTS_HASH_MISMATCH");
  const parentManifest = JSON.parse(parentManifestBytes.toString("utf8"));
  const parentResults = parentResultsBytes.toString("utf8").trimEnd().split(/\r?\n/u).map((line) => JSON.parse(line));
  const currentByIdentity = new Map(results.map((row) => [row.proposalIdentity, row]));
  const parentVerified = parentResults.filter((row) => row.validationStatus === "VERIFIED");
  assert(parentVerified.length === manifest.parentArtifact.verifiedBefore && parentVerified.length === parentManifest.verifiedCount, "PARENT_VERIFIED_COUNT_MISMATCH");
  for (const prior of parentVerified) assert(JSON.stringify(currentByIdentity.get(prior.proposalIdentity)) === JSON.stringify(prior), `PREVIOUSLY_VERIFIED_ROW_CHANGED_${prior.proposalIdentity}`);
}

console.log(JSON.stringify({
  status: "OFFLINE_ARTIFACTS_VALID",
  senses: expectedCount,
  contentFingerprint: expectedFingerprint,
  verified: results.filter((row) => row.validationStatus === "VERIFIED").length,
  reviewRequired: results.filter((row) => row.validationStatus === "REVIEW_REQUIRED").length,
  unresolved: results.filter((row) => row.validationStatus === "UNRESOLVED").length,
  candidatesPendingReview: expectedCandidates.length,
  newlyVerifiedFromIndependentReceipts: isReceiptEnriched ? JSON.parse(bytes["manifest.json"].toString("utf8")).receiptEnrichment.newlyVerified : 0,
  verificationMode: portable ? "PORTABLE_BUNDLE" : "FULL_SOURCE_FILES",
  reviewReceiptFilesVerified: portable ? 0 : receiptHashes.size,
  reviewReceiptPinsBound: receiptHashes.size,
  sourceFilePinsVerified: portable ? 0 : sourceFiles.length + 1,
  sourceFilePinsRecorded: sourceFiles.length + 1,
  aiDerived: 0,
  neonWrites: 0
}, null, 2));
