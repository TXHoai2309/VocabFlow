const normalize = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("vi")
  .replace(/<[^>]*>/gu, " ")
  .replace(/&nbsp;/giu, " ")
  .replace(/&amp;/giu, "&")
  .replace(/\s+/gu, " ").trim();

const hasWholePhrase = (source, phrase) => {
  const normalizedSource = normalize(source);
  const normalizedPhrase = normalize(phrase);
  if (!normalizedSource || !normalizedPhrase) return false;
  const escaped = normalizedPhrase.split(/\s+/u).map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "u").test(normalizedSource);
};

export function verifyReceiptReviewedGloss({ result, snapshotRow, receipt, receiptPath, receiptSha256 }) {
  if (result.validationStatus !== "REVIEW_REQUIRED" || result.sourceType !== "VERIFIED_SOURCE_GLOSS") return null;
  if (!result.shortMeaningVi || result.candidateAlternatives?.length !== 1) return null;
  if (snapshotRow.proposalIdentity !== result.proposalIdentity
    || snapshotRow.sourceContentHash !== result.sourceContentHash
    || snapshotRow.vocabularyId !== result.vocabularyId) return null;
  if (snapshotRow.contentReviewDecision !== "PASS" || snapshotRow.editorialStatus !== "DRAFT") return null;

  const entry = receipt.entries?.find((candidate) => candidate.proposalKey === result.proposalIdentity
    && candidate.effectiveContentHash === result.sourceContentHash);
  if (!entry || entry.decision !== "PASS" || !entry.reviewerIdentity || !receipt.checkpointCreatedAtUtc) return null;
  if (!/relevant source gloss/iu.test(entry.finding ?? "")) return null;

  const evidence = entry.evidence;
  if (!evidence
    || evidence.displayForm !== snapshotRow.headword
    || evidence.partOfSpeech !== snapshotRow.partOfSpeech
    || evidence.definitionEn !== snapshotRow.definitionEn
    || evidence.meaningVi !== snapshotRow.vietnameseExplanation
    || JSON.stringify(evidence.examples ?? []) !== JSON.stringify(snapshotRow.examples ?? [])) return null;

  const pinnedSources = evidence.sourceRecords ?? [];
  if (!pinnedSources.length || pinnedSources.some((source) => source.recordPinVerified !== true)) return null;
  const candidate = result.candidateAlternatives[0];
  if (normalize(candidate.text) !== normalize(result.shortMeaningVi)) return null;
  if (!pinnedSources.some((source) => hasWholePhrase(source.sourceMeaningFieldRaw, candidate.text))) return null;

  return {
    ...result,
    sourceType: "VERIFIED_SOURCE_GLOSS",
    confidence: "HIGH",
    validationStatus: "VERIFIED",
    reviewerIdentity: entry.reviewerIdentity,
    reviewedAt: receipt.checkpointCreatedAtUtc,
    reviewEvidence: `Independent content review PASS for the exact current content hash. The reviewer checked the current English definition, Vietnamese meaning, examples, Sense fit, and explicitly cited a relevant gloss from pinned source records. Receipt: ${receiptPath} (sha256 ${receiptSha256}); source gloss evidence: ${candidate.evidenceRefs.join(", ")}.`,
    reviewReason: "A single pinned, POS-matched source gloss was independently confirmed in the PASS receipt for this exact Sense content hash, with matching headword, POS, definition, Vietnamese meaning, examples, and verified source-record pins.",
    shortMeaningReviewReceipt: {
      path: receiptPath,
      sha256: receiptSha256,
      proposalKey: entry.proposalKey,
      effectiveContentHash: entry.effectiveContentHash,
      decision: entry.decision,
      reviewerIdentity: entry.reviewerIdentity,
      reviewedAt: receipt.checkpointCreatedAtUtc,
      candidateText: candidate.text
    },
    artifactVersion: "short-meanings-v2-offline-results-v2"
  };
}
