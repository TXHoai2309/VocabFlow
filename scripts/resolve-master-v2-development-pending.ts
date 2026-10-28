import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { getConnectionTarget } from "../config/database-targets";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";

const ROOT = process.cwd();
const SCHEMA = "vocabflow_editorial_staging";
const SOURCE_ROOT = "vocabflow-dataset/workspaces/full-source-inventory-dedupe";
const SOURCE_MANIFEST_PATH = path.join(ROOT, SOURCE_ROOT, "manifest.json");
const SYNC_WORKSPACE = "vocabflow-dataset/workspaces/master-v2-development-sync";
const RECOVERY_SCREEN_PATH = path.join(ROOT, SYNC_WORKSPACE, "pending-content-artifact-recovery-screen-v1.json");
const BUNDLE_PATH = path.join(ROOT, SYNC_WORKSPACE, "pending-content-artifact-recovery-bundle-v1.json");
const REPORT_PATH = path.join(ROOT, SYNC_WORKSPACE, "pending-content-artifact-recovery-sync-report-v1.json");
const SNAPSHOT_PATH = path.join(ROOT, "vocabflow-dataset/workspaces/master-v2-development-sync/resolved-effective-staging-snapshot-v1.json");
const ACCEPTED_INVENTORY_FINGERPRINT = "58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53";
const TARGET = Object.freeze({ projectId: "shy-hill-72364426", branchId: "br-square-grass-b3af0nte", databaseName: "neondb", endpointId: "ep-small-shadow-b3ny4993" });
const BATCH_PREFIX = "vocabflow-master-v2-development-pending-content-artifact-recovery-v1:";
let activePhase = "START";
type Row = Record<string, any>;
type BundleItem = {
  proposalKey: string;
  sourceGroupKey: string;
  candidateContentHash: string;
  candidateContentFingerprint: string;
  recoveredCandidateContent: Row;
  recoveredCandidateContentFingerprint: string;
  recoveryArtifactReferences: Row[];
  recoveryScreenFingerprint: string;
  sourceContentHashAlgorithm: string;
  sourceReferencesFingerprint: string;
  artifactIdentityFingerprint: string;
  sourceRecords: Array<{ corpus: string; artifact: string; recordIndex: number; sourceRecordId: string; sourceNoteGuid: string; recordEvidenceSha256: string }>;
  supportingSourceRecords: Array<{ corpus: string; artifact: string; recordIndex: number; sourceRecordId: string; sourceNoteGuid: string; recordEvidenceSha256: string }>;
  displayForm: string;
  previousBatchId: string;
  rightsStatus: string;
};

