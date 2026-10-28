import assert from "node:assert/strict";
import test from "node:test";
import { buildSenseMediaPreview } from "./english-vocabulary-4600-dev-media-resolver.mjs";
import { classifyExampleText, plainSourceText } from "./english-vocabulary-4600-media-review-contract.mjs";

const sense = {
  proposalKey: "EDITORIAL:tear-noun",
  contentFingerprint: "a".repeat(64),
  headword: "tear",
  partOfSpeech: "noun",
  examples: [{ en: "A tear rolled down her cheek." }],
};
const snapshotFingerprint = "b".repeat(64);

function row({ mappingKey, mediaKind, mediaSha256, mappingStatus, targetSenseProposalKey = sense.proposalKey,
  targetLexemeIdentity = "NORMALIZED_HEADWORD:tear", evidence = {}, targetExampleKey = null,
  targetContentFingerprint = sense.contentFingerprint, targetSnapshotFingerprint = snapshotFingerprint }) {
  return {
    mappingKey, mediaKind, mediaSha256, mappingStatus, targetSenseProposalKey, targetLexemeIdentity, targetExampleKey,
    targetContentFingerprint, targetSnapshotFingerprint,
    mappingConfidence: 1,
    sourceNoteIdentity: { sourceRecordId: mappingKey, sourceNoteGuid: `guid-${mappingKey}`, recordEvidenceSha256: "c".repeat(64) },
    mappingEvidence: { sourceNoteIdentityVerified: true, sourceLemma: "tear", sourcePosClasses: ["NOUN"], ...evidence,
      candidateProposalKeysPendingSelection: [sense.proposalKey] },
  };
}

function context(mappings, decisions, sourceFieldsById, rightsStatuses = {}, options = {}) {
  const hashes = [...new Set(mappings.map((mapping) => mapping.mediaSha256))];
  return {
    sense,
    mappings,
    decisions: new Map(Object.entries(decisions)),
    recordsById: new Map(Object.entries(sourceFieldsById).map(([id, sourceFields]) => [id, { sourceFields }])),
    assetsByHash: new Map(hashes.map((hash) => [hash, {
      media_sha256: hash,
      detected_mime_type: mappings.find((mapping) => mapping.mediaSha256 === hash)?.mediaKind === "ILLUSTRATION_IMAGE" ? "image/jpeg" : "audio/mpeg",
      rights_status: "UNKNOWN_REVIEW_REQUIRED",
    }])),
    rightsByHash: new Map(Object.entries(rightsStatuses).map(([hash, rights_status]) => [hash, { rights_status }])),
    snapshotFingerprint,
    lexemePronunciationProfiles: options.lexemePronunciationProfiles,
    includeProposed: options.includeProposed ?? false,
    classifyExampleText,
    plainSourceText,
  };
}

function decision(mapping, outcome, overrides = {}) {
  return {
    outcome,
    target_snapshot_fingerprint: snapshotFingerprint,
    target_sense_proposal_key: sense.proposalKey,
    target_content_fingerprint: sense.contentFingerprint,
    target_lexeme_identity: mapping.targetLexemeIdentity,
    target_example_key: mapping.targetExampleKey,
    ...overrides,
  };
}

test("keeps proposed images out by default and only includes a current hash-pinned proposal on request", () => {
  const proposed = row({ mappingKey: "image", mediaKind: "ILLUSTRATION_IMAGE", mediaSha256: "1".repeat(64),
    mappingStatus: "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW" });
  const pending = buildSenseMediaPreview(context([proposed], {}, { image: { Word: "tear" } }));
  assert.deepEqual(pending.images, []);
  assert.deepEqual(pending.proposedImages, []);

  const preview = buildSenseMediaPreview(context([proposed], {}, { image: { Word: "tear" } }, {}, { includeProposed: true }));
  assert.equal(preview.proposedImages.length, 1);
  assert.equal(preview.proposedImages[0].reviewStatus, "PROPOSED");
  assert.equal(preview.proposedImages[0].targetContentFingerprint, sense.contentFingerprint);
  assert.equal(preview.proposedImages[0].targetSnapshotFingerprint, snapshotFingerprint);
  assert.equal(preview.proposedImages[0].sourceContentHash, proposed.mediaSha256);
  assert.equal(preview.images.length, 0, "viewing a proposal does not accept it");

  const accepted = buildSenseMediaPreview(context([proposed], { image: decision(proposed, "ACCEPT_MAPPING") }, { image: { Word: "tear" } }));
  assert.equal(accepted.images.length, 1);
  assert.equal(accepted.images[0].rightsStatus, "UNKNOWN_REVIEW_REQUIRED");
  assert.equal(accepted.images[0].url, `/api/dev/media-review/assets/${"1".repeat(64)}/preview`);

  const stale = buildSenseMediaPreview(context([proposed], { image: decision(proposed, "ACCEPT_MAPPING", { target_content_fingerprint: "d".repeat(64) }) }, { image: { Word: "tear" } }));
  assert.deepEqual(stale.images, []);
});

