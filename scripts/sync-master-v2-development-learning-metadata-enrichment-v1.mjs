import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const ROOT = process.cwd();
const TARGET = Object.freeze({
  projectId: "silent-sky-84582895",
  branchId: "br-cold-shadow-a17yg4k2",
  branchName: "dev",
  endpointId: "ep-ancient-tree-a15xogc1",
  database: "neondb",
  appSchema: "vocabflow_app"
});
const WORKSPACE = path.join(ROOT, "vocabflow-dataset/workspaces/master-v2-development-sync");
const MANIFEST_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-enrichment-v1.json");
const HASH_PATH = `${MANIFEST_PATH}.sha256`;
const BASE_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-v1.json");
const REPORT_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-enrichment-sync-v1.json");
const EXPECTED_SOURCE = "VOCABFLOW_MASTER_V2_DEV";

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function assert(condition, code) { if (!condition) throw new Error(code); }
function readJson(file) {
  const bytes = readFileSync(file);
  return { value: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) };
}
function metadataValue(row, manifestSha256) {
  return {
    version: 1,
    manifestSha256,
    status: "DEVELOPMENT_ONLY",
    contentSha256: row.contentSha256,
    cefr: row.cefr,
    topics: row.topics,
    subtopics: row.subtopics,
    domains: row.domains,
    difficulty: row.difficulty,
    ageGroup: row.ageGroup,
    schoolGrade: row.schoolGrade,
    examTags: row.examTags
  };
}
function makeSetMemberships(base) {
  const result = [];
  const sortOrderBySlug = new Map(base.learningSets.map((set) => [set.slug, 0]));
  const senseByKey = new Map(base.senses.map((sense) => [sense.proposalKey, sense]));
  for (const sense of base.senses) {
    const metadataSense = senseByKey.get(sense.proposalKey);
    for (const slug of new Set((metadataSense.learningSets ?? []).map((set) => set.slug))) {
      const sortOrder = sortOrderBySlug.get(slug);
      if (sortOrder == null) continue;
      result.push({ slug, proposalKey: sense.proposalKey, contentSha256: sense.contentSha256, sortOrder });
      sortOrderBySlug.set(slug, sortOrder + 1);
    }
  }
  return result;
}
function expectedFinalMemberships(base, manifest) {
  return [...makeSetMemberships(base), ...manifest.learningSetMembershipAdditions]
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.sortOrder - b.sortOrder || a.proposalKey.localeCompare(b.proposalKey));
}
function validateManifest() {
  const manifestFile = readJson(MANIFEST_PATH);
  const manifest = manifestFile.value;
  const sidecar = readFileSync(HASH_PATH, "utf8").trim().split(/\s+/u);
  assert(sidecar[0] === manifestFile.sha256 && sidecar[1] === path.basename(MANIFEST_PATH), "ENRICHMENT_MANIFEST_SHA256_MISMATCH");
  const baseFile = readJson(BASE_PATH);
  assert(manifest.artifactType === "MASTER_V2_DEVELOPMENT_LEARNING_METADATA_ENRICHMENT"
    && manifest.artifactVersion === "1.0.0" && manifest.status === "DEVELOPMENT_ONLY_METADATA_ENRICHMENT"
    && manifest.scope?.senseCount === 7311 && manifest.scope.contentChanged === false
    && manifest.scope.reviewStatusChanged === false && manifest.scope.rightsStatusChanged === false
    && manifest.scope.mediaChanged === false && manifest.sourcePins.baseManifestSha256 === baseFile.sha256,
  "ENRICHMENT_MANIFEST_GATE_FAILURE");
  for (const [key, filePath] of [["queueSha256", manifest.sourcePins.queuePath],
    ["candidateSha256", manifest.sourcePins.candidatePath], ["oxfordInventorySha256", manifest.sourcePins.oxfordInventoryPath],
    ["vocab4600InventorySha256", manifest.sourcePins.vocab4600InventoryPath], ["taxonomySha256", manifest.sourcePins.taxonomyPath]]) {
    assert(readJson(path.resolve(ROOT, filePath)).sha256 === manifest.sourcePins[key], `ENRICHMENT_SOURCE_PIN_MISMATCH_${key}`);
  }
  const base = baseFile.value;
  assert(base.senses.length === 7311 && manifest.senses?.length === 7311
    && new Set(manifest.senses.map((row) => row.proposalKey)).size === 7311
    && manifest.counts.cefrSourceVerifiedBaseline === base.counts.sourceVerifiedCefr
    && manifest.counts.cefrSourceVerifiedTotal + manifest.counts.cefrUnknown === 7311,
  "ENRICHMENT_SENSE_SCOPE_OR_COUNT_FAILURE");
  const baseByKey = new Map(base.senses.map((row) => [row.proposalKey, row]));
  const additions = new Map(manifest.learningSetMembershipAdditions.map((row) => [row.proposalKey, row]));
  for (const row of manifest.senses) {
    const baseline = baseByKey.get(row.proposalKey);
    assert(baseline?.contentSha256 === row.contentSha256 && /^[0-9a-f]{64}$/u.test(row.contentSha256), "ENRICHMENT_CONTENT_HASH_MISMATCH");
    if (row.cefr.status === "SOURCE_VERIFIED") {
      assert(["A1", "A2", "B1", "B2", "C1", "C2", "PRE_A1"].includes(row.cefr.value)
        && row.cefr.evidence?.length > 0 && row.cefr.evidence.every((e) => /^[0-9a-f]{64}$/u.test(e.recordEvidenceSha256)),
      "SOURCE_VERIFIED_CEFR_EVIDENCE_INVALID");
    } else assert(row.cefr.value === null && row.cefr.status === "UNKNOWN", "UNKNOWN_CEFR_SHAPE_INVALID");
    assert(["DERIVED", "UNKNOWN"].includes(row.topics.status)
      && ["DERIVED", "UNKNOWN"].includes(row.subtopics.status)
      && ["DERIVED", "UNKNOWN"].includes(row.domains.status)
      && ["DERIVED", "UNKNOWN"].includes(row.difficulty.status)
      && row.ageGroup.status === "UNKNOWN" && row.schoolGrade.status === "UNKNOWN" && row.examTags.status === "UNKNOWN",
    "CLASSIFICATION_STATUS_INVALID");
    const shouldAdd = !baseline.cefr && row.cefr.status === "SOURCE_VERIFIED";
    assert(shouldAdd === additions.has(row.proposalKey), "CEFR_LEARNING_SET_DELTA_MISMATCH");
    if (shouldAdd) assert(additions.get(row.proposalKey).slug === `v2-cefr-${row.cefr.value.toLowerCase().replaceAll("_", "-")}`,
      "CEFR_LEARNING_SET_DELTA_IDENTITY_MISMATCH");
  }
  const expectedSets = new Set(base.learningSets.map((row) => row.slug));
  for (const set of manifest.learningSetDefinitionsAdded) assert(!expectedSets.has(set.slug) && set.slug.startsWith("v2-cefr-"), "INVALID_ADDITIONAL_LEARNING_SET");
  const expectedLinks = expectedFinalMemberships(base, manifest);
  assert(expectedLinks.length === manifest.counts.learningSetMembershipsAfter
    && base.learningSets.length === manifest.counts.learningSetsBefore
    && base.counts.learningSetMemberships === manifest.counts.learningSetMembershipsBefore,
  "LEARNING_SET_MANIFEST_BASELINE_MISMATCH");
  return { manifest, manifestSha256: manifestFile.sha256, base, baseManifestSha256: baseFile.sha256, expectedLinks };
}