type RecoveryScreen = {
  bundleVersion: string;
  target: Row;
  sourceCapture: Row;
  sourceInventory: Row;
  admissionEvaluator: Row;
  counts: Row;
  items: Row[];
  blocked: Row[];
  screenFingerprint: string;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJson(file: string): Row {
  const value = JSON.parse(readFileSync(file, "utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SOURCE_ARTIFACT_INVALID");
  return value as Row;
}

function loadRecoveryScreen(inventory: ReturnType<typeof sourcePins>): RecoveryScreen {
  const screen = parseJson(RECOVERY_SCREEN_PATH) as RecoveryScreen;
  const { screenFingerprint, ...base } = screen;
  const evaluatorPath = path.join(ROOT, String(screen.admissionEvaluator?.path ?? ""));
  const evaluatorHash = existsSync(evaluatorPath) ? sha256(readFileSync(evaluatorPath)) : "";
  if (screen.bundleVersion !== "master-v2-development-pending-content-artifact-recovery-screen-v1"
    || screen.target?.projectId !== TARGET.projectId || screen.target?.branchId !== TARGET.branchId
    || screen.target?.databaseName !== TARGET.databaseName || screen.target?.schema !== SCHEMA
    || screen.sourceCapture?.targetIdentity?.project_id !== TARGET.projectId
    || screen.sourceCapture?.targetIdentity?.branch_id !== TARGET.branchId
    || screen.sourceCapture?.targetIdentity?.database_name !== TARGET.databaseName
    || screen.admissionEvaluator?.method !== "EXISTING_PHASE_B_NEW_DRAFT_ADMISSION_SCREEN"
    || !evaluatorHash || evaluatorHash !== screen.admissionEvaluator?.sha256
    || sha256(stable(base)) !== screenFingerprint || !Array.isArray(screen.items) || !Array.isArray(screen.blocked)
    || Number(screen.counts?.artifactRecoveredAndEligible) !== screen.items.length
    || Number(screen.counts?.pendingContentRows) !== screen.items.length + screen.blocked.length
    || screen.sourceInventory?.normalizedInventorySha256?.OXFORD_5000 !== inventory.inventories.OXFORD_5000.sha256
    || screen.sourceInventory?.normalizedInventorySha256?.ENGLISH_VOCAB_4600 !== inventory.inventories.ENGLISH_VOCAB_4600.sha256
    || screen.sourceInventory?.manifestSha256 !== sha256(readFileSync(SOURCE_MANIFEST_PATH))) {
    throw new Error("PENDING_CONTENT_RECOVERY_SCREEN_PIN_INVALID");
  }
  const proposalKeys = screen.items.map((item) => String(item.proposalKey));
  if (new Set(proposalKeys).size !== proposalKeys.length) throw new Error("PENDING_CONTENT_RECOVERY_DUPLICATE_PROPOSAL");
  return screen;
}

function recoveredContentHash(content: Row) {
  return sha256(stable({ definitionEn: content.definitionEn, examples: content.examples,
    grammarNotesEn: content.grammarNotesEn, meaningVi: content.meaningVi, senseLabelEn: content.senseLabelEn }));
}

function sourcePins() {
  const manifest = parseJson(SOURCE_MANIFEST_PATH);
  if (manifest.acceptedInventoryFingerprint !== ACCEPTED_INVENTORY_FINGERPRINT
    || manifest.fingerprintAlgorithm !== "SHA256_CANONICAL_JSON_SORTED_KEYS_UTF8_NO_TIMESTAMPS") throw new Error("SOURCE_INVENTORY_PIN_MISMATCH");
  const files = [
    { corpus: "OXFORD_5000", file: "oxford-normalized-inventory.json" },
    { corpus: "ENGLISH_VOCAB_4600", file: "vocab4600-normalized-inventory.json" },
  ];
  const inventories: Record<string, { records: Row[]; file: string; sha256: string }> = {};
  for (const entry of files) {
    const target = path.join(ROOT, SOURCE_ROOT, entry.file);
    const bytes = readFileSync(target);
    const inventory = JSON.parse(bytes.toString("utf8")) as Row;
    if (inventory.source?.sourceId !== entry.corpus || inventory.source?.sha256 !== manifest.sourceFiles?.[entry.corpus]?.sha256
      || !Array.isArray(inventory.records)) throw new Error("SOURCE_INVENTORY_PIN_MISMATCH");
    const apkgPin = String(manifest.sourceFiles[entry.corpus].sha256);
    if (!/^[0-9a-f]{64}$/.test(apkgPin)) throw new Error("SOURCE_APKG_PIN_INVALID");
    inventories[entry.corpus] = { records: inventory.records as Row[], file: entry.file, sha256: sha256(bytes) };
  }
  return {
    manifestPath: path.relative(ROOT, SOURCE_MANIFEST_PATH).replaceAll("\\", "/"),
    inventoryPaths: files.map((entry) => path.relative(ROOT, path.join(SOURCE_ROOT, entry.file)).replaceAll("\\", "/")),
    acceptedInventoryFingerprint: ACCEPTED_INVENTORY_FINGERPRINT,
    normalizedInventoriesSha256: sha256(stable(Object.fromEntries(Object.entries(inventories).map(([corpus, value]) => [corpus, value.sha256])))),
    apkgSha256FromPreviouslyVerifiedManifest: Object.fromEntries(files.map((entry) => [entry.corpus, manifest.sourceFiles[entry.corpus].sha256])),
    inventories,
  };
}

function candidateContentHash(row: Row, candidate: Row) {
  const content = candidate.candidate_content as Row;
  const hashPayload = {
    proposalKey: row.proposal_key,
    candidateGroupKey: row.source_group_key,
    headword: content.headword,
    partOfSpeechProposal: content.partOfSpeech,
    content: {
      definitionEn: content.definitionEn,
      examples: content.examples,
      grammarNotesEn: content.grammarNotesEn ?? null,
      meaningVi: content.meaningVi,
      senseLabelEn: content.senseLabelEn,
    },
  };
  return sha256(stable(hashPayload));
}

function coreFieldsValid(content: Row) {
  return typeof content.headword === "string" && content.headword.trim().length > 0
    && typeof content.partOfSpeech === "string" && content.partOfSpeech.trim().length > 0
    && typeof content.senseLabelEn === "string" && content.senseLabelEn.trim().length > 0
    && typeof content.definitionEn === "string" && content.definitionEn.trim().length > 0
    && typeof content.meaningVi === "string" && content.meaningVi.trim().length > 0
    && Array.isArray(content.examples) && content.examples.length > 0
    && content.examples.every((example: Row) => typeof example.en === "string" && example.en.trim().length > 0
      && typeof example.vi === "string" && example.vi.trim().length > 0);
}

function normalizeSourceHeadword(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function resolveSourceRecords(identity: Row, candidate: Row, inventories: ReturnType<typeof sourcePins>["inventories"]) {
  const refs = candidate.source_provenance_references?.sourceEvidenceReferences;
  if (!Array.isArray(refs) || refs.length === 0) throw new Error(`SOURCE_EVIDENCE_MISSING:${identity.proposal_key}`);
  const content = candidate.candidate_content as Row;
  const sourceRecords: BundleItem["sourceRecords"] = [];
  const supportingSourceRecords: BundleItem["supportingSourceRecords"] = [];
  for (const ref of refs) {
    const corpus = String(ref.corpus ?? "");
    const inventory = inventories[corpus];
    const artifactName = String(ref.artifact ?? "");
    if (!inventory || artifactName !== inventory.file) throw new Error(`SOURCE_CORPUS_ARTIFACT_MISMATCH:${identity.proposal_key}`);
    const recordIndex = Number(ref.recordIndex);
    const record = Number.isSafeInteger(recordIndex) && recordIndex >= 0 ? inventory.records[recordIndex] : undefined;
    if (!record || record.sourceRecordId !== ref.sourceRecordId || record.sourceNoteGuid !== ref.sourceNoteGuid
      || record.recordEvidenceSha256 !== ref.recordEvidenceSha256 || ref.verificationStatus !== "PASS_RECORD_PIN") {
      throw new Error(`SOURCE_RECORD_PIN_MISMATCH:${identity.proposal_key}`);
    }
    if (record.normalizedHeadword !== identity.source_group_key.replace(/^NORMALIZED_HEADWORD:/, "")) {
      throw new Error(`SOURCE_GROUP_KEY_MISMATCH:${identity.proposal_key}`);
    }
    const pinned = { corpus, artifact: artifactName, recordIndex, sourceRecordId: record.sourceRecordId, sourceNoteGuid: record.sourceNoteGuid, recordEvidenceSha256: record.recordEvidenceSha256 };
    sourceRecords.push(pinned);
    if (normalizeSourceHeadword(record.headwordText) === normalizeSourceHeadword(content.headword) && Array.isArray(record.sourcePosClassesCandidate)
      && record.sourcePosClassesCandidate.includes(content.partOfSpeech)) supportingSourceRecords.push(pinned);
  }
  if (supportingSourceRecords.length === 0) {
    const hasExactHeadword = sourceRecords.some((ref) => inventories[ref.corpus]?.records[ref.recordIndex]?.headwordText === content.headword);
    throw new Error(`${hasExactHeadword ? "SOURCE_POS_MISMATCH" : "SOURCE_HEADWORD_MISMATCH"}:${identity.proposal_key}`);
  }
  const forms = new Set(supportingSourceRecords.map((ref) => inventories[ref.corpus]!.records[ref.recordIndex]!.headwordText));
  if (forms.size !== 1) throw new Error(`SOURCE_DISPLAY_FORM_AMBIGUOUS:${identity.proposal_key}`);
  return { displayForm: [...forms][0]!, sourceRecords, supportingSourceRecords };
}

async function connectVerified(purpose: "bootstrap" | "migration" | "runtime") {
  const { context, environment } = readContext();
  if (context !== "local-development" || environment !== "development" || process.env.DATABASE_ENV !== "development" || process.env.VERCEL_ENV) {
    throw new Error("LOCAL_DEVELOPMENT_ONLY");
  }
  const target = getConnectionTarget("development", purpose);
  const verified = await assertResolvedTargetBeforeMutation({ context, source: "dev-launcher", environment, purpose, operation: "db-check", target });
  const configuredEndpointId = verified.fingerprint.host.split(".")[0]?.replace(/-pooler$/, "");
  if (verified.resolved.expected.projectId !== TARGET.projectId || verified.resolved.expected.branchId !== TARGET.branchId
    || verified.resolved.expected.databaseName !== TARGET.databaseName || configuredEndpointId !== TARGET.endpointId) {
    throw new Error("DEVELOPMENT_TARGET_MISMATCH");
  }
  const sql = openSql(verified.url);
  try {
    await assertPostConnectIdentity(sql, target);
    const [identity] = await sql<Row[]>`SELECT current_database() AS database_name, current_user AS role_name,
      (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id,
      (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id`;
    const expectedRole = purpose === "bootstrap" ? "vocabflow_identity_bootstrap" : purpose === "runtime" ? "vocabflow_runtime" : "vocabflow_migration";
    if (!identity || identity.database_name !== TARGET.databaseName || identity.role_name !== expectedRole
      || identity.project_id !== TARGET.projectId || identity.branch_id !== TARGET.branchId) {
      throw new Error("DEVELOPMENT_CONNECTION_IDENTITY_MISMATCH");
    }
    return { sql, target };
  } catch (error) {
    await sql.end({ timeout: 5 });
    throw error;
  }
}

async function runtimeCounts() {
  activePhase = "RUNTIME_COUNTS";
  const { sql } = await connectVerified("runtime");
  try {
    return await sql.begin(async (tx: any) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const tables = await tx.unsafe("SELECT table_name FROM information_schema.tables WHERE table_schema = 'vocabflow_app' AND table_type = 'BASE TABLE' ORDER BY table_name");
      const counts: Record<string, number> = {};
      for (const row of tables) {
        const name = String(row.table_name).replace(/"/g, "\"\"");
        const [count] = await tx.unsafe("SELECT count(*)::text AS rows FROM \"vocabflow_app\".\"" + name + "\"");
        counts[String(row.table_name)] = Number(count?.rows ?? 0);
      }
      return counts;
    });
  } finally { await sql.end({ timeout: 5 }); }
}

async function stagingSummary(tx: any) {
  activePhase = "STAGING_STATUS_QUERY";
  const [statusRows, effective] = await Promise.all([
    tx<Row[]>`SELECT resolution_status, count(*)::int AS count FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} GROUP BY resolution_status ORDER BY resolution_status`,
    tx<Row[]>`SELECT count(*)::int AS identities, count(*) FILTER (WHERE d.proposal_key IS NOT NULL AND d.editorial_status = 'DRAFT')::int AS draft_rows,
      count(*) FILTER (WHERE i.effective_content_hash = d.effective_content_hash)::int AS matching_hashes,
      count(*) FILTER (WHERE d.rights_status <> i.rights_status)::int AS rights_mismatches
      FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} i LEFT JOIN ${tx.unsafe(`${SCHEMA}.draft_proposals`)} d ON d.proposal_key = i.proposal_key
      WHERE i.resolution_status = 'EFFECTIVE'`,
  ]);
  activePhase = "STAGING_MEDIA_QUERY";
  const statuses = Object.fromEntries(statusRows.map((row: Row) => [String(row.resolution_status), Number(row.count)]));
  const [media] = await tx<Row[]>`SELECT
    (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_assets_v2`)} WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS assets,
    (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_mappings_v2`)} WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS mappings,
    (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_rights_v1`)} WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS rights`;
  return { statuses, effective: effective[0], media };
}

async function readCandidateRows(tx: any, lock = false): Promise<Row[]> {
  const lockSql = lock ? " FOR UPDATE OF i" : "";
  return tx.unsafe(`SELECT i.proposal_key, i.source_group_key, i.resolution_status, trim(coalesce(i.effective_content_hash, '')) AS effective_content_hash,
      i.rights_status, i.staging_batch_id, i.source_provenance AS identity_source_provenance,
      COALESCE(cv_rows.versions, '[]'::jsonb) AS candidate_versions
    FROM ${SCHEMA}.identity_registry i
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('candidate_content_hash', trim(cv.candidate_content_hash), 'selection_status', cv.selection_status,
        'candidate_content', cv.candidate_content, 'source_provenance_references', cv.source_provenance_references,
        'original_artifact_identity', cv.original_artifact_identity, 'staging_batch_id', trim(cv.staging_batch_id)) ORDER BY cv.candidate_content_hash) AS versions
      FROM ${SCHEMA}.candidate_versions cv WHERE cv.proposal_key = i.proposal_key
    ) cv_rows ON true
    WHERE i.resolution_status = 'PENDING_CONTENT_VALIDATION' ORDER BY i.proposal_key${lockSql}`);
}

async function readBaseline(tx: any) {
  activePhase = "READ_STAGING_SUMMARY";
  const snapshot = await stagingSummary(tx);
  activePhase = "READ_IDENTITY_COUNT";
  const [identityCount] = await tx<Row[]>`SELECT count(*)::int AS count FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)}`;
  activePhase = "READ_PENDING_VERSION_COUNT";
  const [versionCount] = await tx<Row[]>`SELECT count(*)::int AS count FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} WHERE resolution_status = 'PENDING_VERSION_DECISION'`;
  activePhase = "READ_RUNTIME_COUNTS";
  return { identityCount: Number(identityCount.count), statuses: snapshot.statuses, effectiveDraftIntegrity: snapshot.effective, pendingVersionIdentities: Number(versionCount.count), mediaCounts: snapshot.media };
}

function buildBundle(rows: Row[], inventories: ReturnType<typeof sourcePins>["inventories"], baseline: Row,
  inventory: ReturnType<typeof sourcePins>, screen: RecoveryScreen) {
  const items: BundleItem[] = [];
  const blocked: Record<string, number> = {};
  const blockedSamples: Record<string, Row[]> = {};
  const recoveryByKey = new Map(screen.items.map((item) => [String(item.proposalKey), item]));
  const recoveryBlockedByKey = new Map(screen.blocked.map((item) => [String(item.proposalKey), item]));
  for (const identity of rows) {
    const candidates = identity.candidate_versions as Row[];
    let reason = "";
    let candidate = candidates[0];
    let recovery: Row | undefined;
    if (candidates.length !== 1) reason = candidates.length === 0 ? "NO_CANDIDATE_VERSION" : "CANDIDATE_VERSION_NOT_UNIQUE";
    else if (candidate!.selection_status !== "PENDING_CONTENT_VALIDATION") reason = "CANDIDATE_STATUS_CHANGED";
    else if (candidate!.candidate_content == null) {
      recovery = recoveryByKey.get(String(identity.proposal_key));
      if (!recovery) {
        reason = "ARTIFACT_RECOVERY_SCREEN_BLOCKED";
        const blockedRecovery = recoveryBlockedByKey.get(String(identity.proposal_key));
        const samples = blockedSamples[reason] ?? (blockedSamples[reason] = []);
        if (samples.length < 20) samples.push({ proposalKey: identity.proposal_key, sourceGroupKey: identity.source_group_key,
          recoveryReasons: blockedRecovery?.reasons ?? blockedRecovery?.reason ?? ["NOT_SCREENED_AS_ELIGIBLE"] });
      } else if (recovery.candidateContentHash !== candidate!.candidate_content_hash
        || sha256(stable(recovery.candidateContent)) !== recovery.candidateContentFingerprint
        || recovery.sourceReferencesFingerprint !== sha256(stable(candidate!.source_provenance_references))
        || recovery.artifactIdentityFingerprint !== sha256(stable(candidate!.original_artifact_identity ?? {}))
        || recovery.admission?.status !== "PROVISIONAL_DRAFT_ONLY"
        || recovery.admission?.evaluatorSha256 !== sha256(readFileSync(String(recovery.admission?.evaluatorPath ?? "")))) {
        reason = "ARTIFACT_RECOVERY_SCREEN_ITEM_PIN_INVALID";
      } else {
        const content = recovery.candidateContent as Row;
        if (!coreFieldsValid(content) || recoveredContentHash(content) !== candidate!.candidate_content_hash
          || recovery.recoveryArtifactReferences?.length === 0
          || !Array.isArray(recovery.sourceEvidenceReferences)
          || stable(recovery.sourceEvidenceReferences) !== stable(candidate!.source_provenance_references?.sourceEvidenceReferences ?? [])) {
          reason = "RECOVERED_CANDIDATE_CONTENT_OR_PROVENANCE_INVALID";
        } else {
          candidate = { ...candidate!, candidate_content: content };
        }
      }
    } else if (!coreFieldsValid(candidate!.candidate_content)) reason = "CANDIDATE_CONTENT_SCHEMA_INCOMPLETE";
    else if (candidateContentHash(identity, candidate!) !== candidate!.candidate_content_hash) reason = "CANDIDATE_CONTENT_HASH_MISMATCH";
    let source: ReturnType<typeof resolveSourceRecords> | undefined;
    if (!reason) {
      try { source = resolveSourceRecords(identity, candidate!, inventories); }
      catch (error) { reason = error instanceof Error ? error.message.split(":", 1)[0]! : "SOURCE_EVIDENCE_INVALID"; }
    }
    if (reason) {
      blocked[reason] = (blocked[reason] ?? 0) + 1;
      const samples = blockedSamples[reason] ?? (blockedSamples[reason] = []);
      if (samples.length < 20) {
        const blockedCandidate = candidates[0];
        const refs = blockedCandidate?.source_provenance_references?.sourceEvidenceReferences;
        samples.push({ proposalKey: identity.proposal_key, sourceGroupKey: identity.source_group_key,
          candidateHeadword: candidate?.candidate_content?.headword ?? null, candidatePos: candidate?.candidate_content?.partOfSpeech ?? null,
          source: Array.isArray(refs) ? refs.slice(0, 2).map((ref: Row) => {
            const corpus = String(ref.corpus ?? ""); const inv = inventories[corpus]; const record = inv?.records?.[Number(ref.recordIndex)];
            return { corpus, artifact: ref.artifact, sourceRecordId: ref.sourceRecordId, recordEvidenceSha256: ref.recordEvidenceSha256,
              recordHeadword: record?.headwordText ?? null, normalizedHeadword: record?.normalizedHeadword ?? null,
              sourcePosRaw: record?.sourcePosRaw ?? null, sourcePosValues: record?.sourcePosValues ?? null,
              sourcePosClassesCandidate: record?.sourcePosClassesCandidate ?? null };
          }) : [] });
      }
      continue;
    }
    candidate = candidate!;
    const artifactIdentity = candidate.original_artifact_identity ?? {};
    items.push({
      proposalKey: String(identity.proposal_key), sourceGroupKey: String(identity.source_group_key),
      candidateContentHash: String(candidate.candidate_content_hash),
      candidateContentFingerprint: sha256(stable(candidates[0]!.candidate_content)),
      recoveredCandidateContent: candidate.candidate_content,
      recoveredCandidateContentFingerprint: sha256(stable(candidate.candidate_content)),
      recoveryArtifactReferences: recovery?.recoveryArtifactReferences ?? [],
      recoveryScreenFingerprint: screen.screenFingerprint,
      sourceContentHashAlgorithm: recovery ? "sha256-canonical-json-content-v1" : "identity-bound-candidate-content-v1",
      sourceReferencesFingerprint: sha256(stable(candidate.source_provenance_references)),
      artifactIdentityFingerprint: sha256(stable(artifactIdentity)),
      sourceRecords: source!.sourceRecords, displayForm: source!.displayForm,
      supportingSourceRecords: source!.supportingSourceRecords,
      previousBatchId: String(candidate.staging_batch_id), rightsStatus: String(identity.rights_status),
    });
  }
  const uniqueItems = new Set(items.map((item) => item.proposalKey));
  if (uniqueItems.size !== items.length) throw new Error("DUPLICATE_PROPOSAL_IN_RECOVERY_BUNDLE");
  const base = {
    bundleVersion: "master-v2-development-pending-content-artifact-recovery-v1",
    target: TARGET,
    source: {
      acceptedInventoryFingerprint: inventory.acceptedInventoryFingerprint,
      normalizedInventoriesSha256: inventory.normalizedInventoriesSha256,
      apkgSha256FromPreviouslyVerifiedManifest: inventory.apkgSha256FromPreviouslyVerifiedManifest,
      manifestPath: inventory.manifestPath, inventoryPaths: inventory.inventoryPaths,
      recoveryScreenPath: path.relative(ROOT, RECOVERY_SCREEN_PATH).replaceAll("\\", "/"),
      recoveryScreenSha256: sha256(readFileSync(RECOVERY_SCREEN_PATH)),
      recoveryScreenFingerprint: screen.screenFingerprint,
    },
    baseline,
    counts: { pendingContentRows: rows.length, eligibleProposals: items.length,
      eligibleGroups: new Set(items.map((item) => item.sourceGroupKey)).size, blockedRows: rows.length - items.length, blockedReasons: blocked, blockedSamples },
    items: items.sort((a, b) => a.proposalKey.localeCompare(b.proposalKey)),
  };
  const planFingerprint = sha256(stable(base));
  return { ...base, planFingerprint, batchId: sha256(`${BATCH_PREFIX}${planFingerprint}`) };
}

async function plan() {
  activePhase = "SOURCE_PINS";
  const inventory = sourcePins();
  activePhase = "CONNECT_BOOTSTRAP";
  const { sql } = await connectVerified("bootstrap");
  try {
    activePhase = "READ_BASELINE";
    const data = await sql.begin(async (tx: any) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const baseline = await readBaseline(tx);
      activePhase = "READ_PENDING_CANDIDATES";
      const rows = await readCandidateRows(tx);
      activePhase = "READ_WRITE_GRANTS";
      const grants = await tx<Row[]>`SELECT
        has_table_privilege('vocabflow_identity_bootstrap'::text, 'vocabflow_editorial_staging.identity_registry'::text, 'UPDATE'::text) AS identity_update,
        has_table_privilege('vocabflow_identity_bootstrap'::text, 'vocabflow_editorial_staging.candidate_versions'::text, 'UPDATE'::text) AS candidate_update,
        has_table_privilege('vocabflow_identity_bootstrap'::text, 'vocabflow_editorial_staging.draft_proposals'::text, 'INSERT'::text) AS draft_insert,
        has_table_privilege('vocabflow_identity_bootstrap'::text, 'vocabflow_editorial_staging.import_batches'::text, 'INSERT'::text) AS batch_insert,
        has_schema_privilege('vocabflow_runtime'::text, 'vocabflow_editorial_staging'::text, 'USAGE'::text) AS runtime_schema_usage`;
      return { baseline, rows, grants: grants[0] };
    });
    activePhase = "BUILD_BUNDLE";
    data.baseline.runtimeCounts = await runtimeCounts();
    const screen = loadRecoveryScreen(inventory);
    const bundle = buildBundle(data.rows, inventory.inventories, data.baseline, inventory, screen);
    if (data.baseline.identityCount !== 7473 || data.baseline.statuses.EFFECTIVE !== 7194
      || data.baseline.statuses.PENDING_CONTENT_VALIDATION !== 133 || data.baseline.statuses.PENDING_VERSION_DECISION !== 146
      || data.baseline.pendingVersionIdentities !== 146 || data.baseline.effectiveDraftIntegrity.identities !== 7194
      || data.baseline.effectiveDraftIntegrity.draft_rows !== 7194 || data.baseline.effectiveDraftIntegrity.matching_hashes !== 7194
      || data.baseline.effectiveDraftIntegrity.rights_mismatches !== 0 || data.grants.runtime_schema_usage !== false) {
      throw new Error("DEVELOPMENT_STAGING_BASELINE_OR_ISOLATION_MISMATCH");
    }
    mkdirSync(path.dirname(BUNDLE_PATH), { recursive: true });
    writeFileSync(BUNDLE_PATH, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
    process.stdout.write(`PENDING_CONTENT=${bundle.counts.pendingContentRows}\nARTIFACT_RECOVERED_PROPOSALS=${bundle.counts.eligibleProposals}\nELIGIBLE_GROUPS=${bundle.counts.eligibleGroups}\nBLOCKED=${bundle.counts.blockedRows}\nRECOVERY_SCREEN_SHA256=${bundle.source.recoveryScreenSha256}\nPLAN_SHA256=${bundle.planFingerprint}\nMIGRATION_WRITES_READY=${JSON.stringify(data.grants)}\nBUNDLE=${path.relative(ROOT, BUNDLE_PATH).replaceAll("\\", "/")}\n`);
  } finally { await sql.end({ timeout: 5 }); }
}

function readBundle() {
  const bundle = parseJson(BUNDLE_PATH);
  const { planFingerprint, batchId, ...base } = bundle;
  if (bundle.bundleVersion !== "master-v2-development-pending-content-artifact-recovery-v1") throw new Error("RECOVERY_BUNDLE_VERSION_INVALID");
  if (bundle.target?.projectId !== TARGET.projectId || bundle.target?.branchId !== TARGET.branchId || bundle.target?.databaseName !== TARGET.databaseName
    || sha256(stable(base)) !== planFingerprint || sha256(`${BATCH_PREFIX}${planFingerprint}`) !== batchId
    || !Array.isArray(bundle.items) || bundle.counts?.eligibleProposals !== bundle.items.length) throw new Error("RECOVERY_BUNDLE_PIN_INVALID");
  const inventory = sourcePins();
  const screen = loadRecoveryScreen(inventory);
  if (bundle.source.recoveryScreenFingerprint !== screen.screenFingerprint
    || bundle.source.recoveryScreenSha256 !== sha256(readFileSync(RECOVERY_SCREEN_PATH))
    || bundle.source.acceptedInventoryFingerprint !== inventory.acceptedInventoryFingerprint
    || bundle.source.normalizedInventoriesSha256 !== inventory.normalizedInventoriesSha256
    || stable(bundle.source.apkgSha256FromPreviouslyVerifiedManifest) !== stable(inventory.apkgSha256FromPreviouslyVerifiedManifest)) throw new Error("RECOVERY_SOURCE_PIN_DRIFT");
  return bundle;
}

async function currentMediaCounts(tx: any) {
  return (await tx<Row[]>`SELECT
    (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_assets_v2`)} WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS assets,
    (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_mappings_v2`)} WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS mappings,
    (SELECT count(*)::int FROM ${tx.unsafe(`${SCHEMA}.media_rights_v1`)} WHERE manifest_version = 'english-vocabulary-4600-media-v2.0.0') AS rights`)[0];
}

async function apply() {
  activePhase = "READ_BUNDLE";
  const bundle = readBundle();
  activePhase = "SOURCE_PINS";
  const inventory = sourcePins();
  const runtimeBefore = await runtimeCounts();
  activePhase = "CONNECT_BOOTSTRAP_FOR_STAGING_WRITE";
  const { sql } = await connectVerified("bootstrap");
  let result: Row;
  try {
    activePhase = "APPLY_TRANSACTION";
    result = await sql.begin(async (tx: any) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      await tx`SELECT pg_advisory_xact_lock(hashtext('vocabflow-master-v2-development-pending-content-artifact-recovery-v1'))`;
      const [identity] = await tx<Row[]>`SELECT current_database() AS database_name, current_user AS role_name,
        current_setting('transaction_read_only') AS read_only,
        (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id,
        (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id`;
      if (identity?.database_name !== TARGET.databaseName || identity.role_name !== "vocabflow_identity_bootstrap" || identity.read_only !== "off"
        || identity.project_id !== TARGET.projectId || identity.branch_id !== TARGET.branchId) throw new Error("DEVELOPMENT_WRITE_TARGET_MISMATCH");
      const grants = await tx<Row[]>`SELECT
        has_table_privilege(current_user::text, 'vocabflow_editorial_staging.identity_registry'::text, 'UPDATE'::text) AS identity_update,
        has_table_privilege(current_user::text, 'vocabflow_editorial_staging.candidate_versions'::text, 'UPDATE'::text) AS candidate_update,
        has_table_privilege(current_user::text, 'vocabflow_editorial_staging.draft_proposals'::text, 'INSERT'::text) AS draft_insert,
        has_table_privilege(current_user::text, 'vocabflow_editorial_staging.import_batches'::text, 'INSERT'::text) AS batch_insert,
        has_schema_privilege('vocabflow_runtime'::text, 'vocabflow_editorial_staging'::text, 'USAGE'::text) AS runtime_schema_usage`;
      if (!grants[0]?.identity_update || !grants[0]?.candidate_update || !grants[0]?.draft_insert || !grants[0]?.batch_insert
        || grants[0]?.runtime_schema_usage !== false) throw new Error("DEVELOPMENT_STAGING_WRITE_OR_ISOLATION_GRANT_MISMATCH");

      const before = await readBaseline(tx);
      before.runtimeCounts = runtimeBefore;
      const alreadyApplied = await tx<Row[]>`SELECT count(*)::int AS count
        FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} i
        JOIN ${tx.unsafe(`${SCHEMA}.draft_proposals`)} d ON d.proposal_key = i.proposal_key
        JOIN ${tx.unsafe(`${SCHEMA}.candidate_versions`)} cv ON cv.proposal_key = i.proposal_key
          AND trim(cv.candidate_content_hash) = trim(i.effective_content_hash)
        JOIN jsonb_to_recordset(${tx.json(bundle.items.map((item: BundleItem) => ({ proposal_key: item.proposalKey,
          candidate_content: item.recoveredCandidateContent })))}::jsonb) AS expected(proposal_key text, candidate_content jsonb)
          ON expected.proposal_key = i.proposal_key AND cv.candidate_content = expected.candidate_content
        WHERE i.proposal_key = ANY(${tx.array(bundle.items.map((item: BundleItem) => item.proposalKey))}::text[])
          AND i.resolution_status = 'EFFECTIVE' AND d.editorial_status = 'DRAFT' AND cv.selection_status = 'EFFECTIVE'
          AND trim(i.effective_content_hash) = ANY(${tx.array(bundle.items.map((item: BundleItem) => item.candidateContentHash))}::text[])
          AND d.display_form IS NOT NULL AND d.rights_status = i.rights_status
          AND i.source_provenance->'masterV2PendingContentArtifactRecoveryV1'->>'planFingerprint' = ${bundle.planFingerprint}`;
      if (Number(alreadyApplied[0]?.count) === bundle.items.length) {
        const batch = await tx<Row[]>`SELECT batch_id, bundle_sha256, source_fingerprint, group_count, proposal_count FROM ${tx.unsafe(`${SCHEMA}.import_batches`)} WHERE batch_id = ${bundle.batchId}`;
        const after = await readBaseline(tx);
        after.runtimeCounts = runtimeBefore;
        const mediaAfter = await currentMediaCounts(tx);
        if (batch.length !== 1 || String(batch[0]!.bundle_sha256).trim() !== bundle.planFingerprint
          || Number(batch[0]!.proposal_count) !== bundle.items.length || stable(before.mediaCounts) !== stable(mediaAfter)
          || stable(before.runtimeCounts) !== stable(after.runtimeCounts)) throw new Error("IDEMPOTENT_REPLAY_STATE_MISMATCH");
        return { outcome: "IDEMPOTENT_NOOP", applied: 0, verifiedBatchRows: bundle.items.length, originalAppliedRows: bundle.items.length,
          before, after, mediaPreserved: true, runtimePreserved: true, batchId: bundle.batchId, planFingerprint: bundle.planFingerprint };
      }
      if (Number(alreadyApplied[0]?.count) !== 0) throw new Error("PARTIAL_PRIOR_APPLY_REQUIRES_RECONCILIATION");
      if (stable(before) !== stable(bundle.baseline)) throw new Error("DEVELOPMENT_STAGING_BASELINE_DRIFT");

      await tx<Row[]>`SELECT proposal_key FROM ${tx.unsafe(`${SCHEMA}.candidate_versions`)}
        WHERE proposal_key = ANY(${tx.array(bundle.items.map((item: BundleItem) => item.proposalKey))}::text[])
        ORDER BY proposal_key FOR UPDATE`;
      const liveRows = await readCandidateRows(tx, true);
      const liveByKey = new Map(liveRows.map((row) => [String(row.proposal_key), row]));
      if (liveByKey.size !== Number(bundle.baseline.statuses.PENDING_CONTENT_VALIDATION)
        || liveRows.length !== Number(bundle.baseline.statuses.PENDING_CONTENT_VALIDATION)) throw new Error("PENDING_CONTENT_IDENTITY_COUNT_DRIFT");
      const screen = loadRecoveryScreen(inventory);
      const screenByKey = new Map(screen.items.map((entry) => [String(entry.proposalKey), entry]));
      for (const item of bundle.items as BundleItem[]) {
        const identityRow = liveByKey.get(item.proposalKey);
        const candidates = identityRow?.candidate_versions as Row[] | undefined;
        const sourceCandidate = candidates?.[0];
        const recovered = screenByKey.get(item.proposalKey);
        const candidateForResolution = sourceCandidate && item.sourceContentHashAlgorithm === "sha256-canonical-json-content-v1"
          ? { ...sourceCandidate, candidate_content: item.recoveredCandidateContent } : sourceCandidate;
        if (!identityRow || identityRow.resolution_status !== "PENDING_CONTENT_VALIDATION" || identityRow.source_group_key !== item.sourceGroupKey
          || candidates?.length !== 1 || candidates[0]?.selection_status !== "PENDING_CONTENT_VALIDATION"
          || candidates[0]?.candidate_content_hash !== item.candidateContentHash
          || sha256(stable(candidates[0]?.candidate_content)) !== item.candidateContentFingerprint
          || sha256(stable(candidates[0]?.source_provenance_references)) !== item.sourceReferencesFingerprint
          || sha256(stable(candidates[0]?.original_artifact_identity ?? {})) !== item.artifactIdentityFingerprint
          || String(identityRow.rights_status) !== item.rightsStatus || String(candidates[0]?.staging_batch_id) !== item.previousBatchId
          || !candidateForResolution || !recovered || recovered.candidateContentHash !== item.candidateContentHash
          || stable(recovered.candidateContent) !== stable(item.recoveredCandidateContent)
          || sha256(stable(recovered.candidateContent)) !== item.recoveredCandidateContentFingerprint
          || recoveredContentHash(item.recoveredCandidateContent) !== item.candidateContentHash
          || recovered.admission?.status !== "PROVISIONAL_DRAFT_ONLY"
          || item.recoveryScreenFingerprint !== screen.screenFingerprint) throw new Error(`LIVE_CANDIDATE_PIN_MISMATCH:${item.proposalKey}`);
        const resolved = resolveSourceRecords(identityRow, candidateForResolution!, inventory.inventories);
        if (resolved.displayForm !== item.displayForm || stable(resolved.sourceRecords) !== stable(item.sourceRecords)
          || stable(resolved.supportingSourceRecords) !== stable(item.supportingSourceRecords)) throw new Error(`LIVE_SOURCE_PIN_MISMATCH:${item.proposalKey}`);
      }

      const mediaBefore = await currentMediaCounts(tx);
      const [existingBatch] = await tx<Row[]>`SELECT batch_id, bundle_sha256, source_fingerprint, completeness, group_count, proposal_count FROM ${tx.unsafe(`${SCHEMA}.import_batches`)} WHERE batch_id = ${bundle.batchId}`;
      const groupCount = new Set((bundle.items as BundleItem[]).map((item) => item.sourceGroupKey)).size;
      if (existingBatch && (String(existingBatch.bundle_sha256).trim() !== bundle.planFingerprint
        || String(existingBatch.source_fingerprint).trim() !== inventory.acceptedInventoryFingerprint
        || Number(existingBatch.group_count) !== groupCount || Number(existingBatch.proposal_count) !== bundle.items.length)) {
        throw new Error("RECOVERY_BATCH_ID_COLLISION");
      }
      if (!existingBatch) await tx`INSERT INTO ${tx.unsafe(`${SCHEMA}.import_batches`)}
        (batch_id, bundle_sha256, source_fingerprint, completeness, group_count, proposal_count)
        VALUES (${bundle.batchId}, ${bundle.planFingerprint}, ${inventory.acceptedInventoryFingerprint}, 'PARTIAL', ${groupCount}, ${bundle.items.length})`;

      const resolvedAt = new Date().toISOString();
      const draftRows: Row[] = [];
      const resolutionRows: Row[] = [];
      const candidateRows: Row[] = [];
      for (const item of bundle.items as BundleItem[]) {
        const identityRow = liveByKey.get(item.proposalKey)!;
        const candidate = (identityRow.candidate_versions as Row[])[0]!;
        const content = item.recoveredCandidateContent as Row;
        const evidence = candidate.source_provenance_references;
        const artifact = candidate.original_artifact_identity ?? {};
        const resolutionEvidence = {
          planFingerprint: bundle.planFingerprint,
          batchId: bundle.batchId,
          method: "HASH_PINNED_PRIOR_ARTIFACT_CONTENT_AND_SOURCE_HEADWORD_POS",
          sourceContentHashAlgorithm: item.sourceContentHashAlgorithm,
          recoveryScreenFingerprint: item.recoveryScreenFingerprint,
          recoveryArtifactReferences: item.recoveryArtifactReferences,
          sourceInventoryFingerprint: inventory.acceptedInventoryFingerprint,
          sourceRecords: item.sourceRecords,
          supportingSourceRecords: item.supportingSourceRecords,
          displayFormDerivation: { field: "headwordText", value: item.displayForm },
          previousStagingBatchId: item.previousBatchId,
          resolvedAt,
        };
        const draftProvenance = {
          provenanceVersion: "master-v2-development-pending-content-artifact-recovery-v1",
          inputSetFingerprintSha256: evidence?.inputSetFingerprintSha256 ?? null,
          sourceInventoryFingerprintSha256: inventory.acceptedInventoryFingerprint,
          sourceInventoryFilePins: evidence?.sourceInventoryFilePins ?? [],
          sourceEvidenceReferences: evidence?.sourceEvidenceReferences ?? [],
          candidateArtifactReferences: artifact?.artifactReferences ?? [],
          stagingResolution: resolutionEvidence,
        };
        const senseIdentity = { proposalKey: item.proposalKey, senseLabelEn: content.senseLabelEn };
        draftRows.push({ proposal_key: item.proposalKey, candidate_group_key: item.sourceGroupKey, headword: content.headword,
          part_of_speech: content.partOfSpeech, sense_identity: senseIdentity, definition_en: content.definitionEn, meaning_vi: content.meaningVi,
          examples: content.examples, usage_notes: content.grammarNotesEn ?? null, display_form: item.displayForm,
          source_provenance: draftProvenance, effective_content_hash: item.candidateContentHash, rights_status: item.rightsStatus,
          batch_id: bundle.batchId });
        resolutionRows.push({ proposal_key: item.proposalKey, source_group_key: item.sourceGroupKey,
          candidate_content_hash: item.candidateContentHash, resolution_evidence: resolutionEvidence });
        candidateRows.push({ proposal_key: item.proposalKey, candidate_content_hash: item.candidateContentHash,
          previous_batch_id: item.previousBatchId, candidate_content: content });
      }

      activePhase = "BULK_INSERT_DRAFT_PROJECTIONS";
      const insertedDrafts = await tx<Row[]>`INSERT INTO ${tx.unsafe(`${SCHEMA}.draft_proposals`)}
        (proposal_key, candidate_group_key, headword, part_of_speech, sense_identity, definition_en, meaning_vi, examples,
          usage_notes, display_form, source_provenance, effective_content_hash, editorial_status, rights_status, batch_id)
        SELECT r.proposal_key, r.candidate_group_key, r.headword, r.part_of_speech, r.sense_identity, r.definition_en, r.meaning_vi,
          r.examples, r.usage_notes, r.display_form, r.source_provenance, r.effective_content_hash, 'DRAFT', r.rights_status, r.batch_id
        FROM jsonb_to_recordset(${tx.json(draftRows)}::jsonb) AS r(
          proposal_key text, candidate_group_key text, headword text, part_of_speech text, sense_identity jsonb,
          definition_en text, meaning_vi text, examples jsonb, usage_notes text, display_form text, source_provenance jsonb,
          effective_content_hash text, rights_status text, batch_id text)
        ON CONFLICT (proposal_key) DO NOTHING RETURNING proposal_key`;
      if (insertedDrafts.length !== bundle.items.length) throw new Error("BULK_DRAFT_INSERT_COUNT_INVALID");

      activePhase = "BULK_UPDATE_CANDIDATE_VERSIONS";
      const updatedCandidates = await tx<Row[]>`UPDATE ${tx.unsafe(`${SCHEMA}.candidate_versions`)} cv
        SET candidate_content = r.candidate_content, selection_status = 'EFFECTIVE', staging_batch_id = ${bundle.batchId}
        FROM jsonb_to_recordset(${tx.json(candidateRows)}::jsonb) AS r(
          proposal_key text, candidate_content_hash text, previous_batch_id text, candidate_content jsonb)
        WHERE cv.proposal_key = r.proposal_key AND trim(cv.candidate_content_hash) = r.candidate_content_hash
          AND cv.selection_status = 'PENDING_CONTENT_VALIDATION' AND trim(cv.staging_batch_id) = r.previous_batch_id
          AND cv.candidate_content IS NULL
        RETURNING cv.proposal_key`;
      if (updatedCandidates.length !== bundle.items.length) throw new Error("BULK_CANDIDATE_UPDATE_COUNT_INVALID");

      activePhase = "BULK_UPDATE_IDENTITIES";
      const updatedIdentities = await tx<Row[]>`UPDATE ${tx.unsafe(`${SCHEMA}.identity_registry`)} i
        SET resolution_status = 'EFFECTIVE', effective_content_hash = r.candidate_content_hash, staging_batch_id = ${bundle.batchId},
          source_provenance = i.source_provenance || jsonb_build_object('masterV2PendingContentArtifactRecoveryV1', r.resolution_evidence)
        FROM jsonb_to_recordset(${tx.json(resolutionRows)}::jsonb) AS r(
          proposal_key text, source_group_key text, candidate_content_hash text, resolution_evidence jsonb)
        WHERE i.proposal_key = r.proposal_key AND i.source_group_key = r.source_group_key
          AND i.resolution_status = 'PENDING_CONTENT_VALIDATION'
        RETURNING i.proposal_key`;
      if (updatedIdentities.length !== bundle.items.length) throw new Error("BULK_IDENTITY_UPDATE_COUNT_INVALID");

      activePhase = "POST_APPLY_INTEGRITY";
      const after = await readBaseline(tx);
      after.runtimeCounts = runtimeBefore;
      const mediaAfter = await currentMediaCounts(tx);
      const expectedEffective = Number(bundle.baseline.statuses.EFFECTIVE) + (bundle.items as BundleItem[]).length;
      const expectedPendingContent = Number(bundle.baseline.statuses.PENDING_CONTENT_VALIDATION) - (bundle.items as BundleItem[]).length;
      if (after.identityCount !== bundle.baseline.identityCount || after.statuses.EFFECTIVE !== expectedEffective
        || after.statuses.PENDING_CONTENT_VALIDATION !== expectedPendingContent || after.statuses.PENDING_VERSION_DECISION !== 146
        || after.effectiveDraftIntegrity.identities !== expectedEffective || after.effectiveDraftIntegrity.draft_rows !== expectedEffective
        || after.effectiveDraftIntegrity.matching_hashes !== expectedEffective || after.effectiveDraftIntegrity.rights_mismatches !== 0
        || after.pendingVersionIdentities !== 146 || stable(mediaBefore) !== stable(mediaAfter)) throw new Error("POST_APPLY_INTEGRITY_GATE_FAILED");
      const [newRows] = await tx<Row[]>`SELECT count(*)::int AS count FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} i
        JOIN ${tx.unsafe(`${SCHEMA}.draft_proposals`)} d ON d.proposal_key = i.proposal_key
        JOIN ${tx.unsafe(`${SCHEMA}.candidate_versions`)} cv ON cv.proposal_key = i.proposal_key AND trim(cv.candidate_content_hash) = trim(i.effective_content_hash)
        JOIN jsonb_to_recordset(${tx.json(bundle.items.map((item: BundleItem) => ({ proposal_key: item.proposalKey,
          candidate_content: item.recoveredCandidateContent })))}::jsonb) AS expected(proposal_key text, candidate_content jsonb)
          ON expected.proposal_key = i.proposal_key AND cv.candidate_content = expected.candidate_content
        WHERE i.staging_batch_id = ${bundle.batchId} AND i.resolution_status = 'EFFECTIVE' AND d.editorial_status = 'DRAFT'
          AND d.rights_status = i.rights_status AND cv.selection_status = 'EFFECTIVE'
          AND i.source_provenance->'masterV2PendingContentArtifactRecoveryV1'->>'planFingerprint' = ${bundle.planFingerprint}`;
      if (Number(newRows.count) !== bundle.items.length) throw new Error("POST_APPLY_BATCH_READBACK_FAILED");
      return { outcome: "APPLIED", applied: bundle.items.length, before, after, mediaPreserved: true,
        newRows: Number(newRows.count), batchId: bundle.batchId, planFingerprint: bundle.planFingerprint };
    });
  } finally { await sql.end({ timeout: 5 }); }
  const runtimeAfter = await runtimeCounts();
  result.runtimePreserved = stable(runtimeBefore) === stable(runtimeAfter);
  result.runtimeCountsAfter = runtimeAfter;
  const report = { reportVersion: "master-v2-development-sync-report-v1", target: TARGET, bundle: path.relative(ROOT, BUNDLE_PATH).replaceAll("\\", "/"), ...result,
    boundaries: { runtimeVocabularyWrites: false, learnerProgressWrites: false, reviewHistoryWrites: false, publicationStatusWrites: false,
      senseTextRewritten: false, rightsChanged: false, mediaMetadataChanged: false, productionAccessed: false } };
  mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`NEON_SYNC=${result.outcome}\nNEW_EFFECTIVE_DRAFTS=${result.applied}\nSTAGING_IDENTITIES=${result.after.identityCount}\nEFFECTIVE_SENSES=${result.after.statuses.EFFECTIVE}\nPENDING_CONTENT=${result.after.statuses.PENDING_CONTENT_VALIDATION}\nPENDING_VERSION=${result.after.statuses.PENDING_VERSION_DECISION}\nMEDIA_PRESERVED=YES\nRUNTIME_PRESERVED=YES\nREPORT=${path.relative(ROOT, REPORT_PATH).replaceAll("\\", "/")}\n`);
}

async function exportSnapshot() {
  activePhase = "SNAPSHOT_SOURCE_PINS";
  const bundle = readBundle();
  const { sql } = await connectVerified("bootstrap");
  try {
    activePhase = "SNAPSHOT_READBACK";
    const captured = await sql.begin(async (tx: any) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const [identity] = await tx<Row[]>`SELECT current_database() AS database_name, current_user AS role_name,
        current_setting('transaction_read_only') AS read_only,
        (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id,
        (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id`;
      if (identity?.database_name !== TARGET.databaseName || identity.role_name !== "vocabflow_identity_bootstrap" || identity.read_only !== "on"
        || identity.project_id !== TARGET.projectId || identity.branch_id !== TARGET.branchId) throw new Error("SNAPSHOT_READ_TARGET_MISMATCH");
      const summary = await readBaseline(tx);
      const effectiveRows = await tx<Row[]>`SELECT i.proposal_key, i.source_group_key, trim(i.effective_content_hash) AS identity_content_hash,
        i.rights_status AS identity_rights_status, i.source_provenance AS identity_source_provenance, trim(i.staging_batch_id) AS identity_batch_id,
        d.headword, d.part_of_speech, d.sense_identity, d.definition_en, d.meaning_vi, d.examples, d.usage_notes, d.display_form,
        d.editorial_status, d.rights_status AS draft_rights_status, trim(d.effective_content_hash) AS draft_content_hash,
        trim(d.batch_id) AS draft_batch_id, d.source_provenance AS draft_source_provenance,
        COALESCE(cv.versions, '[]'::jsonb) AS candidate_versions
        FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} i
        JOIN ${tx.unsafe(`${SCHEMA}.draft_proposals`)} d ON d.proposal_key = i.proposal_key
        LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('contentHash', trim(candidate_content_hash), 'selectionStatus', selection_status,
          'batchId', trim(staging_batch_id)) ORDER BY candidate_content_hash) AS versions
          FROM ${tx.unsafe(`${SCHEMA}.candidate_versions`)} WHERE proposal_key = i.proposal_key) cv ON true
        WHERE i.resolution_status = 'EFFECTIVE' ORDER BY i.proposal_key`;
      const [versions] = await tx<Row[]>`SELECT count(*) FILTER (WHERE selected_count = 1)::int AS exactly_one_selected_version,
        count(*) FILTER (WHERE selected_count = 0)::int AS no_selected_version, count(*) FILTER (WHERE selected_count > 1)::int AS multiple_selected_versions
        FROM (SELECT i.proposal_key, count(*) FILTER (WHERE cv.selection_status = 'EFFECTIVE'
          AND trim(cv.candidate_content_hash) = trim(i.effective_content_hash))::int AS selected_count
          FROM ${tx.unsafe(`${SCHEMA}.identity_registry`)} i LEFT JOIN ${tx.unsafe(`${SCHEMA}.candidate_versions`)} cv ON cv.proposal_key = i.proposal_key
          WHERE i.resolution_status = 'EFFECTIVE' GROUP BY i.proposal_key) selected`;
      const batches = await tx<Row[]>`SELECT ib.batch_id, trim(ib.bundle_sha256) AS bundle_sha256, trim(ib.source_fingerprint) AS source_fingerprint,
        ib.completeness, ib.group_count, ib.proposal_count, count(d.proposal_key) FILTER (WHERE i.resolution_status = 'EFFECTIVE')::int AS effective_draft_rows,
        count(d.proposal_key) FILTER (WHERE i.resolution_status = 'EFFECTIVE' AND trim(d.effective_content_hash) = trim(i.effective_content_hash))::int AS effective_hash_matches
        FROM ${tx.unsafe(`${SCHEMA}.import_batches`)} ib
        LEFT JOIN ${tx.unsafe(`${SCHEMA}.draft_proposals`)} d ON trim(d.batch_id) = trim(ib.batch_id)
        LEFT JOIN ${tx.unsafe(`${SCHEMA}.identity_registry`)} i ON i.proposal_key = d.proposal_key
        GROUP BY ib.batch_id, ib.bundle_sha256, ib.source_fingerprint, ib.completeness, ib.group_count, ib.proposal_count
        ORDER BY ib.batch_id`;
      const mediaCounts = await currentMediaCounts(tx);
      return { identity, summary, effectiveRows, versions, batches, mediaCounts };
    });
    if (captured.summary.identityCount !== 7473 || captured.summary.statuses.EFFECTIVE !== 7312
      || captured.summary.statuses.PENDING_CONTENT_VALIDATION !== 15 || captured.summary.statuses.PENDING_VERSION_DECISION !== 146
      || captured.summary.effectiveDraftIntegrity.identities !== 7312 || captured.summary.effectiveDraftIntegrity.draft_rows !== 7312
      || captured.summary.effectiveDraftIntegrity.matching_hashes !== 7312 || captured.summary.effectiveDraftIntegrity.rights_mismatches !== 0
      || captured.effectiveRows.length !== 7312 || Number(captured.versions.multiple_selected_versions) !== 0
      || Number(captured.versions.no_selected_version) !== 573 || captured.mediaCounts.assets !== 13977
      || captured.mediaCounts.mappings !== 14012 || captured.mediaCounts.rights !== 13977) throw new Error("SNAPSHOT_POST_SYNC_INTEGRITY_FAILED");
    const senses = captured.effectiveRows.map((row: Row) => {
      const content = { sourceGroupKey: row.source_group_key, headword: row.headword, partOfSpeech: row.part_of_speech,
        senseIdentity: row.sense_identity, definitionEn: row.definition_en, meaningVi: row.meaning_vi,
        examples: row.examples, usageNotes: row.usage_notes, displayForm: row.display_form };
      if (row.identity_content_hash !== row.draft_content_hash || row.editorial_status !== "DRAFT"
        || row.identity_rights_status !== row.draft_rights_status || !row.identity_source_provenance || !row.draft_source_provenance) {
        throw new Error(`SNAPSHOT_SENSE_PROJECTION_MISMATCH:${row.proposal_key}`);
      }
      return { proposalKey: row.proposal_key, sourceGroupKey: row.source_group_key, contentHash: row.identity_content_hash,
        contentFingerprint: sha256(stable(content)), editorialStatus: row.editorial_status, rightsStatus: row.draft_rights_status,
        identityBatchId: row.identity_batch_id, draftBatchId: row.draft_batch_id,
        identityProvenanceFingerprint: sha256(stable(row.identity_source_provenance)),
        draftProvenanceFingerprint: sha256(stable(row.draft_source_provenance)),
        candidateVersions: row.candidate_versions };
    });
    const payload = {
      snapshotVersion: "resolved-effective-staging-snapshot-v1",
      target: { ...TARGET, schema: SCHEMA, environment: "development", role: captured.identity.role_name },
      source: { resolutionPlanFingerprint: bundle.planFingerprint, sourceInventoryFingerprint: bundle.source.acceptedInventoryFingerprint },
      statusCounts: captured.summary.statuses,
      versionIntegrity: captured.versions,
      importBatchLineage: captured.batches,
      mediaCounts: captured.mediaCounts,
      runtimeCountsAtCapture: await runtimeCounts(),
      senses,
    };
    const stagingFingerprintPayload = { ...payload };
    delete stagingFingerprintPayload.runtimeCountsAtCapture;
    const snapshotFingerprint = sha256(stable(stagingFingerprintPayload));
    const serialized = `${JSON.stringify({ ...payload, snapshotFingerprint }, null, 2)}\n`;
    const snapshotSha256 = sha256(serialized);
    mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, serialized, "utf8");
    writeFileSync(`${SNAPSHOT_PATH}.sha256`, `${snapshotSha256}  resolved-effective-staging-snapshot-v1.json\n`, "utf8");
    process.stdout.write(`STAGING_SNAPSHOT=PASS\nSTAGING_EFFECTIVE=${senses.length}\nSTAGING_SNAPSHOT_SHA256=${snapshotSha256}\nSTAGING_SNAPSHOT_FINGERPRINT=${snapshotFingerprint}\nVERSION_ROWS=${captured.versions.exactly_one_selected_version}\nRECOVERED_WITHOUT_CANDIDATE_HISTORY=${captured.versions.no_selected_version}\nSNAPSHOT=${path.relative(ROOT, SNAPSHOT_PATH).replaceAll("\\", "/")}\n`);
  } finally { await sql.end({ timeout: 5 }); }
}

async function main() {
  loadEnvFile(".env");
  const mode = process.argv[2];
  if (mode === "--plan") return plan();
  if (mode === "--apply") return apply();
  if (mode === "--snapshot") return exportSnapshot();
  throw new Error("MODE_REQUIRED");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "MASTER_V2_DEVELOPMENT_SYNC_FAILED";
  const safe = /^[A-Z][A-Z0-9_:.-]{2,180}$/.test(message) ? message : "MASTER_V2_DEVELOPMENT_SYNC_FAILED";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const detail = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "<redacted-db-url>")
    .replace(/(password|api[_-]?key|api[_-]?secret)\s*[:=]\s*[^\s,;]+/gi, "$1=<redacted>").replace(/[\r\n\t]+/g, " ").slice(0, 180) : "";
  process.stderr.write(`MASTER_V2_DEVELOPMENT_SYNC=FAIL\nPHASE=${activePhase}\nCODE=${safe}\n${/^[A-Z0-9_]{2,30}$/.test(code) ? `ERROR_CODE=${code}\n` : ""}${detail ? `ERROR_DETAIL=${detail}\n` : ""}`);
  process.exitCode = 1;
});
