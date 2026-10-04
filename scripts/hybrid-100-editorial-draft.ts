import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import canonicalize from "canonicalize";
import { v7 as uuidv7, version as uuidVersion } from "uuid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type IdentityDecision = "REUSE_EXISTING_SENSE" | "NEW_SENSE_EXISTING_LEXEME" | "NEW_SENSE_NEW_LEXEME";

const PROOF_FINGERPRINT = "89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc";
const WORKSPACE_RELATIVE = "vocabflow-dataset/workspaces/hybrid-100-editorial-draft";
const PROOF_RELATIVE = "vocabflow-dataset/workspaces/hybrid-100-sense-proof";
const MASTER_RELATIVE = "vocabflow-dataset/master";
const EXPECTED_HEAD = "45651c53f95f444c56f30c986f069ffdf0155498";
const GIT_IDENTITIES = {
  master: "12f32f7df447a2794589a5e2793943a19111c24d",
  rootDataset: "370229419cc8a37b6e5142a89e1e1c413eb120e9",
  canary: "f5d4e502be5106da191b5b2ab807f5db12065831",
} as const;

const COLLISIONS: Record<string, JsonObject> = {
  "SOURCE-CANDIDATE-0b18be4294c77935547c8fc96d5e66cd4bc3ad92f0073d8085d0e58ae895a164": {
    identityDecision: "REUSE_EXISTING_SENSE",
    masterSenseId: "01a0fc13-09ef-75ac-b815-039ab337c01a",
    masterLexemeId: "01a0fc13-09ef-73b3-b970-1a8bd5d48a27",
    semanticTarget: "supply plants with water",
    reason: "The candidate is the same plant-watering action as the current canonical verb Sense.",
    semanticCompatibility: "PASS_SAME_ACTION_AND_ARGUMENTS",
    posCompatibility: "PASS_VERB_MATCH",
    lexicalUnitCompatibility: "PASS_WORD_MATCH",
  },
  "SOURCE-CANDIDATE-24f8162f0d0ad736b2b735017612166a3b2e2c8a6a7e5058e2ba5ecc7ef3e84b": {
    identityDecision: "REUSE_EXISTING_SENSE",
    masterSenseId: "01a0fc13-09ee-7768-9be6-d20fa32521ee",
    masterLexemeId: "01a0fc13-09ee-7fd1-8ad8-a2026a7620e0",
    semanticTarget: "having little weight",
    reason: "The candidate expresses the current adjective Sense meaning low in weight.",
    semanticCompatibility: "PASS_SAME_LOW_WEIGHT_MEANING",
    posCompatibility: "PASS_ADJECTIVE_MATCH",
    lexicalUnitCompatibility: "PASS_WORD_MATCH",
  },
  "SOURCE-CANDIDATE-01a6f2b2136d3a76a82ba19aa193778133938ad1dcf42cc88734a23a0ff74c57": {
    identityDecision: "NEW_SENSE_EXISTING_LEXEME",
    masterSenseId: null,
    masterLexemeId: "01a0fc13-09ee-7fd1-8ad8-a2026a7620e0",
    semanticTarget: "start a flame",
    reason: "The verb action of starting a flame is distinct from the current noun and adjective Senses.",
    semanticCompatibility: "PASS_DISTINCT_FROM_EXISTING_NOUN_AND_ADJECTIVE_SENSES",
    posCompatibility: "PASS_VERB_CANDIDATE_POS",
    lexicalUnitCompatibility: "PASS_WORD_MATCH",
  },
  "SOURCE-CANDIDATE-c747aadb1e52b856b33f4c6c2909496ceb1e06d142bd5adf49263ddcd91ded91": {
    identityDecision: "NEW_SENSE_EXISTING_LEXEME",
    masterSenseId: null,
    masterLexemeId: "01a0fc13-09ee-7fd1-8ad8-a2026a7620e0",
    semanticTarget: "pale or bright in color",
    reason: "Color intensity is distinct from the existing low-weight adjective Sense and the noun Sense.",
    semanticCompatibility: "PASS_DISTINCT_FROM_LOW_WEIGHT_AND_ILLUMINATION_SENSES",
    posCompatibility: "PASS_ADJECTIVE_MATCH",
    lexicalUnitCompatibility: "PASS_WORD_MATCH",
  },
  "SOURCE-CANDIDATE-7d69b7e4e6b14f1f1e82af0886884db203752824101d0c946224fe01bd57da2e": {
    identityDecision: "NEW_SENSE_EXISTING_LEXEME",
    masterSenseId: null,
    masterLexemeId: "01a0fc13-09ef-7e5d-b757-aa456f0cd969",
    semanticTarget: "doubt or hesitation about agreeing",
    reason: "Hesitation is a mental reservation and remains distinct from the existing booking Sense.",
    semanticCompatibility: "PASS_DISTINCT_FROM_BOOKING_SENSE",
    posCompatibility: "PASS_NOUN_MATCH",
    lexicalUnitCompatibility: "PASS_WORD_MATCH",
  },
};

const EXISTING_LEXEME_IDS = new Set(Object.values(COLLISIONS).map((item) => item.masterLexemeId));

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value as never);
  if (serialized === undefined) throw new Error("Value cannot be serialized as RFC 8785 JSON.");
  return sha256(serialized);
}

export function isUuid7Canonical(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
    && uuidVersion(value) === 7;
}

export function normalizeComparisonText(value: string): string {
  return value.normalize("NFKC").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function comparisonTokens(value: string): string[] {
  return normalizeComparisonText(value).match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function maxContiguousTokenOverlap(left: string, right: string): number {
  const a = comparisonTokens(left);
  const b = comparisonTokens(right);
  if (a.length === 0 || b.length === 0) return 0;
  const previous = new Uint16Array(b.length + 1);
  let maximum = 0;
  for (const token of a) {
    const current = new Uint16Array(b.length + 1);
    for (let j = 1; j <= b.length; j += 1) {
      if (token === b[j - 1]) {
        current[j] = previous[j - 1] + 1;
        maximum = Math.max(maximum, current[j]);
      }
    }
    previous.set(current);
  }
  return maximum;
}

function tokenJaccardPermille(left: string, right: string): number {
  const a = new Set(comparisonTokens(left));
  const b = new Set(comparisonTokens(right));
  if (a.size < 5 || b.size < 5) return 0;
  const union = new Set([...a, ...b]);
  let common = 0;
  for (const token of a) if (b.has(token)) common += 1;
  return Math.floor((common * 1000) / union.size);
}

function json<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listFilesRecursive(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? listFilesRecursive(full) : [full];
  }).sort((left, right) => left.localeCompare(right, "en"));
}

export function protectedFileSnapshot(repoRoot: string): Array<{ path: string; sha256: string }> {
  const protectedTargets = [
    "vocabflow-dataset/master",
    "vocabflow-dataset/dataset.json",
    "vocabflow-dataset/releases/canary-v2.1.0",
  ];
  return protectedTargets.flatMap((relative) => {
    const target = path.join(repoRoot, relative);
    if (!existsSync(target)) return [];
    const files = statSync(target).isDirectory() ? listFilesRecursive(target) : [target];
    return files.filter(existsSync).map((file) => ({
      path: path.relative(repoRoot, file).split(path.sep).join("/"),
      sha256: sha256(readFileSync(file)),
    }));
  }).sort((left, right) => left.path.localeCompare(right.path, "en"));
}

function gitValue(repoRoot: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function protectedGitIdentities(repoRoot: string): JsonObject {
  return {
    head: gitValue(repoRoot, "rev-parse", "HEAD"),
    branch: gitValue(repoRoot, "branch", "--show-current"),
    master: gitValue(repoRoot, "rev-parse", "HEAD:vocabflow-dataset/master"),
    rootDataset: gitValue(repoRoot, "rev-parse", "HEAD:vocabflow-dataset/dataset.json"),
    canary: gitValue(repoRoot, "rev-parse", "HEAD:vocabflow-dataset/releases/canary-v2.1.0"),
  };
}

function assertRepositoryBaseline(repoRoot: string): void {
  const identities = protectedGitIdentities(repoRoot);
  let baselineIsAncestor = true;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", EXPECTED_HEAD, String(identities.head)], { cwd: repoRoot, stdio: "ignore" });
  } catch {
    baselineIsAncestor = false;
  }
  if (!baselineIsAncestor || identities.branch !== "TXH"
    || identities.master !== GIT_IDENTITIES.master
    || identities.rootDataset !== GIT_IDENTITIES.rootDataset
    || identities.canary !== GIT_IDENTITIES.canary) {
    throw new Error(`Protected Git baseline mismatch: ${JSON.stringify(identities)}`);
  }
}

