import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveRepositoryPath } from "./short-meaning-v2-paths.mjs";

const expected = {
  projectId: "silent-sky-84582895",
  branchId: "br-cold-shadow-a17yg4k2",
  database: "neondb",
  count: 7311,
  contentFingerprint: "9abf453175f3cb48fdf46c779e6bdcbb5cad8ba659df3321893a777a539cb367"
};
const outputDir = resolveRepositoryPath(process.env.SHORT_MEANING_ARTIFACT_DIR ?? ".vocabflow-local/short-meanings-v2-final");
const sourceRoot = resolveRepositoryPath(process.env.SHORT_MEANING_SOURCE_ROOT ?? "vocabflow-dataset/workspaces/full-source-inventory-dedupe");
const offlineRowsPath = resolveRepositoryPath(process.env.SHORT_MEANING_OFFLINE_ROWS ?? ".vocabflow-local/short-meanings-v2/offline-source-rows.jsonl");
const runtimeManifestPath = resolveRepositoryPath(process.env.SHORT_MEANING_RUNTIME_MANIFEST
  ?? "vocabflow-dataset/workspaces/master-v2-development-sync/development-runtime-v1/master-v2-development-runtime-snapshot-v1.json");
const runtimeManifestHashPath = `${runtimeManifestPath}.sha256`;
const dumpPath = resolveRepositoryPath(process.env.SHORT_MEANING_DEVELOPMENT_DUMP
  ?? ".vocabflow-local/backups/vocabflow-neon-v2-development-20261017.dump");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => JSON.stringify(value);
const normalize = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("vi")
  .replace(/[.,;:!?()\[\]{}"'“”‘’]/gu, " ").replace(/\s+/gu, " ").trim();
function containsWholeGloss(sourceText, glossText) {
  const source = normalize(sourceText);
  const gloss = normalize(glossText);
  if (!source || !gloss) return false;
  const escapedPhrase = gloss.split(/\s+/u).map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapedPhrase}(?:$|[^\\p{L}\\p{N}])`, "u").test(source);
}
const stripHtml = (value) => String(value ?? "")
  .replace(/<br\s*\/?\s*>/giu, " ")
  .replace(/<[^>]+>/gu, " ")
  .replace(/&nbsp;/giu, " ")
  .replace(/&amp;/giu, "&")
  .replace(/&#39;/giu, "'")
  .replace(/&quot;/giu, '"')
  .replace(/\s+/gu, " ").trim();
const words = (value) => String(value ?? "").trim().split(/\s+/u).filter(Boolean);

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

async function writeArtifactOnce(filename, content) {
  try {
    const previous = await readFile(filename, "utf8");
    assert(previous === content, `EXISTING_ARTIFACT_DIFFERS_${path.basename(filename)}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await writeFile(filename, content, { flag: "wx" });
  }
}

function mapPos(value) {
  const source = normalize(value).replace(/\./gu, "");
  const aliases = {
    NOUN: ["n", "noun", "danh tu"],
    VERB: ["v", "verb", "dong tu"],
    ADJECTIVE: ["adj", "adjective", "tinh tu"],
    ADVERB: ["adv", "adverb", "trang tu"],
    PREPOSITION: ["prep", "preposition", "gioi tu"],
    DETERMINER: ["determiner", "article", "indefinite article", "mao tu khong xac dinh"],
    PRONOUN: ["pron", "pronoun", "dai tu"],
    CONJUNCTION: ["conj", "conjunction", "lien tu"],
    INTERJECTION: ["interj", "interjection", "than tu"],
    NUMERAL: ["numeral", "number"]
  };
  return Object.entries(aliases).find(([, values]) => values.includes(source))?.[0] ?? null;
}

function isShortPhrase(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 && words(text).length <= 6 && !/[.!?;:\n\r]/u.test(text);
}

