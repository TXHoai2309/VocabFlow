import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const expected = {
  projectId: "silent-sky-84582895",
  branchId: "br-cold-shadow-a17yg4k2",
  database: "neondb",
  count: 7311,
  contentFingerprint: "9abf453175f3cb48fdf46c779e6bdcbb5cad8ba659df3321893a777a539cb367"
};
if (!process.env.DATABASE_URL) throw new Error("MISSING_DATABASE_URL");
if ((process.env.DATABASE_ENV && process.env.DATABASE_ENV !== "development")
  || (process.env.VOCABFLOW_ENV && process.env.VOCABFLOW_ENV !== "development")
  || (process.env.VOCAB_DATASET_VERSION && process.env.VOCAB_DATASET_VERSION !== "v2")) {
  throw new Error("NON_DEVELOPMENT_V2_TARGET_BLOCKED");
}

const outputDir = path.resolve(process.env.SHORT_MEANING_ARTIFACT_DIR ?? ".vocabflow-local/short-meanings-v2");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => JSON.stringify(value);
const countWords = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
const isShortCandidate = (value) => typeof value === "string"
  && value.trim().length > 0
  && countWords(value) <= 6
  && !/[.!?;:\n\r]/u.test(value.trim());
async function writeArtifactOnce(filePath, content) {
  try {
    const existing = await readFile(filePath, "utf8");
    if (existing !== content) throw new Error("EXISTING_ARTIFACT_DIFFERS_FROM_CURRENT_SNAPSHOT");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await writeFile(filePath, content, { flag: "wx" });
  }
}

