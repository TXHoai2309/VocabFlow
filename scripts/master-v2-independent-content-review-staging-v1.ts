import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { getConnectionTarget } from "../config/database-targets";
import { assertPostConnectIdentity, openSql } from "./db-core";
import { assertMarkers, assertResolvedTargetBeforeMutation } from "./runtime-validation";

const ROOT = process.cwd();
const WORKSPACE = "vocabflow-dataset/workspaces/master-v2-development-sync";
const QUEUE_PATH = `${WORKSPACE}/independent-content-review-queue-v1.json`;
const QUEUE_FILE = path.join(ROOT, QUEUE_PATH);
const SCHEMA = "vocabflow_editorial_staging";
const TABLE = `${SCHEMA}.independent_content_review_events_v1`;
const TARGET = {
  projectId: "shy-hill-72364426",
  branchId: "br-square-grass-b3af0nte",
  databaseName: "neondb",
  endpointId: "ep-small-shadow-b3ny4993",
};
const REVIEW_RECEIPTS = [
  `${WORKSPACE}/independent-review-receipt-a.json`,
  `${WORKSPACE}/independent-review-receipt-b.json`,
  `${WORKSPACE}/independent-review-receipt-c.json`,
];
const REREVIEW_RECEIPTS = [
  `${WORKSPACE}/independent-review-rereview-receipt-a.json`,
  `${WORKSPACE}/independent-review-rereview-receipt-b.json`,
  `${WORKSPACE}/independent-review-rereview-receipt-c.json`,
];
const HASH_REPAIR_EXCEPTION_PINS = new Map<number, Row>([[3701, {
  bundlePath: `${WORKSPACE}/evidence-supported-pending-content-repair-v1.json`,
  bundleSha256: "29b015f1dca321453872181d9368f90f9ad9fbf0bf3e918d41a3cf48bc020cd9",
  batchId: "6c9c57841b213a659266da7deef790075c3055d49fed527ffaa52c66b3d45090",
  planFingerprint: "11ba255033f0970599a954e106c45797ebd59b0c1e3c3e124d5e4723fc0e7b5c",
  previousHash: "707a650c42c2cd8a802e070d5d3d231a2fda942c45598464cfcd0e5cd0efb30c",
  effectiveHash: "e56826c18b07eff91fb7f90ffbd1fba427bd3ea0cb9c68d709c7b24ae4a0a0f7",
  proposalKey: "PHASE_E_2026_10_12:assume:core-sense",
  sourceGroupKey: "NORMALIZED_HEADWORD:assume",
  headword: "assume",
  partOfSpeech: "VERB",
}], [3978, {
  bundlePath: `${WORKSPACE}/evidence-supported-pending-content-repair-v1.json`,
  bundleSha256: "29b015f1dca321453872181d9368f90f9ad9fbf0bf3e918d41a3cf48bc020cd9",
  batchId: "6c9c57841b213a659266da7deef790075c3055d49fed527ffaa52c66b3d45090",
  planFingerprint: "11ba255033f0970599a954e106c45797ebd59b0c1e3c3e124d5e4723fc0e7b5c",
  previousHash: "d1d9124fcd8af7e3b4bbd72983afcc198f836ba4ac87b04de735d0fe96a88d2e",
  effectiveHash: "6d23bc8b0faba74f4bff8a4c1dd94f91db1f49c77095f6d39768e27129c4d0bd",
  proposalKey: "PHASE_E_2026_10_12:disturb:core-sense",
  sourceGroupKey: "NORMALIZED_HEADWORD:disturb",
  headword: "disturb",
  partOfSpeech: "VERB",
}], [6445, {
  bundlePath: `${WORKSPACE}/evidence-supported-pending-content-repair-v1.json`,
  bundleSha256: "29b015f1dca321453872181d9368f90f9ad9fbf0bf3e918d41a3cf48bc020cd9",
  batchId: "6c9c57841b213a659266da7deef790075c3055d49fed527ffaa52c66b3d45090",
  planFingerprint: "11ba255033f0970599a954e106c45797ebd59b0c1e3c3e124d5e4723fc0e7b5c",
  previousHash: "6729d0da6074424d861d1e0209c43829e92de7ad0c0d84dbbbfd4050a1a9c149",
  effectiveHash: "e99c0f989c754859201af98b4beeed4b9f37217177fb07b0ee237a1ed183622e",
  proposalKey: "PROVISIONAL_BULK_2026_02:biscuit:core-sense",
  sourceGroupKey: "NORMALIZED_HEADWORD:biscuit",
  headword: "biscuit",
  partOfSpeech: "NOUN",
}], [6455, {
  bundlePath: `${WORKSPACE}/evidence-supported-pending-content-repair-v1.json`,
  bundleSha256: "29b015f1dca321453872181d9368f90f9ad9fbf0bf3e918d41a3cf48bc020cd9",
  batchId: "6c9c57841b213a659266da7deef790075c3055d49fed527ffaa52c66b3d45090",
  planFingerprint: "11ba255033f0970599a954e106c45797ebd59b0c1e3c3e124d5e4723fc0e7b5c",
  previousHash: "38d196b20341e86ae34d1228ec07d603f69e8710f481f30bb41e811c3358c223",
  effectiveHash: "dc2af01355e91c4486408f3b3232f5235b2eee8a08e5d7907279b0d880cc4e73",
  proposalKey: "PROVISIONAL_BULK_2026_02:breathing:core-sense",
  sourceGroupKey: "NORMALIZED_HEADWORD:breathing",
  headword: "breathing",
  partOfSpeech: "NOUN",
}], [6835, {
  bundlePath: `${WORKSPACE}/evidence-supported-pending-content-repair-v1.json`,
  bundleSha256: "29b015f1dca321453872181d9368f90f9ad9fbf0bf3e918d41a3cf48bc020cd9",
  batchId: "6c9c57841b213a659266da7deef790075c3055d49fed527ffaa52c66b3d45090",
  planFingerprint: "11ba255033f0970599a954e106c45797ebd59b0c1e3c3e124d5e4723fc0e7b5c",
  previousHash: "cd7e4e0bb3b9fc119ff600e066f7ef74ab7be88a725b44a27ec6daf146c48647",
  effectiveHash: "3c389cc78bf636e861ab872023f0558c9e83e9c6695540148378b07f3ebe5783",
  proposalKey: "PROVISIONAL_BULK_2026_02:marriage:core-sense",
  sourceGroupKey: "NORMALIZED_HEADWORD:marriage",
  headword: "marriage",
  partOfSpeech: "NOUN",
}], [6995, {
  bundlePath: `${WORKSPACE}/evidence-supported-pending-content-repair-v1.json`,
  bundleSha256: "29b015f1dca321453872181d9368f90f9ad9fbf0bf3e918d41a3cf48bc020cd9",
  batchId: "6c9c57841b213a659266da7deef790075c3055d49fed527ffaa52c66b3d45090",
  planFingerprint: "11ba255033f0970599a954e106c45797ebd59b0c1e3c3e124d5e4723fc0e7b5c",
  previousHash: "6376bbdd5f3835d893105919c8142cf774e62eaba233535d546da00a967474f4",
  effectiveHash: "7b6f3afeaf06f0b2738ec39b49814f3c09e86182dad404256177d6ffc21e4a6e",
  proposalKey: "PROVISIONAL_BULK_2026_02:pub:core-sense",
  sourceGroupKey: "NORMALIZED_HEADWORD:pub",
  headword: "pub",
  partOfSpeech: "NOUN",
}]]);
const EXPECTED_COLUMNS = [
  "event_id", "event_sha256", "queue_sha256", "queue_index", "proposal_key", "source_group_key",
  "effective_content_hash", "decision", "reviewer_identity", "reviewer_role", "reviewed_at",
  "receipt_checkpoint_at", "receipt_path", "receipt_sha256", "rights_status", "approval_granted",
  "release_eligible", "evidence",
];

