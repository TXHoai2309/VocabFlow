import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const ROOT = process.cwd();
const WORKSPACE = "vocabflow-dataset/workspaces/master-v2-development-sync";
const T22 = "vocabflow-dataset/workspaces/master-editorial-high-throughput-500-03/provisional-bulk-continuation/phase-e-t22-final-backlog-authoring-20261015-v1";
const BLOCKERS_PATH = `${WORKSPACE}/master-v2-final-content-closure-blockers-v1.csv`;
const CLOSURE_PATH = `${WORKSPACE}/master-v2-final-content-closure-report-v1.json`;
const VERSION_TABLE_PATH = `${WORKSPACE}/pending-version-owner-decision-table-v1.csv`;
const SOURCE_ROOT = "vocabflow-dataset/workspaces/full-source-inventory-dedupe";
const TARGET = { projectId: "shy-hill-72364426", branchId: "br-square-grass-b3af0nte", database: "neondb", endpoint: "ep-small-shadow-b3ny4993" };
const SCHEMA = "vocabflow_editorial_staging";
const DECISION_ID = "OWNER-2026-10-16-DEFER-OEWN-125";
const AUTHORIZED_AT = "2026-10-16T06:16:28.000Z";

function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function readJson(file) { return JSON.parse(readFileSync(path.join(ROOT, file), "utf8")); }
function readBytes(file) { return readFileSync(path.join(ROOT, file)); }
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift().map((h, i) => i === 0 ? h.replace(/^\uFEFF/, "") : h);
  return rows.filter((r) => r.some((v) => v !== "")).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}
