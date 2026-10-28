export const REVIEW_CONTRACT_VERSION = "english-vocabulary-4600-media-review-contract-v1";
export const EXAMPLE_TEXT_NORMALIZATION = Object.freeze({
  version: "safe-punctuation-whitespace-v1",
  steps: [
    "Remove HTML tags and decode the small HTML entity set used by the source fields.",
    "Apply Unicode NFKC and lowercase.",
    "Treat punctuation as token separators, except apostrophes inside a word.",
    "Collapse whitespace and compare the complete ordered token sequence.",
    "Do not stem, translate, reorder, substitute words, or change contractions.",
  ],
});

const MAPPING_OUTCOMES = Object.freeze({
  ILLUSTRATION_IMAGE: new Set(["ACCEPT_MAPPING", "REJECT_MAPPING", "AMBIGUOUS", "NEEDS_REVIEW"]),
  WORD_PRONUNCIATION_AUDIO: new Set([
    "EXACT_SUPPORTED_LEXEME_MATCH",
    "PRONUNCIATION_VARIANT",
    "HOMOGRAPH_DIFFERENT_PRONUNCIATION",
    "AMBIGUOUS",
    "INVALID_ASSOCIATION",
    "NEEDS_REVIEW",
  ]),
  EXAMPLE_SENTENCE_AUDIO: new Set(["EXACT_TEXT_MATCH", "SAFE_NORMALIZED_MATCH", "DIFFERENT_SENTENCE", "UNRESOLVED"]),
});

const RIGHTS_STATUSES = new Set([
  "CLEARED_FOR_INTENDED_USE",
  "INTERNAL_REFERENCE_ONLY",
  "UNKNOWN_REVIEW_REQUIRED",
  "RESTRICTED",
]);
const RIGHTS_EVIDENCE_TYPES = new Set([
  "ASSET_SPECIFIC_LICENSE",
  "RIGHTS_HOLDER_PERMISSION",
  "PUBLIC_DOMAIN_RECORD",
  "RIGHTS_HOLDER_GROUP_LICENSE",
  "SOURCE_PAGE_LICENSE_NOTICE",
  "OTHER_DOCUMENTED_EVIDENCE",
]);
const CLOUDINARY_USES = new Set([
  "CLOUDINARY_PUBLIC_NONCOMMERCIAL",
  "CLOUDINARY_PUBLIC_COMMERCIAL",
  "CLOUDINARY_PRIVATE_INTERNAL",
]);
const DECK_PAGE = "https://ankivn.com/decks/4600-english-vocab-anki-vietnam/";
const CC_BY_NC = "https://creativecommons.org/licenses/by-nc/4.0/";

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">");
}