function isConciseReviewedMeaning(value) {
  const text = String(value ?? "").trim();
  if (!isShortPhrase(text)) return false;
  return !/\b(?:hoặc|và|nhưng|khi|nếu|vì|để|có thể|được dùng|dùng để|là|mà|đang|từng|đã|sẽ|theo|của)\b/iu.test(text);
}

function splitGloss(value) {
  return [...new Set(String(value ?? "").split(/[;,，；]/u).map((part) => part.trim()).filter(Boolean))];
}

function parseExampleData(record) {
  try {
    const parsed = JSON.parse(record.sourceFields?.["Example Data"] ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sourceCandidates(record, corpus) {
  const fields = record.sourceFields ?? {};
  const output = [];
  const entries = parseExampleData(record);
  for (const [entryIndex, entry] of entries.entries()) {
    const pos = mapPos(entry.pos);
    for (const [alternativeIndex, text] of splitGloss(entry.meaning_vi).entries()) {
      if (pos && isShortPhrase(text)) output.push({
        text,
        partOfSpeech: pos,
        corpus,
        sourceRecordId: String(record.sourceRecordId),
        sourceNoteGuid: record.sourceNoteGuid,
        recordEvidenceSha256: record.recordEvidenceSha256,
        recordIndex: record.recordIndex,
        sourceField: `Example Data[${entryIndex}].meaning_vi[${alternativeIndex}]`,
        sourceExamples: (entry.examples ?? []).map((example) => example.example_en).filter(Boolean)
      });
    }
  }

  if (corpus === "ENGLISH_VOCAB_4600") {
    const meaning = String(fields.Meaning ?? "");
    const translatedPart = meaning.split(/<br\s*\/?\s*>/iu).slice(1).join(" ");
    const boldTranslations = [...translatedPart.matchAll(/<b[^>]*>(.*?)<\/b>/giu)].map((match) => stripHtml(match[1]));
    const pos = (record.sourcePosValues ?? []).map(mapPos).find(Boolean) ?? mapPos(record.sourcePosRaw);
    const translated = boldTranslations.at(-1);
    if (pos && isShortPhrase(translated)) output.push({
      text: translated,
      partOfSpeech: pos,
      corpus,
      sourceRecordId: String(record.sourceRecordId),
      sourceNoteGuid: record.sourceNoteGuid,
      recordEvidenceSha256: record.recordEvidenceSha256,
      recordIndex: record.recordIndex,
      sourceField: "Meaning[after-br].bold",
      sourceExamples: []
    });
  }

  if (corpus === "OXFORD_5000") {
    const sourcePosValues = (record.sourcePosValues ?? []).map(mapPos).filter(Boolean);
    const singlePos = sourcePosValues.length === 1 ? sourcePosValues[0] : null;
    const vietnamese = stripHtml(fields.Vietnamese);
    if (singlePos) {
      for (const [alternativeIndex, text] of splitGloss(vietnamese).entries()) {
        if (isShortPhrase(text)) output.push({
          text,
          partOfSpeech: singlePos,
          corpus,
          sourceRecordId: String(record.sourceRecordId),
          sourceNoteGuid: record.sourceNoteGuid,
          recordEvidenceSha256: record.recordEvidenceSha256,
          recordIndex: record.recordIndex,
          sourceField: `Vietnamese[${alternativeIndex}]`,
          sourceExamples: []
        });
      }
    }

    const targetLabel = stripHtml(fields["Từ loại"]);
    const hasIndefiniteArticlePos = sourcePosValues.includes("DETERMINER")
      || /\b(?:indefinite article|determiner)\b/iu.test(String(record.sourcePosRaw ?? ""));
    if (hasIndefiniteArticlePos && isShortPhrase(targetLabel)) output.push({
      text: targetLabel,
      partOfSpeech: "DETERMINER",
      corpus,
      sourceRecordId: String(record.sourceRecordId),
      sourceNoteGuid: record.sourceNoteGuid,
      recordEvidenceSha256: record.recordEvidenceSha256,
      recordIndex: record.recordIndex,
      sourceField: "Từ loại",
      sourceExamples: []
    });
  }
  return output;
}

const sourceSpecificSenseSelections = new Map([
  ["EDITORIAL_2H2B:a, an:indefinite", { text: "mạo từ không xác định", corpus: "OXFORD_5000", recordIndex: 32, sourceField: "Từ loại" }],
  ["EDITORIAL_2H2B:about:around", { text: "loanh quanh", corpus: "OXFORD_5000", recordIndex: 39, sourceFieldPrefix: "Example Data[2]" }],
  ["EDITORIAL_2H2B:about:topic", { text: "về", corpus: "OXFORD_5000", recordIndex: 39, sourceFieldPrefix: "Example Data[0]" }],
  ["EDITORIAL_2H2B:age:grow-older", { text: "già đi", corpus: "OXFORD_5000", recordIndex: 307, sourceFieldPrefix: "Example Data[1]" }],
  ["EDITORIAL_2H2B:age:historical-period", { text: "thời đại", corpus: "OXFORD_5000", recordIndex: 307, sourceFieldPrefix: "Example Data[2]" }],
  ["EDITORIAL_2H2B:age:years-lived", { text: "tuổi", corpus: "OXFORD_5000", recordIndex: 307, sourceFieldPrefix: "Example Data[0]" }],
  ["EDITORIAL_2H2B:banana:fruit", { text: "quả chuối", corpus: "OXFORD_5000", recordIndex: 878, sourceField: "Vietnamese[0]" }]
]);

function verifySourceRef(row, reference, inventories, inventoryHashes) {
  const inventory = inventories[reference.corpus];
  if (!inventory) return { ok: false, reason: "SOURCE_CORPUS_NOT_AVAILABLE_OFFLINE" };
  const record = inventory.records[reference.recordIndex];
  const expectedInventoryPin = (row.sourceInventoryFilePins ?? []).find((pin) => pin.corpus === reference.corpus);
  if (!record || !expectedInventoryPin || expectedInventoryPin.sha256 !== inventoryHashes[reference.corpus]
    || String(record.sourceRecordId) !== String(reference.sourceRecordId)
    || record.sourceNoteGuid !== reference.sourceNoteGuid
    || record.recordEvidenceSha256 !== reference.recordEvidenceSha256
    || reference.verificationStatus !== "PASS_RECORD_PIN") {
    return { ok: false, reason: "SOURCE_RECORD_PIN_MISMATCH" };
  }
  if (normalize(record.normalizedHeadword ?? record.headwordText) !== normalize(row.headword)) {
    return { ok: false, reason: "SOURCE_HEADWORD_MISMATCH" };
  }
  return { ok: true, record };
}

function evidenceRef(candidate, inventoryHash) {
  return `source:${candidate.corpus}:${candidate.sourceRecordId}:${candidate.recordEvidenceSha256}:${inventoryHash}#/${candidate.sourceField}`;
}

async function main() {
  const [offlineBytes, runtimeBytes, runtimeHashSidecar, dumpBytes, oxfordBytes, vocabBytes] = await Promise.all([
    readFile(offlineRowsPath), readFile(runtimeManifestPath), readFile(runtimeManifestHashPath), readFile(dumpPath),
    readFile(path.join(sourceRoot, "oxford-normalized-inventory.json")),
    readFile(path.join(sourceRoot, "vocab4600-normalized-inventory.json"))
  ]);
  const sourceHashes = {
    offlineRowsSha256: sha256(offlineBytes),
    runtimeManifestSha256: sha256(runtimeBytes),
    developmentDumpSha256: sha256(dumpBytes),
    OXFORD_5000: sha256(oxfordBytes),
    ENGLISH_VOCAB_4600: sha256(vocabBytes)
  };
  const expectedRuntimeHash = runtimeHashSidecar.toString("utf8").trim().split(/\s+/u)[0];
  assert(sourceHashes.runtimeManifestSha256 === expectedRuntimeHash, "RUNTIME_MANIFEST_SIDECAR_HASH_MISMATCH");

  const runtime = JSON.parse(runtimeBytes.toString("utf8"));
  assert(runtime.includedSenseCount === expected.count && runtime.identities.length === expected.count, "FROZEN_RUNTIME_IDENTITY_COUNT_MISMATCH");
  const runtimeByProposal = new Map(runtime.identities.map((identity) => [identity.proposalKey, identity.contentSha256]));
  assert(runtimeByProposal.size === expected.count, "FROZEN_RUNTIME_DUPLICATE_PROPOSAL_IDENTITY");
  const rows = offlineBytes.toString("utf8").trimEnd().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
  assert(rows.length === expected.count, `OFFLINE_SOURCE_ROW_COUNT_${rows.length}`);
  rows.sort((a, b) => a.proposalIdentity.localeCompare(b.proposalIdentity));

  const rowIds = new Set();
  let identityMismatches = 0;
  let hashMismatches = 0;
  let contentMissing = 0;
  let nonPass = 0;
  for (const row of rows) {
    if (!row.proposalIdentity || rowIds.has(row.proposalIdentity)) identityMismatches++;
    rowIds.add(row.proposalIdentity);
    if (runtimeByProposal.get(row.proposalIdentity) !== row.sourceContentHash) hashMismatches++;
    if (!/^[0-9a-f]{64}$/u.test(row.sourceContentHash ?? "")) hashMismatches++;
    if (!row.headword?.trim() || !row.partOfSpeech?.trim() || !row.vietnameseExplanation?.trim() || !row.definitionEn?.trim()
      || !row.exampleEn?.trim() || !Array.isArray(row.examples) || row.examples.length === 0
      || row.examples.some((example) => !example.en?.trim() || !example.vi?.trim())) contentMissing++;
    if (row.contentReviewDecision !== "PASS" || row.editorialStatus !== "DRAFT" || row.sourceDataset !== "VOCABFLOW_MASTER_V2_DEV") nonPass++;
  }
  let frozenMissing = 0;
  for (const proposal of runtimeByProposal.keys()) if (!rowIds.has(proposal)) frozenMissing++;
  assert(identityMismatches === 0 && frozenMissing === 0, "FROZEN_IDENTITY_SET_MISMATCH");
  assert(hashMismatches === 0, "FROZEN_CONTENT_HASH_MISMATCH");
  assert(contentMissing === 0, "OFFLINE_CONTENT_FIELD_MISSING");
  assert(nonPass === 0, "OFFLINE_ROWS_NOT_PASS_DRAFT_V2");

  const contentFingerprint = sha256(canonicalJson(rows.map((row) => [row.proposalIdentity, row.sourceContentHash])));
  assert(contentFingerprint === expected.contentFingerprint, "V2_CONTENT_FINGERPRINT_MISMATCH");

  const inventories = {
    OXFORD_5000: JSON.parse(oxfordBytes.toString("utf8")),
    ENGLISH_VOCAB_4600: JSON.parse(vocabBytes.toString("utf8"))
  };
  const inventoryHashes = {
    OXFORD_5000: sourceHashes.OXFORD_5000,
    ENGLISH_VOCAB_4600: sourceHashes.ENGLISH_VOCAB_4600
  };
  const sourceStats = { references: 0, pinnedAndIdentityMatched: 0, unavailableCorpora: 0, pinOrIdentityMismatches: 0, posMismatches: 0 };
  const allResults = [];

  for (const row of rows) {
    const candidates = [];
    const verifiedRefs = [];
    for (const reference of row.sourceEvidenceReferences ?? []) {
      sourceStats.references++;
      const verified = verifySourceRef(row, reference, inventories, inventoryHashes);
      if (!verified.ok) {
        if (verified.reason === "SOURCE_CORPUS_NOT_AVAILABLE_OFFLINE") sourceStats.unavailableCorpora++;
        else sourceStats.pinOrIdentityMismatches++;
        continue;
      }
      sourceStats.pinnedAndIdentityMatched++;
      verifiedRefs.push({
        corpus: reference.corpus,
        recordIndex: reference.recordIndex,
        sourceRecordId: reference.sourceRecordId,
        sourceNoteGuid: reference.sourceNoteGuid,
        recordEvidenceSha256: reference.recordEvidenceSha256,
        inventorySha256: inventoryHashes[reference.corpus]
      });
      const possible = sourceCandidates(verified.record, reference.corpus)
        .map((candidate) => ({ ...candidate, recordIndex: reference.recordIndex }));
      const posCandidates = possible.filter((candidate) => candidate.partOfSpeech === row.partOfSpeech);
      if (possible.length > 0 && posCandidates.length === 0) sourceStats.posMismatches++;
      for (const candidate of posCandidates) {
        const key = `${normalize(candidate.text)}|${candidate.corpus}|${candidate.sourceRecordId}|${candidate.sourceField}`;
        if (!candidates.some((existing) => existing.key === key)) candidates.push({ ...candidate, key });
      }
    }

    const uniqueCandidates = new Map();
    for (const candidate of candidates) {
      const key = normalize(candidate.text);
      const existing = uniqueCandidates.get(key);
      if (!existing) uniqueCandidates.set(key, { ...candidate, evidence: [candidate] });
      else existing.evidence.push(candidate);
    }
    const candidateValues = [...uniqueCandidates.values()];
    const directMatches = candidateValues.filter((candidate) => containsWholeGloss(row.vietnameseExplanation, candidate.text));
    let selected = null;
    let sourceType = null;
    let validationStatus = "UNRESOLVED";
    let confidence = null;
    let reviewReason = "No short Vietnamese gloss was identity-pinned to this Sense in the available source notes; no gloss was generated or truncated.";
    let selectedEvidenceRef = null;

    const exactSenseSelection = sourceSpecificSenseSelections.get(row.proposalIdentity);
    if (exactSenseSelection) {
      selected = candidateValues.find((candidate) => normalize(candidate.text) === normalize(exactSenseSelection.text)
        && candidate.evidence.some((evidence) => evidence.corpus === exactSenseSelection.corpus
          && evidence.recordIndex === exactSenseSelection.recordIndex
          && (exactSenseSelection.sourceField ? evidence.sourceField === exactSenseSelection.sourceField
            : evidence.sourceField.startsWith(exactSenseSelection.sourceFieldPrefix))));
      assert(selected, `CURATED_SENSE_SOURCE_SELECTION_NOT_PINNED_${row.proposalIdentity}`);
      sourceType = "VERIFIED_SOURCE_GLOSS";
      validationStatus = "VERIFIED";
      confidence = "HIGH";
      const exactEvidence = selected.evidence.find((evidence) => evidence.corpus === exactSenseSelection.corpus
        && evidence.recordIndex === exactSenseSelection.recordIndex
        && (exactSenseSelection.sourceField ? evidence.sourceField === exactSenseSelection.sourceField
          : evidence.sourceField.startsWith(exactSenseSelection.sourceFieldPrefix)));
      selectedEvidenceRef = evidenceRef(exactEvidence, inventoryHashes[exactEvidence.corpus]);
      reviewReason = "Sense-specific offline lexical check: exact pinned source note, POS, English definition/example and source field were checked together; selection was not based on headword alone.";
    } else if (directMatches.length === 1) {
      selected = directMatches[0];
      sourceType = "VERIFIED_SOURCE_GLOSS";
      validationStatus = "VERIFIED";
      confidence = "HIGH";
      selectedEvidenceRef = evidenceRef(selected.evidence[0], inventoryHashes[selected.evidence[0].corpus]);
      reviewReason = "The pinned, POS-matched source gloss appears verbatim in this independently reviewed Vietnamese Sense content; source identity, record hash and current content hash all match.";
    } else if (directMatches.length > 1) {
      reviewReason = "More than one pinned gloss occurs in the Vietnamese explanation; no alternative was selected automatically.";
    } else if (isConciseReviewedMeaning(row.vietnameseExplanation)) {
      selected = { text: row.vietnameseExplanation.trim() };
      sourceType = "EXISTING_APPROVED_TRANSLATION";
      validationStatus = "VERIFIED";
      confidence = "HIGH";
      selectedEvidenceRef = `canonical:${row.proposalIdentity}:${row.sourceContentHash}:vietnameseExplanation:reviewReceipt=${row.reviewReceiptSha256}`;
      reviewReason = "The complete, unchanged Vietnamese translation is already a short standalone phrase on the PASS content hash; it was reused verbatim, not cut or rewritten.";
    } else if (candidateValues.length === 1) {
      selected = candidateValues[0];
      sourceType = "VERIFIED_SOURCE_GLOSS";
      validationStatus = "REVIEW_REQUIRED";
      confidence = "MEDIUM";
      selectedEvidenceRef = evidenceRef(selected.evidence[0], inventoryHashes[selected.evidence[0].corpus]);
      reviewReason = "One pinned, POS-matched source gloss is available, but the current Sense text does not contain it and the source examples do not resolve its semantic fit automatically.";
    } else if (candidateValues.length > 1) {
      reviewReason = "Multiple pinned source glosses remain possible for this Sense; alternatives are preserved for review and none is selected.";
    }

    const candidateAlternatives = candidateValues.map((candidate) => ({
      text: candidate.text,
      sourceType: "VERIFIED_SOURCE_GLOSS",
      evidenceRefs: candidate.evidence.map((evidence) => evidenceRef(evidence, inventoryHashes[evidence.corpus])),
      sourceExampleTexts: [...new Set(candidate.evidence.flatMap((evidence) => evidence.sourceExamples))]
    }));
    allResults.push({
      vocabularyId: row.vocabularyId,
      proposalIdentity: row.proposalIdentity,
      sourceContentHash: row.sourceContentHash,
      headword: row.headword,
      partOfSpeech: row.partOfSpeech,
      shortMeaningVi: validationStatus === "UNRESOLVED" ? null : selected?.text ?? null,
      sourceType,
      evidenceRef: selectedEvidenceRef,
      confidence,
      validationStatus,
      reviewerIdentity: null,
      reviewedAt: null,
      reviewEvidence: validationStatus === "VERIFIED" ? reviewReason : null,
      reviewReason,
      candidateAlternatives,
      verifiedEvidenceReferences: verifiedRefs,
      artifactVersion: "short-meanings-v2-offline-results-v1"
    });
  }

  const resultText = `${allResults.map(canonicalJson).join("\n")}\n`;
  const candidateQueueText = `${allResults.filter((result) => result.validationStatus !== "VERIFIED" && result.candidateAlternatives.length > 0)
    .map(canonicalJson).join("\n")}${allResults.some((result) => result.validationStatus !== "VERIFIED" && result.candidateAlternatives.length > 0) ? "\n" : ""}`;
  const verifiedCount = allResults.filter((result) => result.validationStatus === "VERIFIED").length;
  const sourceGlossCount = allResults.filter((result) => result.validationStatus === "VERIFIED" && result.sourceType === "VERIFIED_SOURCE_GLOSS").length;
  const existingApprovedCount = allResults.filter((result) => result.validationStatus === "VERIFIED" && result.sourceType === "EXISTING_APPROVED_TRANSLATION").length;
  const reviewRequiredCount = allResults.filter((result) => result.validationStatus === "REVIEW_REQUIRED").length;
  const unresolvedCount = allResults.filter((result) => result.validationStatus === "UNRESOLVED").length;
  const pendingCandidateCount = allResults.filter((result) => result.validationStatus !== "VERIFIED" && result.candidateAlternatives.length > 0).length;
  const verifiedWithoutEvidence = allResults.filter((result) => result.validationStatus === "VERIFIED"
    && (!result.shortMeaningVi || !result.evidenceRef || !result.sourceType || !isShortPhrase(result.shortMeaningVi))).length;
  const verifiedIdentityMismatches = allResults.filter((result) => runtimeByProposal.get(result.proposalIdentity) !== result.sourceContentHash).length;
  assert(allResults.length === expected.count && new Set(allResults.map((result) => result.proposalIdentity)).size === expected.count, "OUTPUT_IDENTITY_COVERAGE_MISMATCH");
  assert(verifiedWithoutEvidence === 0 && verifiedIdentityMismatches === 0, "VERIFIED_ROW_EVIDENCE_OR_HASH_FAILURE");

  const snapshotPayload = {
    artifactVersion: "short-meanings-v2-offline-input-v1",
    target: expected,
    sourceKind: "LOCAL_RESTORED_NEON_DEVELOPMENT_DUMP",
    runtimeEditorialProjectionFingerprint: runtime.projectionFingerprint,
    contentFingerprint,
    sourcePins: {
      developmentDumpSha256: sourceHashes.developmentDumpSha256,
      offlineRowsSha256: sourceHashes.offlineRowsSha256,
      runtimeManifestSha256: sourceHashes.runtimeManifestSha256,
      sourceInventories: {
        OXFORD_5000: sourceHashes.OXFORD_5000,
        ENGLISH_VOCAB_4600: sourceHashes.ENGLISH_VOCAB_4600
      }
    },
    rowCount: rows.length,
    rows
  };
  const snapshotFingerprint = sha256(canonicalJson(snapshotPayload));
  const manifest = {
    artifactVersion: "short-meanings-v2-offline-manifest-v1",
    target: expected,
    rowCount: allResults.length,
    sourcePins: snapshotPayload.sourcePins,
    runtimeEditorialProjectionFingerprint: runtime.projectionFingerprint,
    contentFingerprint,
    snapshotFingerprint,
    snapshotSha256: sha256(canonicalJson(snapshotPayload)),
    resultSha256: sha256(resultText),
    candidateQueueSha256: sha256(candidateQueueText),
    aiCalls: 0,
    verifiedCount,
    verifiedSourceGlosses: sourceGlossCount,
    verifiedExistingTranslations: existingApprovedCount,
    reviewRequiredCount,
    unresolvedCount,
    candidatesPendingReview: pendingCandidateCount,
    sourceReferenceStats: sourceStats,
    exactIdentityMismatches: identityMismatches,
    frozenMissingIdentities: frozenMissing,
    contentHashMismatches: hashMismatches,
    missingContentRows: contentMissing,
    nonPassRows: nonPass,
    verifiedWithoutEvidence,
    verifiedIdentityMismatches
  };
  const report = {
    ...manifest,
    developmentDumpPath: dumpPath,
    offlineRowsPath,
    runtimeManifestPath,
    sourceRoot,
    examples: Object.fromEntries(["banana", "age", "about", "a, an"].map((headword) => [headword,
      allResults.filter((result) => result.headword === headword).map((result) => ({
        proposalIdentity: result.proposalIdentity,
        partOfSpeech: result.partOfSpeech,
        shortMeaningVi: result.shortMeaningVi,
        validationStatus: result.validationStatus,
        evidenceRef: result.evidenceRef,
        reviewReason: result.reviewReason
      }))]))
  };
  const reportMarkdown = [
    "# Short Vietnamese meanings V2 — offline processing",
    "",
    `- Sense rows: ${manifest.rowCount}`,
    `- Content fingerprint: ${contentFingerprint}`,
    `- Editorial projection fingerprint: ${runtime.projectionFingerprint}`,
    `- Verified source glosses: ${sourceGlossCount}`,
    `- Reused concise PASS translations: ${existingApprovedCount}`,
    `- Review required: ${reviewRequiredCount}`,
    `- Unresolved: ${unresolvedCount}`,
    `- Rows with candidate alternatives pending review: ${pendingCandidateCount}`,
    `- AI calls: 0`,
    `- Source reference records checked: ${sourceStats.references}; exact pinned local records: ${sourceStats.pinnedAndIdentityMatched}; unavailable corpus references: ${sourceStats.unavailableCorpora}`,
    "",
    "## Regression examples",
    "",
    ...Object.entries(report.examples).flatMap(([headword, senses]) => [
      `### ${headword}`,
      ...senses.map((sense) => `- ${sense.partOfSpeech}: ${sense.shortMeaningVi ?? "UNRESOLVED"} (${sense.validationStatus}) — ${sense.proposalIdentity}`),
      ""
    ]),
    "## Validation",
    "",
    `- Stable proposal identities: ${expected.count}; duplicate/missing: ${identityMismatches + frozenMissing}`,
    `- Content hash mismatches: ${hashMismatches}`,
    `- Missing required canonical fields: ${contentMissing}`,
    `- Non-PASS/non-DRAFT rows: ${nonPass}`,
    `- Verified rows without evidence or valid short phrase: ${verifiedWithoutEvidence}`,
    "- No Neon writes; no Production access; no AI calls.",
    "- Neon `master_vocabulary_mappings` data is absent from the restored Development dump; the stable `proposalIdentity` and content hash are used as the reproducible offline identity pair."
  ].join("\n");

  await mkdir(outputDir, { recursive: true });
  await writeArtifactOnce(path.join(outputDir, "input-snapshot.json"), `${canonicalJson({ ...snapshotPayload, snapshotFingerprint })}\n`);
  await writeArtifactOnce(path.join(outputDir, "results.jsonl"), resultText);
  await writeArtifactOnce(path.join(outputDir, "candidate-review-queue.jsonl"), candidateQueueText);
  await writeArtifactOnce(path.join(outputDir, "manifest.json"), `${canonicalJson(manifest)}\n`);
  await writeArtifactOnce(path.join(outputDir, "report.json"), `${canonicalJson(report)}\n`);
  await writeArtifactOnce(path.join(outputDir, "report.md"), `${reportMarkdown}\n`);
  const checksums = [
    `input-snapshot.json ${sha256(canonicalJson({ ...snapshotPayload, snapshotFingerprint }) + "\n")}`,
    `results.jsonl ${sha256(resultText)}`,
    `candidate-review-queue.jsonl ${sha256(candidateQueueText)}`,
    `manifest.json ${sha256(canonicalJson(manifest) + "\n")}`,
    `report.json ${sha256(canonicalJson(report) + "\n")}`,
    `report.md ${sha256(`${reportMarkdown}\n`)}`
  ].join("\n") + "\n";
  await writeArtifactOnce(path.join(outputDir, "SHA256SUMS.txt"), checksums);

  console.log(JSON.stringify({
    status: "OFFLINE_COMPLETE",
    target: expected,
    contentFingerprint,
    runtimeEditorialProjectionFingerprint: runtime.projectionFingerprint,
    rows: manifest.rowCount,
    verifiedCount,
    verifiedSourceGlosses: sourceGlossCount,
    verifiedExistingTranslations: existingApprovedCount,
    reviewRequiredCount,
    unresolvedCount,
    candidatesPendingReview: pendingCandidateCount,
    sourceReferenceStats: sourceStats,
    aiCalls: 0,
    artifactDirectory: outputDir,
    resultSha256: manifest.resultSha256
  }, null, 2));
}

await main();