const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => undefined });
try {
  await db.begin("isolation level repeatable read, read only", async (tx) => {
    const [identity] = await tx`
      select environment, provider, project_id, branch_id, identity_version
      from vocabflow_meta.environment_identity where id = 1
    `;
    if (!identity || identity.environment !== "development" || identity.provider !== "neon"
      || identity.project_id !== expected.projectId || identity.branch_id !== expected.branchId) {
      throw new Error("NEON_DEVELOPMENT_IDENTITY_MISMATCH");
    }
    const [dbName] = await tx`select current_database() as database_name`;
    if (dbName?.database_name !== expected.database) throw new Error("DATABASE_NAME_MISMATCH");

    const rows = await tx`
      select v.id as vocabulary_id,
        md.proposal_key as proposal_identity,
        v.word as headword,
        coalesce(md.source_provenance->'masterV2Identity'->>'displayForm', v.word) as display_form,
        md.part_of_speech,
        md.cefr,
        v.ipa,
        coalesce(v.vietnamese_override, v.vietnamese) as vietnamese_explanation,
        md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' as source_meaning_vi,
        v.definition_en,
        v.example_en,
        md.examples,
        md.source_provenance,
        md.content_sha256 as source_content_hash,
        md.content_review_decision,
        md.editorial_status,
        md.review_receipt_sha256
      from vocabflow_app.vocabularies v
      join vocabflow_app.master_v2_development_projections md on md.vocabulary_id = v.id
      where v.enabled = true and v.source_dataset = 'VOCABFLOW_MASTER_V2_DEV'
      order by md.proposal_key
    `;
    if (rows.length !== expected.count) throw new Error(`SENSE_COUNT_MISMATCH_${rows.length}`);
    const identities = new Set(rows.map((row) => row.proposal_identity));
    if (identities.size !== expected.count) throw new Error("DUPLICATE_SENSE_IDENTITIES");
    const invalid = rows.filter((row) => row.content_review_decision !== "PASS" || row.editorial_status !== "DRAFT"
      || !/^[0-9a-f]{64}$/.test(row.source_content_hash ?? "") || !row.proposal_identity || !row.review_receipt_sha256);
    if (invalid.length) throw new Error(`INVALID_CURRENT_PROJECTIONS_${invalid.length}`);

    const contentFingerprint = sha256(canonicalJson(rows
      .map((row) => [row.proposal_identity, row.source_content_hash])
      .sort((a, b) => a[0].localeCompare(b[0]))));
    if (contentFingerprint !== expected.contentFingerprint) throw new Error("V2_CONTENT_FINGERPRINT_MISMATCH");
    const [importRun] = await tx`
      select projection_fingerprint, imported_sense_count, target_project_id, target_branch_id, target_database
      from vocabflow_app.master_v2_development_import_runs
      where target_project_id = ${expected.projectId} and target_branch_id = ${expected.branchId}
        and target_database = ${expected.database}
      order by created_at desc limit 1
    `;
    if (!importRun || importRun.imported_sense_count !== expected.count) throw new Error("DEVELOPMENT_IMPORT_RUN_MISSING_OR_STALE");

    const snapshotPayload = {
      artifactVersion: "short-meanings-v2-input-v1",
      target: expected,
      contentFingerprint,
      developmentProjectionFingerprint: importRun.projection_fingerprint,
      rows: rows.map((row) => ({
        vocabularyId: Number(row.vocabulary_id),
        proposalIdentity: row.proposal_identity,
        sourceContentHash: row.source_content_hash,
        headword: row.headword,
        displayForm: row.display_form,
        partOfSpeech: row.part_of_speech,
        cefr: row.cefr,
        ipa: row.ipa,
        vietnameseExplanation: row.vietnamese_explanation,
        sourceMeaningVi: row.source_meaning_vi,
        definitionEn: row.definition_en,
        exampleEn: row.example_en,
        examples: row.examples,
        sourceProvenance: row.source_provenance,
        contentReviewDecision: row.content_review_decision,
        editorialStatus: row.editorial_status,
        reviewReceiptSha256: row.review_receipt_sha256
      }))
    };
    const snapshotFingerprint = sha256(canonicalJson(snapshotPayload));
    const results = rows.map((row) => {
      const sourceGloss = typeof row.source_meaning_vi === "string" ? row.source_meaning_vi.trim() : "";
      const reusableCandidate = isShortCandidate(sourceGloss);
      return {
        vocabularyId: Number(row.vocabulary_id),
        masterSenseIdentity: row.master_sense_identity,
        sourceContentHash: row.source_content_hash,
        headword: row.headword,
        partOfSpeech: row.part_of_speech,
        shortMeaningVi: reusableCandidate ? sourceGloss : null,
        sourceType: null,
        evidenceRef: reusableCandidate ? `projection:${row.proposal_identity}:sourceProvenance.masterV2Identity.sourceMeaningVi` : null,
        confidence: reusableCandidate ? "MEDIUM" : null,
        validationStatus: reusableCandidate ? "REVIEW_REQUIRED" : "UNRESOLVED",
        reviewerIdentity: null,
        reviewedAt: null,
        reviewEvidence: null,
        reviewReason: reusableCandidate
          ? "Exact-identity sourceMeaningVi is short enough to be a candidate, but no approval record for its short-gloss semantics was present in the source snapshot. No paid AI was called."
          : "No identity-pinned short translation was available in the source snapshot. No paid AI was called.",
      artifactVersion: "short-meanings-v2-results-v1"
      };
    });
    const resultText = results.map(canonicalJson).join("\n") + "\n";
    const manifest = {
      artifactVersion: "short-meanings-v2-manifest-v1",
      target: expected,
      developmentProjectionFingerprint: importRun.projection_fingerprint,
      contentFingerprint,
      rowCount: rows.length,
      snapshotFingerprint,
      snapshotSha256: sha256(canonicalJson(snapshotPayload)),
      resultSha256: sha256(resultText),
      aiCalls: 0,
      verifiedCount: results.filter((row) => row.validationStatus === "VERIFIED").length,
      reviewRequiredCount: results.filter((row) => row.validationStatus === "REVIEW_REQUIRED").length,
      unresolvedCount: results.filter((row) => row.validationStatus === "UNRESOLVED").length
    };
    await mkdir(outputDir, { recursive: true });
    await writeArtifactOnce(path.join(outputDir, "input-snapshot.json"), `${canonicalJson({ ...snapshotPayload, snapshotFingerprint })}\n`);
    await writeArtifactOnce(path.join(outputDir, "results.jsonl"), resultText);
    await writeArtifactOnce(path.join(outputDir, "manifest.json"), `${canonicalJson(manifest)}\n`);
    console.log(JSON.stringify({
      target: expected,
      snapshotFingerprint,
      rowCount: rows.length,
      aiCalls: 0,
      verified: manifest.verifiedCount,
      reviewRequired: manifest.reviewRequiredCount,
      unresolved: manifest.unresolvedCount,
      artifactDirectory: outputDir
    }, null, 2));
  });
} finally {
  await db.end();
}