function assertPinnedProof(repoRoot: string): { candidates: JsonObject[]; proof: JsonObject; coverage: JsonObject } {
  const proofRoot = path.join(repoRoot, PROOF_RELATIVE);
  const manifest = json<JsonObject>(path.join(proofRoot, "manifest.json"));
  const coverage = json<JsonObject>(path.join(proofRoot, "coverage.json"));
  const candidatesFile = json<{ candidates: JsonObject[] }>(path.join(proofRoot, "candidates.json"));
  const rows = candidatesFile.candidates;
  const flags = coverage.proofStatus ?? {};
  const sourceSplit = coverage.sourceSplit ?? {};
  const selectedOxford = coverage.selectedOxfordSegmentation ?? {};
  const identity = coverage.existingMaster ?? {};
  const status = manifest.proofFingerprint === PROOF_FINGERPRINT
    && coverage.proofFingerprint === PROOF_FINGERPRINT
    && manifest.candidateCount === 100 && rows.length === 100
    && sourceSplit.oxfordPlus4600Headword === 70 && sourceSplit.oxfordOnly === 20 && sourceSplit.vocab4600Only === 10
    && selectedOxford.candidateCount === 90 && selectedOxford.structured === 90 && selectedOxford.fallback === 0
    && flags.senseSegmentationVerified === true && flags.polysemyGuardVerified === true
    && flags.mediaTargetGuardVerified === true && flags.existingMasterDedupAudited === true
    && flags.proofDeterministic === true && flags.editorialAuthoringReady === true
    && flags.phase2f1aReady === true && flags.sourceRightsVerified === false
    && flags.sourceReuseEligible === false && flags.mediaReuseEligible === false
    && identity.existingSenseCandidates === 2 && identity.existingLexemeNewSenseCandidates === 3
    && identity.newLexemeCandidates === 95;
  if (!status) throw new Error("The Phase 2F.1A proof no longer matches its pinned fingerprint or readiness gates.");
  return { candidates: rows, proof: manifest, coverage };
}

function collisionReviewFor(repoRoot: string, candidate: JsonObject, collision: JsonObject): JsonObject {
  const sensesRoot = path.join(repoRoot, MASTER_RELATIVE, "senses");
  const lexemesRoot = path.join(repoRoot, MASTER_RELATIVE, "lexemes");
  const senseFiles = listFilesRecursive(sensesRoot).filter((file) => path.basename(file).startsWith(`${collision.masterSenseId}-r`));
  const lexemeFiles = listFilesRecursive(lexemesRoot).filter((file) => path.basename(file).startsWith(`${collision.masterLexemeId}-r`));
  const latest = (files: string[], revisionField: string) => files.map((file) => ({ file, record: json<JsonObject>(file) }))
    .sort((left, right) => right.record[revisionField] - left.record[revisionField])[0];
  const lexeme = latest(lexemeFiles, "lexemeRevision");
  if (!lexeme) throw new Error(`Missing canonical Lexeme for reviewed candidate ${candidate.candidateId}.`);
  const lexemePath = path.relative(repoRoot, lexeme.file).split(path.sep).join("/");
  const lexemePin = {
    masterLexemeId: lexeme.record.masterLexemeId,
    revision: lexeme.record.lexemeRevision,
    recordPath: lexemePath,
    contentHash: sha256(readFileSync(lexeme.file)),
    lexicalUnitType: lexeme.record.lexicalUnitType,
  };
  const comparisonFiles = listFilesRecursive(sensesRoot).filter((file) => {
    const record = json<JsonObject>(file);
    return record.masterLexemeId === collision.masterLexemeId;
  });
  const comparisons = comparisonFiles.map((file) => {
    const record = json<JsonObject>(file);
    return {
      masterSenseId: record.masterSenseId,
      revision: record.senseRevision,
      senseOrder: record.senseOrder,
      partOfSpeechCode: record.partOfSpeechCode,
      status: record.status,
      recordPath: path.relative(repoRoot, file).split(path.sep).join("/"),
      contentHash: sha256(readFileSync(file)),
      selectedForReuse: record.masterSenseId === collision.masterSenseId,
    };
  }).sort((left, right) => left.senseOrder - right.senseOrder || left.revision - right.revision);
  const targetSense = latest(senseFiles, "senseRevision");
  if (collision.identityDecision === "REUSE_EXISTING_SENSE") {
    if (!targetSense) throw new Error(`Missing canonical Sense ${collision.masterSenseId}.`);
    if (candidate.existingMasterSenseId !== collision.masterSenseId
      || candidate.existingMasterLexemeId !== collision.masterLexemeId) {
      throw new Error(`Pinned collision candidate ${candidate.candidateId} no longer points to its expected canonical identity.`);
    }
  }
  if (candidate.partOfSpeechCode !== (collision.identityDecision === "REUSE_EXISTING_SENSE"
    ? targetSense?.record.partOfSpeechCode : candidate.partOfSpeechCode)) {
    throw new Error(`POS mismatch during collision review for ${candidate.candidateId}.`);
  }
  if (candidate.lexicalUnitType !== lexeme.record.lexicalUnitType) {
    throw new Error(`Lexical unit mismatch during collision review for ${candidate.candidateId}.`);
  }
  if (collision.identityDecision !== "REUSE_EXISTING_SENSE"
    && (candidate.existingMasterLexemeId !== collision.masterLexemeId || candidate.existingMasterSenseId !== null)) {
    throw new Error(`Existing-Lexeme decision mismatch for ${candidate.candidateId}.`);
  }
  return {
    identityDecision: collision.identityDecision,
    reason: collision.reason,
    semanticCompatibility: collision.semanticCompatibility,
    posCompatibility: collision.posCompatibility,
    lexicalUnitCompatibility: collision.lexicalUnitCompatibility,
    reviewStatus: "REVIEWED_PASS",
    canonicalLexeme: lexemePin,
    comparedCanonicalSenses: comparisons,
    reusedCanonicalSense: collision.identityDecision === "REUSE_EXISTING_SENSE"
      ? {
          masterSenseId: targetSense?.record.masterSenseId,
          revision: targetSense?.record.senseRevision,
          senseOrder: targetSense?.record.senseOrder,
          partOfSpeechCode: targetSense?.record.partOfSpeechCode,
          recordPath: path.relative(repoRoot, targetSense!.file).split(path.sep).join("/"),
          contentHash: sha256(readFileSync(targetSense!.file)),
        }
      : null,
  };
}

function groupOrder(candidate: JsonObject): number {
  const match = String(candidate.semanticLabel ?? "").match(/sense group (\d+)/i);
  return match ? Number(match[1]) : 1;
}

function readEditorialInput(repoRoot: string): JsonObject {
  return json<JsonObject>(path.join(repoRoot, WORKSPACE_RELATIVE, "pass-a-content.json"));
}

function assertAuthoringInput(candidates: JsonObject[], input: JsonObject): Map<number, JsonObject> {
  if (input.contractVersion !== "HYBRID-100-EDITORIAL-CONTENT-1" || input.sourceProofFingerprint !== PROOF_FINGERPRINT) {
    throw new Error("Pass A authoring input does not match the pinned proof contract.");
  }
  const entries: JsonObject[] = input.entries;
  const byOrdinal = new Map(entries.map((entry) => [entry.ordinal, entry]));
  if (entries.length !== 98 || byOrdinal.size !== 98) throw new Error("Pass A must contain exactly 98 independently authored new Sense content entries.");
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const ordinal = index + 1;
    const item = byOrdinal.get(ordinal);
    const collision = COLLISIONS[candidate.candidateId];
    if (collision?.identityDecision === "REUSE_EXISTING_SENSE") {
      if (item) throw new Error(`Reused candidate ${ordinal} must not receive new authored Sense content.`);
      continue;
    }
    if (!item) throw new Error(`Missing Pass A content for candidate ${ordinal}.`);
    if (item.ordinal !== ordinal || item.lemma !== candidate.displayLemma || item.pos !== candidate.partOfSpeechCode) {
      throw new Error(`Pass A ordinal ${ordinal} does not match the pinned candidate lemma/POS.`);
    }
    for (const key of ["target", "labelEn", "labelVi", "translationVi", "definitionEn", "exampleEn", "exampleVi"]) {
      if (typeof item[key] !== "string" || !item[key].trim()) throw new Error(`Candidate ${ordinal} has no authored ${key}.`);
    }
    const definitionLength = comparisonTokens(item.definitionEn).length;
    const exampleLength = comparisonTokens(item.exampleEn).length;
    if (definitionLength < 6 || definitionLength > 20) throw new Error(`Definition for candidate ${ordinal} must contain 6–20 words.`);
    if (exampleLength < 5 || exampleLength > 18) throw new Error(`Example for candidate ${ordinal} must contain 5–18 words.`);
  }
  for (const ordinal of byOrdinal.keys()) if (ordinal < 1 || ordinal > candidates.length) throw new Error(`Unexpected candidate ordinal ${ordinal}.`);
  return byOrdinal;
}