async function verifyNeonApiTarget(env) {
  assert(env.NEON_V2_PROJECT_ID === TARGET.projectId && env.NEON_V2_BRANCH_ID === TARGET.branchId
    && env.NEON_V2_DATABASE === TARGET.database && env.NEON_API_KEY, "NEON_V2_DEVELOPMENT_ENV_METADATA_REQUIRED");
  const headers = { Authorization: `Bearer ${env.NEON_API_KEY}` };
  const responses = await Promise.all([
    fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}`, { headers }),
    fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/branches/${TARGET.branchId}`, { headers }),
    fetch(`https://console.neon.tech/api/v2/projects/${TARGET.projectId}/endpoints`, { headers })
  ]);
  assert(responses.every((response) => response.ok), "NEON_V2_TARGET_API_PREFLIGHT_FAILED");
  const [projectBody, branchBody, endpointBody] = await Promise.all(responses.map((response) => response.json()));
  const endpoint = (endpointBody.endpoints ?? []).find((row) => row.id === TARGET.endpointId);
  assert(projectBody.project?.id === TARGET.projectId && projectBody.project?.name === "vocabflow-v2"
    && branchBody.branch?.id === TARGET.branchId && branchBody.branch?.project_id === TARGET.projectId
    && branchBody.branch?.name === TARGET.branchName && branchBody.branch?.primary === false
    && endpoint?.branch_id === TARGET.branchId && endpoint?.type === "read_write",
  "NEON_V2_DEVELOPMENT_TARGET_MISMATCH");
}

