const ACCEPTED_IMAGE_OUTCOMES = new Set(["ACCEPT_MAPPING"]);
const ACCEPTED_WORD_OUTCOMES = new Set(["EXACT_SUPPORTED_LEXEME_MATCH", "PRONUNCIATION_VARIANT"]);
const ACCEPTED_EXAMPLE_OUTCOMES = new Set(["EXACT_TEXT_MATCH", "SAFE_NORMALIZED_MATCH"]);
const ACCEPTED_WORD_MAPPING_STATUSES = new Set(["MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION"]);
const PROPOSED_IMAGE_MAPPING_STATUS = "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW";
const AMBIGUOUS_IMAGE_MAPPING_STATUS = "AMBIGUOUS_SENSE_MAPPING";

function normalizedTokens(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("und")
    .replace(/<[^>]*>/gu, " ").replace(/[^\p{L}\p{N}']+/gu, " ").trim().replace(/\s+/gu, " ");
}

function normalizedPos(value) {
  const pos = normalizedTokens(value).replace(/\s+/gu, "_").toUpperCase();
  if (["ADJECTIVE", "ADJ"].includes(pos)) return "ADJ";
  if (["ADVERB", "ADV"].includes(pos)) return "ADV";
  if (["NOUN", "N"].includes(pos)) return "NOUN";
  if (["VERB", "V", "AUXILIARY_VERB", "MODAL_VERB"].includes(pos)) return "VERB";
  if (["PREPOSITION", "PREP"].includes(pos)) return "PREP";
  if (["PRONOUN", "PRON"].includes(pos)) return "PRON";
  if (["CONJUNCTION", "CONJ"].includes(pos)) return "CONJ";
  if (["DETERMINER", "DET", "ARTICLE"].includes(pos)) return "DET";
  return pos;
}

function compareStrings(left, right) {
  return left === right ? 0 : left < right ? -1 : 1;
}

function matchesSnapshot(review, snapshotFingerprint) {
  return review?.target_snapshot_fingerprint === snapshotFingerprint;
}

function matchesSense(review, sense, snapshotFingerprint) {
  return matchesSnapshot(review, snapshotFingerprint)
    && review.target_sense_proposal_key === sense.proposalKey
    && review.target_content_fingerprint === sense.contentFingerprint;
}

function candidateSenseKeys(mapping) {
  const evidence = mapping.mappingEvidence ?? {};
  return new Set([
    mapping.targetSenseProposalKey,
    ...(evidence.candidateProposalKeysPendingSelection ?? []),
    ...(evidence.effectiveSourceEvidenceProposalKeys ?? []),
    ...(evidence.mismatchCandidateProposalKeys ?? []),
  ].filter(Boolean));
}

function rightsStatusFor(sha, assetsByHash, rightsByHash) {
  const decision = rightsByHash?.get(sha);
  const status = decision?.rights_status ?? decision?.rightsStatus ?? assetsByHash.get(sha)?.rights_status;
  return status ?? "UNKNOWN_REVIEW_REQUIRED";
}

function previewableAsset(sha, assetsByHash, rightsByHash) {
  const asset = assetsByHash.get(sha);
  if (!asset) return null;
  const rightsStatus = rightsStatusFor(sha, assetsByHash, rightsByHash);
  if (rightsStatus === "RESTRICTED") return null;
  return {
    mediaSha256: sha,
    mimeType: asset.detected_mime_type,
    rightsStatus,
    url: `/api/dev/media-review/assets/${sha}/preview`,
  };
}

function candidateMedia(mapping, sourceRecord, asset, status, sense, extra = {}) {
  return {
    ...asset,
    mappingKey: mapping.mappingKey,
    mappingStatus: mapping.mappingStatus,
    mappingConfidence: mapping.mappingConfidence,
    sourceNoteIdentity: mapping.sourceNoteIdentity,
    sourceContentHash: mapping.mediaSha256,
    targetSenseProposalKey: sense.proposalKey,
    targetContentFingerprint: sense.contentFingerprint,
    targetSnapshotFingerprint: mapping.targetSnapshotFingerprint,
    targetPartOfSpeech: sense.partOfSpeech,
    reviewStatus: status,
    mappingEvidence: mapping.mappingEvidence,
    source: {
      word: sourceRecord.sourceFields?.Word ?? sourceRecord.sourceFields?.word ?? "",
      ipa: sourceRecord.sourceFields?.IPA ?? sourceRecord.sourceFields?.ipa ?? "",
      pos: sourceRecord.sourceFields?.POS ?? sourceRecord.sourceFields?.pos ?? "",
      meaning: sourceRecord.sourceFields?.Meaning ?? sourceRecord.sourceFields?.meaning ?? "",
    },
    ...extra,
  };
}

/** Build Development preview assets only from pinned source hashes and the current effective Sense snapshot. */
export function buildSenseMediaPreview({ sense, mappings, decisions, recordsById, assetsByHash, rightsByHash,
  snapshotFingerprint, classifyExampleText, plainSourceText, lexemePronunciationProfiles, includeProposed = false }) {
  const imagesByHash = new Map();
  const proposedImagesByHash = new Map();
  const ambiguousImagesByHash = new Map();
  const wordAudioByHash = new Map();
  const proposedWordAudioByHash = new Map();
  const ambiguousWordAudioByHash = new Map();
  const examplesByKey = new Map((sense.examples ?? []).map((example, index) => [`${sense.proposalKey}:example-${index + 1}`, {
    exampleKey: `${sense.proposalKey}:example-${index + 1}`,
    index,
    text: example.en ?? "",
    audio: null,
  }]));
  const exampleAudioCandidates = new Map([...examplesByKey.keys()].map((key) => [key, new Map()]));

  for (const mapping of mappings) {
    if (mapping.targetSnapshotFingerprint !== snapshotFingerprint || !mapping.mappingEvidence?.sourceNoteIdentityVerified) continue;
    const sourceRecord = recordsById.get(String(mapping.sourceNoteIdentity?.sourceRecordId));
    if (!sourceRecord) continue;
    const review = decisions.get(mapping.mappingKey);

    if (mapping.mediaKind === "ILLUSTRATION_IMAGE") {
      const targetsCurrentCandidate = candidateSenseKeys(mapping).has(sense.proposalKey);
      const directTargetHashMatches = mapping.targetSenseProposalKey === sense.proposalKey
        && mapping.targetContentFingerprint === sense.contentFingerprint;
      if (!targetsCurrentCandidate) continue;
      const asset = previewableAsset(mapping.mediaSha256, assetsByHash, rightsByHash);
      if (!asset || asset.mimeType?.startsWith("image/") !== true) continue;
      if (ACCEPTED_IMAGE_OUTCOMES.has(review?.outcome) && matchesSense(review, sense, snapshotFingerprint)) {
        imagesByHash.set(asset.mediaSha256, candidateMedia(mapping, sourceRecord, asset, "ACCEPTED", sense));
      } else if (includeProposed && !review && mapping.mappingStatus === PROPOSED_IMAGE_MAPPING_STATUS && directTargetHashMatches) {
        proposedImagesByHash.set(asset.mediaSha256, candidateMedia(mapping, sourceRecord, asset, "PROPOSED", sense));
      } else if (includeProposed && (mapping.mappingStatus === AMBIGUOUS_IMAGE_MAPPING_STATUS
        || ["AMBIGUOUS", "NEEDS_REVIEW"].includes(review?.outcome))) {
        ambiguousImagesByHash.set(asset.mediaSha256, candidateMedia(mapping, sourceRecord, asset,
          mapping.mappingStatus === AMBIGUOUS_IMAGE_MAPPING_STATUS ? "AMBIGUOUS_MAPPING" : review.outcome, sense,
        { candidateProposalKeys: [...candidateSenseKeys(mapping)] }));
      }
      continue;
    }

    if (mapping.mediaKind === "WORD_PRONUNCIATION_AUDIO") {
      const sourceLemma = normalizedTokens(mapping.mappingEvidence.sourceLemma);
      const targetLemma = normalizedTokens(sense.headword);
      const targetLexeme = `NORMALIZED_HEADWORD:${sourceLemma}`;
      const sourcePos = new Set((mapping.mappingEvidence.sourcePosClasses ?? []).map(normalizedPos));
      if (sourceLemma !== targetLemma || mapping.targetLexemeIdentity !== targetLexeme) continue;
      const profile = lexemePronunciationProfiles?.get(mapping.targetLexemeIdentity);
      const candidatePosMatchesSense = sourcePos.has(normalizedPos(sense.partOfSpeech));
      const pronunciationProfileNeedsChoice = profile?.reviewSignal?.startsWith("MULTIPLE_")
        || profile?.reviewSignal === "SOURCE_IPA_MISSING";
      if (!candidatePosMatchesSense && !(includeProposed && pronunciationProfileNeedsChoice)) continue;
      const sourceFields = sourceRecord.sourceFields ?? {};
      const pronunciation = plainSourceText(sourceFields.IPA) || "Pronunciation variant not recorded";
      const asset = previewableAsset(mapping.mediaSha256, assetsByHash, rightsByHash);
      if (!asset || asset.mimeType !== "audio/mpeg") continue;
      const details = {
        ...candidateMedia(mapping, sourceRecord, asset, "PROPOSED", sense, {
          targetLexemeIdentity: mapping.targetLexemeIdentity,
          pronunciation,
          sourceIpaSha256: mapping.mappingEvidence.sourceIpaSha256 ?? null,
          pronunciationEvidence: mapping.mappingEvidence.pronunciationEvidence ?? null,
          lexemePronunciationReviewSignal: profile?.reviewSignal ?? "SOURCE_IPA_PROFILE_MISSING",
          sourcePosClasses: [...sourcePos],
          candidatePosMatchesSense,
        }),
      };
      if (ACCEPTED_WORD_OUTCOMES.has(review?.outcome) && ACCEPTED_WORD_MAPPING_STATUSES.has(mapping.mappingStatus)
        && candidatePosMatchesSense
        && review.target_lexeme_identity === mapping.targetLexemeIdentity && matchesSnapshot(review, snapshotFingerprint)) {
        wordAudioByHash.set(asset.mediaSha256, { ...details, reviewStatus: "ACCEPTED", reviewOutcome: review.outcome });
      } else if (includeProposed && !review && ACCEPTED_WORD_MAPPING_STATUSES.has(mapping.mappingStatus)) {
        const destination = pronunciationProfileNeedsChoice || !candidatePosMatchesSense
          ? ambiguousWordAudioByHash : proposedWordAudioByHash;
        destination.set(asset.mediaSha256, details);
      } else if (includeProposed && ["AMBIGUOUS", "NEEDS_REVIEW"].includes(review?.outcome)) {
        ambiguousWordAudioByHash.set(asset.mediaSha256, { ...details, reviewStatus: review.outcome });
      }
      continue;
    }

    if (mapping.mediaKind === "EXAMPLE_SENTENCE_AUDIO") {
      if (!ACCEPTED_EXAMPLE_OUTCOMES.has(review?.outcome) || !candidateSenseKeys(mapping).has(sense.proposalKey)
        || !matchesSense(review, sense, snapshotFingerprint)) continue;
      const example = examplesByKey.get(review.target_example_key);
      if (!example) continue;
      const classification = classifyExampleText(sourceRecord.sourceFields?.Example, example.text);
      if (!ACCEPTED_EXAMPLE_OUTCOMES.has(classification) || classification !== review.outcome) continue;
      const asset = previewableAsset(mapping.mediaSha256, assetsByHash, rightsByHash);
      if (!asset || asset.mimeType !== "audio/mpeg") continue;
      exampleAudioCandidates.get(example.exampleKey).set(asset.mediaSha256, {
        ...asset,
        sourceNoteIdentity: mapping.sourceNoteIdentity,
        textMatch: classification,
        reviewOutcome: review.outcome,
      });
    }
  }

  for (const [exampleKey, candidates] of exampleAudioCandidates) {
    if (candidates.size === 1) examplesByKey.get(exampleKey).audio = candidates.values().next().value;
  }

  const ordered = (map, selector = (a, b) => compareStrings(a.pronunciation, b.pronunciation) || compareStrings(a.mediaSha256, b.mediaSha256)) => [...map.values()].sort(selector);
  return {
    proposalKey: sense.proposalKey,
    contentFingerprint: sense.contentFingerprint,
    targetSnapshotFingerprint: snapshotFingerprint,
    source: "ENGLISH_VOCAB_4600",
    rightsNotice: "APKG assets are shown only in this Development preview. UNKNOWN_REVIEW_REQUIRED is not rights clearance or publication approval.",
    previewMode: includeProposed ? "ACCEPTED_AND_PROPOSED" : "ACCEPTED_ONLY",
    images: ordered(imagesByHash, (a, b) => compareStrings(a.mediaSha256, b.mediaSha256)),
    proposedImages: ordered(proposedImagesByHash, (a, b) => compareStrings(a.mediaSha256, b.mediaSha256)),
    ambiguousImages: ordered(ambiguousImagesByHash, (a, b) => compareStrings(a.mediaSha256, b.mediaSha256)),
    wordPronunciations: ordered(wordAudioByHash),
    proposedWordPronunciations: ordered(proposedWordAudioByHash),
    ambiguousWordPronunciations: ordered(ambiguousWordAudioByHash),
    examples: [...examplesByKey.values()],
  };
}

export const devMediaResolverContract = Object.freeze({
  acceptedImageOutcomes: [...ACCEPTED_IMAGE_OUTCOMES],
  acceptedWordOutcomes: [...ACCEPTED_WORD_OUTCOMES],
  acceptedExampleOutcomes: [...ACCEPTED_EXAMPLE_OUTCOMES],
  acceptedWordMappingStatuses: [...ACCEPTED_WORD_MAPPING_STATUSES],
  proposedImageMappingStatus: PROPOSED_IMAGE_MAPPING_STATUS,
  ambiguousImageMappingStatus: AMBIGUOUS_IMAGE_MAPPING_STATUS,
});