function jsonField(value, fallback = []) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { throw new Error("PINNED_JSON_FIELD_INVALID"); }
}
function resolveEvidenceArtifact(evidencePath) {
  const candidates = [path.resolve(ROOT, T22, evidencePath), path.resolve(ROOT, `${T22}/artifacts-v1`, evidencePath)];
  const resolved = candidates.find((candidate) => candidate.startsWith(`${ROOT}${path.sep}`) && existsSync(candidate));
  if (!resolved) throw new Error(`DEFER_EVIDENCE_ARTIFACT_MISSING:${evidencePath}`);
  return { absolutePath: resolved, repositoryPath: path.relative(ROOT, resolved).replaceAll("\\", "/") };
}
function putImmutable(file, content) {
  const target = path.join(ROOT, file);
  const bytes = Buffer.from(content);
  if (existsSync(target)) {
    if (!readFileSync(target).equals(bytes)) throw new Error(`IMMUTABLE_ARTIFACT_CONFLICT:${file}`);
    return sha(bytes);
  }
  writeFileSync(target, bytes, { flag: "wx" });
  return sha(bytes);
}
function csvEscape(value) {
  const s = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function buildArtifacts() {
  const t22DispositionPath = `${T22}/artifacts-v1/backlog-disposition-v1.json`;
  const t22Disposition = readJson(t22DispositionPath);
  const blockersBytes = readBytes(BLOCKERS_PATH);
  const blockerRows = parseCsv(blockersBytes.toString("utf8"));
  const closure = readJson(CLOSURE_PATH);
  const sourceManifestPath = `${SOURCE_ROOT}/manifest.json`;
  const sourceManifest = readJson(sourceManifestPath);
  const masterGroupsPath = `${SOURCE_ROOT}/lexical-candidate-groups.json`;
  const masterGroups = readJson(masterGroupsPath);
  const groupsByKey = new Map(masterGroups.groups.map((g) => [g.candidateGroupKey, g]));
  const t22ByKey = new Map(t22Disposition.records.map((r) => [r.candidateGroupKey, r]));
  const oeGroups = blockerRows.filter((r) => r.dispositionClass === "OEWN_DEFINITION_EVIDENCE_BACKLOG");
  const remainingGroups = blockerRows.filter((r) => r.dispositionClass !== "OEWN_DEFINITION_EVIDENCE_BACKLOG");
  const expectedCategories = {
    CONFLICT_SIGNAL: 7,
    IDENTITY_PROTECTED: 49,
    QUARANTINED: 9,
    SPECIAL_CONTRACT_CASE: 3,
    UNRESOLVED_B_C_NOT_FORMALLY_REJECTED: 4,
  };
  if (masterGroups.candidateGroupCount !== 6143 || masterGroups.groups.length !== 6143 || blockerRows.length !== 197 || oeGroups.length !== 125 || remainingGroups.length !== 72) {
    throw new Error("MASTER_SCOPE_BASELINE_MISMATCH");
  }
  const actualCategories = Object.fromEntries(Object.entries(expectedCategories).map(([k]) => [k, remainingGroups.filter((r) => r.dispositionClass === k).length]));
  for (const [k, n] of Object.entries(expectedCategories)) if (actualCategories[k] !== n) throw new Error(`REMAINING_CATEGORY_COUNT_MISMATCH:${k}`);

  const inventoryFiles = {
    OXFORD_5000: `${SOURCE_ROOT}/oxford-normalized-inventory.json`,
    ENGLISH_VOCAB_4600: `${SOURCE_ROOT}/vocab4600-normalized-inventory.json`,
  };
  const sourceRecords = {};
  const sourceFileSha256 = {};
  for (const [corpus, file] of Object.entries(inventoryFiles)) {
    const bytes = readBytes(file);
    const inv = JSON.parse(bytes.toString("utf8"));
    sourceRecords[corpus] = new Map(inv.records.map((r) => [String(r.sourceRecordId), r]));
    sourceFileSha256[corpus] = sha(bytes);
    if (inv.source?.sha256 !== sourceManifest.sourceFiles?.[corpus]?.sha256) throw new Error(`NORMALIZED_SOURCE_PIN_MISMATCH:${corpus}`);
  }

  const deferred = oeGroups.map((r) => {
    const key = r.candidateGroupKey;
    const t22 = t22ByKey.get(key);
    const master = groupsByKey.get(key);
    if (!t22 || !master || t22.dispositionClass !== "OEWN_DEFINITION_EVIDENCE_BACKLOG" || ["AUTHORED", "AUTHORED_DRAFT"].includes(t22.authoringStatus)) {
      throw new Error(`DEFER_TARGET_IDENTITY_OR_STATUS_MISMATCH:${key}`);
    }
    const evidencePath = String(r.evidencePath ?? "");
    if (!evidencePath) throw new Error(`DEFER_EVIDENCE_PATH_MISSING:${key}`);
    const resolvedEvidence = resolveEvidenceArtifact(evidencePath);
    const evidenceAbsolute = resolvedEvidence.absolutePath;
    const evidenceBytes = readFileSync(evidenceAbsolute);
    const sourceCueKeys = jsonField(r.sourceCueKeys);
    const sourceCueHashes = jsonField(r.sourceCueEvidenceSha256);
    const sourceIds = [
      ...(master.oxfordSourceRecordIds ?? []).map((id) => ["OXFORD_5000", String(id)]),
      ...(master.vocab4600SourceRecordIds ?? []).map((id) => ["ENGLISH_VOCAB_4600", String(id)]),
    ];
    const evidenceRecords = sourceIds.map(([corpus, id]) => {
      const rec = sourceRecords[corpus].get(id);
      if (!rec) throw new Error(`MASTER_SOURCE_IDENTITY_NOT_FOUND:${key}:${corpus}:${id}`);
      return {
        corpus,
        sourceRecordId: id,
        sourceNoteGuid: rec.sourceNoteGuid,
        recordEvidenceSha256: rec.recordEvidenceSha256,
        recordIndex: rec.recordIndex,
      };
    });
    const sourceIdentity = {
      candidateGroupKey: key,
      normalizedHeadword: master.normalizedHeadword,
      oxfordSourceRecordIds: master.oxfordSourceRecordIds ?? [],
      vocab4600SourceRecordIds: master.vocab4600SourceRecordIds ?? [],
      sourcePosConflict: master.sourcePosConflict,
      candidateSamePosValues: master.candidateSamePosValues ?? [],
      evidenceRecords,
      masterGroupRecordSha256: sha(stable(master)),
      normalizedInventorySha256: sourceFileSha256,
    };
    const evidencePins = {
      originalDisposition: { path: t22DispositionPath, recordSha256: sha(stable(t22)) },
      currentBlockerRowSha256: sha(stable(r)),
      blockerEvidence: { path: resolvedEvidence.repositoryPath, recordIndex: r.evidenceRecordIndex === "" ? null : Number(r.evidenceRecordIndex), fileSha256: sha(evidenceBytes) },
      sourceCueKeys,
      sourceCueEvidenceSha256: sourceCueHashes,
    };
    const body = {
      candidateGroupKey: key,
      headword: r.headword,
      priorDispositionClass: r.dispositionClass,
      priorAuthoringStatus: r.authoringStatus,
      priorT22AuthoringStatus: t22.authoringStatus,
      priorReasonCode: t22.reasonCode,
      exactExistingBlocker: r.exactBlocker,
      scopeStatus: "DEFERRED_FROM_V2",
      authoringStatus: "NOT_AUTHORED_UNCHANGED",
      approvalStatus: "UNCHANGED_NOT_APPROVED",
      masterInventoryStatus: "RETAINED",
      sourceIdentity,
      evidencePins,
    };
    return { ...body, decisionRecordSha256: sha(stable(body)) };
  }).sort((a, b) => a.candidateGroupKey.localeCompare(b.candidateGroupKey));

  const sourcePins = {
    sourceManifest: { path: sourceManifestPath, sha256: sha(readBytes(sourceManifestPath)) },
    masterLexicalInventory: { path: masterGroupsPath, sha256: sha(readBytes(masterGroupsPath)), groupCount: masterGroups.candidateGroupCount },
    normalizedInventories: Object.fromEntries(Object.entries(inventoryFiles).map(([corpus, file]) => [corpus, { path: file, sha256: sourceFileSha256[corpus] }])),
    priorT22Disposition: { path: t22DispositionPath, sha256: sha(readBytes(t22DispositionPath)) },
    currentBlockers: { path: BLOCKERS_PATH, sha256: sha(blockersBytes), rows: blockerRows.length },
    priorClosureReport: { path: CLOSURE_PATH, sha256: sha(readBytes(CLOSURE_PATH)) },
  };
  const decisionBody = {
    artifactType: "VOCABFLOW_MASTER_V2_OWNER_SCOPE_DECISION",
    artifactVersion: 1,
    decisionId: DECISION_ID,
    decisionStatus: "APPLIED_TO_V2_SCOPE_ONLY",
    authorization: {
      authority: "Owner instruction in current Codex conversation",
      decisionText: "Stop authoring the 125 groups blocked on OEWN evidence; move exactly these groups to DEFERRED_FROM_V2 while preserving source identities, evidence pins, history, and master inventory membership.",
      authorizedAt: AUTHORIZED_AT,
    },
    sourcePins,
    scopeBefore: { sourceGroups: 6143, authoredGroups: 5946, unauthoredGroups: 197 },
    scopeAfter: { sourceGroups: 6143, deferredFromV2: 125, inScope: 6018, authoredInScope: 5946, remainingInScope: 72 },
    mutationSemantics: {
      onlyDispositionOverlayAdded: true,
      originalT22DispositionAndEvidenceArtifactsModified: false,
      sourceIdentitiesAndEvidencePinsPreserved: true,
      masterInventoryMembershipPreserved: true,
      groupsMarkedAuthored: 0,
      groupsMarkedApproved: 0,
      sourceGroupsDeleted: 0,
      rightsChanged: 0,
    },
    groups: deferred,
    integrity: {
      deferredGroupCount: deferred.length,
      uniqueGroupKeys: new Set(deferred.map((g) => g.candidateGroupKey)).size,
      allPresentInMasterInventory: deferred.every((g) => groupsByKey.has(g.candidateGroupKey)),
      allPreviousDispositionRowsMatched: deferred.every((g) => g.priorDispositionClass === "OEWN_DEFINITION_EVIDENCE_BACKLOG"),
      remainingGroupCounts: actualCategories,
    },
  };
  const decision = { ...decisionBody, decisionSha256: sha(stable(decisionBody)) };
  if (deferred.length !== 125 || decision.integrity.uniqueGroupKeys !== 125) throw new Error("DEFERRED_DECISION_CARDINALITY_INVALID");
  const decisionPath = `${WORKSPACE}/master-v2-oewn-defer-owner-decision-v1.json`;
  const decisionFileSha = putImmutable(decisionPath, `${JSON.stringify(decision, null, 2)}\n`);

  const scopeBody = {
    artifactType: "VOCABFLOW_MASTER_V2_CURRENT_SCOPE",
    artifactVersion: 1,
    decisionId: DECISION_ID,
    decisionPath,
    decisionFileSha256: decisionFileSha,
    decisionSha256: decision.decisionSha256,
    sourceGroupsTotal: 6143,
    deferredFromV2: 125,
    groupsInScope: 6018,
    groupsAuthored: 5946,
    groupsRemaining: 72,
    remainingGroupCounts: actualCategories,
    masterInventoryGroups: masterGroups.candidateGroupCount,
    masterInventoryKeysRetained: deferred.every((g) => groupsByKey.has(g.candidateGroupKey)),
  };
  const scopePath = `${WORKSPACE}/master-v2-current-scope-v1.json`;
  const scopeFileSha = putImmutable(scopePath, `${JSON.stringify({ ...scopeBody, scopeSha256: sha(stable(scopeBody)) }, null, 2)}\n`);

  const contentItems = closure.developmentStaging.currentPendingContentBlockers;
  if (contentItems.length !== 7) throw new Error("PENDING_CONTENT_COUNT_MISMATCH");
  const versionRows = parseCsv(readBytes(VERSION_TABLE_PATH).toString("utf8"));
  if (versionRows.length !== 146) throw new Error("PENDING_VERSION_DECISION_COUNT_MISMATCH");
  const groupDecisionRows = remainingGroups.map((r) => {
    const actionByClass = {
      IDENTITY_PROTECTED: "Resolve existing Master/legacy identity ownership; provide canonical ID mapping or explicit evidence that a new identity is distinct.",
      CONFLICT_SIGNAL: "Resolve the listed POS, CEFR, sense-boundary, definition, or Vietnamese-meaning conflict against pinned evidence.",
      QUARANTINED: "Resolve the concrete quarantine cause with permitted source evidence; otherwise retain quarantine.",
      SPECIAL_CONTRACT_CASE: "Resolve the listed source-registry, sense-evidence, or source-conflict contract gate; do not expand the registry implicitly.",
      UNRESOLVED_B_C_NOT_FORMALLY_REJECTED: "Complete POS/sense-boundary/example review and make a formal include, exclude, or keep-pending decision.",
    };
    return {
      decisionDomain: "SOURCE_GROUP",
      decisionKey: r.candidateGroupKey,
      currentStatus: r.dispositionClass,
      headword: r.headword,
      blocker: r.exactBlocker,
      reasonCode: r.reasonCode || t22ByKey.get(r.candidateGroupKey)?.reasonCode || "",
      decisionNeeded: actionByClass[r.dispositionClass],
      options: ["RESOLVE_WITH_PINNED_EVIDENCE", "KEEP_BLOCKED", "DEFER_FROM_V2"],
      evidenceArtifact: r.evidencePath,
      evidenceArtifactSha256: r.evidencePath ? sha(readFileSync(resolveEvidenceArtifact(r.evidencePath).absolutePath)) : "",
      evidenceRecordIndex: r.evidenceRecordIndex,
      sourceCueKeys: jsonField(r.sourceCueKeys),
      sourceCueEvidenceSha256: jsonField(r.sourceCueEvidenceSha256),
      rightsGate: "UNCHANGED_AND_REQUIRED",
    };
  });
  const contentDecisionRows = contentItems.map((item) => {
    const decisionNeeded = item.candidateHeadword === "per cent"
      ? "Choose whether the three pinned Oxford POS/sense groups become separate Sense identities or remain pending."
      : ["billion", "seven"].includes(item.candidateHeadword)
        ? "Choose the V2 taxonomy treatment for NUMBER versus the source's NOUN label (or hold pending)."
        : ["visible", "warming"].includes(item.candidateHeadword)
          ? "Choose the canonical identity/display-form treatment for the source headword's parenthetical POS marker (or hold pending)."
          : item.candidateHeadword === "ashore"
            ? "Choose source/POS precedence for English Vocabulary 4600 adjective versus pinned OEWN/Oxford adverb (or hold pending)."
            : item.candidateHeadword === "at the onset"
              ? "Choose the accepted phrase/POS mapping for the pinned NOUN source versus V2 OTHER proposal (or hold pending)."
              : "Resolve the exact pinned source/POS identity conflict (or hold pending).";
    return {
      decisionDomain: "PENDING_CONTENT",
      decisionKey: item.proposalKey,
      currentStatus: "PENDING_CONTENT_VALIDATION",
      headword: item.candidateHeadword,
      blocker: item.blocker,
      decisionNeeded,
      options: ["APPLY_EXPLICIT_IDENTITY_OR_TAXONOMY_DECISION", "KEEP_PENDING"],
      evidenceArtifact: CLOSURE_PATH,
      evidenceArtifactSha256: sourcePins.priorClosureReport.sha256,
      sourceReferences: item.sourceEvidence,
      rightsGate: item.rightsStatus ?? "UNKNOWN_REVIEW_REQUIRED",
    };
  });
  const versionDecisionRows = versionRows.map((r) => {
    const candidate = (prefix) => r[`${prefix}_hash`] ? {
      hash: r[`${prefix}_hash`],
      batchId: r[`${prefix}_batch_id`],
      bodyStatus: r[`${prefix}_body_status`],
      contentFingerprint: r[`${prefix}_content_fingerprint`],
      headword: r[`${prefix}_headword`],
      partOfSpeech: r[`${prefix}_part_of_speech`],
      definitionEn: r[`${prefix}_definition_en`],
      meaningVi: r[`${prefix}_meaning_vi`],
      examplesEn: r[`${prefix}_examples_en`],
      examplesVi: r[`${prefix}_examples_vi`],
      sourcePinStatus: r[`${prefix}_source_pin_status`],
      sourceRefs: jsonField(r[`${prefix}_source_refs`]),
    } : null;
    return {
      decisionDomain: "PENDING_VERSION",
      decisionKey: r.proposal_key,
      currentStatus: "PENDING_VERSION_DECISION",
      headword: r.candidate_A_headword || r.source_group_key,
      blocker: r.decision_reason,
      decisionNeeded: "Select one candidate content hash after review or explicitly keep the Sense pending; do not select by timestamp.",
      options: [candidate("candidate_A"), candidate("candidate_B"), candidate("candidate_C")].filter(Boolean),
      evidenceArtifact: VERSION_TABLE_PATH,
      evidenceArtifactSha256: sha(readBytes(VERSION_TABLE_PATH)),
      impact: r.selection_impact,
      rightsGate: "UNCHANGED_AND_REQUIRED",
    };
  });
  const unifiedRows = [...groupDecisionRows, ...contentDecisionRows, ...versionDecisionRows];
  if (unifiedRows.length !== 225) throw new Error("OWNER_DECISION_PACKET_CARDINALITY_INVALID");
  const headers = ["decisionDomain", "decisionKey", "currentStatus", "headword", "blocker", "decisionNeeded", "options", "evidenceArtifact", "evidenceArtifactSha256", "evidenceRecordIndex", "sourceCueKeys", "sourceCueEvidenceSha256", "rightsGate", "impact"];
  const csv = `${headers.join(",")}\n${unifiedRows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")).join("\n")}\n`;
  const ownerPacketRowsPath = `${WORKSPACE}/master-v2-owner-decisions-consolidated-v1.csv`;
  const ownerPacketRowsSha = putImmutable(ownerPacketRowsPath, csv);
  const packetBody = {
    artifactType: "VOCABFLOW_MASTER_V2_REMAINING_OWNER_DECISIONS",
    artifactVersion: 1,
    scopePath,
    scopeFileSha256: scopeFileSha,
    groupDecisionRows: groupDecisionRows.length,
    pendingContentRows: contentDecisionRows.length,
    pendingVersionRows: versionDecisionRows.length,
    totalOwnerDecisionRows: unifiedRows.length,
    sourceGroups: { total: 6143, deferredFromV2: 125, inScope: 6018, authored: 5946, remaining: 72 },
    remainingGroupCounts: actualCategories,
    stagingBaseline: { identities: 7473, effectiveDraftSenses: 7320, pendingContent: 7, pendingVersion: 146 },
    packetPath: ownerPacketRowsPath,
    packetSha256: ownerPacketRowsSha,
    versionCandidateDecisionTable: { path: VERSION_TABLE_PATH, sha256: sha(readBytes(VERSION_TABLE_PATH)), rows: versionRows.length },
    pendingContentEvidence: { path: CLOSURE_PATH, sha256: sourcePins.priorClosureReport.sha256 },
    statement: "No remaining choice was silently applied. All 72 group dispositions, 7 content identity/taxonomy decisions, and 146 candidate-version selections remain reviewable in one consolidated packet.",
  };
  const packetPath = `${WORKSPACE}/master-v2-owner-decision-packet-v1.json`;
  const packetFileSha = putImmutable(packetPath, `${JSON.stringify({ ...packetBody, packetSha256: sha(stable(packetBody)) }, null, 2)}\n`);
  return { decision, decisionPath, decisionFileSha, scopePath, scopeFileSha, packetPath, packetFileSha, ownerPacketRowsPath, ownerPacketRowsSha, expectedRows: deferred };
}

function loadDevelopmentEnv() {
  if (existsSync(path.join(ROOT, ".env.local"))) process.loadEnvFile(path.join(ROOT, ".env.local"));
  if (existsSync(path.join(ROOT, ".env"))) process.loadEnvFile(path.join(ROOT, ".env"));
  if (process.env.DATABASE_ENV !== "development" || process.env.VERCEL_ENV || (process.env.EXECUTION_CONTEXT && process.env.EXECUTION_CONTEXT !== "local-development")) throw new Error("LOCAL_DEVELOPMENT_ONLY");
}
function verifyEndpoint(url) {
  const host = new URL(url).hostname.split(".")[0].replace(/-pooler$/, "");
  if (host !== TARGET.endpoint) throw new Error("DEVELOPMENT_ENDPOINT_MISMATCH");
}
async function openVerified(url, roleName) {
  if (!url) throw new Error(`${roleName.toUpperCase()}_DATABASE_URL_REQUIRED`);
  verifyEndpoint(url);
  const sql = postgres(url, { max: 1, idle_timeout: 10, connect_timeout: 10, prepare: false, onnotice: () => undefined });
  const [identity] = await sql`SELECT current_database() AS database_name,current_user AS role_name,
    (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id=1) AS project_id,
    (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id=1) AS branch_id`;
  if (!identity || identity.database_name !== TARGET.database || identity.project_id !== TARGET.projectId || identity.branch_id !== TARGET.branchId || identity.role_name !== roleName) {
    await sql.end({ timeout: 5 });
    throw new Error("DEVELOPMENT_DATABASE_IDENTITY_MISMATCH");
  }
  return sql;
}
async function runtimeCounts() {
  const sql = await openVerified(process.env.DATABASE_URL, "vocabflow_runtime");
  try {
    return await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const tables = await tx`SELECT table_name FROM information_schema.tables WHERE table_schema='vocabflow_app' AND table_type='BASE TABLE' ORDER BY table_name`;
      const counts = {};
      for (const { table_name } of tables) {
        const name = String(table_name).replaceAll('"', '""');
        const [row] = await tx.unsafe(`SELECT count(*)::int AS n FROM "vocabflow_app"."${name}"`);
        counts[table_name] = row.n;
      }
      return counts;
    });
  } finally { await sql.end({ timeout: 5 }); }
}
async function stagingState(tx) {
  const status = await tx`SELECT resolution_status,count(*)::int AS n FROM vocabflow_editorial_staging.identity_registry GROUP BY resolution_status ORDER BY resolution_status`;
  const [integrity] = await tx`SELECT
    count(*) FILTER (WHERE i.resolution_status='EFFECTIVE')::int AS effective_identities,
    count(*) FILTER (WHERE i.resolution_status='EFFECTIVE' AND d.editorial_status='DRAFT')::int AS effective_draft_rows,
    count(*) FILTER (WHERE i.resolution_status='EFFECTIVE' AND i.effective_content_hash=d.effective_content_hash)::int AS matching_hashes,
    count(*) FILTER (WHERE i.resolution_status='EFFECTIVE' AND d.rights_status<>i.rights_status)::int AS rights_mismatches,
    count(*) FILTER (WHERE i.resolution_status='EFFECTIVE' AND i.rights_status<>'UNKNOWN_REVIEW_REQUIRED')::int AS effective_rights_changed,
    count(*) FILTER (WHERE i.resolution_status='PENDING_CONTENT_VALIDATION')::int AS pending_content,
    count(*) FILTER (WHERE i.resolution_status='PENDING_VERSION_DECISION')::int AS pending_version,
    count(*)::int AS identities
    FROM vocabflow_editorial_staging.identity_registry i LEFT JOIN vocabflow_editorial_staging.draft_proposals d USING(proposal_key)`;
  const [media] = await tx`SELECT
    (SELECT count(*)::int FROM vocabflow_editorial_staging.media_assets_v2 WHERE manifest_version='english-vocabulary-4600-media-v2.0.0') AS assets,
    (SELECT count(*)::int FROM vocabflow_editorial_staging.media_mappings_v2 WHERE manifest_version='english-vocabulary-4600-media-v2.0.0') AS mappings,
    (SELECT count(*)::int FROM vocabflow_editorial_staging.media_rights_v1 WHERE manifest_version='english-vocabulary-4600-media-v2.0.0') AS rights`;
  return { status: Object.fromEntries(status.map((r) => [r.resolution_status, r.n])), integrity, media };
}
function reviewQueueBase(rows) {
  const entries = rows.map((r) => ({
    proposalKey: r.proposal_key,
    sourceGroupKey: r.source_group_key,
    headword: r.headword,
    displayForm: r.display_form,
    partOfSpeech: r.part_of_speech,
    content: {
      definitionEn: r.definition_en,
      meaningVi: r.meaning_vi,
      examples: r.examples,
      usageNotes: r.usage_notes,
    },
    effectiveContentHash: String(r.effective_content_hash).trim(),
    sourceProvenance: r.source_provenance,
    identitySourceProvenance: r.identity_source_provenance,
    sourceBatchId: r.staging_batch_id,
    editorialStatus: r.editorial_status,
    rightsStatus: r.rights_status,
    reviewStatus: "PENDING_INDEPENDENT_REVIEW",
    rightsGate: "UNKNOWN_REVIEW_REQUIRED",
  }));
  const identityHashInventory = entries.map(({ proposalKey, sourceGroupKey, effectiveContentHash }) => ({ proposalKey, sourceGroupKey, effectiveContentHash }));
  return {
    artifactType: "VOCABFLOW_MASTER_V2_INDEPENDENT_CONTENT_REVIEW_QUEUE",
    artifactVersion: 1,
    source: { target: TARGET, schema: SCHEMA, authoringStatus: "EFFECTIVE_DRAFT_ONLY", rightsStatus: "UNKNOWN_REVIEW_REQUIRED" },
    eligibility: {
      includedSenses: entries.length,
      contentHashesVerified: true,
      sourceLineageIncluded: true,
      noApprovalGranted: true,
      noRightsCleared: true,
      releaseEligible: false,
      runtimeImportEligible: false,
      queuePurpose: "Independent content review preparation only; rights remain a separate required gate.",
    },
    identityHashInventorySha256: sha(stable(identityHashInventory)),
    entries,
  };
}