function verifyConnectionUrl(value) {
  assert(value, "NEON_V2_MIGRATION_CONNECTION_REQUIRED");
  const parsed = new URL(value);
  assert(new Set(["postgres:", "postgresql:"]).has(parsed.protocol)
    && parsed.hostname === `${TARGET.endpointId}.ap-southeast-1.aws.neon.tech`
    && decodeURIComponent(parsed.pathname.replace(/^\//u, "")) === TARGET.database
    && decodeURIComponent(parsed.username) === "vocabflow_migration"
    && parsed.searchParams.get("sslmode") === "require"
    && !parsed.hostname.includes("-pooler"), "NEON_V2_CONNECTION_TARGET_MISMATCH");
}

async function readIdentity(tx) {
  const [identity] = await tx.unsafe("select current_database() database, session_user role, environment, provider, project_id, branch_id, identity_version from vocabflow_meta.environment_identity where id=1");
  assert(identity?.database === TARGET.database && identity.role === "vocabflow_migration"
    && identity.environment === "development" && identity.provider === "neon"
    && identity.project_id === TARGET.projectId && identity.branch_id === TARGET.branchId
    && identity.identity_version === 1, "CONNECTED_DATABASE_IS_NOT_NEON_V2_DEVELOPMENT");
}

async function preservedFingerprint(tx, base) {
  const [invariants] = await tx.unsafe(`select
    (select count(*)::int from vocabflow_app.vocabularies) vocabulary_rows,
    (select count(*)::int from vocabflow_app.vocabularies where source_dataset is null) legacy_vocabulary_rows,
    (select count(*)::int from vocabflow_app.vocabularies where source_dataset='${EXPECTED_SOURCE}') v2_vocabulary_rows,
    (select count(*)::int from vocabflow_app.learner_progress) progress_rows,
    (select coalesce(md5(string_agg(to_jsonb(lp)::text, E'\\n' order by lp.learner_id, lp.vocabulary_id)), md5('')) from vocabflow_app.learner_progress lp) progress_fingerprint,
    (select count(*)::int from vocabflow_app.review_events) review_rows,
    (select coalesce(md5(string_agg(to_jsonb(re)::text, E'\\n' order by re.household_id, re.review_id)), md5('')) from vocabflow_app.review_events re) review_fingerprint,
    (select coalesce(md5(string_agg(to_jsonb(v)::text, E'\\n' order by v.id)), md5('')) from vocabflow_app.vocabularies v) vocabulary_fingerprint,
    (select coalesce(md5(string_agg(p.proposal_key || ':' || p.content_sha256, E'\\n' order by p.proposal_key)), md5('')) from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}') content_hash_fingerprint,
    (select coalesce(md5(string_agg(p.proposal_key || ':' || coalesce(p.development_media::text,'null'), E'\\n' order by p.proposal_key)), md5('')) from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}') media_fingerprint,
    (select coalesce(md5(string_agg(p.proposal_key || ':' || (to_jsonb(p) - 'cefr' - 'source_provenance')::text, E'\\n' order by p.proposal_key)), md5('')) from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}') projection_nonmetadata_fingerprint,
    (select coalesce(md5(string_agg(p.proposal_key || ':' || (p.source_provenance - 'developmentLearningMetadataV2')::text, E'\\n' order by p.proposal_key)), md5('')) from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}') provenance_other_fingerprint,
    (select count(*)::int from vocabflow_app.topics) topic_rows,
    (select count(*)::int from vocabflow_app.vocabulary_topics) topic_membership_rows,
    (select coalesce(md5(string_agg(to_jsonb(t)::text, E'\\n' order by t.id)), md5('')) from vocabflow_app.topics t) topic_fingerprint,
    (select coalesce(md5(string_agg(to_jsonb(vt)::text, E'\\n' order by vt.vocabulary_id, vt.topic_id)), md5('')) from vocabflow_app.vocabulary_topics vt) topic_membership_fingerprint,
    (select coalesce(md5(string_agg(to_jsonb(s)::text, E'\\n' order by s.id)), md5('')) from vocabflow_app.learning_sets s where s.slug = any($1::text[])) base_learning_set_fingerprint`,
    [base.learningSets.map((set) => set.slug)]);
  return invariants;
}

async function readCurrentState(tx, data) {
  const { manifest, manifestSha256, base, baseManifestSha256 } = data;
  const [counts] = await tx.unsafe(`select
    (select count(*)::int from vocabflow_app.vocabularies where source_dataset='${EXPECTED_SOURCE}') v2_vocabularies,
    (select count(*)::int from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}') v2_projections,
    (select count(distinct p.proposal_key)::int from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}') unique_identities,
    (select count(*)::int from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}' and p.content_review_decision='PASS' and p.editorial_status='DRAFT' and p.rights_status='UNKNOWN_REVIEW_REQUIRED') eligible_drafts,
    (select count(*)::int from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}' and p.source_provenance->'developmentLearningMetadataV1'->>'manifestSha256'=$1) base_metadata_rows,
    (select count(*)::int from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}' and p.source_provenance ? 'developmentLearningMetadataV2') enrichment_rows,
    (select count(*)::int from vocabflow_app.topics) topics,
    (select count(*)::int from vocabflow_app.vocabulary_topics) topic_memberships,
    (select count(*)::int from vocabflow_app.learning_sets where slug = any($2::text[])) base_learning_sets,
    (select count(*)::int from vocabflow_app.learning_sets where slug like 'v2-%') v2_learning_sets,
    (select count(*)::int from vocabflow_app.learning_set_items lsi join vocabflow_app.vocabularies v on v.id=lsi.vocabulary_id join vocabflow_app.learning_sets s on s.id=lsi.learning_set_id where v.source_dataset='${EXPECTED_SOURCE}' and s.slug like 'v2-%') v2_learning_memberships,
    (select count(*)::int from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id where v.source_dataset='${EXPECTED_SOURCE}' and p.cefr is not null) cefr_assignments`,
    [baseManifestSha256, base.learningSets.map((set) => set.slug)]);

  const projectionRows = await tx.unsafe(`select p.proposal_key, p.content_sha256, p.cefr,
    p.source_provenance->'developmentLearningMetadataV1'->>'manifestSha256' base_manifest_sha,
    p.source_provenance->'developmentLearningMetadataV2' enrichment_metadata,
    v.source_dataset, p.content_review_decision, p.editorial_status, p.rights_status
    from vocabflow_app.master_v2_development_projections p
    join vocabflow_app.vocabularies v on v.id=p.vocabulary_id
    where v.source_dataset='${EXPECTED_SOURCE}' order by p.proposal_key`);
  const sets = await tx.unsafe("select slug, name, description, grade::text grade, enabled, sort_order from vocabflow_app.learning_sets where slug = any($1::text[]) order by slug",
    [[...base.learningSets.map((set) => set.slug), ...manifest.learningSetDefinitionsAdded.map((set) => set.slug)]]);
  const memberships = await tx.unsafe(`select s.slug, p.proposal_key, p.content_sha256, lsi.sort_order,
    v.source_dataset from vocabflow_app.learning_set_items lsi
    join vocabflow_app.learning_sets s on s.id=lsi.learning_set_id
    join vocabflow_app.vocabularies v on v.id=lsi.vocabulary_id
    left join vocabflow_app.master_v2_development_projections p on p.vocabulary_id=v.id
    where s.slug = any($1::text[]) order by s.slug, lsi.sort_order, p.proposal_key`,
    [[...base.learningSets.map((set) => set.slug), ...manifest.learningSetDefinitionsAdded.map((set) => set.slug)]]);
  const enrichmentByKey = new Map(manifest.senses.map((row) => [row.proposalKey, row]));
  const baseByKey = new Map(base.senses.map((row) => [row.proposalKey, row]));
  assert(counts.v2_vocabularies === 7311 && counts.v2_projections === 7311 && counts.unique_identities === 7311
    && counts.eligible_drafts === 7311 && counts.base_metadata_rows === 7311 && counts.topics === 21
    && counts.topic_memberships === 1768 && counts.base_learning_sets === 10,
  "NEON_V2_METADATA_BASELINE_MISMATCH");
  assert(projectionRows.length === 7311 && new Set(projectionRows.map((row) => row.proposal_key)).size === 7311,
    "NEON_V2_PROJECTION_IDENTITY_MISMATCH");
  for (const row of projectionRows) {
    const expected = enrichmentByKey.get(row.proposal_key);
    const baseline = baseByKey.get(row.proposal_key);
    assert(expected && baseline && row.content_sha256 === expected.contentSha256
      && row.base_manifest_sha === baseManifestSha256 && row.source_dataset === EXPECTED_SOURCE
      && row.content_review_decision === "PASS" && row.editorial_status === "DRAFT"
      && row.rights_status === "UNKNOWN_REVIEW_REQUIRED", "NEON_V2_CONTENT_OR_REVIEW_HASH_MISMATCH");
    assert(row.cefr === (baseline.cefr?.value ?? null) || row.cefr === (expected.cefr.value ?? null),
      "NEON_V2_CEFR_CONCURRENT_CHANGE");
    if (row.enrichment_metadata != null) {
      assert(row.enrichment_metadata.manifestSha256 === manifestSha256
        && row.enrichment_metadata.contentSha256 === expected.contentSha256
        && stable(row.enrichment_metadata) === stable(metadataValue(expected, manifestSha256)),
      "NEON_V2_ENRICHMENT_METADATA_CONFLICT");
    }
  }

  const setBySlug = new Map(sets.map((row) => [row.slug, row]));
  assert(sets.length === (counts.enrichment_rows === 7311 ? 11 : 10)
    && counts.v2_learning_sets === sets.length, "NEON_V2_LEARNING_SET_SCOPE_MISMATCH");
  for (const expected of base.learningSets) {
    const actual = setBySlug.get(expected.slug);
    assert(actual && actual.name === expected.name && actual.description === expected.description
      && actual.grade == null && actual.enabled === true && Number(actual.sort_order) === expected.sortOrder,
    "NEON_V2_EXISTING_LEARNING_SET_CHANGED");
  }
  for (const expected of manifest.learningSetDefinitionsAdded) {
    const actual = setBySlug.get(expected.slug);
    if (actual) assert(actual.name === expected.name && actual.description === expected.description
      && actual.grade == null && actual.enabled === expected.enabled && Number(actual.sort_order) === expected.sortOrder,
    "NEON_V2_ADDED_LEARNING_SET_CONFLICT");
  }

  const expectedBaseLinks = makeSetMemberships(base);
  const expectedFullLinks = expectedFinalMemberships(base, manifest);
  const actualLinks = memberships.map((row) => ({ slug: row.slug, proposalKey: row.proposal_key,
    contentSha256: row.content_sha256, sortOrder: Number(row.sort_order), sourceDataset: row.source_dataset }));
  const isSameLinks = (expected, actual) => {
    if (expected.length !== actual.length) return false;
    const actualByKey = new Map(actual.map((row) => [`${row.slug}\n${row.proposalKey}`, row]));
    if (actualByKey.size !== actual.length) return false;
    return expected.every((row) => {
      const actualRow = actualByKey.get(`${row.slug}\n${row.proposalKey}`);
      return actualRow && actualRow.sourceDataset === EXPECTED_SOURCE
        && actualRow.contentSha256 === row.contentSha256 && actualRow.sortOrder === row.sortOrder;
    });
  };
  const isBase = isSameLinks(expectedBaseLinks, actualLinks);
  const isFinal = isSameLinks(expectedFullLinks, actualLinks);
  const metadataState = counts.enrichment_rows === 0 ? "BASELINE" : counts.enrichment_rows === 7311 ? "ENRICHED" : "INVALID_PARTIAL";
  assert((metadataState === "BASELINE" && isBase && counts.v2_learning_memberships === expectedBaseLinks.length)
    || (metadataState === "ENRICHED" && isFinal && counts.v2_learning_memberships === expectedFullLinks.length),
  "NEON_V2_LEARNING_MEMBERSHIP_STATE_MISMATCH");
  for (const row of projectionRows) {
    const expected = enrichmentByKey.get(row.proposal_key);
    const baseline = baseByKey.get(row.proposal_key);
    assert(row.cefr === (metadataState === "BASELINE" ? (baseline.cefr?.value ?? null) : (expected.cefr.value ?? null)),
      "NEON_V2_CEFR_STATE_MISMATCH");
  }
  return { counts, projectionRows, sets, memberships, metadataState };
}

async function applyEnrichment(tx, data) {
  const { manifest, manifestSha256, base } = data;
  await tx.unsafe("select pg_advisory_xact_lock(hashtext('vocabflow-master-v2-development-learning-metadata-enrichment-v1'))");
  const before = await preservedFingerprint(tx, base);
  const state = await readCurrentState(tx, data);
  assert(state.metadataState === "BASELINE" || state.metadataState === "ENRICHED", "NEON_V2_ENRICHMENT_PARTIAL_STATE");

  let insertedSets = 0;
  for (const set of manifest.learningSetDefinitionsAdded) {
    const existing = state.sets.find((row) => row.slug === set.slug);
    if (existing) continue;
    const rows = await tx.unsafe(`insert into vocabflow_app.learning_sets (slug,name,description,grade,enabled,sort_order)
      values ($1,$2,$3,null,$4,$5) on conflict (slug) do nothing returning id`,
      [set.slug, set.name, set.description, set.enabled, set.sortOrder]);
    insertedSets += rows.length;
  }

  const projectionInputs = manifest.senses.map((row) => ({
    proposalKey: row.proposalKey,
    contentSha256: row.contentSha256,
    cefr: row.cefr.value,
    metadata: metadataValue(row, manifestSha256)
  }));
  let updatedProjectionRows = 0;
  for (let offset = 0; offset < projectionInputs.length; offset += 250) {
    const batch = projectionInputs.slice(offset, offset + 250);
    const result = await tx.unsafe(`with input as (
      select * from jsonb_to_recordset($1::jsonb) as x("proposalKey" text,"contentSha256" text,cefr text,metadata jsonb)
    ) update vocabflow_app.master_v2_development_projections p
      set cefr=input.cefr,
          source_provenance=jsonb_set(coalesce(p.source_provenance,'{}'::jsonb),'{developmentLearningMetadataV2}',input.metadata,true)
      from input, vocabflow_app.vocabularies v
      where p.proposal_key=input."proposalKey" and v.id=p.vocabulary_id and v.source_dataset='${EXPECTED_SOURCE}'
        and p.content_sha256=input."contentSha256"
        and p.content_review_decision='PASS' and p.editorial_status='DRAFT' and p.rights_status='UNKNOWN_REVIEW_REQUIRED'
        and (p.cefr is distinct from input.cefr
          or p.source_provenance->'developmentLearningMetadataV2' is distinct from input.metadata)
      returning p.proposal_key`, [tx.json(batch)]);
    updatedProjectionRows += result.length;
  }

  let insertedMemberships = 0;
  if (state.metadataState === "BASELINE" && manifest.learningSetMembershipAdditions.length) {
    const setSlugs = [...new Set(manifest.learningSetMembershipAdditions.map((row) => row.slug))];
    const proposalKeys = manifest.learningSetMembershipAdditions.map((row) => row.proposalKey);
    const setRows = await tx.unsafe("select id,slug from vocabflow_app.learning_sets where slug=any($1::text[]) and enabled=true", [setSlugs]);
    const projectionRows = await tx.unsafe(`select p.proposal_key,p.content_sha256,p.vocabulary_id,v.source_dataset
      from vocabflow_app.master_v2_development_projections p join vocabflow_app.vocabularies v on v.id=p.vocabulary_id
      where p.proposal_key=any($1::text[])`, [proposalKeys]);
    const setIds = new Map(setRows.map((row) => [row.slug, row.id]));
    const projectionByKey = new Map(projectionRows.map((row) => [row.proposal_key, row]));
    assert(setIds.size === setSlugs.length && projectionByKey.size === proposalKeys.length,
      "NEON_V2_LEARNING_SET_IDENTITY_RESOLUTION_FAILURE");
    const membershipInputs = manifest.learningSetMembershipAdditions.map((row) => {
      const projection = projectionByKey.get(row.proposalKey);
      assert(projection && projection.source_dataset === EXPECTED_SOURCE
        && projection.content_sha256 === row.contentSha256, "NEON_V2_LEARNING_SET_MEMBER_IDENTITY_MISMATCH");
      return { learningSetId: setIds.get(row.slug), vocabularyId: projection.vocabulary_id, sortOrder: row.sortOrder };
    });
    for (let offset = 0; offset < membershipInputs.length; offset += 500) {
      const batch = membershipInputs.slice(offset, offset + 500);
      const added = await tx.unsafe(`with input as (
        select * from jsonb_to_recordset($1::jsonb) as x("learningSetId" integer,"vocabularyId" integer,"sortOrder" integer)
      ) insert into vocabflow_app.learning_set_items (learning_set_id,vocabulary_id,sort_order)
        select "learningSetId","vocabularyId","sortOrder" from input order by "learningSetId","sortOrder","vocabularyId"
        on conflict (learning_set_id,vocabulary_id) do nothing returning vocabulary_id`, [tx.json(batch)]);
      insertedMemberships += added.length;
    }
  }

  const after = await preservedFingerprint(tx, base);
  assert(stable(before) === stable(after), "NEON_V2_RUNTIME_MEDIA_OR_HISTORY_PRESERVATION_FAILURE");
  const finalState = await readCurrentState(tx, data);
  assert(finalState.metadataState === "ENRICHED", "NEON_V2_ENRICHMENT_READBACK_NOT_COMPLETE");
  assert(finalState.counts.v2_learning_memberships === manifest.counts.learningSetMembershipsAfter
    && finalState.counts.v2_learning_sets === manifest.counts.learningSetsAfter,
  "NEON_V2_ENRICHMENT_MEMBERSHIP_COUNT_MISMATCH");
  return { before, after, insertedSets, updatedProjectionRows, insertedMemberships, finalState };
}

async function main() {
  const dryRun = !process.argv.includes("--apply");
  const { manifest, manifestSha256, base, baseManifestSha256, expectedLinks } = validateManifest();
  assert(process.env.VOCABFLOW_ENV === "development" && process.env.DATABASE_ENV === "development"
    && !process.env.VERCEL_ENV && process.env.VOCAB_DATASET_VERSION === "v2", "LOCAL_DEVELOPMENT_ENVIRONMENT_REQUIRED");
  await verifyNeonApiTarget(process.env);
  verifyConnectionUrl(process.env.DATABASE_MIGRATION_URL);
  const db = postgres(process.env.DATABASE_MIGRATION_URL, { max: 1, connect_timeout: 20, prepare: false, ssl: "require", onnotice: () => undefined });
  const data = { manifest, manifestSha256, base, baseManifestSha256, expectedLinks };
  try {
    const readPlan = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await readIdentity(tx);
      const preservation = await preservedFingerprint(tx, base);
      const state = await readCurrentState(tx, data);
      return { preservation, state };
    });
    if (dryRun) {
      console.log(JSON.stringify({ status: "DRY_RUN_PASS", target: `${TARGET.projectId}/${TARGET.branchId}/${TARGET.database}`,
        manifestSha256, state: readPlan.state.metadataState, targetSenseRows: readPlan.state.counts.v2_projections,
        cefrBefore: readPlan.state.counts.cefr_assignments, cefrAfter: manifest.counts.cefrSourceVerifiedTotal,
        sourceVerifiedCefrAdded: manifest.counts.cefrSourceVerifiedFromVocab4600,
        unknownCefr: manifest.counts.cefrUnknown, sourceDisagreementNotOverwritten: manifest.counts.cefrSecondarySourceDisagreementSenses,
        topics: manifest.counts.topicCoverage, subtopics: manifest.counts.subtopicCoverage, domains: manifest.counts.domainCoverage,
        difficultyDerived: manifest.counts.difficultyDerived, ageGroup: 0, schoolGrade: 0, examTags: 0,
        learningSetsBefore: manifest.counts.learningSetsBefore, learningSetsAfter: manifest.counts.learningSetsAfter,
        learningSetMembershipsBefore: manifest.counts.learningSetMembershipsBefore,
        learningSetMembershipsAfter: manifest.counts.learningSetMembershipsAfter,
        progressRows: readPlan.preservation.progress_rows, reviewRows: readPlan.preservation.review_rows,
        writes: "none; rerun with --apply to sync metadata only" }, null, 2));
      return;
    }

    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      await readIdentity(tx);
      await tx.unsafe("select pg_advisory_xact_lock(hashtext('vocabflow-master-v2-development-learning-metadata-enrichment-v1'))");
      const preservation = await preservedFingerprint(tx, base);
      const current = await readCurrentState(tx, data);
      assert(stable(preservation) === stable(readPlan.preservation)
        && current.metadataState === readPlan.state.metadataState,
      "NEON_V2_CHANGED_AFTER_PREFLIGHT");
      return await applyEnrichment(tx, data);
    });
    const report = {
      artifactType: "MASTER_V2_DEVELOPMENT_LEARNING_METADATA_ENRICHMENT_SYNC",
      version: 1,
      status: "SYNCED_DEVELOPMENT_ONLY",
      target: TARGET,
      manifestPath: path.relative(ROOT, MANIFEST_PATH).replaceAll("\\", "/"),
      manifestSha256,
      counts: { ...manifest.counts, projectionsUpdated: result.updatedProjectionRows,
        learningSetsInserted: result.insertedSets, learningSetMembershipsInserted: result.insertedMemberships },
      preservation: { before: result.before, after: result.after,
        contentHashesUnchanged: true, vocabularyRowsUnchanged: true, nonMetadataProjectionFieldsUnchanged: true,
        sourceProvenanceOutsideEnrichmentUnchanged: true, topicCatalogAndMembershipsUnchanged: true,
        learnerProgressUnchanged: true, reviewHistoryUnchanged: true, cloudinaryMediaUnchanged: true,
        rightsAndReviewStatusesUnchanged: true },
      idempotency: { replaySupported: true, transactionAtomic: true }
    };
    const body = `${JSON.stringify(report, null, 2)}\n`;
    writeFileSync(REPORT_PATH, body, "utf8");
    writeFileSync(`${REPORT_PATH}.sha256`, `${sha256(body)}  ${path.basename(REPORT_PATH)}\n`, "utf8");
    console.log(JSON.stringify({ status: "SYNCED_DEVELOPMENT_ONLY", target: `${TARGET.projectId}/${TARGET.branchId}/${TARGET.database}`,
      stateBefore: readPlan.state.metadataState, manifestSha256, sourceVerifiedCefr: manifest.counts.cefrSourceVerifiedTotal,
      cefrAdded: manifest.counts.cefrSourceVerifiedFromVocab4600, cefrUnknown: manifest.counts.cefrUnknown,
      learningSets: manifest.counts.learningSetsAfter, learningSetMemberships: manifest.counts.learningSetMembershipsAfter,
      projectionsUpdated: result.updatedProjectionRows, learningSetsInserted: result.insertedSets,
      learningSetMembershipsInserted: result.insertedMemberships, runtimePreserved: true,
      report: path.relative(ROOT, REPORT_PATH).replaceAll("\\", "/") }, null, 2));
  } finally { await db.end(); }
}

main().catch((error) => {
  const code = error instanceof Error ? error.message : "UNKNOWN_METADATA_SYNC_FAILURE";
  console.error(`LEARNING_METADATA_ENRICHMENT_SYNC_FAILED=${code}`);
  process.exitCode = 1;
});
