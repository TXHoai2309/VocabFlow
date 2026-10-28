import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { canonicalJsonSha256, validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

type JsonRecord = Record<string, unknown>;
type ApprovalPlanRow = {
  action: string;
  approvalOnlyTransition: boolean;
  entityType: "LEXEME" | "SENSE" | "CLASSIFICATION";
  semanticContentChange: boolean;
  stableId: string;
  targetContentHash: string;
  targetRecordPath: string;
  targetRevision: number;
  targetStatus: string;
};

const repositoryRoot = path.resolve(process.cwd());
const datasetRoot = path.join(repositoryRoot, "vocabflow-dataset");
const releaseRoots = [
  {
    version: "2.2.0",
    hash: "c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d",
  },
  {
    version: "2.2.1",
    hash: "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c",
  },
].map((pin) => ({
  ...pin,
  root: path.join(datasetRoot, "releases", `hybrid-100-v${pin.version}`),
}));
const approvalWorkspace = path.join(datasetRoot, "workspaces", "hybrid-100-rc-final-review");

function readJson(file: string): JsonRecord {
  return JSON.parse(readFileSync(file, "utf8")) as JsonRecord;
}

function verifyCurrentApprovedReleaseAndLifecycle(): void {
  const currentManifest = readJson(path.join(datasetRoot, "dataset.json"));
  const currentTaxonomyPins = currentManifest.includedTaxonomySnapshots as JsonRecord[];
  assert.equal(currentTaxonomyPins.length, 1);
  assert.deepEqual(currentTaxonomyPins[0], {
    taxonomyId: "01a0fc13-09e9-72dd-b49d-ffef077385dd",
    taxonomyVersion: "2.0.1",
    recordPath: "taxonomy/01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.1.json",
    contentHash: "64f5c98611e8bffca48c67ebfb25fb2d974d9d050df51d0122223a21e678a05c",
  });

  const releaseManifests = releaseRoots.map(({ version, hash, root }) => {
    const releaseManifest = readJson(path.join(root, "dataset.json"));
    assert.equal(releaseManifest.datasetVersion, version);
    assert.equal(releaseManifest.status, "APPROVED");
    assert.equal(releaseManifest.releaseHash, hash);
    const releasePayload = { ...releaseManifest };
    delete releasePayload.releaseHash;
    assert.equal(canonicalJsonSha256(releasePayload), hash);
    const releaseValidation = validateMasterVocabularyV2({ datasetRoot: root, writeReport: false });
    assert.deepEqual(
      { status: releaseValidation.status, errors: releaseValidation.errorCount, warnings: releaseValidation.warningCount },
      { status: "PASS", errors: 0, warnings: 0 },
    );

    const entitySets = [
      (releaseManifest.includedLexemes as JsonRecord[]).map((row) => row.masterLexemeId),
      (releaseManifest.includedSenses as JsonRecord[]).map((row) => row.masterSenseId),
      (releaseManifest.includedClassifications as JsonRecord[]).map((row) => row.classificationId),
    ];
    const allIds = entitySets.flat();
    assert.equal(allIds.length, 286);
    assert.equal(new Set(allIds).size, allIds.length, `duplicate canonical identity in ${version}`);
    return { releaseManifest, entitySets };
  });
  for (let entityIndex = 0; entityIndex < 3; entityIndex += 1) {
    assert.deepEqual(
      [...releaseManifests[0].entitySets[entityIndex]].sort(),
      [...releaseManifests[1].entitySets[entityIndex]].sort(),
      `canonical identity changed between releases for entity set ${entityIndex}`,
    );
  }

  const plan = readJson(path.join(approvalWorkspace, "approval-revision-plan.json"));
  assert.equal(plan.planOnly, true);
  const targets = (plan.rows as ApprovalPlanRow[]).filter((row) => row.action === "CREATE_APPROVED_NEXT_REVISION");
  assert.equal(targets.length, 286);
  assert.equal(new Set(targets.map((row) => row.targetRecordPath)).size, 286);

  const identityFields = {
    LEXEME: ["masterLexemeId", "lexemeRevision"],
    SENSE: ["masterSenseId", "senseRevision"],
    CLASSIFICATION: ["classificationId", "classificationRevision"],
  } as const;
  for (const row of targets) {
    assert.equal(row.approvalOnlyTransition, true);
    assert.equal(row.semanticContentChange, false);
    const targetPath = path.resolve(datasetRoot, ...row.targetRecordPath.split("/"));
    assert.ok(targetPath.startsWith(`${datasetRoot}${path.sep}`), `approval target escaped the dataset: ${row.targetRecordPath}`);
    assert.ok(existsSync(targetPath), `approved lifecycle target is not materialized: ${row.targetRecordPath}`);
    const record = readJson(targetPath) as JsonRecord;
    const [identityField, revisionField] = identityFields[row.entityType];
    assert.equal(record[identityField], row.stableId);
    assert.equal(record[revisionField], row.targetRevision);
    assert.equal(record.status, row.targetStatus);
    assert.equal(row.targetStatus, "APPROVED");
    assert.equal(canonicalJsonSha256(record), row.targetContentHash);
  }

  console.log(JSON.stringify({
    status: "PASS_CURRENT_PHASE_RELEASE_AND_APPROVAL_TARGET_PINS",
    currentTaxonomy: "2.0.1/APPROVED",
    approvedReleases: releaseRoots.map(({ version, hash }) => ({ version, releaseHash: hash })),
    approvalTargetsPlanned: targets.length,
    approvalTargetsMaterializedAndPinned: targets.length,
    writes: "NONE",
    databaseAccess: "NONE",
  }));
}

verifyCurrentApprovedReleaseAndLifecycle();