test("requires an accepted exact Lexeme, POS and source pronunciation mapping; keeps IPA variants separate", () => {
  const first = row({ mappingKey: "word-1", mediaKind: "WORD_PRONUNCIATION_AUDIO", mediaSha256: "2".repeat(64),
    mappingStatus: "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION", evidence: { sourceIpaSha256: "e".repeat(64) } });
  const second = row({ mappingKey: "word-2", mediaKind: "WORD_PRONUNCIATION_AUDIO", mediaSha256: "3".repeat(64),
    mappingStatus: "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION", evidence: { sourceIpaSha256: "f".repeat(64) } });
  const mappings = [first, second];
  const accepted = buildSenseMediaPreview(context(mappings, {
    "word-1": decision(first, "PRONUNCIATION_VARIANT"),
    "word-2": decision(second, "EXACT_SUPPORTED_LEXEME_MATCH"),
  }, { "word-1": { IPA: "/tɪər/" }, "word-2": { IPA: "/tɛər/" } }));
  assert.deepEqual(accepted.wordPronunciations.map((audio) => audio.pronunciation).sort(), ["/tɛər/", "/tɪər/"]);

  const wrongPos = row({ mappingKey: "word-wrong-pos", mediaKind: "WORD_PRONUNCIATION_AUDIO", mediaSha256: "4".repeat(64),
    mappingStatus: "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION", evidence: { sourcePosClasses: ["VERB"] } });
  const blocked = buildSenseMediaPreview(context([wrongPos], { "word-wrong-pos": decision(wrongPos, "EXACT_SUPPORTED_LEXEME_MATCH") }, { "word-wrong-pos": { IPA: "/tɛər/" } }));
  assert.deepEqual(blocked.wordPronunciations, []);
});

test("shows source-verified current word proposals and keeps multi-IPA homographs in a separate selectable set", () => {
  const first = row({ mappingKey: "word-1", mediaKind: "WORD_PRONUNCIATION_AUDIO", mediaSha256: "a".repeat(64),
    mappingStatus: "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION", evidence: { sourceIpaSha256: "e".repeat(64), sourcePosClasses: ["VERB"] } });
  const second = row({ mappingKey: "word-2", mediaKind: "WORD_PRONUNCIATION_AUDIO", mediaSha256: "b".repeat(64),
    mappingStatus: "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION", evidence: { sourceIpaSha256: "f".repeat(64) } });
  const singleMapping = row({ mappingKey: "word-single", mediaKind: "WORD_PRONUNCIATION_AUDIO", mediaSha256: "c".repeat(64),
    mappingStatus: "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION" });
  const single = buildSenseMediaPreview(context([singleMapping], {}, { "word-single": { IPA: "/tɛər/" } }, {}, { includeProposed: true }));
  assert.equal(single.proposedWordPronunciations.length, 1);
  assert.equal(single.proposedWordPronunciations[0].sourceNoteIdentity.sourceRecordId, "word-single");
  assert.equal(single.proposedWordPronunciations[0].rightsStatus, "UNKNOWN_REVIEW_REQUIRED");

  const profile = { reviewSignal: "MULTIPLE_SOURCE_IPA_FORMS_REVIEW", pronunciationForms: [{ ipa: "/tɛər/" }, { ipa: "/tɪər/" }] };
  const homograph = buildSenseMediaPreview(context([first, second], {}, {
    "word-1": { IPA: "/tɛər/" }, "word-2": { IPA: "/tɪər/" },
  }, {}, { includeProposed: true, lexemePronunciationProfiles: new Map([["NORMALIZED_HEADWORD:tear", profile]]) }));
  assert.deepEqual(homograph.proposedWordPronunciations, []);
  assert.deepEqual(homograph.ambiguousWordPronunciations.map((audio) => audio.pronunciation).sort(), ["/tɛər/", "/tɪər/"]);
  assert.ok(homograph.ambiguousWordPronunciations.every((audio) => audio.reviewStatus === "PROPOSED"));
  assert.equal(homograph.ambiguousWordPronunciations.find((audio) => audio.mappingKey === "word-1").candidatePosMatchesSense, false);
});