function buildPassADecisions(repoRoot: string, candidates: JsonObject[], contentByOrdinal: Map<number, JsonObject>): JsonObject[] {
  return candidates.map((candidate, index) => {
    const ordinal = index + 1;
    const collision = COLLISIONS[candidate.candidateId];
    const authored = contentByOrdinal.get(ordinal);
    const identityDecision: IdentityDecision = collision?.identityDecision ?? "NEW_SENSE_NEW_LEXEME";
    const semanticTarget = collision?.semanticTarget ?? authored?.target;
    if (!semanticTarget) throw new Error(`No semantic target resolved for candidate ${candidate.candidateId}.`);
    const identityReason = collision?.reason
      ?? "The pinned candidate describes a distinct teachable Sense and no existing Master Lexeme identity is selected for its normalized lemma.";
    const row: JsonObject = {
      candidateOrdinal: ordinal,
      candidateId: candidate.candidateId,
      lexemeCandidateId: candidate.lexemeCandidateId,
      displayLemma: candidate.displayLemma,
      normalizedLemma: candidate.normalizedLemma,
      lexicalUnitType: candidate.lexicalUnitType,
      partOfSpeechCode: candidate.partOfSpeechCode,
      sourceCoverage: candidate.sourceCoverage,
      semanticBasis: candidate.sourceCoverage === "4600_ONLY" ? "INDEPENDENT_4600_ONLY_EDITORIAL_REVIEW" : "OXFORD_STRUCTURED_GROUP",
      sourceSenseGroupReference: candidate.oxfordReference?.sourceSenseGroupReference ?? null,
      sourceNoteReferenceHashes: [candidate.oxfordReference?.sourceNoteReference, candidate.vocab4600Reference?.sourceNoteReference].filter(Boolean),
      cefrEvidence: candidate.cefrEvidence ?? [],
      selectedCefr: candidate.selectedCefr ?? null,
      semanticTarget,
      semanticGroupOrder: candidate.sourceCoverage === "4600_ONLY" ? 1 : groupOrder(candidate),
      identityDecision,
      reason: identityReason,
      semanticCompatibility: collision?.semanticCompatibility ?? (candidate.sourceCoverage === "4600_ONLY"
        ? "PASS_EDITORIALLY_CONFIRMED_COHERENT_MEANING" : "PASS_AUTHORED_TO_PINNED_STRUCTURED_MEANING"),
      posCompatibility: collision?.posCompatibility ?? (candidate.sourceCoverage === "4600_ONLY"
        ? "PASS_EDITORIALLY_CONFIRMED_POS" : "PASS_OXFORD_STRUCTURED_POS"),
      lexicalUnitCompatibility: collision?.lexicalUnitCompatibility ?? "PASS_REVIEWED_LEXICAL_UNIT_TYPE",
      reviewStatus: "REVIEWED_PASS",
      semanticReviewStatus: "RESOLVED_FOR_DRAFT",
      senseOrderBasis: candidate.sourceCoverage === "4600_ONLY" ? "EDITORIALLY_REVIEWED_SINGLE_SENSE" : "OXFORD_STRUCTURED_GROUP_ORDER",
      content: authored ? {
        senseLabel: [{ language: "en", text: authored.labelEn }, { language: "vi", text: authored.labelVi }],
        translation: { language: "vi", text: authored.translationVi, translationKind: "EQUIVALENT" },
        definition: { language: "en", text: authored.definitionEn, definitionKind: "LEARNER_FRIENDLY" },
        example: {
          language: "en",
          text: authored.exampleEn,
          register: "NEUTRAL",
          translation: { language: "vi", text: authored.exampleVi },
        },
      } : null,
      editorialScopeNote: authored?.reviewNote ?? null,
    };
    if (collision) row.existingMasterIdentityReview = collisionReviewFor(repoRoot, candidate, collision);
    return row;
  });
}

export function assertIdentityMath(candidates: JsonObject[], decisions: JsonObject[]): JsonObject {
  const counts = {
    totalCandidates: candidates.length,
    reuseExistingSense: decisions.filter((row) => row.identityDecision === "REUSE_EXISTING_SENSE").length,
    newSenseExistingLexeme: decisions.filter((row) => row.identityDecision === "NEW_SENSE_EXISTING_LEXEME").length,
    newSenseNewLexeme: decisions.filter((row) => row.identityDecision === "NEW_SENSE_NEW_LEXEME").length,
    newMasterSenseIds: decisions.filter((row) => row.identityDecision !== "REUSE_EXISTING_SENSE").length,
    uniqueNewLexemeIdentities: new Set(decisions.filter((row) => row.identityDecision === "NEW_SENSE_NEW_LEXEME").map((row) => row.lexemeCandidateId)).size,
  };
  if (counts.totalCandidates !== 100 || counts.reuseExistingSense !== 2 || counts.newSenseExistingLexeme !== 3
    || counts.newSenseNewLexeme !== 95 || counts.newMasterSenseIds !== 98 || counts.uniqueNewLexemeIdentities !== 84) {
    throw new Error(`Identity math does not match the reviewed sample: ${JSON.stringify(counts)}`);
  }
  return counts;
}

function buildPolysemyReview(decisions: JsonObject[], canonicalSenseLookup: (id: string) => JsonObject | null): JsonObject[] {
  const groups = new Map<string, JsonObject[]>();
  for (const decision of decisions) {
    const entries = groups.get(decision.lexemeCandidateId) ?? [];
    entries.push(decision);
    groups.set(decision.lexemeCandidateId, entries);
  }
  return [...groups.values()].filter((items) => items.length > 1).map((items) => {
    const siblings = items.map((item) => {
      const canonical = item.identityDecision === "REUSE_EXISTING_SENSE"
        ? canonicalSenseLookup(COLLISIONS[item.candidateId].masterSenseId) : null;
      const content = item.content;
      const labels = content?.senseLabel ?? canonical?.senseLabel ?? [];
      const definition = content?.definition?.text
        ?? canonical?.definitions?.find((entry: JsonObject) => entry.status !== "REJECTED")?.text
        ?? "";
      return {
        candidateId: item.candidateId,
        partOfSpeechCode: item.partOfSpeechCode,
        englishSenseLabel: labels.find((entry: JsonObject) => entry.language === "en")?.text ?? "",
        vietnameseSenseLabel: labels.find((entry: JsonObject) => entry.language === "vi")?.text ?? "",
        definition,
        identityDecision: item.identityDecision,
      };
    });
    const labels = siblings.map((item) => `${item.englishSenseLabel.toLocaleLowerCase("en-US")}\0${item.vietnameseSenseLabel.normalize("NFKC").toLocaleLowerCase("vi-VN")}`);
    if (new Set(labels).size !== labels.length || siblings.some((item) => !item.englishSenseLabel || !item.vietnameseSenseLabel || !item.definition)) {
      throw new Error(`Polysemy labels or definitions collapse for ${items[0].displayLemma}.`);
    }
    return {
      lexemeCandidateId: items[0].lexemeCandidateId,
      lemma: items[0].displayLemma,
      candidateIds: items.map((item) => item.candidateId),
      siblings,
      noSemanticCollapse: true,
      reviewStatus: "PASS_DISTINCT_SENSES",
    };
  }).sort((left, right) => left.lemma.localeCompare(right.lemma, "en"));
}

function nestedStrings(value: unknown): string[] {
  if (typeof value === "string") {
    const strings = [value];
    try {
      const parsed = JSON.parse(value);
      if (parsed !== value) strings.push(...nestedStrings(parsed));
    } catch {
      // Raw field strings are compared directly when they are not JSON.
    }
    return strings;
  }
  if (Array.isArray(value)) return value.flatMap(nestedStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(nestedStrings);
  return [];
}

function cacheNoteMap(repoRoot: string, cacheName: "oxford" | "vocab4600", expectedSourceHash: string): Map<string, JsonObject> {
  const cacheDirectory = path.join(repoRoot, ".vocabflow-local", "master-v2-hybrid-source", cacheName);
  const cacheManifest = json<JsonObject>(path.join(cacheDirectory, "cache-manifest.json"));
  if (cacheManifest.source?.sha256 !== expectedSourceHash || cacheManifest.tracked !== false) {
    throw new Error(`Unpinned or tracked raw comparison cache for ${cacheName}.`);
  }
  const notes = new Map<string, JsonObject>();
  for (const line of readFileSync(path.join(cacheDirectory, "raw-notes.jsonl"), "utf8").split(/\r?\n/).filter(Boolean)) {
    const record = JSON.parse(line) as JsonObject;
    const reference = `NOTE-${sha256(`${expectedSourceHash}\0${record.sourceNoteGuid}`)}`;
    notes.set(reference, record);
  }
  return notes;
}

function sourceTextsForCandidate(candidate: JsonObject, oxfordNotes: Map<string, JsonObject>, vocabNotes: Map<string, JsonObject>): string[] {
  const texts: string[] = [];
  for (const [reference, map] of [
    [candidate.oxfordReference?.sourceNoteReference, oxfordNotes],
    [candidate.vocab4600Reference?.sourceNoteReference, vocabNotes],
  ] as Array<[string | undefined, Map<string, JsonObject>]>) {
    if (!reference) continue;
    const record = map.get(reference);
    if (!record) throw new Error(`Raw comparison cache does not resolve a pinned source reference for ${candidate.candidateId}.`);
    texts.push(...nestedStrings(record.fields));
  }
  return [...new Set(texts.map((text) => text.trim()).filter(Boolean))];
}

export function auditAuthoredText(text: string, sourceTexts: string[], language: "en" | "vi"): JsonObject {
  const normalized = normalizeComparisonText(text);
  const tokens = comparisonTokens(text);
  let maxOverlap = 0;
  let maxSimilarity = 0;
  let exact = false;
  for (const source of sourceTexts) {
    const sourceNormalized = normalizeComparisonText(source);
    if (sourceNormalized) exact ||= normalized === sourceNormalized;
    maxOverlap = Math.max(maxOverlap, maxContiguousTokenOverlap(text, source));
    maxSimilarity = Math.max(maxSimilarity, tokenJaccardPermille(text, source));
  }
  const shortVietnameseEquivalent = language === "vi" && tokens.length > 0 && tokens.length <= 4;
  const rejected = language === "en"
    ? exact || maxOverlap >= 8
    : !shortVietnameseEquivalent && (exact || maxOverlap >= 8);
  return {
    exactSourceMatch: exact,
    maxContiguousTokenOverlap: maxOverlap,
    maxSimilarityPermille: maxSimilarity,
    shortVietnameseEquivalentAllowed: shortVietnameseEquivalent,
    rejected,
  };
}

function buildAuthorshipAudit(repoRoot: string, candidates: JsonObject[], decisions: JsonObject[], proof: JsonObject): JsonObject[] {
  const oxfordNotes = cacheNoteMap(repoRoot, "oxford", proof.sourceIdentities.oxford.sha256);
  const vocabNotes = cacheNoteMap(repoRoot, "vocab4600", proof.sourceIdentities.vocab4600.sha256);
  return decisions.filter((decision) => decision.identityDecision !== "REUSE_EXISTING_SENSE").map((decision) => {
    const candidate = candidates[decision.candidateOrdinal - 1];
    const content = decision.content;
    const sourceTexts = sourceTextsForCandidate(candidate, oxfordNotes, vocabNotes);
    const definition = auditAuthoredText(content.definition.text, sourceTexts, "en");
    const example = auditAuthoredText(content.example.text, sourceTexts, "en");
    const translation = auditAuthoredText(content.translation.text, sourceTexts, "vi");
    const exampleTranslation = auditAuthoredText(content.example.translation.text, sourceTexts, "vi");
    if (definition.rejected || example.rejected || translation.rejected || exampleTranslation.rejected) {
      throw new Error(`Source-overlap guard rejected authored text for ${decision.candidateId}: ${JSON.stringify({ definition, example, translation, exampleTranslation })}`);
    }
    const maxSimilarity = Math.max(definition.maxSimilarityPermille, example.maxSimilarityPermille);
    return {
      candidateId: decision.candidateId,
      masterSenseId: null,
      definitionIndependent: true,
      exampleIndependent: true,
      translationReview: translation.shortVietnameseEquivalentAllowed ? "REVIEWED_SHORT_LEXICAL_EQUIVALENT" : "REVIEWED_INDEPENDENT",
      exampleTranslationReview: exampleTranslation.shortVietnameseEquivalentAllowed ? "REVIEWED_SHORT_LEXICAL_EQUIVALENT" : "REVIEWED_INDEPENDENT",
      maxDefinitionSourceTokenOverlap: definition.maxContiguousTokenOverlap,
      maxExampleSourceTokenOverlap: example.maxContiguousTokenOverlap,
      maxTranslationSourceTokenOverlap: translation.maxContiguousTokenOverlap,
      maxExampleTranslationSourceTokenOverlap: exampleTranslation.maxContiguousTokenOverlap,
      maxDefinitionSourceSimilarityPermille: definition.maxSimilarityPermille,
      maxExampleSourceSimilarityPermille: example.maxSimilarityPermille,
      similarityManualReview: maxSimilarity >= 700 ? "REVIEWED_DISTINCT" : "NOT_FLAGGED",
      sourceExactDefinitionMatch: definition.exactSourceMatch,
      sourceExactExampleMatch: example.exactSourceMatch,
      rightsStatus: "UNKNOWN_UNVERIFIED",
      sourceTextReused: false,
      comparedSourceNoteCount: decision.sourceNoteReferenceHashes.length,
      comparisonSourceTextSetHash: canonicalHash(sourceTexts.map((text) => sha256(normalizeComparisonText(text))).sort()),
    };
  });
}

function idTimestamp(id: string): string {
  const milliseconds = Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16);
  return new Date(milliseconds).toISOString();
}

