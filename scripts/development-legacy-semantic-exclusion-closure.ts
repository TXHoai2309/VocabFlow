import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  applyOwnerReviewedExclusions, deterministicAuditFingerprint, readOwnerReviewedExclusions,
  semanticAuditFingerprintPayload, type CandidateAnalysis
} from "./development-legacy-vocabulary-cleanup-audit";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = "vocabflow-dataset/workspaces/legacy-vocabulary-cleanup-audit";
const BASELINE = "b8f2ef7e2f38d107d5f53bdca5b0b2b834e845ad";

// Offline semantic replay only. Accepted inventory, target, mappings, impact
// simulation and historical owner artifacts are never rewritten.
export function closeLegacySemanticExclusions(check = false, root = ROOT): string {
  const directory = path.join(root, WORKSPACE);
  const read = (name: string) => JSON.parse(readFileSync(path.join(directory, name), "utf8"));
  const ownerReviewedExclusions = readOwnerReviewedExclusions(root);
  const candidateArtifact = read("legacy-master-candidates.json") as { approvedMasterSources: unknown; candidates: CandidateAnalysis[] };
  const candidates = candidateArtifact.candidates.map((row) => applyOwnerReviewedExclusions(row, ownerReviewedExclusions.exclusions));
  const classification = read("cleanup-classification.json");
  const byId = new Map(candidates.map((row) => [row.runtimeVocabularyId, row]));
  classification.classifications = classification.classifications.map((row: { runtimeVocabularyId: number }) => ({ ...row, candidateRelation: byId.get(row.runtimeVocabularyId)?.relation ?? "NO_MASTER_CANDIDATE" }));
  const inventory = read("runtime-vocabulary-inventory.json");
  const mappings = read("master-mappings.json");
  const summary = read("validation-summary.json");
  if (inventory.totalRuntimeVocabulary !== 2126 || candidates.length !== 2018 || new Set(candidates.map((row) => row.runtimeVocabularyId)).size !== 2018 ||
      classification.cleanupClassCounts.KEEP_MASTER_MANAGED !== 108 || classification.cleanupClassCounts.KEEP_REFERENCED_LEGACY !== 2018 ||
      summary.runtime11History.progress !== 1 || summary.runtime11History.reviews !== 5) throw new Error("ACCEPTED_INVENTORY_MISMATCH");
  const payload = semanticAuditFingerprintPayload({
    target: read("development-target.json"), runtimeVocabularyInventory: inventory.rows, masterMappings: mappings.mappings,
    schemaReferenceInventory: read("schema-reference-inventory.json"), cleanupClassification: classification.classifications,
    candidateAnalysis: candidates, ownerReviewedExclusions, hybridCheckpoint: summary.hybridCheckpoint, repositoryBaseline: BASELINE
  });
  const fingerprint = deterministicAuditFingerprint(payload);
  summary.legacyAuditSnapshotFingerprint = fingerprint;
  summary.semanticClosure = { phase: "2G.3A.1", databaseConnection: "NONE", sourceBaseline: BASELINE, fingerprintVersion: 2,
    excludedPairs: ownerReviewedExclusions.exclusions.length, excludedLegacyRows: candidates.filter((row) => row.relation === "OWNER_REVIEWED_NOT_SAME_IDENTITY").length };
  const manifest = read("manifest.json");
  manifest.legacyAuditSnapshotFingerprint = fingerprint;
  manifest.semanticClosure = summary.semanticClosure;
  manifest.fingerprintPayloadKeys = Object.keys(payload).sort();
  for (const file of ["owner-reviewed-exclusions.json", "semantic-fingerprint-payload.json"]) if (!manifest.files.includes(file)) manifest.files.push(file);
  const artifacts = new Map<string, unknown>([
    ["owner-reviewed-exclusions.json", ownerReviewedExclusions], ["semantic-fingerprint-payload.json", payload],
    ["legacy-master-candidates.json", { ...candidateArtifact, candidates }], ["cleanup-classification.json", classification],
    ["validation-summary.json", summary], ["manifest.json", manifest]
  ]);
  const reportPath = path.join(root, "vocabflow-dataset/reports/development-legacy-vocabulary-cleanup-audit.md");
  const report = readFileSync(reportPath, "utf8").replace(/Candidate discovery checks[^\n]+/, "Finalized owner-reviewed CREATE_NEW decisions take precedence over exact lemma, duplicate, alias and translation heuristics for each reviewed runtime/Master Sense pair. Excluded candidates have relation OWNER_REVIEWED_NOT_SAME_IDENTITY and identityClaim=NONE. No mapping is created.")
    .replace(/(\*\*LEGACY_AUDIT_SNAPSHOT_FINGERPRINT:\*\* `)[a-f0-9]{64}/, `$1${fingerprint}`);
  const marker = "\n<!-- PHASE-2G3A1 START -->";
  const correctedReport = report.split(marker)[0] + marker + "\n## Phase 2G.3A.1 — Owner-reviewed semantic exclusion closure\n\n" +
    `Offline correction from baseline \`${BASELINE}\`; database connection NONE. The accepted Phase 2G.3A inventory and transaction above are historical evidence, not a fresh database scan.\n\n` +
    `Derived ${ownerReviewedExclusions.exclusions.length} reviewed pairs from proposal candidate IDs joined to finalized CREATE_NEW decisions. ${summary.semanticClosure.excludedLegacyRows} legacy rows are excluded. #295 apple and #849 record retain their existing conservative candidate treatment. All 2126 vocabulary rows, 108 mappings, 2018 referenced legacy rows, #11 history (1 progress / 5 reviews), and #284 booking mapping remain unchanged.\n\n` +
    `Fingerprint v2 includes sanitized inventory, mapping/reference evidence, classifications, candidate identities and owner exclusions. Reproducible payload: \`semantic-fingerprint-payload.json\`. Corrected fingerprint: \`${fingerprint}\`. This replaces the Phase 2G.3A fingerprint; it is not a new database snapshot.\n<!-- PHASE-2G3A1 END -->\n`;
  const outputs: Array<readonly [string, string]> = [...artifacts].map(([file, value]) => [path.join(directory, file), `${JSON.stringify(value, null, 2)}\n`]);
  outputs.push([reportPath, correctedReport]);
  for (const [file, text] of outputs) {
    if (check) { if (readFileSync(file, "utf8") !== text) throw new Error("SEMANTIC_CLOSURE_ARTIFACT_DRIFT"); }
    else writeFileSync(file, text, "utf8");
  }
  return fingerprint;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.slice(2).some((arg) => arg !== "--check")) throw new Error("UNSUPPORTED_CLOSURE_ARGUMENT");
  console.log(JSON.stringify({ status: "PASS", fingerprint: closeLegacySemanticExclusions(process.argv.includes("--check")), databaseConnection: "NONE", databaseWrites: "NONE" }));
}
