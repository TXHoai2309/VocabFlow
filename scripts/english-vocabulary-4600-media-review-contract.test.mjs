import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReadinessSets,
  buildLexemePronunciationProfiles,
  classifyExampleText,
  isIdempotentReplay,
  isMappingOutcomeAllowed,
  safeSentenceTokens,
  validateMappingDecision,
  validateRightsDecision,
} from "./english-vocabulary-4600-media-review-contract.mjs";

test("example text matching distinguishes exact, safe punctuation/space changes, and different sentences", () => {
  assert.equal(classifyExampleText("<b>They agree.</b>", "They agree."), "EXACT_TEXT_MATCH");
  assert.equal(classifyExampleText("They, agree!", "they agree"), "SAFE_NORMALIZED_MATCH");
  assert.equal(classifyExampleText("They can't agree.", "They cant agree."), "DIFFERENT_SENTENCE");
  assert.equal(classifyExampleText("They agree.", "They agreed."), "DIFFERENT_SENTENCE");
  assert.equal(classifyExampleText(" ", "They agree."), "UNRESOLVED");
  assert.deepEqual(safeSentenceTokens("Well-known: they don't.").slice(0, 2), ["well", "known"]);
});

test("mapping outcomes are media-kind-specific and accepted targets require pinned identities", () => {
  assert.equal(isMappingOutcomeAllowed("ILLUSTRATION_IMAGE", "ACCEPT_MAPPING"), true);
  assert.equal(isMappingOutcomeAllowed("ILLUSTRATION_IMAGE", "EXACT_TEXT_MATCH"), false);
  assert.equal(validateMappingDecision({
    mappingKey: "a".repeat(64), mediaSha256: "b".repeat(64), mediaKind: "ILLUSTRATION_IMAGE",
    outcome: "ACCEPT_MAPPING", targetSenseProposalKey: "sense-1", targetContentFingerprint: "c".repeat(64),
  }).ok, true);
  assert.equal(validateMappingDecision({
    mappingKey: "a".repeat(64), mediaSha256: "b".repeat(64), mediaKind: "ILLUSTRATION_IMAGE",
    outcome: "ACCEPT_MAPPING", targetSenseProposalKey: "sense-1", targetContentFingerprint: null,
  }).reason, "IMAGE_ACCEPT_REQUIRES_PINNED_EFFECTIVE_SENSE");
  assert.equal(validateMappingDecision({
    mappingKey: "a".repeat(64), mediaSha256: "b".repeat(64), mediaKind: "EXAMPLE_SENTENCE_AUDIO",
    outcome: "SAFE_NORMALIZED_MATCH", targetSenseProposalKey: "sense-1", targetExampleKey: "sense-1:example-1",
    targetContentFingerprint: "c".repeat(64),
  }).ok, true);
});

test("page-level CC BY-NC is not sufficient asset or group clearance evidence", () => {
  const group = { evidenceGroupId: "d".repeat(64) };
  const base = { rightsStatus: "CLEARED_FOR_INTENDED_USE", evidenceType: "SOURCE_PAGE_LICENSE_NOTICE",
    evidenceUrl: "https://ankivn.com/decks/4600-english-vocab-anki-vietnam/", rightsHolder: "Deck uploader",
    intendedUse: "CLOUDINARY_PUBLIC_NONCOMMERCIAL", scope: "ASSET" };
  assert.equal(validateRightsDecision(base, group).reason, "PAGE_LEVEL_LICENSE_CANNOT_CLEAR_SOURCE_ASSETS");
  assert.equal(validateRightsDecision({ ...base, evidenceType: "ASSET_SPECIFIC_LICENSE", evidenceUrl: "https://creativecommons.org/licenses/by-nc/4.0/" }, group).reason,
    "PAGE_LEVEL_LICENSE_CANNOT_CLEAR_SOURCE_ASSETS");
  assert.equal(validateRightsDecision({ ...base, evidenceType: "RIGHTS_HOLDER_PERMISSION", evidenceUrl: "https://rights.example/asset/1" }, group).ok, true);
  assert.equal(validateRightsDecision({ ...base, scope: "GROUP", evidenceGroupId: group.evidenceGroupId, evidenceType: "RIGHTS_HOLDER_PERMISSION", evidenceUrl: "https://rights.example/group/1" }, group).reason,
    "GROUP_CLEARANCE_REQUIRES_GROUP_LICENSE");
  assert.equal(validateRightsDecision({ ...base, scope: "GROUP", evidenceGroupId: group.evidenceGroupId, evidenceType: "RIGHTS_HOLDER_GROUP_LICENSE", evidenceUrl: "https://rights.example/group/1" }, group).ok, true);
});