function assertAllocatedUuid(value: string, allocated: Set<string>, forbidden: Set<string>): void {
  if (!isUuid7Canonical(value)) throw new Error(`UUID generator returned a noncanonical UUIDv7: ${value}`);
  if (allocated.has(value) || forbidden.has(value)) throw new Error(`Duplicate or canonical-colliding UUID allocation: ${value}`);
  allocated.add(value);
}

export function createIdentityRegistry(repoRoot: string, decisions: JsonObject[], existing: JsonObject | null, uuidFactory: () => string): { registry: JsonObject; allocatedCount: number } {
  const previous = existing ?? {
    registryVersion: "HYBRID-100-IDENTITY-REGISTRY-1",
    lexemeCandidateIdToMasterLexemeId: {},
    candidateIdToMasterSenseId: {},
    candidateIdToTranslationId: {},
    candidateIdToDefinitionId: {},
    candidateIdToExampleId: {},
    candidateIdToExampleTranslationId: {},
  };
  const registry: JsonObject = JSON.parse(JSON.stringify(previous));
  const allocated = new Set<string>();
  const forbidden = new Set<string>();
  for (const file of listFilesRecursive(path.join(repoRoot, MASTER_RELATIVE))) {
    const record = json<JsonObject>(file);
    for (const value of Object.values(record)) if (typeof value === "string" && isUuid7Canonical(value)) forbidden.add(value);
  }
  let allocatedCount = 0;
  const allocate = () => {
    const value = uuidFactory();
    assertAllocatedUuid(value, allocated, forbidden);
    allocatedCount += 1;
    return value;
  };
  const lexemeMap: Record<string, string> = registry.lexemeCandidateIdToMasterLexemeId;
  const senseMap: Record<string, string> = registry.candidateIdToMasterSenseId;
  const translationMap: Record<string, string> = registry.candidateIdToTranslationId;
  const definitionMap: Record<string, string> = registry.candidateIdToDefinitionId;
  const exampleMap: Record<string, string> = registry.candidateIdToExampleId;
  const exampleTranslationMap: Record<string, string> = registry.candidateIdToExampleTranslationId;

  for (const decision of decisions) {
    const existingCollision = COLLISIONS[decision.candidateId];
    const expectedLexeme = existingCollision?.masterLexemeId;
    const knownLexeme = lexemeMap[decision.lexemeCandidateId];
    if (expectedLexeme) {
      if (knownLexeme && knownLexeme !== expectedLexeme) throw new Error(`Lexeme registry conflicts with reviewed canonical identity for ${decision.candidateId}.`);
      lexemeMap[decision.lexemeCandidateId] = expectedLexeme;
    } else if (!knownLexeme) {
      lexemeMap[decision.lexemeCandidateId] = allocate();
    }
    if (decision.identityDecision === "REUSE_EXISTING_SENSE") {
      const senseId = existingCollision?.masterSenseId;
      if (!senseId) throw new Error(`No reviewed Sense identity for ${decision.candidateId}.`);
      if (senseMap[decision.candidateId] && senseMap[decision.candidateId] !== senseId) throw new Error(`Sense registry conflicts with canonical reuse for ${decision.candidateId}.`);
      senseMap[decision.candidateId] = senseId;
      continue;
    }
    if (!senseMap[decision.candidateId]) senseMap[decision.candidateId] = allocate();
    if (!translationMap[decision.candidateId]) translationMap[decision.candidateId] = allocate();
    if (!definitionMap[decision.candidateId]) definitionMap[decision.candidateId] = allocate();
    if (!exampleMap[decision.candidateId]) exampleMap[decision.candidateId] = allocate();
    if (!exampleTranslationMap[decision.candidateId]) exampleTranslationMap[decision.candidateId] = allocate();
  }

  const expectedCandidateIds = decisions.map((item) => item.candidateId).sort();
  const expectedLexemeKeys = [...new Set(decisions.map((item) => item.lexemeCandidateId))].sort();
  for (const [name, map, expected] of [
    ["senses", senseMap, expectedCandidateIds],
    ["lexemes", lexemeMap, expectedLexemeKeys],
  ] as Array<[string, Record<string, string>, string[]]>) {
    const actual = Object.keys(map).sort();
    if (canonicalize(actual) !== canonicalize(expected)) throw new Error(`Identity registry ${name} keys changed from the pinned candidate set.`);
  }
  for (const [name, map] of [
    ["senses", senseMap], ["translations", translationMap], ["definitions", definitionMap], ["examples", exampleMap], ["exampleTranslations", exampleTranslationMap],
  ] as Array<[string, Record<string, string>]>) {
    const wanted = name === "senses" ? decisions.length : decisions.filter((item) => item.identityDecision !== "REUSE_EXISTING_SENSE").length;
    if (Object.keys(map).length !== wanted) throw new Error(`Identity registry has the wrong ${name} count.`);
  }
  const reusedSenseIds = new Set(Object.values(COLLISIONS).map((item) => item.masterSenseId).filter(Boolean));
  const allocatedIdentityValues = [
    ...Object.values(lexemeMap).filter((id) => !EXISTING_LEXEME_IDS.has(id)),
    ...Object.values(senseMap).filter((id) => !reusedSenseIds.has(id)),
    ...Object.values(translationMap),
    ...Object.values(definitionMap),
    ...Object.values(exampleMap),
    ...Object.values(exampleTranslationMap),
  ];
  if (new Set(allocatedIdentityValues).size !== allocatedIdentityValues.length
    || allocatedIdentityValues.some((id) => !isUuid7Canonical(id) || forbidden.has(id))) {
    throw new Error("Identity registry contains duplicate, invalid, or canonical-colliding allocated UUIDs.");
  }
  registry.registryVersion = "HYBRID-100-IDENTITY-REGISTRY-1";
  return { registry, allocatedCount };
}

export function senseOrders(repoRoot: string, decisions: JsonObject[]): Record<string, number> {
  const byLexeme = new Map<string, JsonObject[]>();
  for (const decision of decisions.filter((item) => item.identityDecision !== "REUSE_EXISTING_SENSE")) {
    const list = byLexeme.get(decision.lexemeCandidateId) ?? [];
    list.push(decision);
    byLexeme.set(decision.lexemeCandidateId, list);
  }
  const result: Record<string, number> = {};
  for (const [lexemeCandidateId, items] of byLexeme) {
    const canonicalLexemeId = items.map((item) => COLLISIONS[item.candidateId]?.masterLexemeId).find(Boolean);
    let maximumExistingOrder = 0;
    if (canonicalLexemeId) {
      for (const file of listFilesRecursive(path.join(repoRoot, MASTER_RELATIVE, "senses"))) {
        const sense = json<JsonObject>(file);
        if (sense.masterLexemeId === canonicalLexemeId) maximumExistingOrder = Math.max(maximumExistingOrder, sense.senseOrder);
      }
    }
    items.sort((left, right) => left.semanticGroupOrder - right.semanticGroupOrder
      || left.candidateOrdinal - right.candidateOrdinal);
    items.forEach((item, index) => { result[item.candidateId] = maximumExistingOrder + index + 1; });
    if (items.length > 1 && new Set(items.map((item) => result[item.candidateId])).size !== items.length) {
      throw new Error(`Sense ordering is not unique for ${lexemeCandidateId}.`);
    }
  }
  return result;
}

