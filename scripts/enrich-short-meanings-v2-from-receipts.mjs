import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyReceiptReviewedGloss } from "./short-meanings-v2-receipt-evidence.mjs";
import { resolveRepositoryPath } from "./short-meaning-v2-paths.mjs";

const inputDir = resolveRepositoryPath(process.env.SHORT_MEANING_INPUT_DIR ?? ".vocabflow-local/short-meanings-v2-final");
const outputDir = resolveRepositoryPath(process.env.SHORT_MEANING_ARTIFACT_DIR ?? "vocabflow-dataset/artifacts/short-meanings-v2-final-reviewed-v3");
const sourceRepoRoot = resolveRepositoryPath(process.env.SHORT_MEANING_SOURCE_REPO ?? ".");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => JSON.stringify(value);
const readJson = async (filename) => JSON.parse(await readFile(filename, "utf8"));

async function writeOnce(filename, content) {
  try {
    const previous = await readFile(filename, "utf8");
    if (previous !== content) throw new Error(`EXISTING_ARTIFACT_DIFFERS_${path.basename(filename)}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await writeFile(filename, content, { flag: "wx" });
  }
}

const inputFiles = ["input-snapshot.json", "results.jsonl", "candidate-review-queue.jsonl", "manifest.json", "report.json", "report.md"];
const inputBytes = Object.fromEntries(await Promise.all(inputFiles.map(async (filename) => [filename, await readFile(path.join(inputDir, filename))])));
const inputManifest = JSON.parse(inputBytes["manifest.json"].toString("utf8"));
const inputReport = JSON.parse(inputBytes["report.json"].toString("utf8"));
const snapshot = JSON.parse(inputBytes["input-snapshot.json"].toString("utf8"));
const originalResults = inputBytes["results.jsonl"].toString("utf8").trimEnd().split(/\r?\n/u).map((line) => JSON.parse(line));
const snapshotByIdentity = new Map(snapshot.rows.map((row) => [row.proposalIdentity, row]));

const receiptFileHashes = new Map();
const receiptByPath = new Map();
for (const row of snapshot.rows) {
  const relativePath = row.localDockerRestoreLineage?.contentReviewReceiptPath;
  const expectedHash = row.reviewReceiptSha256;
  if (!relativePath || !expectedHash) throw new Error("CONTENT_REVIEW_RECEIPT_REFERENCE_MISSING");
  const absolutePath = path.resolve(sourceRepoRoot, relativePath);
  const relativeToRoot = path.relative(sourceRepoRoot, absolutePath);
  if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) throw new Error("CONTENT_REVIEW_RECEIPT_PATH_OUTSIDE_SOURCE_ROOT");
  const priorHash = receiptFileHashes.get(absolutePath);
  if (priorHash && priorHash !== expectedHash) throw new Error("CONTENT_REVIEW_RECEIPT_HASH_CONFLICT");
  receiptFileHashes.set(absolutePath, expectedHash);
  if (!receiptByPath.has(absolutePath)) {
    const receiptBytes = await readFile(absolutePath);
    if (sha256(receiptBytes) !== expectedHash) throw new Error(`CONTENT_REVIEW_RECEIPT_HASH_MISMATCH_${path.basename(absolutePath)}`);
    receiptByPath.set(absolutePath, JSON.parse(receiptBytes.toString("utf8")));
  }
}

const enrichedResults = [];
const reviewEvidenceRows = [];
let attemptedReviewRequired = 0;
let promoted = 0;
for (const result of originalResults) {
  if (result.validationStatus !== "REVIEW_REQUIRED") {
    enrichedResults.push(result);
    continue;
  }
  attemptedReviewRequired++;
  const source = snapshotByIdentity.get(result.proposalIdentity);
  const relativePath = source?.localDockerRestoreLineage?.contentReviewReceiptPath;
  const absolutePath = relativePath ? path.resolve(sourceRepoRoot, relativePath) : null;
  const receipt = absolutePath ? receiptByPath.get(absolutePath) : null;
  const receiptHash = absolutePath ? receiptFileHashes.get(absolutePath) : null;
  const enriched = receipt && source
    ? verifyReceiptReviewedGloss({ result, snapshotRow: source, receipt, receiptPath: relativePath, receiptSha256: receiptHash })
    : null;
  if (!enriched) {
    enrichedResults.push(result);
    continue;
  }
  promoted++;
  enrichedResults.push(enriched);
  const entry = receipt.entries.find((candidate) => candidate.proposalKey === result.proposalIdentity
    && candidate.effectiveContentHash === result.sourceContentHash);
  const candidate = result.candidateAlternatives[0];
  reviewEvidenceRows.push({
    proposalIdentity: result.proposalIdentity,
    vocabularyId: result.vocabularyId,
    sourceContentHash: result.sourceContentHash,
    candidateText: candidate.text,
    evidenceRefs: candidate.evidenceRefs,
    reviewerIdentity: entry.reviewerIdentity,
    reviewedAt: receipt.checkpointCreatedAtUtc,
    decision: entry.decision,
    receiptPath: relativePath,
    receiptSha256: receiptHash,
    finding: entry.finding,
    sourceRecords: (entry.evidence.sourceRecords ?? []).filter((sourceRecord) => sourceRecord.recordPinVerified === true)
      .map((sourceRecord) => ({ corpus: sourceRecord.corpus, recordIndex: sourceRecord.recordIndex, sourceRecordId: sourceRecord.sourceRecordId, recordEvidenceSha256: sourceRecord.recordEvidenceSha256, recordPinVerified: sourceRecord.recordPinVerified, sourceMeaningFieldRaw: sourceRecord.sourceMeaningFieldRaw }))
  });
}

if (snapshot.rowCount !== originalResults.length || originalResults.length !== 7311) throw new Error("INPUT_SENSE_COUNT_MISMATCH");
if (promoted === 0) throw new Error("NO_RECEIPT_SUPPORTED_GLOSSES_FOUND");
for (let i = 0; i < originalResults.length; i++) {
  if (originalResults[i].validationStatus === "VERIFIED" && canonicalJson(enrichedResults[i]) !== canonicalJson(originalResults[i])) {
    throw new Error(`EXISTING_VERIFIED_GLOSS_CHANGED_${originalResults[i].proposalIdentity}`);
  }
}

const resultText = `${enrichedResults.map(canonicalJson).join("\n")}\n`;
const candidateQueueRows = enrichedResults.filter((row) => row.validationStatus !== "VERIFIED" && row.candidateAlternatives.length > 0);
const candidateQueueText = `${candidateQueueRows.map(canonicalJson).join("\n")}\n`;
const reviewEvidenceText = `${reviewEvidenceRows.map(canonicalJson).join("\n")}\n`;
const pendingReviewRows = enrichedResults.filter((row) => row.validationStatus !== "VERIFIED").map((result) => {
  const source = snapshotByIdentity.get(result.proposalIdentity);
  return {
    proposalIdentity: result.proposalIdentity,
    vocabularyId: result.vocabularyId,
    contentHash: result.sourceContentHash,
    headword: result.headword,
    partOfSpeech: result.partOfSpeech,
    definitionEn: source.definitionEn,
    vietnameseExplanation: source.vietnameseExplanation,
    examples: source.examples,
    shortMeaningCandidate: result.shortMeaningVi,
    validationStatus: result.validationStatus,
    reviewReason: result.reviewReason,
    candidateAlternatives: result.candidateAlternatives,
    sourceEvidenceReferences: source.sourceEvidenceReferences,
    reviewReceiptPath: source.localDockerRestoreLineage.contentReviewReceiptPath,
    reviewReceiptSha256: source.reviewReceiptSha256
  };
});
const pendingReviewQueueText = `${pendingReviewRows.map(canonicalJson).join("\n")}\n`;
const counts = {
  total: enrichedResults.length,
  verified: enrichedResults.filter((row) => row.validationStatus === "VERIFIED").length,
  verifiedSourceGlosses: enrichedResults.filter((row) => row.validationStatus === "VERIFIED" && row.sourceType === "VERIFIED_SOURCE_GLOSS").length,
  verifiedExistingTranslations: enrichedResults.filter((row) => row.validationStatus === "VERIFIED" && row.sourceType === "EXISTING_APPROVED_TRANSLATION").length,
  reviewRequired: enrichedResults.filter((row) => row.validationStatus === "REVIEW_REQUIRED").length,
  unresolved: enrichedResults.filter((row) => row.validationStatus === "UNRESOLVED").length,
  candidatesPendingReview: candidateQueueRows.length,
  pendingReviewQueue: pendingReviewRows.length,
  newlyVerifiedFromIndependentReceipts: promoted,
  reviewRequiredCheckedAgainstReceipts: attemptedReviewRequired,
  receiptFilesVerified: receiptFileHashes.size,
  neonWrites: 0,
  aiCalls: 0
};

const reviewedManifest = {
  artifactVersion: "short-meanings-v2-offline-manifest-v2",
  target: inputManifest.target,
  rowCount: counts.total,
  sourcePins: inputManifest.sourcePins,
  runtimeEditorialProjectionFingerprint: inputManifest.runtimeEditorialProjectionFingerprint,
  contentFingerprint: inputManifest.contentFingerprint,
  snapshotFingerprint: inputManifest.snapshotFingerprint,
  snapshotSha256: inputManifest.snapshotSha256,
  resultSha256: sha256(resultText),
  candidateQueueSha256: sha256(candidateQueueText),
  pendingReviewQueueSha256: sha256(pendingReviewQueueText),
  reviewEvidenceSha256: sha256(reviewEvidenceText),
  parentArtifact: {
    path: path.relative(process.cwd(), inputDir).replaceAll("\\", "/"),
    manifestSha256: sha256(inputBytes["manifest.json"]),
    resultSha256: sha256(inputBytes["results.jsonl"]),
    verifiedBefore: inputManifest.verifiedCount
  },
  receiptEnrichment: {
    method: "single pinned source gloss + matching independent PASS receipt on exact current content hash + exact headword/POS/definition/meaning/examples + pinned source record + reviewer explicitly cites a relevant source gloss",
    newlyVerified: promoted,
    receiptFilesVerified: receiptFileHashes.size
  },
  counts,
  aiCalls: 0
};
const report = {
  ...inputReport,
  artifactVersion: "short-meanings-v2-offline-report-v2",
  parentManifestSha256: sha256(inputBytes["manifest.json"]),
  receiptEnrichment: reviewedManifest.receiptEnrichment,
  counts,
  resultSha256: reviewedManifest.resultSha256,
  candidateQueueSha256: reviewedManifest.candidateQueueSha256,
  pendingReviewQueueSha256: reviewedManifest.pendingReviewQueueSha256,
  reviewEvidenceSha256: reviewedManifest.reviewEvidenceSha256,
  neonWrites: 0,
  productionChanged: false
};
const markdown = [
  "# Short Vietnamese meanings V2 — offline receipt enrichment",
  "",
  `- Sense rows: ${counts.total}`,
  `- Content fingerprint: ${inputManifest.contentFingerprint}`,
  `- Verified before this enrichment: ${inputManifest.verifiedCount}`,
  `- New source glosses verified from existing independent PASS receipts: ${promoted}`,
  `- Verified after enrichment: ${counts.verified}`,
  `- Review required: ${counts.reviewRequired}`,
  `- Unresolved: ${counts.unresolved}`,
  `- Candidate alternatives pending review: ${counts.candidatesPendingReview}`,
  `- Existing verified rows changed: 0`,
  `- Neon writes: 0; AI calls: 0; Production changes: 0`,
  "",
  "## Promotion gate",
  "",
  "A pending single-gloss row was promoted only when the existing content review receipt was PASS for the exact current content hash; its reviewer identity, headword, POS, English definition, Vietnamese meaning, and examples matched the pinned snapshot; every source record was pin-verified; and the reviewer finding explicitly called out a relevant source gloss containing the exact candidate. Ambiguous or unsupported rows remain pending.",
  "",
  `Independent review receipts verified: ${receiptFileHashes.size}. See review-evidence.jsonl for the row-level proof references.`,
  ""
].join("\n");

const outputFiles = {
  "input-snapshot.json": inputBytes["input-snapshot.json"].toString("utf8"),
  "results.jsonl": resultText,
  "candidate-review-queue.jsonl": candidateQueueText,
  "pending-review-queue.jsonl": pendingReviewQueueText,
  "review-evidence.jsonl": reviewEvidenceText,
  "manifest.json": `${JSON.stringify(reviewedManifest)}\n`,
  "report.json": `${JSON.stringify(report, null, 2)}\n`,
  "report.md": markdown
};
await mkdir(outputDir, { recursive: true });
for (const [filename, content] of Object.entries(outputFiles)) await writeOnce(path.join(outputDir, filename), content);
const checksums = Object.entries(outputFiles).map(([filename, content]) => `${filename} ${sha256(content)}`).join("\n") + "\n";
await writeOnce(path.join(outputDir, "SHA256SUMS.txt"), checksums);

console.log(JSON.stringify({
  status: "OFFLINE_RECEIPT_ENRICHMENT_COMPLETE",
  artifactDir: outputDir,
  ...counts,
  contentFingerprint: inputManifest.contentFingerprint,
  resultSha256: reviewedManifest.resultSha256,
  neonWrites: 0,
  productionChanged: false
}, null, 2));