test("Cloudinary candidate set requires rights, accepted mapping, and complete link review", () => {
  const assets = [{ media_sha256: "a".repeat(64), media_kind: "IMAGE", rights_status: "UNKNOWN_REVIEW_REQUIRED" }];
  const mappings = [
    { mappingKey: "1".repeat(64), mediaSha256: "a".repeat(64) },
    { mappingKey: "2".repeat(64), mediaSha256: "a".repeat(64) },
  ];
  const rightsLedger = { assets: [{ mediaSha256: "a".repeat(64), evidenceGroupId: "d".repeat(64) }] };
  const clear = { rightsStatus: "CLEARED_FOR_INTENDED_USE", intendedUse: "CLOUDINARY_PUBLIC_NONCOMMERCIAL", reviewedAt: "2026-10-15T00:00:00.000Z", mediaSha256: "a".repeat(64) };
  const partial = buildReadinessSets({ assets, mappings, mappingDecisions: [{ mappingKey: "1".repeat(64), outcome: "ACCEPT_MAPPING" }], rightsDecisions: [clear], rightsLedger });
  assert.equal(partial.cloudinaryEligible.length, 0);
  assert.ok(partial.blockedAssets[0].blockedReasons.includes("MAPPING_REVIEW_INCOMPLETE"));
  const complete = buildReadinessSets({ assets, mappings, mappingDecisions: [
    { mappingKey: "1".repeat(64), outcome: "ACCEPT_MAPPING" }, { mappingKey: "2".repeat(64), outcome: "REJECT_MAPPING" },
  ], rightsDecisions: [clear], rightsLedger });
  assert.equal(complete.cloudinaryEligible.length, 1);
  assert.equal(complete.blockedAssets.length, 0);
});

test("idempotency accepts only one stored event with the exact same payload hash", () => {
  const eventHash = "f".repeat(64);
  assert.equal(isIdempotentReplay([{ event_sha256: eventHash }], eventHash), true);
  assert.equal(isIdempotentReplay([{ event_sha256: "e".repeat(64) }], eventHash), false);
  assert.equal(isIdempotentReplay([], eventHash), false);
  assert.equal(isIdempotentReplay([{ event_sha256: eventHash }, { event_sha256: eventHash }], eventHash), false);
});

test("word-audio profile exposes distinct source IPA and shared-POS evidence without auto-accepting", () => {
  const mappings = [
    { targetLexemeIdentity: "NORMALIZED_HEADWORD:tear", sourceNoteIdentity: { sourceRecordId: "1" }, mappingEvidence: { sourcePosClasses: ["VERB"], sourceIpaSha256: "a".repeat(64) } },
    { targetLexemeIdentity: "NORMALIZED_HEADWORD:tear", sourceNoteIdentity: { sourceRecordId: "2" }, mappingEvidence: { sourcePosClasses: ["NOUN"], sourceIpaSha256: "b".repeat(64) } },
    { targetLexemeIdentity: "NORMALIZED_HEADWORD:project", sourceNoteIdentity: { sourceRecordId: "3" }, mappingEvidence: { sourcePosClasses: ["NOUN"] } },
    { targetLexemeIdentity: "NORMALIZED_HEADWORD:project", sourceNoteIdentity: { sourceRecordId: "4" }, mappingEvidence: { sourcePosClasses: ["VERB"] } },
  ];
  const notes = new Map([
    ["1", { sourceFields: { IPA: "/tɛː/" } }],
    ["2", { sourceFields: { IPA: "/tɪr/" } }],
    ["3", { sourceFields: { IPA: "/ˈprɒdʒekt/" } }],
    ["4", { sourceFields: { IPA: "/ˈprɒdʒekt/" } }],
  ]);
  const profiles = buildLexemePronunciationProfiles(mappings, notes);
  assert.equal(profiles.get("NORMALIZED_HEADWORD:tear").reviewSignal, "MULTIPLE_SOURCE_IPA_FORMS_REVIEW");
  assert.equal(profiles.get("NORMALIZED_HEADWORD:tear").pronunciationForms.length, 2);
  assert.equal(profiles.get("NORMALIZED_HEADWORD:project").reviewSignal, "MULTIPLE_POS_SHARED_IPA_REVIEW");
  assert.equal(profiles.get("NORMALIZED_HEADWORD:project").pronunciationForms.length, 1);
});
