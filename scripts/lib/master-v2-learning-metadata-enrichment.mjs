const CEFR_LEVELS = new Set(["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"]);
const POS_ALIASES = Object.freeze({
  ADJ: "ADJECTIVE", ADV: "ADVERB", N: "NOUN", V: "VERB", PREP: "PREPOSITION",
  PRON: "PRONOUN", CONJ: "CONJUNCTION", DET: "DETERMINER"
});

export function normalizeMetadataText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("und")
    .replace(/<[^>]*>/gu, " ").replace(/[^\p{L}\p{N}']+/gu, " ").trim().replace(/\s+/gu, " ");
}

export function normalizeMetadataPos(value) {
  const pos = normalizeMetadataText(value).replace(/\s+/gu, "_").toUpperCase();
  return POS_ALIASES[pos] ?? pos;
}

export function matchPinnedCefrEvidence({ entry, sourceProvenance, recordsByCorpus }) {
  const matches = new Map();
  const refs = sourceProvenance?.sourceEvidenceReferences ?? [];
  for (const ref of refs) {
    if (ref.verificationStatus !== "PASS_RECORD_PIN" || !recordsByCorpus[ref.corpus]
      || !ref.sourceRecordId || !ref.sourceNoteGuid || !/^[0-9a-f]{64}$/u.test(ref.recordEvidenceSha256 ?? "")) continue;
    const record = recordsByCorpus[ref.corpus].get(String(ref.sourceRecordId));
    if (!record || record.sourceNoteGuid !== ref.sourceNoteGuid
      || record.recordEvidenceSha256 !== ref.recordEvidenceSha256
      || normalizeMetadataText(record.normalizedHeadword ?? record.headwordText) !== normalizeMetadataText(entry.headword)
      || !(record.sourcePosClassesCandidate ?? []).some((value) => normalizeMetadataPos(value) === normalizeMetadataPos(entry.partOfSpeech))) continue;

    const evidence = (record.sourceCefrEvidence ?? []).flatMap((item) => {
      const value = String(item.value ?? "").trim().toUpperCase();
      if (!CEFR_LEVELS.has(value)) return [];
      return [{ value, sourceField: item.sourceField, corpus: ref.corpus,
        sourceRecordId: String(record.sourceRecordId), sourceNoteGuid: record.sourceNoteGuid,
        recordEvidenceSha256: record.recordEvidenceSha256 }];
    });
    if (evidence.length) matches.set(`${ref.corpus}:${ref.sourceRecordId}`, evidence);
  }
  return [...matches.values()].flat().sort((a, b) => a.corpus.localeCompare(b.corpus)
    || a.sourceRecordId.localeCompare(b.sourceRecordId) || a.sourceField.localeCompare(b.sourceField));
}

export function resolveCefr({ baselineCefr, evidence }) {
  const byCorpus = (corpus) => [...new Set(evidence.filter((item) => item.corpus === corpus).map((item) => item.value))].sort();
  const oxfordValues = byCorpus("OXFORD_5000");
  const vocab4600Values = byCorpus("ENGLISH_VOCAB_4600");
  if (baselineCefr) {
    if (oxfordValues.length !== 1 || oxfordValues[0] !== baselineCefr.value) {
      throw new Error("BASELINE_OXFORD_CEFR_EVIDENCE_MISMATCH");
    }
    const conflicts = vocab4600Values.filter((value) => value !== baselineCefr.value);
    return {
      value: baselineCefr.value,
      status: "SOURCE_VERIFIED",
      authority: "EXISTING_OXFORD_PINNED_BASELINE",
      evidence: evidence.filter((item) => item.corpus === "OXFORD_5000" && item.value === baselineCefr.value),
      corroboratingEvidence: evidence.filter((item) => item.corpus === "ENGLISH_VOCAB_4600" && item.value === baselineCefr.value),
      secondarySourceConflicts: conflicts.length
        ? evidence.filter((item) => item.corpus === "ENGLISH_VOCAB_4600" && conflicts.includes(item.value)) : []
    };
  }

  if (!vocab4600Values.length) return { value: null, status: "UNKNOWN", reason: "NO_MATCHED_VOCAB4600_CEFR_EVIDENCE", evidence: [] };
  if (vocab4600Values.length !== 1) return { value: null, status: "UNKNOWN", reason: "CONFLICTING_VOCAB4600_CEFR_EVIDENCE", evidence };
  const value = vocab4600Values[0];
  const allValues = [...new Set(evidence.map((item) => item.value))];
  if (allValues.length !== 1 || allValues[0] !== value) {
    return { value: null, status: "UNKNOWN", reason: "CONFLICTING_PINNED_SOURCE_CEFR_EVIDENCE", evidence };
  }
  return {
    value, status: "SOURCE_VERIFIED", authority: "PINNED_VOCAB4600_TAG_WHERE_BASELINE_WAS_UNKNOWN",
    evidence, corroboratingEvidence: [], secondarySourceConflicts: []
  };
}

export function deriveDifficulty(cefr) {
  const level = cefr?.value;
  const values = {
    PRE_A1: "FOUNDATION", A1: "FOUNDATION", A2: "BASIC", B1: "INTERMEDIATE",
    B2: "UPPER_INTERMEDIATE", C1: "ADVANCED", C2: "PROFICIENT"
  };
  return level && values[level]
    ? { value: values[level], status: "DERIVED", method: "CEFR_ORDERED_PROXY_V1",
        sourceCefr: level, calibration: "PROXY_NOT_INDEPENDENTLY_CALIBRATED" }
    : { value: null, status: "UNKNOWN", reason: "NO_UNAMBIGUOUS_SOURCE_VERIFIED_CEFR" };
}