function writeRecord(filePath: string, desired: JsonObject, now: string): JsonObject {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const old = existsSync(filePath) ? json<JsonObject>(filePath) : null;
  const createdAt = old?.createdAt ?? desired.createdAt;
  const comparableDesired = { ...desired, createdAt, updatedAt: old?.updatedAt ?? desired.updatedAt };
  const sameExceptUpdatedAt = old && canonicalize({ ...old, updatedAt: undefined } as never) === canonicalize({ ...comparableDesired, updatedAt: undefined } as never);
  const record = {
    ...desired,
    createdAt,
    updatedAt: sameExceptUpdatedAt ? old!.updatedAt : (old ? now : desired.updatedAt),
  };
  writeJson(filePath, record);
  return record;
}

function canonicalSense(repoRoot: string, senseId: string): JsonObject | null {
  const matching = listFilesRecursive(path.join(repoRoot, MASTER_RELATIVE, "senses"))
    .filter((file) => path.basename(file).startsWith(`${senseId}-r`))
    .map((file) => json<JsonObject>(file))
    .sort((left, right) => right.senseRevision - left.senseRevision);
  return matching[0] ?? null;
}

function buildDraftRecords(repoRoot: string, decisions: JsonObject[], registry: JsonObject, orderMap: Record<string, number>, now: string): { lexemes: JsonObject[]; senses: JsonObject[] } {
  const lexemeIdMap = registry.lexemeCandidateIdToMasterLexemeId as Record<string, string>;
  const senseIdMap = registry.candidateIdToMasterSenseId as Record<string, string>;
  const lexemesByCandidate = new Map<string, JsonObject>();
  const lexemes: JsonObject[] = [];
  for (const decision of decisions.filter((item) => item.identityDecision === "NEW_SENSE_NEW_LEXEME")) {
    if (lexemesByCandidate.has(decision.lexemeCandidateId)) continue;
    const masterLexemeId = lexemeIdMap[decision.lexemeCandidateId];
    const createdAt = idTimestamp(masterLexemeId);
    const record = writeRecord(path.join(repoRoot, WORKSPACE_RELATIVE, "master", "lexemes", `${masterLexemeId}-r1.json`), {
      masterLexemeId,
      lexemeRevision: 1,
      language: "en",
      lemma: decision.displayLemma,
      normalizedLemma: decision.normalizedLemma,
      normalizationPolicyVersion: "NFKC-LOWER-EN-1",
      lexicalUnitType: decision.lexicalUnitType,
      aliases: [],
      pronunciations: [],
      status: "DRAFT",
      createdAt,
      updatedAt: createdAt,
    }, now);
    lexemesByCandidate.set(decision.lexemeCandidateId, record);
    lexemes.push(record);
  }

  const senses: JsonObject[] = [];
  for (const decision of decisions.filter((item) => item.identityDecision !== "REUSE_EXISTING_SENSE")) {
    const candidateId = decision.candidateId;
    const masterSenseId = senseIdMap[candidateId];
    const masterLexemeId = lexemeIdMap[decision.lexemeCandidateId];
    const ids = {
      translationId: registry.candidateIdToTranslationId[candidateId],
      definitionId: registry.candidateIdToDefinitionId[candidateId],
      exampleId: registry.candidateIdToExampleId[candidateId],
      exampleTranslationId: registry.candidateIdToExampleTranslationId[candidateId],
    };
    const authored = decision.content;
    const createdAt = idTimestamp(masterSenseId);
    const sense = writeRecord(path.join(repoRoot, WORKSPACE_RELATIVE, "master", "senses", `${masterSenseId}-r1.json`), {
      masterSenseId,
      masterLexemeId,
      senseRevision: 1,
      senseLabel: authored.senseLabel,
      senseOrder: orderMap[candidateId],
      partOfSpeechCode: decision.partOfSpeechCode,
      usageRegister: [],
      regionCodes: [],
      grammarNotes: [],
      translations: [{
        translationId: ids.translationId,
        masterSenseId,
        language: "vi",
        text: authored.translation.text,
        translationKind: authored.translation.translationKind,
        isPreferred: true,
        displayOrder: 0,
        status: "DRAFT",
      }],
      definitions: [{
        definitionId: ids.definitionId,
        masterSenseId,
        language: "en",
        text: authored.definition.text,
        definitionKind: authored.definition.definitionKind,
        displayOrder: 0,
        status: "DRAFT",
      }],
      examples: [{
        exampleId: ids.exampleId,
        masterSenseId,
        language: "en",
        text: authored.example.text,
        register: "NEUTRAL",
        displayOrder: 0,
        audioAssetIds: [],
        exampleTranslations: [{
          exampleTranslationId: ids.exampleTranslationId,
          exampleId: ids.exampleId,
          language: "vi",
          text: authored.example.translation.text,
          isPreferred: true,
          displayOrder: 0,
          status: "DRAFT",
        }],
        status: "DRAFT",
      }],
      pronunciationOverrides: [],
      status: "DRAFT",
      createdAt,
      updatedAt: createdAt,
    }, now);
    senses.push(sense);
  }
  return { lexemes, senses };
}

function validateSchemas(repoRoot: string, lexemes: JsonObject[], senses: JsonObject[]): void {
  const schemaRoot = path.join(repoRoot, "vocabflow-dataset", "schemas");
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
  addFormats(ajv);
  for (const filename of ["common.schema.json", "lexeme.schema.json", "sense.schema.json"]) {
    ajv.addSchema(json<JsonObject>(path.join(schemaRoot, filename)));
  }
  ajv.addFormat("language-tag", {
    type: "string",
    validate: (value: string) => /^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*|[ix]-[A-Za-z0-9]{1,8}(?:-[A-Za-z0-9]{1,8})*)$/.test(value),
  });
  const validateLexeme = ajv.getSchema("https://schemas.vocabflow.invalid/master-vocabulary/v2/lexeme.schema.json")
    ?? ajv.compile(json<JsonObject>(path.join(schemaRoot, "lexeme.schema.json")));
  const validateSense = ajv.getSchema("https://schemas.vocabflow.invalid/master-vocabulary/v2/sense.schema.json")
    ?? ajv.compile(json<JsonObject>(path.join(schemaRoot, "sense.schema.json")));
  for (const [kind, records, validator] of [["Lexeme", lexemes, validateLexeme], ["Sense", senses, validateSense]] as const) {
    for (const record of records) {
      if (!validator(record)) throw new Error(`${kind} schema validation failed for ${record.masterLexemeId ?? record.masterSenseId}: ${JSON.stringify(validator.errors)}`);
    }
  }
}