test("does not display ambiguous images as direct Sense proposals and drops stale targets", () => {
  const ambiguous = row({ mappingKey: "ambiguous", mediaKind: "ILLUSTRATION_IMAGE", mediaSha256: "9".repeat(64),
    mappingStatus: "AMBIGUOUS_SENSE_MAPPING" });
  const stale = row({ mappingKey: "stale", mediaKind: "ILLUSTRATION_IMAGE", mediaSha256: "0".repeat(64),
    mappingStatus: "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW", targetContentFingerprint: "d".repeat(64) });
  const result = buildSenseMediaPreview(context([ambiguous, stale], {}, { ambiguous: { Word: "tear" }, stale: { Word: "tear" } }, {}, { includeProposed: true }));
  assert.deepEqual(result.proposedImages, []);
  assert.equal(result.ambiguousImages.length, 1);
  assert.equal(result.ambiguousImages[0].reviewStatus, "AMBIGUOUS_MAPPING");
});

test("attaches example audio only when the selected target sentence still matches the source contract", () => {
  const exact = row({ mappingKey: "example-exact", mediaKind: "EXAMPLE_SENTENCE_AUDIO", mediaSha256: "5".repeat(64),
    targetExampleKey: `${sense.proposalKey}:example-1` });
  const mismatch = row({ mappingKey: "example-mismatch", mediaKind: "EXAMPLE_SENTENCE_AUDIO", mediaSha256: "6".repeat(64),
    targetExampleKey: `${sense.proposalKey}:example-1` });
  const normalized = row({ mappingKey: "example-normalized", mediaKind: "EXAMPLE_SENTENCE_AUDIO", mediaSha256: "8".repeat(64),
    targetExampleKey: `${sense.proposalKey}:example-1` });
  const result = buildSenseMediaPreview(context([exact, mismatch], {
    "example-exact": decision(exact, "EXACT_TEXT_MATCH"),
    "example-mismatch": decision(mismatch, "EXACT_TEXT_MATCH"),
  }, {
    "example-exact": { Example: "A tear rolled down her cheek." },
    "example-mismatch": { Example: "Tear the paper into pieces." },
  }));
  assert.equal(result.examples[0].audio?.mediaSha256, "5".repeat(64));
  assert.equal(result.examples[0].audio?.textMatch, "EXACT_TEXT_MATCH");

  const normalizedResult = buildSenseMediaPreview(context([normalized], {
    "example-normalized": decision(normalized, "SAFE_NORMALIZED_MATCH"),
  }, { "example-normalized": { Example: "A tear rolled down, her cheek!" } }));
  assert.equal(normalizedResult.examples[0].audio?.textMatch, "SAFE_NORMALIZED_MATCH");

  const conflictingAcceptedClips = buildSenseMediaPreview(context([exact, normalized], {
    "example-exact": decision(exact, "EXACT_TEXT_MATCH"),
    "example-normalized": decision(normalized, "SAFE_NORMALIZED_MATCH"),
  }, {
    "example-exact": { Example: "A tear rolled down her cheek." },
    "example-normalized": { Example: "A tear rolled down, her cheek!" },
  }));
  assert.equal(conflictingAcceptedClips.examples[0].audio, null, "conflicting accepted clips for one example remain unresolved");
});

test("restricted assets never get preview links and unresolved rights remain visible", () => {
  const mapping = row({ mappingKey: "image", mediaKind: "ILLUSTRATION_IMAGE", mediaSha256: "7".repeat(64) });
  const restricted = buildSenseMediaPreview(context([mapping], { image: decision(mapping, "ACCEPT_MAPPING") }, { image: { Word: "tear" } }, { ["7".repeat(64)]: "RESTRICTED" }));
  assert.deepEqual(restricted.images, []);
  assert.match(restricted.rightsNotice, /UNKNOWN_REVIEW_REQUIRED is not rights clearance/);
});