type Row = Record<string, any>;

function sha(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: any): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function readBytes(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath));
}

function readJson(relativePath: string): Row {
  return JSON.parse(readBytes(relativePath).toString("utf8"));
}

function loadDevelopmentEnv() {
  if (existsSync(path.join(ROOT, ".env.local"))) loadEnvFile(path.join(ROOT, ".env.local"));
  if (existsSync(path.join(ROOT, ".env"))) loadEnvFile(path.join(ROOT, ".env"));
  if (process.env.DATABASE_ENV !== "development" || process.env.VOCABFLOW_ENV !== "development"
    || process.env.VERCEL_ENV || (process.env.EXECUTION_CONTEXT && process.env.EXECUTION_CONTEXT !== "local-development")) {
    throw new Error("INDEPENDENT_REVIEW_STAGING_LOCAL_DEVELOPMENT_ONLY");
  }
}

function assertEndpoint(url: string) {
  const endpoint = new URL(url).hostname.split(".")[0]?.replace(/-pooler$/u, "");
  if (endpoint !== TARGET.endpointId) throw new Error("INDEPENDENT_REVIEW_DEVELOPMENT_ENDPOINT_MISMATCH");
}

async function connect(purpose: "bootstrap" | "migration") {
  const { context, environment } = await import("./db-core").then((module) => module.readContext());
  assertMarkers(context, "dev-launcher", environment);
  if (context !== "local-development" || environment !== "development") throw new Error("INDEPENDENT_REVIEW_LOCAL_DEVELOPMENT_ONLY");
  const target = getConnectionTarget("development", purpose);
  if (target.projectId !== TARGET.projectId || target.branchId !== TARGET.branchId || target.databaseName !== TARGET.databaseName) {
    throw new Error("INDEPENDENT_REVIEW_DATABASE_TARGET_MISMATCH");
  }
  const resolved = await assertResolvedTargetBeforeMutation({
    context,
    source: "dev-launcher",
    environment,
    purpose,
    operation: "db-migrate",
    target,
  });
  assertEndpoint(resolved.url);
  const sql = openSql(resolved.url);
  try {
    await assertPostConnectIdentity(sql, target);
    const [identity] = await sql`SELECT current_database() AS database_name, current_user AS role_name,
      (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id=1) AS project_id,
      (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id=1) AS branch_id`;
    if (identity?.database_name !== TARGET.databaseName || identity?.project_id !== TARGET.projectId
      || identity?.branch_id !== TARGET.branchId || identity?.role_name !== target.roleName) {
      throw new Error("INDEPENDENT_REVIEW_CONNECTED_DATABASE_IDENTITY_MISMATCH");
    }
    return { sql, target };
  } catch (error) {
    await sql.end({ timeout: 5 });
    throw error;
  }
}