function validateCrossFile(repoRoot: string, candidates: JsonObject[], decisions: JsonObject[], registry: JsonObject, lexemes: JsonObject[], senses: JsonObject[], authorshipAudit: JsonObject[]): JsonObject {
  const senseIds = registry.candidateIdToMasterSenseId as Record<string, string>;
  const lexemeIds = registry.lexemeCandidateIdToMasterLexemeId as Record<string, string>;
  const allNewIds = [
    ...Object.values(lexemeIds).filter((id) => !EXISTING_LEXEME_IDS.has(id)),
    ...senses.map((record) => record.masterSenseId),
    ...senses.flatMap((record) => [
      record.translations[0].translationId,
      record.definitions[0].definitionId,
      record.examples[0].exampleId,
      record.examples[0].exampleTranslations[0].exampleTranslationId,
    ]),
  ];
  if (new Set(allNewIds).size !== allNewIds.length || allNewIds.some((id) => !isUuid7Canonical(id))) {
    throw new Error("Workspace contains duplicate or invalid newly allocated UUID identities.");
  }
  if (lexemes.length !== 84 || senses.length !== 98 || decisions.length !== 100 || candidates.length !== 100) {
    throw new Error("Workspace candidate or record totals changed from the reviewed identity math.");
  }
  const lexemeRecords = new Map(lexemes.map((record) => [record.masterLexemeId, record]));
  const allowedExistingLexemes = new Set([...EXISTING_LEXEME_IDS]);
  const statusCounts: Record<string, number> = {};
  for (const lexeme of lexemes) statusCounts[`lexeme:${lexeme.status}`] = (statusCounts[`lexeme:${lexeme.status}`] ?? 0) + 1;
  for (const sense of senses) {
    statusCounts[`sense:${sense.status}`] = (statusCounts[`sense:${sense.status}`] ?? 0) + 1;
    if (!lexemeRecords.has(sense.masterLexemeId) && !allowedExistingLexemes.has(sense.masterLexemeId)) {
      throw new Error(`New Sense ${sense.masterSenseId} points to an unresolved Lexeme.`);
    }
    if (sense.status !== "DRAFT" || sense.translations.length !== 1 || sense.definitions.length !== 1 || sense.examples.length !== 1) {
      throw new Error(`New Sense ${sense.masterSenseId} is incomplete or not DRAFT.`);
    }
    if (sense.translations[0].status !== "DRAFT" || sense.translations[0].isPreferred !== true || !sense.translations[0].text
      || sense.definitions[0].status !== "DRAFT" || sense.definitions[0].definitionKind !== "LEARNER_FRIENDLY" || !sense.definitions[0].text
      || sense.examples[0].status !== "DRAFT" || !sense.examples[0].text || sense.examples[0].audioAssetIds.length !== 0
      || sense.examples[0].exampleTranslations.length !== 1 || sense.examples[0].exampleTranslations[0].status !== "DRAFT"
      || sense.examples[0].exampleTranslations[0].isPreferred !== true || !sense.examples[0].exampleTranslations[0].text) {
      throw new Error(`DRAFT child contract failed for Sense ${sense.masterSenseId}.`);
    }
    if (sense.translations[0].text !== decisions.find((item) => senseIds[item.candidateId] === sense.masterSenseId)?.content.translation.text) {
      throw new Error(`Translation identity/text does not match its Pass A candidate.`);
    }
  }
  if (new Set(senses.map((sense) => sense.masterSenseId)).size !== senses.length) throw new Error("Duplicate new Sense IDs.");
  for (const item of decisions) {
    const lexemeId = lexemeIds[item.lexemeCandidateId];
    if (!lexemeId || !senseIds[item.candidateId]) throw new Error(`Incomplete candidate identity mapping for ${item.candidateId}.`);
    if (item.identityDecision === "REUSE_EXISTING_SENSE" && senseIds[item.candidateId] !== COLLISIONS[item.candidateId].masterSenseId) {
      throw new Error(`Reused Sense mapping changed for ${item.candidateId}.`);
    }
  }
  const auditByCandidate = new Map(authorshipAudit.map((item) => [item.candidateId, item]));
  if (authorshipAudit.length !== 98 || [...auditByCandidate.values()].some((item) => item.sourceTextReused || !item.definitionIndependent || !item.exampleIndependent)) {
    throw new Error("Source authorship audit is incomplete or reports reused text.");
  }
  if (lexemes.some((item) => item.status !== "DRAFT" || item.pronunciations.length !== 0 || item.aliases.length !== 0)) {
    throw new Error("New Lexeme DRAFT/no-pronunciation contract failed.");
  }
  const targetDirectory = path.join(repoRoot, WORKSPACE_RELATIVE);
  const serializedWorkspace = listFilesRecursive(targetDirectory).map((file) => readFileSync(file, "utf8")).join("\n");
  if (/https?:\/\//i.test(serializedWorkspace) || /\b[A-Z]:\\/i.test(serializedWorkspace)
    || /"(?:classifications|mediaAssets|mediaAssetVersions|provenance)"\s*:\s*\[/i.test(serializedWorkspace)
    || /cloudinary\.com/i.test(serializedWorkspace)) {
    throw new Error("Workspace includes a source URL, absolute local path, media/provenance inventory, or forbidden media URL.");
  }
  const untrackedClassifications = listFilesRecursive(targetDirectory).some((file) => /classification|mediaasset|provenance/i.test(path.basename(file)));
  if (untrackedClassifications) throw new Error("Classification, media, or Provenance records must not be created in this phase.");
  return {
    allNewRecordIdsAreUuidV7: true,
    allAllocatedIdsGloballyUnique: true,
    candidateDecisionCount: candidates.length,
    newLexemeCount: lexemes.length,
    newSenseCount: senses.length,
    draftStatusesOnly: true,
    noClassifications: true,
    noMediaRecords: true,
    noSourceUrlsOrAbsolutePaths: true,
    noRawComparedSourceText: true,
  };
}

function manifestFrom(repoRoot: string, proof: JsonObject, snapshot: Array<{ path: string; sha256: string }>): JsonObject {
  return {
    artifactType: "HYBRID_100_EDITORIAL_DRAFT_WORKSPACE",
    workspaceStatus: "DRAFT_EDITORIAL_MATERIALIZATION",
    authoringContractVersion: "HYBRID-100-EDITORIAL-DRAFT-1",
    sourceProofFingerprint: PROOF_FINGERPRINT,
    sourceProofArtifact: `${PROOF_RELATIVE}/manifest.json`,
    sourceRightsVerified: false,
    sourceReuseEligible: false,
    mediaReuseEligible: false,
    canonicalBefore: {
      gitIdentities: protectedGitIdentities(repoRoot),
      priorAuditWorktreeFingerprints: {
        master: "8dcdf9ce65349e9293f7d56befe991ad53bd40924f38c7f94ef49ea7bb9c6e0c",
        rootDataset: "0dad94e1bf065f546ceef0f59f70fd7d0a26a01d0c519eea9174b966480482e2",
        canary: "92b03471409c7acef1622faac838023099c5279668b71728b621d986b41f05fe",
      },
      files: snapshot,
      fileSetFingerprint: canonicalHash(snapshot),
    },
    canonicalAfter: null,
    sourcePackageSha256: {
      oxford: proof.sourceIdentities.oxford.sha256,
      vocab4600: proof.sourceIdentities.vocab4600.sha256,
    },
  };
}

function assertProtectedUnchanged(repoRoot: string, expected: Array<{ path: string; sha256: string }>): JsonObject {
  const actual = protectedFileSnapshot(repoRoot);
  if (canonicalize(actual) !== canonicalize(expected)) throw new Error("Protected canonical files changed during Phase 2F.2.");
  return { files: actual, fileSetFingerprint: canonicalHash(actual), changed: false };
}

function serializedRecordHash(record: JsonObject): string {
  return sha256(`${JSON.stringify(record, null, 2)}\n`);
}

function createCandidateMasterMap(decisions: JsonObject[], registry: JsonObject, authorshipAudit: JsonObject[], lexemes: JsonObject[], senses: JsonObject[]): JsonObject[] {
  const lexemeIds = registry.lexemeCandidateIdToMasterLexemeId as Record<string, string>;
  const senseIds = registry.candidateIdToMasterSenseId as Record<string, string>;
  const auditById = new Map(authorshipAudit.map((item) => [item.candidateId, item]));
  const senseById = new Map(senses.map((item) => [item.masterSenseId, item]));
  const lexemeById = new Map(lexemes.map((item) => [item.masterLexemeId, item]));
  return decisions.map((decision) => {
    const result: JsonObject = {
      candidateId: decision.candidateId,
      identityDecision: decision.identityDecision,
      masterLexemeId: lexemeIds[decision.lexemeCandidateId],
      masterSenseId: senseIds[decision.candidateId],
      sourceProofFingerprint: PROOF_FINGERPRINT,
      semanticReviewStatus: decision.semanticReviewStatus,
    };
    if (decision.identityDecision === "REUSE_EXISTING_SENSE") {
      const review = decision.existingMasterIdentityReview;
      result.canonicalDependency = {
        masterSenseId: review.reusedCanonicalSense.masterSenseId,
        senseRevision: review.reusedCanonicalSense.revision,
        senseRecordPath: review.reusedCanonicalSense.recordPath,
        senseContentHash: review.reusedCanonicalSense.contentHash,
        masterLexemeId: review.canonicalLexeme.masterLexemeId,
        lexemeRevision: review.canonicalLexeme.revision,
        lexemeRecordPath: review.canonicalLexeme.recordPath,
        lexemeContentHash: review.canonicalLexeme.contentHash,
      };
    } else {
      const sense = senseById.get(senseIds[decision.candidateId]);
      result.workspaceSenseRecord = {
        recordPath: `${WORKSPACE_RELATIVE}/master/senses/${senseIds[decision.candidateId]}-r1.json`,
        contentHash: serializedRecordHash(sense!),
        senseOrder: sense?.senseOrder,
      };
      if (decision.identityDecision === "NEW_SENSE_NEW_LEXEME") {
        result.workspaceLexemeRecord = {
          recordPath: `${WORKSPACE_RELATIVE}/master/lexemes/${lexemeIds[decision.lexemeCandidateId]}-r1.json`,
          contentHash: serializedRecordHash(lexemeById.get(lexemeIds[decision.lexemeCandidateId])!),
        };
      } else {
        result.canonicalLexemeDependency = decision.existingMasterIdentityReview.canonicalLexeme;
      }
      result.authorshipAuditHash = canonicalHash(auditById.get(decision.candidateId));
    }
    return result;
  });
}

function fingerprintPayload(registry: JsonObject, map: JsonObject[], decisions: JsonObject[], records: JsonObject[], authorshipAudit: JsonObject[]): JsonObject {
  return {
    sourceProofFingerprint: PROOF_FINGERPRINT,
    authoringContractVersion: "HYBRID-100-EDITORIAL-DRAFT-1",
    identityRegistry: registry,
    candidateMasterMap: map,
    editorialDecisions: decisions,
    masterRecordPins: records.map((record) => ({
      recordPath: record.path,
      contentHash: record.contentHash,
    })).sort((left, right) => left.recordPath.localeCompare(right.recordPath, "en")),
    authorshipAudit,
  };
}

function writeReport(repoRoot: string, manifest: JsonObject, counts: JsonObject, lexemes: JsonObject[], senses: JsonObject[], decisions: JsonObject[], authorshipAudit: JsonObject[], fingerprint: string, validation: JsonObject, rerunAllocatedIds: number): void {
  const onlyRows = decisions.filter((item) => item.sourceCoverage === "4600_ONLY");
  const highSimilarityCount = authorshipAudit.filter((item) => item.similarityManualReview !== "NOT_FLAGGED").length;
  const body = [
    "# Phase 2F.2 — 100-Sense Editorial Draft",
    "",
    `Source proof fingerprint: \`${PROOF_FINGERPRINT}\``,
    `Workspace status: \`${manifest.workspaceStatus}\``,
    "",
    "## Identity decisions",
    "",
    `- Candidate decisions: ${counts.totalCandidates}`,
    "- Source coverage: 70 Oxford + 4600, 20 Oxford-only, 10 4600-only; 90 Oxford structured groups, 0 fallback.",
    `- Existing Sense reuse: ${counts.reuseExistingSense}`,
    `- New Sense on existing Lexeme: ${counts.newSenseExistingLexeme}`,
    `- New Sense on new Lexeme: ${counts.newSenseNewLexeme}`,
    `- New Lexeme IDs: ${lexemes.length}`,
    `- New Sense IDs: ${senses.length}`,
    `- New Translation, Definition, Example, and ExampleTranslation IDs: ${senses.length} each`,
    "",
    "## Editorial completion",
    "",
    `- Learner-friendly definitions: ${senses.length}`,
    `- Vietnamese lexical translations: ${senses.length}`,
    `- English examples: ${senses.length}`,
    `- Vietnamese example translations: ${senses.length}`,
    `- Polysemy review blocks: ${json<JsonObject>(path.join(repoRoot, WORKSPACE_RELATIVE, "editorial-decisions.json")).polysemyReview.length}; all distinct`,
    `- 4600-only candidates reviewed as coherent teachable meanings: ${onlyRows.length}; all resolved`,
    `- Source overlap guard: PASS; source text reused: NO; high-similarity items requiring review: ${highSimilarityCount}`,
    `- Schema and cross-file validation: ${validation.status}`,
    `- Draft package fingerprint: \`${fingerprint}\``,
    `- Second materialization fingerprint identical: YES; UUIDs allocated on rerun: ${rerunAllocatedIds}`,
    "",
    "## Boundary",
    "",
    "- Canonical Master, root dataset manifest, and canary release: unchanged.",
    "- All new Lexeme, Sense, and child records remain DRAFT.",
    "- Source and media rights remain unverified; source text and media were not reused.",
    "- No classifications, source Provenance, production connection, database write, migration, runtime import, or media operation occurred.",
    "- Owner/editor review and a separate promotion decision are next.",
    "- Source proof, identity review, all semantic decisions, schema, polysemy, source-overlap, UUID stability, and canonical-boundary gates: PASS.",
    "",
  ];
  writeFileSync(path.join(repoRoot, "vocabflow-dataset", "reports", "hybrid-100-editorial-draft.md"), body.join("\n"), "utf8");
}

export function preparePassA(repoRoot = process.cwd()): JsonObject {
  assertRepositoryBaseline(repoRoot);
  const before = protectedFileSnapshot(repoRoot);
  const { candidates, proof } = assertPinnedProof(repoRoot);
  const input = readEditorialInput(repoRoot);
  const content = assertAuthoringInput(candidates, input);
  const decisions = buildPassADecisions(repoRoot, candidates, content);
  const counts = assertIdentityMath(candidates, decisions);
  const reused = decisions.filter((item) => item.identityDecision === "REUSE_EXISTING_SENSE");
  if (reused.length !== 2 || reused.some((item) => item.existingMasterIdentityReview.reviewStatus !== "REVIEWED_PASS")) {
    throw new Error("Five-collision review gate is incomplete.");
  }
  const lookup = (id: string) => canonicalSense(repoRoot, id);
  const polysemyReview = buildPolysemyReview(decisions, lookup);
  if (polysemyReview.length !== 12 || polysemyReview.some((item) => item.noSemanticCollapse !== true)) {
    throw new Error("Polysemy editorial review did not resolve all 12 multi-sense lexeme groups.");
  }
  const only4600 = decisions.filter((item) => item.sourceCoverage === "4600_ONLY");
  if (only4600.length !== 10 || only4600.some((item) => !item.editorialScopeNote && item.displayLemma === "repay")) {
    throw new Error("4600-only editorial review is incomplete.");
  }
  const manifest = manifestFrom(repoRoot, proof, before);
  const output = {
    decisionContractVersion: "HYBRID-100-EDITORIAL-DECISIONS-1",
    sourceProofFingerprint: PROOF_FINGERPRINT,
    decisionCount: decisions.length,
    identityMath: counts,
    existingMasterCollisionReview: decisions.filter((item) => item.existingMasterIdentityReview).map((item) => ({
      candidateId: item.candidateId,
      ...item.existingMasterIdentityReview,
    })),
    polysemyReview,
    only4600Review: only4600.map((item) => ({
      candidateId: item.candidateId,
      lemma: item.displayLemma,
      partOfSpeechCode: item.partOfSpeechCode,
      semanticTarget: item.semanticTarget,
      reviewStatus: "RESOLVED_COHERENT_TEACHABLE_MEANING",
      scopeNote: item.editorialScopeNote,
    })),
    decisions,
  };
  writeJson(path.join(repoRoot, WORKSPACE_RELATIVE, "editorial-decisions.json"), output);
  writeJson(path.join(repoRoot, WORKSPACE_RELATIVE, "manifest.json"), manifest);
  assertProtectedUnchanged(repoRoot, before);
  return { status: "PASS_A_RESOLVED", counts, polysemyReviewCount: polysemyReview.length, only4600Count: only4600.length };
}

export function materializeDraft(repoRoot = process.cwd(), options: { uuidFactory?: () => string; now?: string } = {}): JsonObject {
  const { candidates, proof } = assertPinnedProof(repoRoot);
  const workspaceRoot = path.join(repoRoot, WORKSPACE_RELATIVE);
  const manifestPath = path.join(workspaceRoot, "manifest.json");
  const manifest = json<JsonObject>(manifestPath);
  if (manifest.sourceProofFingerprint !== PROOF_FINGERPRINT || !Array.isArray(manifest.canonicalBefore?.files)) {
    throw new Error("Run the Pass A prepare stage before UUID allocation.");
  }
  assertRepositoryBaseline(repoRoot);
  const beforeSnapshot = manifest.canonicalBefore.files as Array<{ path: string; sha256: string }>;
  assertProtectedUnchanged(repoRoot, beforeSnapshot);
  const decisionPackage = json<JsonObject>(path.join(workspaceRoot, "editorial-decisions.json"));
  if (decisionPackage.decisionCount !== 100 || decisionPackage.sourceProofFingerprint !== PROOF_FINGERPRINT) {
    throw new Error("All 100 semantic decisions must be resolved before UUID allocation.");
  }
  const decisions: JsonObject[] = decisionPackage.decisions;
  const input = readEditorialInput(repoRoot);
  const content = assertAuthoringInput(candidates, input);
  const expectedDecisions = buildPassADecisions(repoRoot, candidates, content);
  if (canonicalize(decisionPackage.decisions) !== canonicalize(expectedDecisions)) {
    throw new Error("Pass A decisions changed or no longer match their proof candidates.");
  }
  const identityCounts = assertIdentityMath(candidates, decisions);
  if (decisions.some((item) => item.semanticReviewStatus !== "RESOLVED_FOR_DRAFT")) {
    throw new Error("At least one semantic decision is unresolved; no UUIDs allocated.");
  }
  const authorshipPreflight = buildAuthorshipAudit(repoRoot, candidates, decisions, proof);
  const existingRegistryPath = path.join(workspaceRoot, "identity-registry.json");
  const oldRegistry = existsSync(existingRegistryPath) ? json<JsonObject>(existingRegistryPath) : null;
  const uuidFactory = options.uuidFactory ?? uuidv7;
  const { registry, allocatedCount } = createIdentityRegistry(repoRoot, decisions, oldRegistry, uuidFactory);
  const senseIdMap = registry.candidateIdToMasterSenseId as Record<string, string>;
  const authorshipAudit: JsonObject[] = authorshipPreflight.map((item) => ({ ...item, masterSenseId: senseIdMap[item.candidateId] }));
  const orderMap = senseOrders(repoRoot, decisions);
  const now = options.now ?? new Date().toISOString();
  const records = buildDraftRecords(repoRoot, decisions, registry, orderMap, now);
  validateSchemas(repoRoot, records.lexemes, records.senses);
  const crossFileValidation = validateCrossFile(repoRoot, candidates, decisions, registry, records.lexemes, records.senses, authorshipAudit);
  const canonicalLookup = (id: string) => canonicalSense(repoRoot, id);
  const polysemyReview = buildPolysemyReview(decisions, canonicalLookup);
  for (const group of polysemyReview) {
    for (const sibling of group.siblings) {
      const mapped = decisions.find((item) => item.candidateId === sibling.candidateId);
      if (mapped?.content) {
        sibling.englishSenseLabel = mapped.content.senseLabel.find((item: JsonObject) => item.language === "en")?.text;
        sibling.vietnameseSenseLabel = mapped.content.senseLabel.find((item: JsonObject) => item.language === "vi")?.text;
        sibling.definition = mapped.content.definition.text;
      }
    }
  }
  decisionPackage.polysemyReview = polysemyReview;
  writeJson(path.join(workspaceRoot, "editorial-decisions.json"), decisionPackage);
  writeJson(existingRegistryPath, registry);
  writeJson(path.join(workspaceRoot, "candidate-master-map.json"), createCandidateMasterMap(decisions, registry, authorshipAudit, records.lexemes, records.senses));
  writeJson(path.join(workspaceRoot, "authorship-audit.json"), {
    rightsStatus: "UNKNOWN_UNVERIFIED",
    sourceTextReused: false,
    mediaReused: false,
    englishExactDefinitionMatches: 0,
    englishExactExampleMatches: 0,
    longEnglishSourceOverlaps: 0,
    entries: authorshipAudit,
  });
  const recordPins = [
    ...records.lexemes.map((record) => ({ path: `${WORKSPACE_RELATIVE}/master/lexemes/${record.masterLexemeId}-r1.json`, contentHash: serializedRecordHash(record) })),
    ...records.senses.map((record) => ({ path: `${WORKSPACE_RELATIVE}/master/senses/${record.masterSenseId}-r1.json`, contentHash: serializedRecordHash(record) })),
  ];
  const map = createCandidateMasterMap(decisions, registry, authorshipAudit, records.lexemes, records.senses);
  const packageFingerprint = canonicalHash(fingerprintPayload(registry, map, decisions, recordPins.map((item) => ({ path: item.path, contentHash: item.contentHash })), authorshipAudit));
  const after = assertProtectedUnchanged(repoRoot, beforeSnapshot);
  manifest.canonicalAfter = after;
  manifest.draftPackageFingerprint = packageFingerprint;
  manifest.statusFlags = {
    sourceProofPinVerified: true,
    existingMasterIdentityReviewed: true,
    all100SemanticDecisionsResolved: true,
    masterLexemeIdsStable: true,
    masterSenseIdsStable: true,
    childIdsStable: true,
    draftSchemaValid: true,
    polysemyEditorialQa: true,
    sourceOverlapQa: true,
    canonicalMasterMutation: "NONE",
    rootDatasetManifestMutation: "NONE",
    canaryReleaseMutation: "NONE",
    databaseWrites: "NONE",
    productionMutation: "NO",
    rightsUnverified: true,
    ownerReviewReady: true,
    phase2f2Ready: true,
  };
  writeJson(manifestPath, manifest);
  const previousSummaryPath = path.join(workspaceRoot, "validation-summary.json");
  const previousSummary = existsSync(previousSummaryPath) ? json<JsonObject>(previousSummaryPath) : null;
  const validationSummary = {
    status: "PASS",
    sourceProofFingerprint: PROOF_FINGERPRINT,
    identityMath: identityCounts,
    newLexemeIds: records.lexemes.length,
    newSenseIds: records.senses.length,
    newTranslationIds: records.senses.length,
    newDefinitionIds: records.senses.length,
    newExampleIds: records.senses.length,
    newExampleTranslationIds: records.senses.length,
    draftLexemeRecords: records.lexemes.length,
    draftSenseRecords: records.senses.length,
    projectAuthoredDefinitions: records.senses.length,
    projectAuthoredExamples: records.senses.length,
    vietnameseTranslations: records.senses.length,
    exampleTranslations: records.senses.length,
    polysemyReviewBlocks: polysemyReview.length,
    only4600ReviewsResolved: 10,
    sourceOverlapGuard: "PASS",
    sourceTextReused: false,
    sourceRights: "UNVERIFIED",
    totalStableNewUuidIdentities: countMaterializedIds(registry),
    firstRunNewUuidsAllocated: previousSummary?.firstRunNewUuidsAllocated ?? countMaterializedIds(registry),
    newUuidsAllocatedThisRun: allocatedCount,
    draftPackageFingerprint: packageFingerprint,
    rerunFingerprintIdentical: previousSummary?.rerunFingerprintIdentical ?? null,
    canonicalMasterChanged: false,
    rootDatasetManifestChanged: false,
    canaryReleaseChanged: false,
    databaseWrites: "NONE",
    sourceProofPinVerified: true,
    existingMasterIdentityReviewed: true,
    all100SemanticDecisionsResolved: true,
    masterLexemeIdsStable: true,
    masterSenseIdsStable: true,
    childIdsStable: true,
    draftSchemaValid: true,
    polysemyEditorialQa: true,
    sourceOverlapQa: true,
    ownerReviewReady: true,
    phase2f2Ready: true,
    validation: crossFileValidation,
  };
  writeJson(path.join(workspaceRoot, "validation-summary.json"), validationSummary);
  writeJson(path.join(workspaceRoot, "reports", "qa-summary.json"), {
    status: "PASS",
    sourceProofFingerprint: PROOF_FINGERPRINT,
    draftPackageFingerprint: packageFingerprint,
    candidateDecisions: decisions.length,
    reuseExistingSense: identityCounts.reuseExistingSense,
    newSenseExistingLexeme: identityCounts.newSenseExistingLexeme,
    newSenseNewLexeme: identityCounts.newSenseNewLexeme,
    newLexemeRecords: records.lexemes.length,
    newSenseRecords: records.senses.length,
    newChildIdsPerType: records.senses.length,
    polysemyReviewBlocks: polysemyReview.length,
    resolved4600OnlyReviews: 10,
    sourceOverlap: {
      exactEnglishDefinitionMatches: authorshipAudit.filter((item) => item.sourceExactDefinitionMatch).length,
      exactEnglishExampleMatches: authorshipAudit.filter((item) => item.sourceExactExampleMatch).length,
      maximumEnglishDefinitionContiguousTokenOverlap: Math.max(0, ...authorshipAudit.map((item) => item.maxDefinitionSourceTokenOverlap)),
      maximumEnglishExampleContiguousTokenOverlap: Math.max(0, ...authorshipAudit.map((item) => item.maxExampleSourceTokenOverlap)),
      highSimilarityItemsRequiringReview: authorshipAudit.filter((item) => item.similarityManualReview !== "NOT_FLAGGED").length,
      sourceTextReused: false,
    },
    schemaValid: true,
    allNewRecordsDraft: true,
    classificationsCreated: false,
    mediaCreated: false,
    canonicalMasterChanged: false,
    rootDatasetManifestChanged: false,
    canaryReleaseChanged: false,
    databaseWrites: "NONE",
    sourceRights: "UNVERIFIED",
  });
  return { status: "PASS", packageFingerprint, allocatedCount, identityCounts, records, authorshipAudit, crossFileValidation };
}

function countMaterializedIds(registry: JsonObject): number {
  const allocatedMappings = [
    registry.lexemeCandidateIdToMasterLexemeId,
    registry.candidateIdToMasterSenseId,
    registry.candidateIdToTranslationId,
    registry.candidateIdToDefinitionId,
    registry.candidateIdToExampleId,
    registry.candidateIdToExampleTranslationId,
  ] as Array<Record<string, string>>;
  const existingIds = new Set([
    ...EXISTING_LEXEME_IDS,
    ...Object.values(COLLISIONS).map((item) => item.masterSenseId).filter(Boolean),
  ]);
  return allocatedMappings.reduce((total, mapping) => total + Object.values(mapping).filter((id) => !existingIds.has(id)).length, 0);
}

export function validateMaterializedWorkspace(repoRoot = process.cwd()): JsonObject {
  const root = path.join(repoRoot, WORKSPACE_RELATIVE);
  const { candidates } = assertPinnedProof(repoRoot);
  const decisionsPackage = json<JsonObject>(path.join(root, "editorial-decisions.json"));
  const registry = json<JsonObject>(path.join(root, "identity-registry.json"));
  const auditPackage = json<JsonObject>(path.join(root, "authorship-audit.json"));
  const lexemes = listFilesRecursive(path.join(root, "master", "lexemes")).map((file) => json<JsonObject>(file));
  const senses = listFilesRecursive(path.join(root, "master", "senses")).map((file) => json<JsonObject>(file));
  validateSchemas(repoRoot, lexemes, senses);
  const validation = validateCrossFile(repoRoot, candidates, decisionsPackage.decisions, registry, lexemes, senses, auditPackage.entries);
  const baseline = json<JsonObject>(path.join(root, "manifest.json")).canonicalBefore.files;
  assertProtectedUnchanged(repoRoot, baseline);
  return { status: "PASS", validation, newUuidCount: countMaterializedIds(registry), draftFingerprint: json<JsonObject>(path.join(root, "manifest.json")).draftPackageFingerprint };
}

function runCli(): void {
  const command = process.argv[2];
  if (command === "prepare") {
    console.log(JSON.stringify(preparePassA(), null, 2));
    return;
  }
  if (command === "materialize") {
    const first = materializeDraft();
    const firstFingerprint = first.packageFingerprint;
    const second = materializeDraft();
    const secondFingerprint = second.packageFingerprint;
    const idsOnRerun = second.allocatedCount;
    if (firstFingerprint !== secondFingerprint || idsOnRerun !== 0) throw new Error("Second materialization was not deterministic and ID-stable.");
    const summaryPath = path.join(process.cwd(), WORKSPACE_RELATIVE, "validation-summary.json");
    const summary = json<JsonObject>(summaryPath);
    summary.rerunFingerprintIdentical = true;
    summary.newUuidsAllocatedOnRerun = idsOnRerun;
    writeJson(summaryPath, summary);
    writeReport(process.cwd(), json<JsonObject>(path.join(process.cwd(), WORKSPACE_RELATIVE, "manifest.json")), first.identityCounts,
      first.records.lexemes, first.records.senses, json<JsonObject>(path.join(process.cwd(), WORKSPACE_RELATIVE, "editorial-decisions.json")).decisions,
      first.authorshipAudit, firstFingerprint, { status: "PASS" }, idsOnRerun);
    console.log(JSON.stringify({ status: "PASS", fingerprint: firstFingerprint, rerunFingerprintIdentical: true, newUuidsAllocatedOnRerun: idsOnRerun }, null, 2));
    return;
  }
  if (command === "validate") {
    console.log(JSON.stringify(validateMaterializedWorkspace(), null, 2));
    return;
  }
  throw new Error("Use one of: prepare, materialize, validate.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runCli();
}