export function plainSourceText(value) {
  return decodeHtml(value).normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function safeSentenceTokens(value) {
  const text = decodeHtml(value).normalize("NFKC").toLocaleLowerCase("und");
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

export function classifyExampleText(source, target) {
  const left = plainSourceText(source);
  const right = plainSourceText(target);
  if (!left || !right) return "UNRESOLVED";
  if (left === right) return "EXACT_TEXT_MATCH";
  const leftTokens = safeSentenceTokens(left);
  const rightTokens = safeSentenceTokens(right);
  if (leftTokens.length > 0 && leftTokens.length === rightTokens.length && leftTokens.every((token, index) => token === rightTokens[index])) {
    return "SAFE_NORMALIZED_MATCH";
  }
  return "DIFFERENT_SENTENCE";
}

export function isMappingOutcomeAllowed(mediaKind, outcome) {
  return Boolean(MAPPING_OUTCOMES[mediaKind]?.has(outcome));
}

export function isIdempotentReplay(existingEvents, expectedEventSha256) {
  return Array.isArray(existingEvents) && existingEvents.length === 1
    && existingEvents[0]?.event_sha256 === expectedEventSha256;
}

export function buildLexemePronunciationProfiles(wordMappings, recordsById) {
  const profiles = new Map();
  for (const mapping of wordMappings) {
    const lexemeIdentity = mapping.targetLexemeIdentity;
    if (!lexemeIdentity) continue;
    const profile = profiles.get(lexemeIdentity) ?? { referenceCount: 0, notes: new Map(), posClasses: new Set() };
    profile.referenceCount += 1;
    const recordId = String(mapping.sourceNoteIdentity?.sourceRecordId ?? "");
    const note = recordsById.get(recordId);
    const ipa = plainSourceText(note?.sourceFields?.IPA ?? "");
    const noteKey = recordId || String(mapping.sourceNoteIdentity?.sourceNoteGuid ?? "");
    if (noteKey && !profile.notes.has(noteKey)) profile.notes.set(noteKey, {
      sourceRecordId: recordId || null,
      sourceNoteGuid: mapping.sourceNoteIdentity?.sourceNoteGuid ?? null,
      recordEvidenceSha256: mapping.sourceNoteIdentity?.recordEvidenceSha256 ?? null,
      ipa,
      sourceIpaSha256: mapping.mappingEvidence?.sourceIpaSha256 ?? null,
    });
    for (const partOfSpeech of mapping.mappingEvidence?.sourcePosClasses ?? []) {
      if (partOfSpeech) profile.posClasses.add(String(partOfSpeech));
    }
    profiles.set(lexemeIdentity, profile);
  }
  return new Map([...profiles].map(([lexemeIdentity, profile]) => {
    const notes = [...profile.notes.values()].sort((left, right) => String(left.sourceRecordId).localeCompare(String(right.sourceRecordId)));
    const forms = new Map();
    for (const note of notes) {
      if (!note.ipa) continue;
      const existing = forms.get(note.ipa) ?? { ipa: note.ipa, sourceIpaSha256: note.sourceIpaSha256, sourceNotes: [] };
      existing.sourceNotes.push({ sourceRecordId: note.sourceRecordId, sourceNoteGuid: note.sourceNoteGuid,
        recordEvidenceSha256: note.recordEvidenceSha256 });
      forms.set(note.ipa, existing);
    }
    const pronunciationForms = [...forms.values()].sort((left, right) => left.ipa.localeCompare(right.ipa));
    const posClasses = [...profile.posClasses].sort();
    const reviewSignal = pronunciationForms.length > 1 ? "MULTIPLE_SOURCE_IPA_FORMS_REVIEW"
      : posClasses.length > 1 ? "MULTIPLE_POS_SHARED_IPA_REVIEW" : pronunciationForms.length === 1 ? "SINGLE_SOURCE_IPA_FORM" : "SOURCE_IPA_MISSING";
    return [lexemeIdentity, { lexemeIdentity, referenceCount: profile.referenceCount, sourceNoteCount: notes.length,
      posClasses, pronunciationForms, reviewSignal }];
  }));
}

export function validateMappingDecision(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "DECISION_BODY_INVALID" };
  if (!/^[0-9a-f]{64}$/.test(String(input.mappingKey ?? ""))) return { ok: false, reason: "MAPPING_KEY_INVALID" };
  if (!/^[0-9a-f]{64}$/.test(String(input.mediaSha256 ?? ""))) return { ok: false, reason: "MEDIA_HASH_INVALID" };
  if (!isMappingOutcomeAllowed(input.mediaKind, input.outcome)) return { ok: false, reason: "MAPPING_OUTCOME_INVALID" };
  if (input.mediaKind === "ILLUSTRATION_IMAGE" && input.outcome === "ACCEPT_MAPPING"
    && (!String(input.targetSenseProposalKey ?? "") || !/^[0-9a-f]{64}$/.test(String(input.targetContentFingerprint ?? "")))) {
    return { ok: false, reason: "IMAGE_ACCEPT_REQUIRES_PINNED_EFFECTIVE_SENSE" };
  }
  if (input.mediaKind === "WORD_PRONUNCIATION_AUDIO" && input.outcome !== "NEEDS_REVIEW"
    && input.outcome !== "AMBIGUOUS" && input.outcome !== "INVALID_ASSOCIATION"
    && !String(input.targetLexemeIdentity ?? "")) return { ok: false, reason: "WORD_AUDIO_REQUIRES_LEXEME" };
  if (input.mediaKind === "EXAMPLE_SENTENCE_AUDIO" && ["EXACT_TEXT_MATCH", "SAFE_NORMALIZED_MATCH"].includes(input.outcome)
    && (!String(input.targetExampleKey ?? "") || !String(input.targetSenseProposalKey ?? "") || !/^[0-9a-f]{64}$/.test(String(input.targetContentFingerprint ?? "")))) {
    return { ok: false, reason: "EXAMPLE_MATCH_REQUIRES_PINNED_TARGET_EXAMPLE" };
  }
  return { ok: true };
}

export function validateRightsDecision(input, group) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "RIGHTS_BODY_INVALID" };
  const status = String(input.rightsStatus ?? "");
  const evidenceType = String(input.evidenceType ?? "");
  const evidenceUrl = String(input.evidenceUrl ?? "").trim();
  const rightsHolder = String(input.rightsHolder ?? "").trim();
  const intendedUse = String(input.intendedUse ?? "");
  const scope = input.scope === "GROUP" ? "GROUP" : input.scope === "ASSET" ? "ASSET" : "";
  if (!RIGHTS_STATUSES.has(status)) return { ok: false, reason: "RIGHTS_STATUS_INVALID" };
  if (!RIGHTS_EVIDENCE_TYPES.has(evidenceType)) return { ok: false, reason: "RIGHTS_EVIDENCE_TYPE_INVALID" };
  if (!scope || (scope === "GROUP" && (!group?.evidenceGroupId || !/^[0-9a-f]{64}$/.test(String(input.evidenceGroupId ?? ""))
    || input.evidenceGroupId !== group.evidenceGroupId))) return { ok: false, reason: "RIGHTS_SCOPE_INVALID" };
  if (status === "CLEARED_FOR_INTENDED_USE") {
    let parsedUrl;
    try { parsedUrl = new URL(evidenceUrl); } catch { return { ok: false, reason: "CLEARANCE_REQUIRES_EVIDENCE_URL" }; }
    if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password || !rightsHolder || !CLOUDINARY_USES.has(intendedUse)) {
      return { ok: false, reason: "CLEARANCE_EVIDENCE_INCOMPLETE" };
    }
    if (evidenceType === "SOURCE_PAGE_LICENSE_NOTICE" || parsedUrl.href.replace(/\/$/u, "") === DECK_PAGE.replace(/\/$/u, "")
      || parsedUrl.href.replace(/\/$/u, "") === CC_BY_NC.replace(/\/$/u, "")) {
      return { ok: false, reason: "PAGE_LEVEL_LICENSE_CANNOT_CLEAR_SOURCE_ASSETS" };
    }
    if (scope === "GROUP" && evidenceType !== "RIGHTS_HOLDER_GROUP_LICENSE") return { ok: false, reason: "GROUP_CLEARANCE_REQUIRES_GROUP_LICENSE" };
    if (scope === "ASSET" && evidenceType === "RIGHTS_HOLDER_GROUP_LICENSE") return { ok: false, reason: "GROUP_LICENSE_REQUIRES_GROUP_SCOPE" };
  }
  if (status !== "CLEARED_FOR_INTENDED_USE" && evidenceUrl) {
    try {
      const parsedUrl = new URL(evidenceUrl);
      if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) return { ok: false, reason: "EVIDENCE_URL_INVALID" };
    } catch { return { ok: false, reason: "EVIDENCE_URL_INVALID" }; }
  }
  if (String(input.reviewerNote ?? "").length > 2000) return { ok: false, reason: "REVIEWER_NOTE_TOO_LONG" };
  if (status !== "CLEARED_FOR_INTENDED_USE" && intendedUse && !CLOUDINARY_USES.has(intendedUse)) return { ok: false, reason: "INTENDED_USE_INVALID" };
  return { ok: true, normalized: { status, evidenceType, evidenceUrl, rightsHolder, intendedUse, scope } };
}

