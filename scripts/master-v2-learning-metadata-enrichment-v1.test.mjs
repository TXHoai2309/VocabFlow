import test from "node:test";
import assert from "node:assert/strict";
import { deriveDifficulty, matchPinnedCefrEvidence, normalizeMetadataPos, resolveCefr } from "./lib/master-v2-learning-metadata-enrichment.mjs";

const record = {
  sourceRecordId: "4600-1",
  sourceNoteGuid: "note-guid",
  recordEvidenceSha256: "a".repeat(64),
  normalizedHeadword: "tear",
  sourcePosClassesCandidate: ["VERB"],
  sourceCefrEvidence: [
    { value: "B2", sourceField: "noteTag" },
    { value: "B2", sourceField: "deck:4600 English Vocab::B2" }
  ]
};
const entry = { headword: "Tear", partOfSpeech: "VERB" };
const validRef = {
  corpus: "ENGLISH_VOCAB_4600", sourceRecordId: "4600-1", sourceNoteGuid: "note-guid",
  recordEvidenceSha256: "a".repeat(64), verificationStatus: "PASS_RECORD_PIN"
};

test("exact pinned CEFR evidence requires record, hash, headword, and POS match", () => {
  const evidence = matchPinnedCefrEvidence({ entry,
    sourceProvenance: { sourceEvidenceReferences: [validRef] },
    recordsByCorpus: { ENGLISH_VOCAB_4600: new Map([["4600-1", record]]) }
  });
  assert.equal(evidence.length, 2);
  assert.equal(new Set(evidence.map((item) => item.value)).size, 1);
  assert.equal(normalizeMetadataPos("verb"), "VERB");
});

test("unverified or mismatched source references produce no evidence", () => {
  const badRefs = [
    { ...validRef, verificationStatus: "UNKNOWN" },
    { ...validRef, sourceNoteGuid: "wrong-note" },
    { ...validRef, recordEvidenceSha256: "b".repeat(64) }
  ];
  const evidence = matchPinnedCefrEvidence({ entry,
    sourceProvenance: { sourceEvidenceReferences: badRefs },
    recordsByCorpus: { ENGLISH_VOCAB_4600: new Map([["4600-1", record]]) }
  });
  assert.deepEqual(evidence, []);
});

test("existing Oxford assignment stays primary and secondary disagreement is retained", () => {
  const evidence = [
    { value: "A2", corpus: "OXFORD_5000", sourceRecordId: "ox-1", sourceField: "CEFR", recordEvidenceSha256: "c".repeat(64) },
    { value: "B2", corpus: "ENGLISH_VOCAB_4600", sourceRecordId: "4600-1", sourceField: "noteTag", recordEvidenceSha256: "a".repeat(64) }
  ];
  const resolved = resolveCefr({ baselineCefr: { value: "A2" }, evidence });
  assert.equal(resolved.value, "A2");
  assert.equal(resolved.status, "SOURCE_VERIFIED");
  assert.equal(resolved.authority, "EXISTING_OXFORD_PINNED_BASELINE");
  assert.equal(resolved.secondarySourceConflicts[0].value, "B2");
});

test("baseline-unknown CEFR is filled only by one consistent pinned value", () => {
  const consistent = resolveCefr({ baselineCefr: null, evidence: [
    { value: "B2", corpus: "ENGLISH_VOCAB_4600", sourceRecordId: "4600-1", sourceField: "noteTag", recordEvidenceSha256: "a".repeat(64) },
    { value: "B2", corpus: "OXFORD_5000", sourceRecordId: "ox-1", sourceField: "CEFR", recordEvidenceSha256: "c".repeat(64) }
  ] });
  assert.equal(consistent.status, "SOURCE_VERIFIED");
  assert.equal(consistent.value, "B2");
  const conflicting = resolveCefr({ baselineCefr: null, evidence: [
    { value: "A2", corpus: "OXFORD_5000", sourceRecordId: "ox-1", sourceField: "CEFR", recordEvidenceSha256: "c".repeat(64) },
    { value: "B2", corpus: "ENGLISH_VOCAB_4600", sourceRecordId: "4600-1", sourceField: "noteTag", recordEvidenceSha256: "a".repeat(64) }
  ] });
  assert.equal(conflicting.status, "UNKNOWN");
  assert.equal(conflicting.value, null);
});

test("difficulty is explicitly derived from CEFR and remains unknown without it", () => {
  assert.deepEqual(deriveDifficulty({ value: "C1", status: "SOURCE_VERIFIED" }), {
    value: "ADVANCED", status: "DERIVED", method: "CEFR_ORDERED_PROXY_V1", sourceCefr: "C1",
    calibration: "PROXY_NOT_INDEPENDENTLY_CALIBRATED"
  });
  assert.equal(deriveDifficulty({ value: null, status: "UNKNOWN" }).status, "UNKNOWN");
});