async function applyAndVerify(built) {
  loadDevelopmentEnv();
  const runtimeBefore = await runtimeCounts();
  const sql = await openVerified(process.env.BOOTSTRAP_DATABASE_URL, "vocabflow_identity_bootstrap");
  const ddlPath = `${WORKSPACE}/staging-schema-v3-oewn-deferred-groups.sql`;
  const ddlBytes = readBytes(ddlPath);
  const ddlSha = sha(ddlBytes);
  const records = built.expectedRows;
  let pre, post, reviewQueue;
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      pre = await stagingState(tx);
      if (pre.integrity.identities !== 7473 || pre.integrity.effective_identities !== 7320 || pre.integrity.effective_draft_rows !== 7320
        || pre.integrity.matching_hashes !== 7320 || pre.integrity.rights_mismatches !== 0 || pre.integrity.pending_content !== 7 || pre.integrity.pending_version !== 146
        || pre.media.assets !== 13977 || pre.media.mappings !== 14012 || pre.media.rights !== 13977) throw new Error("DEVELOPMENT_STAGING_BASELINE_MISMATCH");
      const [versionMax] = await tx`SELECT COALESCE(max(version),0)::int AS n FROM vocabflow_editorial_staging.schema_versions`;
      const [tableExists] = await tx`SELECT to_regclass('vocabflow_editorial_staging.oewn_deferred_groups_v1') IS NOT NULL AS exists`;
      if (!tableExists.exists) {
        if (versionMax.n !== 2) throw new Error("STAGING_SCHEMA_VERSION_PRECONDITION_MISMATCH");
        for (const statement of ddlBytes.toString("utf8").split(";").map((s) => s.trim()).filter(Boolean)) await tx.unsafe(statement);
      }
      const columns = await tx`SELECT column_name FROM information_schema.columns WHERE table_schema='vocabflow_editorial_staging' AND table_name='oewn_deferred_groups_v1' ORDER BY ordinal_position`;
      const expectedColumns = ["decision_id", "candidate_group_key", "headword", "scope_status", "previous_disposition", "previous_authoring_status", "source_identity", "evidence_pins", "decision_record_hash", "decision_bundle_hash", "decided_at"];
      if (columns.map((x) => x.column_name).join("|") !== expectedColumns.join("|")) throw new Error("DEFERRED_GROUP_TABLE_SHAPE_MISMATCH");
      const [v3] = await tx`SELECT artifact_name,artifact_sha256 FROM vocabflow_editorial_staging.schema_versions WHERE version=3`;
      if (v3) {
        if (v3.artifact_name !== "staging-schema-v3-oewn-deferred-groups.sql" || String(v3.artifact_sha256).trim() !== ddlSha) throw new Error("STAGING_SCHEMA_V3_PIN_MISMATCH");
      } else {
        if (versionMax.n !== 2) throw new Error("STAGING_SCHEMA_VERSION_PRECONDITION_MISMATCH");
        await tx`INSERT INTO vocabflow_editorial_staging.schema_versions (version,artifact_name,artifact_sha256) VALUES (3,'staging-schema-v3-oewn-deferred-groups.sql',${ddlSha})`;
      }
      const recordInsert = async () => {
        let inserted = 0;
        for (const r of records) {
          const [row] = await tx`INSERT INTO vocabflow_editorial_staging.oewn_deferred_groups_v1
            (decision_id,candidate_group_key,headword,scope_status,previous_disposition,previous_authoring_status,source_identity,evidence_pins,decision_record_hash,decision_bundle_hash,decided_at)
            VALUES (${DECISION_ID},${r.candidateGroupKey},${r.headword},${r.scopeStatus},${r.priorDispositionClass},${r.priorAuthoringStatus},${JSON.stringify(r.sourceIdentity)}::jsonb,${JSON.stringify(r.evidencePins)}::jsonb,${r.decisionRecordSha256},${built.decision.decisionSha256},${AUTHORIZED_AT}::timestamptz)
            ON CONFLICT (decision_id,candidate_group_key) DO NOTHING RETURNING 1 AS inserted`;
          if (row) inserted++;
        }
        return inserted;
      };
      const firstInsertCount = await recordInsert();
      const replayInsertCount = await recordInsert();
      const decisionRows = await tx`SELECT candidate_group_key,scope_status,decision_record_hash,decision_bundle_hash FROM vocabflow_editorial_staging.oewn_deferred_groups_v1 WHERE decision_id=${DECISION_ID} ORDER BY candidate_group_key`;
      if (decisionRows.length !== 125 || decisionRows.some((r, i) => r.candidate_group_key !== records[i].candidateGroupKey || r.scope_status !== "DEFERRED_FROM_V2" || r.decision_record_hash !== records[i].decisionRecordSha256 || r.decision_bundle_hash !== built.decision.decisionSha256)) throw new Error("DEFERRED_GROUP_READBACK_MISMATCH");
      if (firstInsertCount !== 125 && firstInsertCount !== 0) throw new Error("DEFERRED_GROUP_INSERT_COUNT_INVALID");
      if (replayInsertCount !== 0) throw new Error("DEFERRED_GROUP_IDEMPOTENCY_FAILED");
      post = await stagingState(tx);
      const queueRows = await tx`SELECT i.proposal_key,i.source_group_key,i.effective_content_hash,i.rights_status AS identity_rights_status,i.source_provenance AS identity_source_provenance,
        d.headword,d.display_form,d.part_of_speech,d.definition_en,d.meaning_vi,d.examples,d.usage_notes,d.editorial_status,d.rights_status,d.batch_id,d.source_provenance,d.effective_content_hash AS draft_content_hash
        FROM vocabflow_editorial_staging.identity_registry i JOIN vocabflow_editorial_staging.draft_proposals d USING(proposal_key)
        WHERE i.resolution_status='EFFECTIVE' ORDER BY i.proposal_key`;
      const hashGate = queueRows.every((r) => r.editorial_status === "DRAFT" && r.rights_status === "UNKNOWN_REVIEW_REQUIRED" && r.identity_rights_status === "UNKNOWN_REVIEW_REQUIRED" && String(r.effective_content_hash).trim() === String(r.draft_content_hash).trim());
      if (queueRows.length !== 7320 || !hashGate) throw new Error("INDEPENDENT_REVIEW_QUEUE_ELIGIBILITY_GATE_FAILED");
      reviewQueue = reviewQueueBase(queueRows.map((r) => ({ ...r, staging_batch_id: r.batch_id })));
    });
  } finally { await sql.end({ timeout: 5 }); }
  const runtimeAfter = await runtimeCounts();
  if (stable(runtimeBefore) !== stable(runtimeAfter)) throw new Error("RUNTIME_PRESERVATION_GATE_FAILED");
  if (stable(pre.media) !== stable(post.media) || pre.integrity.identities !== post.integrity.identities || pre.integrity.effective_identities !== post.integrity.effective_identities
    || pre.integrity.effective_draft_rows !== post.integrity.effective_draft_rows || pre.integrity.matching_hashes !== post.integrity.matching_hashes
    || pre.integrity.pending_content !== post.integrity.pending_content || pre.integrity.pending_version !== post.integrity.pending_version || post.integrity.effective_rights_changed !== 0) throw new Error("STAGING_PRESERVATION_GATE_FAILED");
  const reviewPath = `${WORKSPACE}/independent-content-review-queue-v1.json`;
  const reviewBytes = `${JSON.stringify({ ...reviewQueue, queueSha256: sha(stable(reviewQueue)) }, null, 2)}\n`;
  const reviewSha = putImmutable(reviewPath, reviewBytes);
  const report = {
    reportType: "MASTER_V2_SCOPE_DECISION_SYNC_AND_REVIEW_PREPARATION",
    reportVersion: 1,
    target: TARGET,
    schemaVersion: 3,
    schemaArtifact: { path: ddlPath, sha256: ddlSha },
    scopeDecision: { decisionId: DECISION_ID, path: built.decisionPath, sha256: built.decisionFileSha, deferredRows: 125, replayOutcome: "IDEMPOTENT_NOOP" },
    currentScope: { sourceGroups: 6143, deferredFromV2: 125, inScope: 6018, authored: 5946, remaining: 72 },
    staging: { identitiesBefore: pre.integrity.identities, identitiesAfter: post.integrity.identities, effectiveDraftBefore: pre.integrity.effective_draft_rows, effectiveDraftAfter: post.integrity.effective_draft_rows, pendingContentBefore: pre.integrity.pending_content, pendingContentAfter: post.integrity.pending_content, pendingVersionBefore: pre.integrity.pending_version, pendingVersionAfter: post.integrity.pending_version, scopeDecisionRows: 125, matchingEffectiveContentHashes: post.integrity.matching_hashes, duplicateSenseIdentities: 0 },
    media: { before: pre.media, after: post.media, preserved: stable(pre.media) === stable(post.media) },
    independentReview: { path: reviewPath, sha256: reviewSha, effectiveDraftSenses: reviewQueue.entries.length, rightsStatus: "UNKNOWN_REVIEW_REQUIRED", reviewStatus: "PENDING_INDEPENDENT_REVIEW", approvalGranted: false, releaseEligible: false },
    runtime: { preserved: true, countsSha256: sha(stable(runtimeBefore)), tableCounts: runtimeBefore },
    invariants: { productionAccessed: false, learnerProgressOrReviewChanged: false, publicationChanged: false, rightsChanged: false, cloudinaryOrMediaChanged: false },
    ownerPacket: { path: built.packetPath, sha256: built.packetFileSha, pendingGroupDecisions: 72, pendingContentDecisions: 7, pendingVersionDecisions: 146, totalRows: 225 },
  };
  const reportPath = `${WORKSPACE}/master-v2-scope-decision-sync-report-v1.json`;
  const reportSha = putImmutable(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { reportPath, reportSha, reviewPath, reviewSha, firstRun: pre.integrity.identities === 7473, staging: post.integrity, runtimePreserved: true };
}

const built = buildArtifacts();
const command = process.argv[2] ?? "build";
if (command === "build") {
  console.log(JSON.stringify({ decisionPath: built.decisionPath, decisionSha256: built.decision.decisionSha256, decisionFileSha256: built.decisionFileSha, scopePath: built.scopePath, scopeSha256: built.scopeFileSha, ownerDecisionPacket: built.packetPath, ownerPacketSha256: built.packetFileSha, rows: { deferred: 125, remainingGroups: 72, pendingContent: 7, pendingVersion: 146 } }, null, 2));
} else if (command === "apply") {
  const result = await applyAndVerify(built);
  console.log(JSON.stringify(result, null, 2));
} else throw new Error("COMMAND_MUST_BE_BUILD_OR_APPLY");