async function provision() {
  const { sql } = await connect("bootstrap");
  try {
    await sql.begin(async (tx) => {
      const [isolation] = await tx`SELECT pg_get_userbyid(n.nspowner) AS schema_owner,
        has_schema_privilege('vocabflow_runtime', n.oid, 'USAGE') AS runtime_usage,
        has_schema_privilege('vocabflow_identity_bootstrap', n.oid, 'CREATE') AS bootstrap_create
        FROM pg_namespace n WHERE n.nspname=${SCHEMA}`;
      if (isolation?.schema_owner !== "vocabflow_identity_bootstrap" || isolation.runtime_usage !== false || isolation.bootstrap_create !== true) {
        throw new Error("INDEPENDENT_REVIEW_STAGING_ISOLATION_PREFLIGHT_FAILED");
      }
      await tx.unsafe(`CREATE TABLE IF NOT EXISTS ${TABLE} (
        event_id text PRIMARY KEY CHECK (event_id ~ '^[0-9a-f]{64}$'),
        event_sha256 text NOT NULL CHECK (event_sha256 ~ '^[0-9a-f]{64}$'),
        queue_sha256 text NOT NULL CHECK (queue_sha256 ~ '^[0-9a-f]{64}$'),
        queue_index integer NOT NULL CHECK (queue_index >= 0),
        proposal_key text NOT NULL,
        source_group_key text NOT NULL,
        effective_content_hash text NOT NULL CHECK (effective_content_hash ~ '^[0-9a-f]{64}$'),
        decision text NOT NULL CHECK (decision IN ('PASS','FAIL','REVIEW_REQUIRED')),
        reviewer_identity text NOT NULL,
        reviewer_role text NOT NULL,
        reviewed_at timestamptz,
        receipt_checkpoint_at timestamptz,
        receipt_path text NOT NULL,
        receipt_sha256 text NOT NULL CHECK (receipt_sha256 ~ '^[0-9a-f]{64}$'),
        rights_status text NOT NULL CHECK (rights_status='UNKNOWN_REVIEW_REQUIRED'),
        approval_granted boolean NOT NULL DEFAULT false CHECK (approval_granted=false),
        release_eligible boolean NOT NULL DEFAULT false CHECK (release_eligible=false),
        evidence jsonb NOT NULL,
        recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
      )`);
      await tx.unsafe(`REVOKE ALL ON ${TABLE} FROM PUBLIC, vocabflow_runtime`);
      await tx.unsafe(`GRANT USAGE ON SCHEMA ${SCHEMA} TO vocabflow_migration`);
      await tx.unsafe(`GRANT SELECT, INSERT ON ${TABLE} TO vocabflow_migration`);
    });
    await verifySchema(sql);
    process.stdout.write("INDEPENDENT_REVIEW_STAGING_TABLE=READY\nRUNTIME_ISOLATION=PASS\nMIGRATION_ROLE=SELECT_INSERT_ONLY\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function verifySchema(sql: ReturnType<typeof openSql>) {
  const [table] = await sql`SELECT to_regclass(${TABLE}) IS NOT NULL AS present`;
  if (table?.present !== true) throw new Error("INDEPENDENT_REVIEW_STAGING_TABLE_MISSING");
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema=${SCHEMA} AND table_name='independent_content_review_events_v1' ORDER BY ordinal_position`;
  if (cols.map((r) => r.column_name).join("|") !== [...EXPECTED_COLUMNS, "recorded_at"].join("|")) {
    throw new Error("INDEPENDENT_REVIEW_STAGING_TABLE_SHAPE_MISMATCH");
  }
  const [schemaGrant] = await sql`SELECT has_schema_privilege('vocabflow_runtime', ${SCHEMA}, 'USAGE') AS runtime_usage`;
  const [privileges] = await sql`SELECT
    has_table_privilege('vocabflow_migration', ${TABLE}, 'SELECT') AS migration_select,
    has_table_privilege('vocabflow_migration', ${TABLE}, 'INSERT') AS migration_insert,
    has_table_privilege('vocabflow_migration', ${TABLE}, 'UPDATE') AS migration_update,
    has_table_privilege('vocabflow_migration', ${TABLE}, 'DELETE') AS migration_delete,
    has_table_privilege('vocabflow_runtime', ${TABLE}, 'SELECT') AS runtime_select,
    has_table_privilege('vocabflow_runtime', ${TABLE}, 'INSERT') AS runtime_insert,
    has_table_privilege('vocabflow_runtime', ${TABLE}, 'UPDATE') AS runtime_update,
    has_table_privilege('vocabflow_runtime', ${TABLE}, 'DELETE') AS runtime_delete`;
  if (schemaGrant?.runtime_usage !== false || privileges?.migration_select !== true || privileges?.migration_insert !== true
    || privileges?.migration_update !== false || privileges?.migration_delete !== false
    || privileges?.runtime_select !== false || privileges?.runtime_insert !== false || privileges?.runtime_update !== false || privileges?.runtime_delete !== false) {
    throw new Error("INDEPENDENT_REVIEW_STAGING_GRANTS_MISMATCH");
  }
}

async function readRuntimeCounts() {
  const { context, environment } = await import("./db-core").then((module) => module.readContext());
  const target = getConnectionTarget("development", "runtime");
  const resolved = await assertResolvedTargetBeforeMutation({
    context,
    source: "dev-launcher",
    environment,
    purpose: "runtime",
    operation: "db-check",
    target,
  });
  assertEndpoint(resolved.url);
  const sql = openSql(resolved.url);
  try {
    await assertPostConnectIdentity(sql, target);
    return await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const tables = await tx`SELECT table_name FROM information_schema.tables WHERE table_schema='vocabflow_app'
        AND table_type='BASE TABLE' ORDER BY table_name`;
      const counts: Record<string, number> = {};
      for (const { table_name } of tables) {
        const safeName = String(table_name).replaceAll('"', '""');
        const [row] = await tx.unsafe(`SELECT count(*)::int AS n FROM "vocabflow_app"."${safeName}"`);
        counts[table_name] = row.n;
      }
      return counts;
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function normalizeDecision(entry: Row) {
  const decision = entry.decision ?? entry.verdict ?? entry.disposition;
  if (!["PASS", "FAIL", "REVIEW_REQUIRED"].includes(decision)) throw new Error(`REVIEW_DECISION_INVALID:${entry.queueIndex}`);
  return decision as "PASS" | "FAIL" | "REVIEW_REQUIRED";
}

function buildEvents() {
  const queue = readJson(QUEUE_PATH);
  const { queueSha256, ...queueBody } = queue;
  if (!Array.isArray(queue.entries) || queue.entries.length !== 7320 || sha(stable(queueBody)) !== queueSha256) {
    throw new Error("INDEPENDENT_REVIEW_QUEUE_HASH_OR_COUNT_MISMATCH");
  }
  const inventory = queue.entries.map(({ proposalKey, sourceGroupKey, effectiveContentHash }: Row) => ({ proposalKey, sourceGroupKey, effectiveContentHash }));
  if (sha(stable(inventory)) !== queue.identityHashInventorySha256) throw new Error("INDEPENDENT_REVIEW_QUEUE_IDENTITY_INVENTORY_MISMATCH");

  const inventoryFiles = new Map<string, { bytes: Buffer; records: Row[] }>();
  const verifiedExternalFilePins = new Map<string, string>();
  const verifyFilePin = (relativePath: string, expectedSha: string) => {
    const prior = verifiedExternalFilePins.get(relativePath);
    if (prior) {
      if (prior !== expectedSha) throw new Error(`REVIEW_FILE_PIN_CONFLICT:${relativePath}`);
      return;
    }
    if (sha(readBytes(relativePath)) !== expectedSha) throw new Error(`REVIEW_EXTERNAL_FILE_HASH_MISMATCH:${relativePath}`);
    verifiedExternalFilePins.set(relativePath, expectedSha);
  };
  const pinInventory = (pin: Row) => {
      if (!pin?.path || !/^[0-9a-f]{64}$/u.test(pin.sha256 ?? "")) throw new Error("REVIEW_SOURCE_INVENTORY_PIN_INVALID");
      if (!inventoryFiles.has(pin.path)) {
        const bytes = readBytes(pin.path);
        if (sha(bytes) !== pin.sha256) throw new Error(`REVIEW_SOURCE_INVENTORY_FILE_HASH_MISMATCH:${pin.path}`);
        const parsed = JSON.parse(bytes.toString("utf8"));
        if (!Array.isArray(parsed.records)) throw new Error(`REVIEW_SOURCE_INVENTORY_SHAPE_INVALID:${pin.path}`);
        inventoryFiles.set(pin.path, { bytes, records: parsed.records });
      }
  };
  const artifactCache = new Map<string, { bytesSha: string; records: Row[] }>();
  const repairBundleCache = new Map<string, { sha256: string; bundle: Row }>();
  const verifyStagingRepairLineage = (entry: Row, receiptEntry: Row) => {
    const repair = entry.sourceProvenance?.stagingRepair;
    if (!repair) return null;
    const queueIndex = Number(receiptEntry.queueIndex);
    const pin = HASH_REPAIR_EXCEPTION_PINS.get(queueIndex);
    if (!pin) throw new Error(`REVIEW_UNREGISTERED_STAGING_REPAIR:${entry.proposalKey}:${queueIndex}`);
    if (receiptEntry.stagingRepairBundleSha256 !== pin.bundleSha256
      || receiptEntry.stagingRepairBatchId !== pin.batchId
      || receiptEntry.hashVerificationMethod !== "CANONICAL_SHA256_OF_HASH_PINNED_STAGING_REPAIR_BUNDLE_CANDIDATE_PAYLOAD") {
      throw new Error(`REVIEW_STAGING_REPAIR_ATTESTATION_MISSING:${entry.proposalKey}:${queueIndex}`);
    }
    if (sha(readBytes(pin.bundlePath)) !== pin.bundleSha256) {
      throw new Error(`REVIEW_STAGING_REPAIR_BUNDLE_HASH_MISMATCH:${entry.proposalKey}`);
    }
    let cached = repairBundleCache.get(pin.bundlePath);
    if (!cached) {
      cached = { sha256: pin.bundleSha256, bundle: readJson(pin.bundlePath) };
      repairBundleCache.set(pin.bundlePath, cached);
    } else if (cached.sha256 !== pin.bundleSha256) {
      throw new Error(`REVIEW_STAGING_REPAIR_BUNDLE_PIN_CONFLICT:${entry.proposalKey}`);
    }
    const item = (cached.bundle.items ?? []).find((candidate: Row) => candidate.proposalKey === pin.proposalKey);
    if (!item || cached.bundle.batchId !== pin.batchId || cached.bundle.planFingerprint !== pin.planFingerprint
      || item.sourceGroupKey !== pin.sourceGroupKey || item.previousCandidateHash !== pin.previousHash
      || item.candidateContentHash !== pin.effectiveHash || item.bodyFingerprint !== pin.effectiveHash
      || repair.batchId !== pin.batchId || repair.planFingerprint !== pin.planFingerprint
      || repair.previousCandidateHash !== pin.previousHash || repair.candidateContentHash !== pin.effectiveHash
      || repair.bodyFingerprint !== pin.effectiveHash || entry.proposalKey !== pin.proposalKey
      || entry.sourceGroupKey !== pin.sourceGroupKey || entry.headword !== pin.headword
      || entry.partOfSpeech !== pin.partOfSpeech || entry.effectiveContentHash !== pin.effectiveHash) {
      throw new Error(`REVIEW_STAGING_REPAIR_LINEAGE_MISMATCH:${entry.proposalKey}`);
    }
    const candidate = item.candidateContent;
    if (!candidate || candidate.headword !== pin.headword || candidate.partOfSpeech !== pin.partOfSpeech
      || candidate.definitionEn !== entry.content?.definitionEn || candidate.meaningVi !== entry.content?.meaningVi
      || stable(candidate.examples) !== stable(entry.content?.examples)
      || candidate.grammarNotesEn !== entry.content?.usageNotes) {
      throw new Error(`REVIEW_STAGING_REPAIR_CONTENT_PROJECTION_MISMATCH:${entry.proposalKey}`);
    }
    const payload = Object.fromEntries(["definitionEn", "examples", "grammarNotesEn", "meaningVi", "senseLabelEn"]
      .map((key) => [key, candidate[key] ?? null]));
    if (sha(stable(payload)) !== pin.effectiveHash) {
      throw new Error(`REVIEW_STAGING_REPAIR_CANONICAL_CONTENT_HASH_MISMATCH:${entry.proposalKey}`);
    }
    const sourceRefKey = (source: Row) => stable({
      corpus: source.corpus, recordIndex: source.recordIndex, sourceRecordId: source.sourceRecordId,
      sourceNoteGuid: source.sourceNoteGuid, recordEvidenceSha256: source.recordEvidenceSha256,
    });
    const queueRefs = (entry.sourceProvenance?.sourceEvidenceReferences ?? []).map(sourceRefKey).sort();
    const repairRefs = (item.sourceReferences?.sourceEvidenceReferences ?? []).map(sourceRefKey).sort();
    if (stable(queueRefs) !== stable(repairRefs)) {
      throw new Error(`REVIEW_STAGING_REPAIR_SOURCE_PIN_MISMATCH:${entry.proposalKey}`);
    }
    if (item.admission?.status !== repair.admission?.status || item.admission?.evaluatorSha256 !== repair.admission?.evaluatorSha256
      || item.admission?.status !== "PROVISIONAL_DRAFT_ONLY") {
      throw new Error(`REVIEW_STAGING_REPAIR_ADMISSION_MISMATCH:${entry.proposalKey}`);
    }
    return { previousHash: pin.previousHash, effectiveHash: pin.effectiveHash };
  };
  const verifyQueueEntry = (entry: Row, receiptEntry: Row) => {
    const provenance = entry.sourceProvenance ?? {};
    const rawInventoryPins = provenance.sourceInventoryFilePins ?? provenance.sourceInventoryPins ?? {};
    const inventoryPins: Row[] = Array.isArray(rawInventoryPins) ? rawInventoryPins : Object.entries(rawInventoryPins).map(([filename, value]: [string, any]) => ({
      path: `vocabflow-dataset/workspaces/full-source-inventory-dedupe/${filename}`,
      corpus: filename.startsWith("oxford") ? "OXFORD_5000" : filename.startsWith("vocab4600") ? "ENGLISH_VOCAB_4600" : undefined,
      sha256: typeof value === "string" ? value : value?.sha256,
    }));
    for (const pin of inventoryPins) pinInventory(pin);
    const sourceEvidenceReferences: Row[] = provenance.sourceEvidenceReferences ?? [];
    for (const ref of sourceEvidenceReferences) {
      const filePin = inventoryPins.find((x: Row) => x.corpus === ref.corpus || x.path.endsWith(ref.artifact ?? "!"));
      const sourceFile = filePin && inventoryFiles.get(filePin.path);
      const record = sourceFile?.records?.[ref.recordIndex];
      const recoveryPin = (provenance.recoverySourcePinVerification ?? []).find((x: Row) => x.sourceRecordId === ref.sourceRecordId);
      const duplicateOfVerifiedPin = ref.verificationStatus !== "PASS_RECORD_PIN" && sourceEvidenceReferences.some((candidate) =>
        candidate !== ref && candidate.verificationStatus === "PASS_RECORD_PIN"
        && candidate.artifact === ref.artifact
        && candidate.recordIndex === ref.recordIndex && candidate.sourceNoteGuid === ref.sourceNoteGuid
        && candidate.sourceRecordId === ref.sourceRecordId && candidate.recordEvidenceSha256 === ref.recordEvidenceSha256);
      if (record && (record.sourceRecordId !== ref.sourceRecordId || record.sourceNoteGuid !== ref.sourceNoteGuid
        || record.recordEvidenceSha256 !== ref.recordEvidenceSha256)) {
        throw new Error(`REVIEW_SOURCE_RECORD_PIN_MISMATCH:${entry.proposalKey}:${ref.corpus}:${ref.recordIndex}`);
      }
      if (!record && recoveryPin?.status !== "PASS_RECORD_PIN") throw new Error(`REVIEW_SOURCE_RECORD_PIN_UNVERIFIED:${entry.proposalKey}:${ref.sourceRecordId}`);
      if (ref.verificationStatus !== "PASS_RECORD_PIN" && recoveryPin?.status !== "PASS_RECORD_PIN" && !duplicateOfVerifiedPin) {
        throw new Error(`REVIEW_SOURCE_RECORD_PIN_UNVERIFIED:${entry.proposalKey}:${ref.sourceRecordId}`);
      }
    }
    for (const ref of provenance.sourceCueIdentityReferences ?? []) {
      const filePin = inventoryPins.find((x: Row) => x.corpus === ref.corpus || x.path.endsWith(ref.artifact ?? "!"));
      const record = filePin && inventoryFiles.get(filePin.path)?.records?.[ref.recordIndex];
      if (!record || record.sourceRecordId !== ref.sourceRecordId || record.sourceNoteGuid !== ref.sourceNoteGuid
        || record.recordEvidenceSha256 !== ref.recordEvidenceSha256) {
        throw new Error(`REVIEW_SOURCE_CUE_PIN_MISMATCH:${entry.proposalKey}:${ref.sourceCueKey}`);
      }
    }
    const stagingRepairLineage = verifyStagingRepairLineage(entry, receiptEntry);
    const refs = provenance.candidateArtifactReferences ?? [];
    let matchingCandidate = false;
    for (const ref of refs) {
      const relativePath = path.join("vocabflow-dataset/workspaces/master-editorial-high-throughput-500-03", ref.path).replaceAll("\\", "/");
      let cached = artifactCache.get(relativePath);
      if (!cached) {
        const bytes = readBytes(relativePath);
        if (sha(bytes) !== ref.sha256) throw new Error(`REVIEW_CANDIDATE_ARTIFACT_FILE_HASH_MISMATCH:${relativePath}`);
        const parsed = JSON.parse(bytes.toString("utf8"));
        if (!Array.isArray(parsed.records)) throw new Error(`REVIEW_CANDIDATE_ARTIFACT_SHAPE_INVALID:${relativePath}`);
        cached = { bytesSha: sha(bytes), records: parsed.records };
        artifactCache.set(relativePath, cached);
      } else if (cached.bytesSha !== ref.sha256) throw new Error(`REVIEW_CANDIDATE_ARTIFACT_PIN_CONFLICT:${relativePath}`);
      const pointerParts = String(ref.jsonPointer ?? "").split("/").slice(1).map((part: string) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
      let candidate: any = cached.records;
      let index = Number.NaN;
      const recordParts = pointerParts[0] === "records" ? pointerParts.slice(1) : pointerParts;
      for (const [partIndex, part] of recordParts.entries()) {
        if (partIndex === 0 && /^\d+$/u.test(part)) index = Number(part);
        candidate = candidate?.[part];
      }
      if (candidate && typeof candidate === "object" && !candidate.proposalKey && recordParts.at(-1) === "content") {
        candidate = cached.records[index];
      }
      if (!candidate || (candidate.proposalKey && candidate.proposalKey !== entry.proposalKey)
        || ((candidate.candidateGroupKey ?? candidate.sourceGroupKey) && (candidate.candidateGroupKey ?? candidate.sourceGroupKey) !== entry.sourceGroupKey)
        || (candidate.effectiveContentHash && candidate.effectiveContentHash !== entry.effectiveContentHash
          && !(stagingRepairLineage && candidate.effectiveContentHash === stagingRepairLineage.previousHash))
        || (candidate.headword && candidate.headword !== entry.headword)
        || ((candidate.partOfSpeech ?? candidate.partOfSpeechProposal) && (candidate.partOfSpeech ?? candidate.partOfSpeechProposal) !== entry.partOfSpeech)) {
        throw new Error(`REVIEW_CANDIDATE_IDENTITY_OR_HASH_MISMATCH:${entry.proposalKey}:${relativePath}:${index}`);
      }
      if (candidate.effectiveContentHash === entry.effectiveContentHash) matchingCandidate = true;
      const content = candidate.content ?? candidate.candidateContent;
      if (content && candidate.proposalKey && candidate.candidateGroupKey && candidate.headword
        && (candidate.partOfSpeech ?? candidate.partOfSpeechProposal)) {
        const payload = {
          proposalKey: candidate.proposalKey,
          candidateGroupKey: candidate.candidateGroupKey,
          headword: candidate.headword,
          partOfSpeechProposal: candidate.partOfSpeech ?? candidate.partOfSpeechProposal,
          content: {
            definitionEn: content.definitionEn,
            examples: content.examples,
            grammarNotesEn: content.grammarNotesEn ?? null,
            meaningVi: content.meaningVi,
            senseLabelEn: content.senseLabelEn,
          },
        };
        if (sha(stable(payload)) === entry.effectiveContentHash) matchingCandidate = true;
      }
      // Phase E's pinned admission contract predates the identity-bound hash
      // format and defines effectiveContentHash as canonical_sha256(content).
      // Accept that contract only after the candidate's proposal, group,
      // headword, and POS have independently matched the queue identity above.
      const candidateGroupKey = candidate.candidateGroupKey ?? candidate.sourceGroupKey;
      const candidatePos = candidate.partOfSpeech ?? candidate.partOfSpeechProposal;
      const identityMatches = candidate.proposalKey === entry.proposalKey
        && candidateGroupKey === entry.sourceGroupKey
        && candidate.headword === entry.headword
        && candidatePos === entry.partOfSpeech;
      if (content && identityMatches && sha(stable(content)) === entry.effectiveContentHash) matchingCandidate = true;
    }
    if (stagingRepairLineage) matchingCandidate = true;
    const candidateVersionHashes = (entry.identitySourceProvenance?.candidateVersions ?? [])
      .map((x: Row) => x.candidateContentHash).filter(Boolean);
    const wordnetEvidence: Row[] = [
      ...(Array.isArray(provenance.recordEvidence) ? provenance.recordEvidence : []),
      ...(Array.isArray(provenance.oewnEvidenceReferences) ? provenance.oewnEvidenceReferences : []),
    ];
    const wordnet = provenance.providerId === "OPEN_ENGLISH_WORDNET_2025" || wordnetEvidence.length > 0;
    const receiptHashAttestation = receiptEntry.hashPinnedContentVerified === true
      || receiptEntry.contentHashVerifiedAgainstPinnedCandidateArtifacts === true
      || receiptEntry.evidence?.identityBoundCandidateHashVerified === true;
    if (!candidateVersionHashes.includes(entry.effectiveContentHash)
      && !(stagingRepairLineage && candidateVersionHashes.includes(stagingRepairLineage.previousHash))
      && !receiptHashAttestation) {
      throw new Error(`REVIEW_CANDIDATE_VERSION_HASH_MISSING:${entry.proposalKey}`);
    }
    if (!matchingCandidate) {
      if (!receiptHashAttestation) throw new Error(`REVIEW_CANDIDATE_CONTENT_HASH_UNVERIFIED:${entry.proposalKey}`);
      if (wordnet) {
      const archivePath = `${WORKSPACE}/evidence-source-acquisition/english-wordnet-2025-json.zip`;
      const archiveSha256 = provenance.archiveSha256 ?? wordnetEvidence[0]?.archiveSha256;
      verifyFilePin(archivePath, archiveSha256);
      if (wordnetEvidence.some((record: Row) => record.archiveSha256 !== archiveSha256)) {
        throw new Error(`REVIEW_WORDNET_ARCHIVE_PIN_MISMATCH:${entry.proposalKey}`);
      }
      }
    }
  };

  const seen = new Set<number>();
  const primaryEntries = new Map<number, Row>();
  const rereviewedQueueIndices = new Set<number>();
  const currentDecisions = new Map<number, string>();
  let rereviewCount = 0;
  const events: Row[] = [];
  for (const receiptPath of REVIEW_RECEIPTS) {
    const receiptBytes = readBytes(receiptPath);
    const receiptSha256 = sha(receiptBytes);
    const receipt = JSON.parse(receiptBytes.toString("utf8")) as Row;
    if (receipt.reviewerIdentity !== "/root/independent_review_a" && receipt.reviewerIdentity !== "/root/independent_review_b"
      && receipt.reviewerIdentity !== "/root/independent_review_c") throw new Error(`REVIEWER_IDENTITY_NOT_INDEPENDENT:${receiptPath}`);
    if (receipt.queueSha256 && receipt.queueSha256 !== queueSha256) throw new Error(`REVIEW_RECEIPT_QUEUE_PIN_MISMATCH:${receiptPath}`);
    if (receipt.inputQueueSha256 && receipt.inputQueueSha256 !== queueSha256) throw new Error(`REVIEW_RECEIPT_QUEUE_PIN_MISMATCH:${receiptPath}`);
    if (receipt.sourceQueueIdentityHashInventorySha256 && receipt.sourceQueueIdentityHashInventorySha256 !== queue.identityHashInventorySha256) {
      throw new Error(`REVIEW_RECEIPT_IDENTITY_INVENTORY_MISMATCH:${receiptPath}`);
    }
    for (const source of receipt.entries ?? []) {
      const queueIndex = Number(source.queueIndex);
      const queueEntry = queue.entries[queueIndex];
      if (!Number.isInteger(queueIndex) || !queueEntry || seen.has(queueIndex)
        || queueEntry.proposalKey !== source.proposalKey || queueEntry.sourceGroupKey !== source.sourceGroupKey
        || queueEntry.effectiveContentHash !== source.effectiveContentHash) {
        throw new Error(`REVIEW_RECEIPT_QUEUE_IDENTITY_MISMATCH:${receiptPath}:${queueIndex}`);
      }
      verifyQueueEntry(queueEntry, source);
      const decision = normalizeDecision(source);
      const reviewerIdentity = source.reviewerIdentity ?? receipt.reviewerIdentity;
      if (reviewerIdentity !== receipt.reviewerIdentity) throw new Error(`REVIEWER_IDENTITY_ENTRY_MISMATCH:${receiptPath}:${queueIndex}`);
      if (receipt.reviewerIdentity === "/root/independent_review_c" && source.hashPinnedContentVerified !== true) {
        throw new Error(`REVIEW_CANDIDATE_HASH_VERIFICATION_MISSING:${receiptPath}:${queueIndex}`);
      }
      const wordnetSourceEvidence = [
        ...(Array.isArray(queueEntry.sourceProvenance?.recordEvidence) ? queueEntry.sourceProvenance.recordEvidence : []),
        ...(Array.isArray(queueEntry.sourceProvenance?.oewnEvidenceReferences) ? queueEntry.sourceProvenance.oewnEvidenceReferences : []),
      ];
      if (receipt.reviewerIdentity === "/root/independent_review_c" && wordnetSourceEvidence.length) {
        const expectedPins = [...new Set(wordnetSourceEvidence.map((x: Row) => x.recordEvidenceSha256))].sort();
        const receiptPins = [...(source.sourceRecordEvidenceSha256s ?? [])].sort();
        if (stable(expectedPins) !== stable([...new Set(receiptPins)])) throw new Error(`REVIEW_WORDNET_RECORD_PINS_MISMATCH:${receiptPath}:${queueIndex}`);
      }
      const reviewedAt = source.reviewedAtUtc ?? null;
      const checkpointAt = receipt.checkpointCreatedAtUtc ?? null;
      const evidence = {
        entry: source,
        receiptPurpose: receipt.receiptPurpose ?? "Independent content review; no rights clearance or publication approval.",
        timestampStatus: reviewedAt ? "PER_ENTRY_TIMESTAMP" : checkpointAt ? "CHECKPOINT_TIMESTAMP_ONLY" : "NOT_CAPTURED_IN_RECEIPT",
        checkpointAt,
        rightsReview: "NOT_PERFORMED; rights remain UNKNOWN_REVIEW_REQUIRED",
        approvalGranted: false,
        releaseEligible: false,
      };
      const eventBody = {
        queueSha256,
        queueIndex,
        proposalKey: queueEntry.proposalKey,
        sourceGroupKey: queueEntry.sourceGroupKey,
        effectiveContentHash: queueEntry.effectiveContentHash,
        decision,
        reviewerIdentity,
        reviewerRole: "INDEPENDENT_CONTENT_REVIEWER",
        reviewedAt,
        checkpointAt,
        receiptPath: receiptPath.replaceAll("\\", "/"),
        receiptSha256,
        rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
        approvalGranted: false,
        releaseEligible: false,
        evidence,
      };
      const eventSha256 = sha(stable(eventBody));
      const eventId = sha(`${queueSha256}:${queueIndex}:${reviewerIdentity}:${eventSha256}`);
      events.push({ eventId, eventSha256, ...eventBody });
      seen.add(queueIndex);
      primaryEntries.set(queueIndex, { source, reviewerIdentity, decision, receiptSha256 });
      currentDecisions.set(queueIndex, decision);
    }
  }
  const requiredReReviewChecks = [
    "headword_pos_identity", "english_definition", "vietnamese_meaning", "examples",
    "sense_boundaries", "cefr_tags_evidence", "source_provenance", "content_hash",
  ];
  for (const receiptPath of REREVIEW_RECEIPTS) {
    if (!existsSync(path.join(ROOT, receiptPath))) continue;
    const receiptBytes = readBytes(receiptPath);
    const receiptSha256 = sha(receiptBytes);
    const receipt = JSON.parse(receiptBytes.toString("utf8")) as Row;
    if (receipt.receiptType !== "INDEPENDENT_RE_REVIEW") throw new Error(`RE_REVIEW_RECEIPT_TYPE_INVALID:${receiptPath}`);
    if (receipt.reviewerIdentity !== "/root/independent_review_a" && receipt.reviewerIdentity !== "/root/independent_review_b"
      && receipt.reviewerIdentity !== "/root/independent_review_c") throw new Error(`RE_REVIEWER_IDENTITY_NOT_INDEPENDENT:${receiptPath}`);
    if (receipt.queueSha256 !== queueSha256) throw new Error(`RE_REVIEW_RECEIPT_QUEUE_PIN_MISMATCH:${receiptPath}`);
    if (receipt.sourceQueueIdentityHashInventorySha256 !== queue.identityHashInventorySha256) {
      throw new Error(`RE_REVIEW_RECEIPT_IDENTITY_INVENTORY_MISMATCH:${receiptPath}`);
    }
    for (const source of receipt.entries ?? []) {
      const queueIndex = Number(source.queueIndex);
      const queueEntry = queue.entries[queueIndex];
      const original = primaryEntries.get(queueIndex);
      if (!Number.isInteger(queueIndex) || !queueEntry || !original || rereviewedQueueIndices.has(queueIndex)
        || queueEntry.proposalKey !== source.proposalKey || queueEntry.sourceGroupKey !== source.sourceGroupKey
        || queueEntry.effectiveContentHash !== source.effectiveContentHash) {
        throw new Error(`RE_REVIEW_QUEUE_IDENTITY_MISMATCH:${receiptPath}:${queueIndex}`);
      }
      if (original.decision === "PASS") throw new Error(`RE_REVIEW_ORIGINAL_DECISION_NOT_ELIGIBLE:${queueIndex}`);
      if (source.supersedesReviewerIdentity !== original.reviewerIdentity
        || source.supersedesDecision !== original.decision
        || source.supersedesReceiptSha256 !== original.receiptSha256) {
        throw new Error(`RE_REVIEW_SUPERSESSION_PIN_MISMATCH:${receiptPath}:${queueIndex}`);
      }
      const reviewerIdentity = source.reviewerIdentity ?? receipt.reviewerIdentity;
      if (reviewerIdentity !== receipt.reviewerIdentity || reviewerIdentity === original.reviewerIdentity) {
        throw new Error(`RE_REVIEWER_NOT_INDEPENDENT_OF_ORIGINAL:${receiptPath}:${queueIndex}`);
      }
      const reviewedAt = source.reviewedAtUtc;
      if (!reviewedAt || Number.isNaN(Date.parse(reviewedAt))) throw new Error(`RE_REVIEW_TIMESTAMP_MISSING:${receiptPath}:${queueIndex}`);
      const checklist = Array.isArray(source.reReviewChecklist)
        ? new Set(source.reReviewChecklist)
        : new Set(Object.entries(source.reReviewChecklist ?? {})
          .filter(([, value]) => value === true || (typeof value === "string" && value.trim().length > 0))
          .map(([key]) => key));
      if (requiredReReviewChecks.some((check) => !checklist.has(check))) {
        throw new Error(`RE_REVIEW_CHECKLIST_INCOMPLETE:${receiptPath}:${queueIndex}`);
      }
      const evidenceText = typeof source.evidence === "string" ? source.evidence.trim() : "";
      if (evidenceText.length < 40) throw new Error(`RE_REVIEW_EVIDENCE_MISSING:${receiptPath}:${queueIndex}`);
      verifyQueueEntry(queueEntry, source);
      const decision = normalizeDecision(source);
      if (receipt.reviewerIdentity === "/root/independent_review_c" && source.hashPinnedContentVerified !== true) {
        throw new Error(`RE_REVIEW_CANDIDATE_HASH_VERIFICATION_MISSING:${receiptPath}:${queueIndex}`);
      }
      const wordnetSourceEvidence = [
        ...(Array.isArray(queueEntry.sourceProvenance?.recordEvidence) ? queueEntry.sourceProvenance.recordEvidence : []),
        ...(Array.isArray(queueEntry.sourceProvenance?.oewnEvidenceReferences) ? queueEntry.sourceProvenance.oewnEvidenceReferences : []),
      ];
      if (receipt.reviewerIdentity === "/root/independent_review_c" && wordnetSourceEvidence.length) {
        const expectedPins = [...new Set(wordnetSourceEvidence.map((x: Row) => x.recordEvidenceSha256))].sort();
        const receiptPins = [...(source.sourceRecordEvidenceSha256s ?? [])].sort();
        if (stable(expectedPins) !== stable([...new Set(receiptPins)])) throw new Error(`RE_REVIEW_WORDNET_RECORD_PINS_MISMATCH:${receiptPath}:${queueIndex}`);
      }
      const eventBody = {
        queueSha256,
        queueIndex,
        proposalKey: queueEntry.proposalKey,
        sourceGroupKey: queueEntry.sourceGroupKey,
        effectiveContentHash: queueEntry.effectiveContentHash,
        decision,
        reviewerIdentity,
        reviewerRole: "INDEPENDENT_CONTENT_REVIEWER",
        reviewedAt,
        checkpointAt: receipt.checkpointCreatedAtUtc ?? null,
        receiptPath: receiptPath.replaceAll("\\", "/"),
        receiptSha256,
        rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
        approvalGranted: false,
        releaseEligible: false,
        evidence: {
          entry: source,
          receiptPurpose: receipt.receiptPurpose ?? "Independent re-review of current content hash; no rights clearance or publication approval.",
          reReview: true,
          supersedesReviewerIdentity: original.reviewerIdentity,
          supersedesDecision: original.decision,
          supersedesReceiptSha256: original.receiptSha256,
          rightsReview: "NOT_PERFORMED; rights remain UNKNOWN_REVIEW_REQUIRED",
          approvalGranted: false,
          releaseEligible: false,
        },
      };
      const eventSha256 = sha(stable(eventBody));
      const eventId = sha(`${queueSha256}:${queueIndex}:${reviewerIdentity}:${eventSha256}`);
      events.push({ eventId, eventSha256, ...eventBody });
      rereviewedQueueIndices.add(queueIndex);
      currentDecisions.set(queueIndex, decision);
      rereviewCount += 1;
    }
  }
  if (events.length === 0) throw new Error("NO_INDEPENDENT_REVIEW_EVENTS_TO_SYNC");
  const currentDecisionCounts = [...currentDecisions.values()].reduce((counts, decision) => {
    counts[decision] = (counts[decision] ?? 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  return {
    queue, queueSha256, events, uniqueQueueIndices: primaryEntries.size, rereviewCount, currentDecisionCounts,
  };
}

async function sync() {
  const built = buildEvents();
  const currentReceiptCounts = built.currentDecisionCounts;
  const runtimeBefore = await readRuntimeCounts();
  const { sql } = await connect("migration");
  let result: Row;
  try {
    await verifySchema(sql);
    result = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      const [pre] = await tx`SELECT count(*)::int AS rows,
        count(*) FILTER (WHERE decision='PASS')::int AS pass,
        count(*) FILTER (WHERE decision='FAIL')::int AS fail,
        count(*) FILTER (WHERE decision='REVIEW_REQUIRED')::int AS review_required,
        count(*) FILTER (WHERE rights_status<>'UNKNOWN_REVIEW_REQUIRED' OR approval_granted OR release_eligible)::int AS gate_violations
        FROM ${tx.unsafe(`"${SCHEMA}"."independent_content_review_events_v1"`)}`;
      if (pre.gate_violations !== 0) throw new Error("INDEPENDENT_REVIEW_STAGING_PREEXISTING_GATE_VIOLATION");
      // Receipts are checkpoint files that may grow by appended entries. The
      // file SHA changes on every checkpoint, so event_id alone would replay
      // all older entries as new rows. Preserve the append-only audit log but
      // only append assertions whose reviewer/index/decision/evidence tuple is
      // genuinely new. A changed verdict or evidence still creates a new event.
      const existingEvents = await tx`SELECT queue_index,proposal_key,source_group_key,effective_content_hash,decision,
          reviewer_identity,evidence->'entry' AS entry_evidence
        FROM ${tx.unsafe(`"${SCHEMA}"."independent_content_review_events_v1"`)}
        WHERE queue_sha256=${built.queueSha256}`;
      const semanticKey = (event: Row) => stable({
        queueIndex: event.queueIndex ?? event.queue_index,
        proposalKey: event.proposalKey ?? event.proposal_key,
        sourceGroupKey: event.sourceGroupKey ?? event.source_group_key,
        effectiveContentHash: event.effectiveContentHash ?? event.effective_content_hash,
        decision: event.decision,
        reviewerIdentity: event.reviewerIdentity ?? event.reviewer_identity,
        entryEvidence: event.entryEvidence ?? event.entry_evidence ?? event.evidence?.entry,
      });
      const existingSemanticKeys = new Set(existingEvents.map(semanticKey));
      const newEvents = built.events.filter((event) => !existingSemanticKeys.has(semanticKey(event)));
      const batches = Array.from({ length: Math.ceil(newEvents.length / 100) }, (_, index) => newEvents.slice(index * 100, (index + 1) * 100));
      const insertBatches = async () => {
        let insertedCount = 0;
        for (const batch of batches) {
        const payload = batch.map((event) => ({
            event_id: event.eventId,
            event_sha256: event.eventSha256,
            queue_sha256: event.queueSha256,
            queue_index: event.queueIndex,
            proposal_key: event.proposalKey,
            source_group_key: event.sourceGroupKey,
            effective_content_hash: event.effectiveContentHash,
            decision: event.decision,
            reviewer_identity: event.reviewerIdentity,
            reviewer_role: event.reviewerRole,
            reviewed_at: event.reviewedAt,
            receipt_checkpoint_at: event.checkpointAt,
            receipt_path: event.receiptPath,
            receipt_sha256: event.receiptSha256,
            rights_status: event.rightsStatus,
            approval_granted: false,
            release_eligible: false,
          evidence: event.evidence,
        }));
        const insertedRows = await tx`
            INSERT INTO vocabflow_editorial_staging.independent_content_review_events_v1
              (event_id,event_sha256,queue_sha256,queue_index,proposal_key,source_group_key,effective_content_hash,decision,
               reviewer_identity,reviewer_role,reviewed_at,receipt_checkpoint_at,receipt_path,receipt_sha256,rights_status,
               approval_granted,release_eligible,evidence)
            SELECT x.event_id,x.event_sha256,x.queue_sha256,x.queue_index,x.proposal_key,x.source_group_key,x.effective_content_hash,
              x.decision,x.reviewer_identity,x.reviewer_role,x.reviewed_at,x.receipt_checkpoint_at,x.receipt_path,x.receipt_sha256,
              x.rights_status,x.approval_granted,x.release_eligible,x.evidence
            FROM jsonb_to_recordset(${JSON.stringify(payload)}::text::jsonb) AS x(
              event_id text,event_sha256 text,queue_sha256 text,queue_index integer,proposal_key text,source_group_key text,
              effective_content_hash text,decision text,reviewer_identity text,reviewer_role text,reviewed_at timestamptz,
              receipt_checkpoint_at timestamptz,receipt_path text,receipt_sha256 text,rights_status text,approval_granted boolean,
              release_eligible boolean,evidence jsonb)
            ON CONFLICT (event_id) DO NOTHING RETURNING event_id`;
          insertedCount += insertedRows.length;
        }
        return insertedCount;
      };
      const inserted = await insertBatches();
      const replayInserted = await insertBatches();
      const readback = await tx`SELECT event_id,event_sha256,queue_sha256,queue_index,proposal_key,source_group_key,effective_content_hash,
        decision,reviewer_identity,receipt_sha256,rights_status,approval_granted,release_eligible,evidence->'entry' AS entry_evidence
        FROM ${tx.unsafe(`"${SCHEMA}"."independent_content_review_events_v1"`)}
        WHERE queue_sha256=${built.queueSha256} ORDER BY queue_index`;
      const expected = new Map(built.events.map((event) => [event.eventId, event]));
      const readbackSemanticKeys = new Set(readback.map(semanticKey));
      if (built.events.some((event) => !readbackSemanticKeys.has(semanticKey(event)))) {
        throw new Error("INDEPENDENT_REVIEW_STAGING_READBACK_MISSING_ROWS");
      }
      for (const row of readback) {
        const event = expected.get(row.event_id);
        if (!event) continue;
        if (row.event_sha256 !== event.eventSha256 || row.queue_index !== event.queueIndex || row.proposal_key !== event.proposalKey
          || row.source_group_key !== event.sourceGroupKey || row.effective_content_hash !== event.effectiveContentHash
          || row.decision !== event.decision || row.reviewer_identity !== event.reviewerIdentity
          || row.rights_status !== "UNKNOWN_REVIEW_REQUIRED" || row.approval_granted !== false || row.release_eligible !== false) {
          throw new Error(`INDEPENDENT_REVIEW_STAGING_READBACK_MISMATCH:${row.queue_index}`);
        }
      }
      const [post] = await tx`SELECT count(*)::int AS rows,
        count(*) FILTER (WHERE decision='PASS')::int AS pass,
        count(*) FILTER (WHERE decision='FAIL')::int AS fail,
        count(*) FILTER (WHERE decision='REVIEW_REQUIRED')::int AS review_required,
        count(*) FILTER (WHERE rights_status<>'UNKNOWN_REVIEW_REQUIRED' OR approval_granted OR release_eligible)::int AS gate_violations
        FROM ${tx.unsafe(`"${SCHEMA}"."independent_content_review_events_v1"`)}`;
      if (replayInserted !== 0 || post.gate_violations !== 0) throw new Error("INDEPENDENT_REVIEW_STAGING_IDEMPOTENCY_OR_GATE_FAILED");
      return { inserted, replayInserted, receiptEventCount: built.events.length, readbackRows: readback.length, pre, post };
    });
    process.stdout.write(`INDEPENDENT_REVIEW_QUEUE_SHA256=${built.queueSha256}\n`);
    process.stdout.write(`INDEPENDENT_REVIEW_EVENTS_SYNCED=${result.inserted}\n`);
    process.stdout.write(`IDEMPOTENT_REPLAY_INSERTED=${result.replayInserted}\n`);
    process.stdout.write(`RECEIPT_EVENTS=${result.receiptEventCount}\n`);
    process.stdout.write(`INDEPENDENT_REVIEW_UNIQUE_QUEUE_INDICES=${built.uniqueQueueIndices}\n`);
    process.stdout.write(`INDEPENDENT_RE_REVIEW_EVENTS=${built.rereviewCount}\n`);
    process.stdout.write(`CURRENT_RECEIPT_PASS=${currentReceiptCounts.PASS ?? 0}\n`);
    process.stdout.write(`CURRENT_RECEIPT_FAIL=${currentReceiptCounts.FAIL ?? 0}\n`);
    process.stdout.write(`CURRENT_RECEIPT_REVIEW_REQUIRED=${currentReceiptCounts.REVIEW_REQUIRED ?? 0}\n`);
    process.stdout.write(`NEW_SEMANTIC_EVENTS=${result.inserted}\n`);
    process.stdout.write(`NEON_REVIEW_AUDIT_EVENT_ROWS=${result.post.rows}\n`);
    process.stdout.write(`NEON_REVIEW_AUDIT_PASS_EVENTS=${result.post.pass}\n`);
    process.stdout.write(`NEON_REVIEW_AUDIT_FAIL_EVENTS=${result.post.fail}\n`);
    process.stdout.write(`NEON_REVIEW_AUDIT_REQUIRED_EVENTS=${result.post.review_required}\n`);
    process.stdout.write(`RIGHTS_OR_RELEASE_GATE_VIOLATIONS=${result.post.gate_violations}\nRUNTIME_ROLE_TABLE_ACCESS=DENIED\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
  const runtimeAfter = await readRuntimeCounts();
  const runtimePreserved = stable(runtimeBefore) === stable(runtimeAfter);
  if (!runtimePreserved) throw new Error("RUNTIME_READONLY_COUNT_SNAPSHOT_CHANGED_DURING_REVIEW_SYNC");
  process.stdout.write(`RUNTIME_PRESERVED=${runtimePreserved ? "PASS" : "FAIL"}\n`);
}

async function main() {
  loadDevelopmentEnv();
  if (process.argv[2] === "--provision") await provision();
  else if (process.argv[2] === "--sync") await sync();
  else throw new Error("Use --provision or --sync for the additive Development-only independent review staging table.");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : "INDEPENDENT_REVIEW_STAGING_FAILED"}\n`);
  process.exitCode = 1;
});