export function buildReadinessSets({ assets, mappings, mappingDecisions, rightsDecisions, rightsLedger }) {
  const currentMapping = new Map(mappingDecisions.map((row) => [row.mappingKey, row]));
  const perAssetRights = new Map(rightsDecisions.filter((row) => row.mediaSha256).map((row) => [row.mediaSha256, row]));
  const groupRights = new Map(rightsDecisions.filter((row) => row.evidenceGroupId).map((row) => [row.evidenceGroupId, row]));
  const assetGroup = new Map(rightsLedger.assets.map((row) => [row.mediaSha256, row.evidenceGroupId]));
  const refsByHash = new Map();
  for (const mapping of mappings) {
    if (!refsByHash.has(mapping.mediaSha256)) refsByHash.set(mapping.mediaSha256, []);
    refsByHash.get(mapping.mediaSha256).push(mapping);
  }
  const candidates = [];
  const blocked = [];
  for (const asset of assets) {
    const refs = refsByHash.get(asset.media_sha256) ?? [];
    const groupId = assetGroup.get(asset.media_sha256);
    const specific = perAssetRights.get(asset.media_sha256);
    const grouped = groupId ? groupRights.get(groupId) : null;
    const rights = specific && (!grouped || specific.reviewedAt >= grouped.reviewedAt) ? specific : grouped;
    const accepted = refs.filter((mapping) => {
      const decision = currentMapping.get(mapping.mappingKey);
      return decision && ["ACCEPT_MAPPING", "EXACT_SUPPORTED_LEXEME_MATCH", "PRONUNCIATION_VARIANT", "EXACT_TEXT_MATCH", "SAFE_NORMALIZED_MATCH"].includes(decision.outcome);
    });
    const allReviewed = refs.every((mapping) => currentMapping.has(mapping.mappingKey));
    const rightsCleared = rights?.rightsStatus === "CLEARED_FOR_INTENDED_USE"
      && ["CLOUDINARY_PUBLIC_NONCOMMERCIAL", "CLOUDINARY_PUBLIC_COMMERCIAL"].includes(rights.intendedUse);
    const item = { mediaSha256: asset.media_sha256, mediaKind: asset.media_kind, mappingReferenceCount: refs.length,
      acceptedMappingCount: accepted.length, rightsStatus: rights?.rightsStatus ?? asset.rights_status,
      intendedUse: rights?.intendedUse ?? null, evidenceGroupId: groupId ?? null };
    if (rightsCleared && accepted.length > 0 && allReviewed) candidates.push(item);
    else blocked.push({ ...item, blockedReasons: [
      ...(!rightsCleared ? [rights?.rightsStatus === "RESTRICTED" ? "RIGHTS_RESTRICTED" : "RIGHTS_NOT_CLEARED_FOR_CLOUDINARY_USE"] : []),
      ...(accepted.length === 0 ? ["NO_ACCEPTED_MAPPING"] : []),
      ...(accepted.length > 0 && !allReviewed ? ["MAPPING_REVIEW_INCOMPLETE"] : []),
    ] });
  }
  return { cloudinaryEligible: candidates, blockedAssets: blocked };
}
